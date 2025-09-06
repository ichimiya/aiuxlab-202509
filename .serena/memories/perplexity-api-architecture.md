# Perplexity API連携アーキテクチャ設計

## 現在のプロジェクト構造

- Next.js 15 (App Router) + TypeScript
- OpenAPI駆動開発（Orval使用）
- コロケーション設計（機能別整理）
- 既存のAPI構造：`/research` エンドポイント

## Perplexity API連携の設計方針

### 1. アーキテクチャレイヤー

```
src/shared/
├── api/
│   ├── external/           # 外部API連携（新規作成）
│   │   ├── perplexity/    # Perplexity API専用
│   │   │   ├── client.ts  # APIクライアント
│   │   │   ├── types.ts   # 型定義
│   │   │   └── __tests__/ # テスト
│   │   └── index.ts
│   ├── generated/         # 既存のOrval生成コード
│   └── mutator.ts        # 既存のAxios設定
```

### 2. Perplexity API仕様

- **エンドポイント**: https://api.perplexity.ai/chat/completions
- **認証**: Authorization: Bearer {API_KEY}
- **リクエスト形式**: OpenAI互換
- **レスポンス**: choices配列形式

### 3. 型定義設計

```typescript
// Perplexity API Request
interface PerplexityRequest {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  search_domain_filter?: string[];
  search_recency_filter?: "month" | "week" | "day" | "hour";
}

// Perplexity API Response
interface PerplexityResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

### 4. サービス層設計

```typescript
// PerplexityService: ビジネスロジック層
class PerplexityService {
  async searchWithContext(
    query: string,
    selectedText?: string,
  ): Promise<ResearchResult>;
  async analyzeWithVoicePattern(
    content: string,
    pattern: VoicePattern,
  ): Promise<ResearchResult>;
}
```

### 5. 既存システムとの連携

- 既存の`Research`モデルと統合
- `ResearchResult`に Perplexity レスポンスをマッピング
- エラーハンドリングは既存の`mutator.ts`のパターンを継承

### 6. TDD開発順序

1. Perplexity APIクライアント（基本接続）
2. 検索クエリ送信・結果取得
3. エラーハンドリング（レート制限、認証エラー等）
4. ビジネスロジック層（コンテキスト理解、音声パターン解釈）

### 7. 環境変数

- `PERPLEXITY_API_KEY`: APIキー
- `PERPLEXITY_MODEL`: 使用モデル（デフォルト: llama-3.1-sonar-large-128k-online）

### 8. セキュリティ考慮

- APIキーはサーバーサイドでのみ使用
- プロキシ経由でクライアントからアクセス
- レート制限対応
