# 音声インタラクション 技術仕様（ドラフト）

## 1. 音声イベントAPI

### 1.1 エンドポイント

- `POST /api/voice-events`
  - 目的: 音声認識結果（逐次 transcript chunk）をサーバへ送信
  - 認証: セッションCookie（CSRF対策は本実装時に追加）
  - レート制限: 1セッションあたり毎秒 4 リクエストを上限（バースト許容）

### 1.2 リクエスト形式

```json
{
  "sessionId": "qo-ses-20240901-abcdef", // 音声セッションID
  "timestamp": "2025-09-17T01:20:30.123Z", // 発話完了時刻
  "transcript": "AIの事故例も入れて", // STT結果
  "confidence": 0.92, // STT信頼度
  "isFinal": false, // STTの最終結果かどうか
  "metadata": {
    "locale": "ja-JP",
    "device": "web",
    "chunkSeq": 12 // チャンク連番
  }
}
```

### 1.3 レスポンス形式

- 即時 202 Accepted を返し、処理は非同期化

```json
{
  "status": "accepted",
  "queuedAt": "2025-09-17T01:20:30.456Z"
}
```

- バリデーションエラー時は 400 (JSON bodyに `code`, `message`)
- 認証エラーは 401, レート超過は 429

### 1.4 送信頻度と再送

- STTは 500ms〜1s 間隔でチャンク送信
- ネットワークエラー時はクライアント側で最大3回指数バックオフ再送
- `isFinal: true` のチャンクを受け取った時点で同チャンクに対する Intent 推定を必ず実行

## 2. イベント処理キュー

### 2.1 選定方針（プロトタイプ）

- **基盤**: Node.js プロセス内の簡易FIFOキュー（ライブラリ `p-queue` など）
- 理由: 外部コンポーネント不要で立ち上げが速い／PoC段階での検証を優先

### 2.2 フロー概要

1. `POST /api/voice-events` 受領後、インメモリキュー `voiceEventQueue` に enqueue
2. 単一ワーカー（またはセッションIDごとの `p-queue`）が FIFO でイベントを実行
3. 処理中はセッションロックマップで排他制御（Key: `sessionId`）
4. Intent推定 → Command生成 → UseCase呼び出し
5. 処理完了後、セッション状態を更新し、通知（SSE）を送信

> 実装メモ (2025-09-18): `/api/voice-events` で受け取ったイベントは `InMemoryVoiceEventQueue` がセッション単位で逐次処理する。ワーカー (`processVoiceEvent`) は Redis (`qo:session:*`) に履歴を保存しつつ `createOptimizeQueryUseCase` を呼び出し、結果を `session_update` SSE として送信する。

### 2.3 ジョブ定義

```ts
interface VoiceEventJob {
  sessionId: string;
  timestamp: string;
  transcript: string;
  confidence: number;
  isFinal: boolean;
  metadata: {
    locale: string;
    device: string;
    chunkSeq: number;
  };
}
```

### 2.4 再試行・エラー処理

- イベント処理中に例外発生時は即座に1回再試行（同期フォールバック）
- 連続失敗時はセッションステータスを `error` に遷移させ、ユーザーへ通知
- セッションロック取得不能（他イベント処理中）の場合は次のtickで再度キューイング

> 文脈マージ実装: 直近候補のクエリをベースに新しい発話を連結（重複語句は除外）し、`VoicePattern` はメタデータとして保持。短い追加発話（例: 地名や指示語）でも継続的にクエリへ織り込み、連続発話の意図を保持する。

### 2.5 スケーリング / 将来拡張

- 現段階では単一Node.jsプロセス前提（プロセス再起動でキュークリア）
- 将来的に Redis/BullMQ 等へ移行する場合は `VoiceEventQueuePort` を定義しAdapter差し替えで対応

## 3. セッション状態モデル

### 3.1 データストア

- Node.js プロセス内 `Map<string, VoiceSessionState>` を利用
- TTL管理は簡易タイマーで実装（最終更新から30分で自動削除）
- プロセス再起動で状態は失われる想定（PoC前提）

### 3.2 スキーマ

```ts
interface VoiceSessionState {
  sessionId: string;
  userId: string;
  status: "idle" | "optimizing" | "ready" | "researching";
  context: {
    originalQuery?: string;
    appendedPhrases: { text: string; timestamp: string }[];
  };
  candidates: Array<{
    id: string;
    query: string;
    coverageScore: number;
    rank: number;
    source: "llm" | "manual";
  }>;
  selectedCandidateId?: string;
  pendingIntent?: {
    intentId: string;
    confidence: number;
    parameters: Record<string, unknown>;
    expiresAt: string; // 確認待ちタイムアウト
  };
  lastUpdatedAt: string;
}
```

