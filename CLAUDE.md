# NOVA - Claude Code設定

## プロジェクト概要

NOVA provides Network Oriented Visualized Analysis, enabling users to explore complex data relationships through intuitive network graphs and uncover hidden insights.

## ドキュメント

- **プロダクトビジョン**: @docs/product-vision.md
- **技術仕様**: @docs/tech-stack.md
- **開発フロー**: @docs/development.md
- **アーキテクチャ**: @docs/architecture.md
- **コミット規則**: @docs/commit-rules.md
- **Phase計画**: @docs/phases.md
- **音声解釈**: @docs/voice-patterns.md

## 応答言語

日本語

## 重要リマインダー

- **パフォーマンス最優先**: 60fps維持が体験の核心
- **OpenAPI駆動開発**: スキーマファーストな型安全開発
- **Phase別段階実装**: 一気に全機能実装せず確実に
- **未来感の演出**: 既存ツールとの差別化を体験で示す

### Ports & Adapters（設計ルール）

- UseCaseはPort（抽象）にのみ依存。外部サービスはAdapter（実装）で吸収。
- 依存注入はFactoryを使用：
  - LLM: `@/shared/infrastructure/external/llm/factory`
  - Search: `@/shared/infrastructure/external/search/factory`
  - STT: `@/shared/infrastructure/external/stt/factory`
- プロンプトは `src/shared/ai/prompts/*` に集約（プロバイダ非依存）。
- ログ/HTTPは `src/shared/lib/logger.ts` / `src/shared/api/http/http.ts` を使用。
- 禁止（段階的廃止）: `@/shared/infrastructure/external/bedrock` バレルimport。
  - 代替: 各Factory/Adapterを直接使用。

## POC開発方針

### シンプル実装の原則

- **YAGNI (You Aren't Gonna Need It)**: 現在使われていない機能は実装しない
- **過剰最適化の回避**: キャッシュ、メモ化、複雑なパフォーマンス監視は後回し
- **基本機能優先**: コア機能を確実に動作させることを最優先
- **段階的改善**: 必要に応じて後から機能を追加する設計

### 削除対象となる実装例

❌ **避けるべき実装**

- LRUキャッシュなどの複雑な最適化
- 使用されていないパフォーマンス設定
- 過剰なエラーパターンマッチング
- 詳細すぎるログ・監視機能

✅ **保持すべき実装**

- API呼び出しの基本機能
- 必要最小限のエラーハンドリング
- 型安全性の確保
- テストカバレッジの維持

## 依存注入と切替

- `LLM_PROVIDER` / `SEARCH_PROVIDER` でプロバイダ切替（既定: bedrock / perplexity）。
- 例（LLM）:

```ts
import { createContentProcessingAdapter } from "@/shared/infrastructure/external/llm/factory";
const contentPort = createContentProcessingAdapter();
```

詳細: @docs/architecture.md / @docs/development.md

## 緊急時の対応

技術的な行き詰まりや方向性の迷い → @docs/product-vision.md に立ち返る
