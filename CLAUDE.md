# Claude Code プロジェクト設定

## 応答言語
日本語

## プロジェクト概要
AI時代の新しいリサーチ体験を探索する実験的POC。
テキスト選択＋音声コマンドによる革新的インタラクションと動的可視化が特徴。

## 重要な設計方針

### UX最優先
- **可視化パフォーマンス**: 60fps維持が最重要
- **直感的操作**: 説明不要で使える操作感
- **未来感の演出**: 既存ツールとの差別化を体験で示す

### 技術制約の理解
- **音声認識**: Web Speech API制約を考慮
- **外部API**: Perplexity/OpenAI APIの応答時間制約
- **ブラウザ対応**: Chrome/Edge中心（Web Speech API必須）

## 開発フェーズ

### 現在のフェーズ: 準備段階
- ✅ Phase 0: プロダクトビジョン・要件定義（完了）
- 🔄 Phase 1準備: 技術スタック選定（Issue #2）
- 📋 Phase 1: 基盤機能開発（Issue #3）

### Phase別重点事項
- **Phase 1**: Perplexity API連携 + テキスト選択
- **Phase 2**: 音声解釈システム（8パターン）+ LLM連携
- **Phase 3**: 動的可視化システム + リアルタイム表示

## 音声解釈の8パターン
1. 深堀り系: 「もっと詳しく」→詳細検索
2. 視点変更系: 「他の観点でも」→異なる視点検索
3. 具体化系: 「具体例ある？」→事例検索
4. データ・根拠系: 「データある？」→統計検索
5. 比較・関連系: 「他と比べると？」→比較検索
6. 時系列・トレンド系: 「今後どうなる？」→トレンド分析
7. 実用・応用系: 「どう使えるの？」→活用方法検索
8. 要約・整理系: 「まとめて」→構造化・要約

## コミット・PR規則

### セマンティックコミット形式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type一覧
- **feat**: 新機能追加
- **fix**: バグ修正
- **docs**: ドキュメントのみの変更
- **style**: コードの意味に影響しない変更（空白、フォーマット等）
- **refactor**: バグ修正や機能追加を伴わないコード変更
- **perf**: パフォーマンス改善
- **test**: テストの追加・修正
- **chore**: ビルドプロセスやツールの変更

### Issueリンク
- 進行中: `Refs: #番号`
- 完了時: `Fixes: #番号` （GitHubの自動クローズ機能）

## ブランチ戦略
- 命名規則: `feature/[issue No]-[Issueの内容を表す簡潔な説明]`
- 例: `feature/2-tech-stack-selection`

## TDD原則（将来の実装時）
1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限のコードを実装
3. **Refactor**: テストが通ることを確認しながらリファクタリング

## API設定（開発時）
```bash
# 環境変数例（.env.local）
PERPLEXITY_API_KEY=your_api_key
OPENAI_API_KEY=your_api_key
CLAUDE_API_KEY=your_api_key
```

## よく使うコマンド

### 開発準備
```bash
# 新しいIssue対応ブランチ作成
git checkout -b feature/[issue-no]-[description]

# Issue一覧確認
gh issue list

# Issue詳細確認
gh issue view [number]
```

### PR作成
```bash
# プッシュ
git push -u origin feature/[branch-name]

# PR作成
gh pr create --title "feat: [title]" --body "[description]"
```

## 重要なリマインダー

### パフォーマンス最優先
- 可視化の滑らかさ（60fps）は体験の核心
- レスポンシブ性能 > 機能の豊富さ

### POCの目的を忘れない
- 定量的成果 < 感覚的な「未来感」
- 完璧な実装 < デモで驚きを与える体験

### 段階的な実装
- 一気に全機能実装せず、Phase別に確実に
- 各Phaseで体験可能な状態を維持

## ドキュメント
- [📄 README.md](./README.md) - プロジェクト全体概要
- [📋 docs/](./docs/) - 各種要件定義・設計書

## 緊急時の対応
技術的な行き詰まりや方向性の迷いが生じた場合:
1. プロダクトビジョンに立ち返る（docs/product-vision.md）
2. ターゲットユーザーの驚きを優先（docs/success-metrics.md）
3. Phase単位での最小価値を確保

---

*このPOCで未来のリサーチ体験を実証しましょう！*