### 3.3 ライフサイクル

1. トグルONでセッション生成（`status=idle`）
2. `OPTIMIZE_QUERY_APPEND` 処理開始で `status=optimizing`、候補生成完了で `status=ready`
3. `START_RESEARCH` 成功で `status=researching`、リサーチセッションIDと紐付け
4. `CANCEL_OPTIMIZATION` や確認タイムアウトで `status=idle` へ戻す
5. TTL満了（30分無操作）でタイマーにより自動削除、関連ロックも解放

### 3.4 整合性確保

- セッション更新はシングルスレッドイベントループで実行されるため、`Map` 更新時に再取得して反映（簡易CAS）
- ワーカーは処理中フラグ (`processingSessions`) を利用し、finallyで解除
- フロントは `GET /api/voice-sessions/:id` で復元、SSR時はリクエスト時点のスナップショットを提供

## 4. Intent判定・アクションルーティング・通知

### 4.1 Intent判定パイプライン

1. `voice-intent-worker` が `VoiceEventJob` を受信
2. Intent分類ロジックを実行（LLM呼び出し）
   - プロトタイプ段階から LLM API を利用し、音声コンテキストをまとめたプロンプトで分類
   - 入力: セッションコンテキスト（直近 transcript 3件、現在候補、ステータス）
   - 出力例:

```json
{
  "intentId": "OPTIMIZE_QUERY_APPEND",
  "confidence": 0.74,
  "parameters": {
    "partialText": "事故例も入れて"
  }
}
```

> 補足: LLM応答には `confidenceBand` (auto/confirm/reject) や `rationale` が付与される場合があるが、アプリケーション層で必須となるのは `intentId` / `confidence` / `parameters` の3項目。

3. `confidence` を閾値テーブル（`docs/voice-intent-spec.md` 定義）で判定し、`auto`/`confirm`/`reject` を決定
4. `auto` の場合は Command に変換、`confirm` は `pendingIntent` としてセッションに格納

### 4.2 コマンドルーター

- `VoiceIntentRouter` が Intent→Command マッピングを保持

```ts
type VoiceCommand =
  | { type: "AppendQuery"; partialText: string }
  | { type: "StartResearch"; candidateId?: string; pattern?: string }
  | { type: "ReplaceQuery"; focus: string }
  | { type: "SelectCandidate"; candidateId: string }
  | { type: "CancelOptimization" };
```

- Command は UseCase Port を呼び出し
  - `AppendQuery` → `OptimizeQueryUseCase`
  - `StartResearch` → `ExecuteResearchUseCase`
  - `ReplaceQuery` → `OptimizeQueryUseCase` (モード: replace)
  - `SelectCandidate` → `QueryOptimizationStorePort`
  - `CancelOptimization` → セッションリセット
- Command 実行結果は `VoiceSessionState` に反映、必要に応じて追加ジョブを enqueue

### 4.3 通知チャネル

- **SSE (`/api/voice-events/stream`)** を推奨
  - イベント種別: `session_update`, `intent_confirmation`, `error`
  - ペイロード例:

````

- SSE接続は1セッション1チャネル。プライマリTabのみ接続するようクライアントで制御

### 4.5 フロントエンド受信フロー

```mermaid
sequenceDiagram
  participant Toggle as VoiceToggle
  participant SSE as SSEClient
  participant Store as voiceRecognitionStore
  participant UI as Components

  Toggle->>SSE: open(sessionId)
  SSE->>SSE: new EventSource(`/api/voice-events/stream?sessionId=...`)
  SSE->>Store: on session_update
  Store->>Store: reduceSessionState()
  Store->>UI: emit selector updates
  UI->>UI: rerender QueryOptimizer/VoiceStatus
  SSE->>Store: on intent_confirmation
  Store->>UI: display confirm modal/toast
  SSE->>Store: on error
  Store->>UI: show error toast + retry option
  SSE-->>Toggle: on close/error notify for reconnect
````

#### 実装メモ

- `voiceRecognitionStore` に `sessionState`, `pendingIntent`, `lastError` フィールドを追加
- SSEハンドラは JSON.parse 後、イベント種別に応じた reducer (`applySessionUpdate`, `setPendingIntent`, `setError`) を呼び出す
- 再接続ポリシー: ネットワークエラー時は 1s → 2s → 4s の指数バックオフ（最大5回）
- プライマリTab判定: BroadcastChannel か `storage` イベントを使い、アクティブタブが SSE を保持
- コンポーネント側は `useVoiceRecognitionStore` の selector で状態を購読し、PendingIntentが存在する場合は確認ダイアログを表示

#### ストア状態・reducer テスト方針

- **状態構造案**
  ```ts
  interface VoiceRecognitionViewState {
    sessionId: string | null;
    sessionState: VoiceSessionState | null;
    pendingIntent: PendingIntent | null;
    lastError: string | null;
    reconnectAttempt: number;
  }
  ```
- **Reducer**
  - `setSessionState(state)` : session_update イベントを反映（候補マージ・status更新）
  - `setPendingIntent(intent)` : intent_confirmation を保存
  - `clearPendingIntent()` : ユーザー応答後にクリア
  - `setError(message)` / `clearError()` : エラー表示制御
  - `incrementReconnectAttempt()` / `resetReconnectAttempt()` : 再接続制御
- **テスト観点（Vitest）**
  1. session_update 受信で候補が上書きされ、statusが更新される
  2. intent_confirmation で pendingIntent が設定され、ユーザー応答後に clear される
  3. error イベントで lastError がセットされ、後続の成功イベントで clear される
  4. reconnectAttempt が上限を超えた場合に SSE 再接続を停止（hooks側で扱う想定）

#### SSEクライアント実装手順（フロント）

1. `useVoiceSSE` フックを作成
   - 引数: `sessionId`, `isPrimaryTab`
   - 内部で EventSource を生成し、イベントハンドラを登録
   - cleanup で `eventSource.close()`
2. イベントハンドラ
   - `onmessage`: `JSON.parse(event.data)` → `store.dispatch`
   - `onerror`: ストアに error を記録し、EventSource を閉じ再接続スケジュール
3. 再接続ロジック
   - `reconnectAttempt` に応じて delay (1s, 2s, 4s, 8s, 16s)
   - 上限到達時はユーザーへ手動再接続ボタン提示
4. プライマリタブ制御
   - `useEffect` で `BroadcastChannel('voice-session')` をリッスンし、`isPrimary` フラグを共有
   - タブ非アクティブ時は EventSource を閉じ、アクティブ復帰時に再接続
5. UI連携
   - `VoiceRecognitionButton` で sessionId を生成し `useVoiceSSE` を呼ぶ
   - `QueryOptimizer` コンポーネントはストア selector で `sessionState` と `pendingIntent` を購読
   - `PendingIntent` が存在する場合はモーダル or トーストを表示し、ユーザー応答でストアを更新

### 4.4 エラーハンドリング

- Intent判定APIエラー → `VoiceIntentClassificationError` としてセッションに記録、SSEで通知
- UseCaseエラーは `error` イベントを送信し、UIにはリトライボタンを提示
- 連続3回以上の失敗で音声ガイダンス（ヘルプ誘導 Intent）を表示

## 5. Port / Adapter 設計（バックエンド）

### 5.1 インターフェース

```ts
export interface VoiceEventQueuePort {
  enqueue(job: VoiceEventJob): Promise<void>;
}

export interface VoiceSessionStorePort {
  get(sessionId: string): Promise<VoiceSessionState | null>;
  set(session: VoiceSessionState): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

export interface VoiceIntentClassifierPort {
  classify(input: VoiceIntentInput): Promise<VoiceIntentResult>;
}

export interface VoiceNotificationPort {
  publish(event: VoiceSseEvent): Promise<void>;
}
```

### 5.2 Adapter 方針（プロトタイプ）

- `VoiceEventQueuePort`: Node.js 内部キュー（`p-queue`）実装 `InMemoryVoiceEventQueue`
- `VoiceSessionStorePort`: プロセス内 `Map` をラップする `InMemoryVoiceSessionStore`
- `VoiceIntentClassifierPort`: Bedrock などLLM APIを呼び出す `LlmIntentClassifier`
- `VoiceNotificationPort`: SSE への push を行う `SseNotificationAdapter`

### 5.3 将来拡張ポイント

- Queue を Redis/BullMQ へ差し替える場合は `VoiceEventQueuePort` のみ差し替え
- SessionStore を Redis 等へ移行する場合も Port 実装を切り替え、残りのコードは不変
- Notification を WebSocket や Kafka へ変更する場合も `VoiceNotificationPort` を置き換える
- Intent分類ロジックをルールベースにフォールバックする場合は `VoiceIntentClassifierPort` の別Adapterを用意

### 5.4 テスト戦略

- Port にはインターフェースレベルの契約テスト（`InMemory` 実装）を追加
- QueueAdapter には「enqueue した順序で handler が呼ばれる」などのユニットテスト
- IntentClassifier は LLMモックを利用したレスポンスハンドリングのテスト
- NotificationAdapter は SSE用のイベント配信をモックで検証
