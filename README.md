# AI Research POC

AI時代の新しいリサーチ体験を探索する実験的POC

## ドキュメント

### 要件・設計

- **プロダクトビジョン**: @docs/product-vision.md
- **ターゲットユーザー**: @docs/target-users.md
- **機能・優先順位**: @docs/features-and-priorities.md
- **非機能要件**: @docs/non-functional-requirements.md
- **成功指標**: @docs/success-metrics.md

### 開発

- **技術仕様**: @docs/tech-stack.md
- **開発ガイド**: @docs/development.md
- **アーキテクチャ**: @docs/architecture.md
- **SSR統合**: @docs/ssr-hydration.md
- **CI/CD**: @docs/github-actions.md
- **Claude Code設定**: @CLAUDE.md

## クイックスタート

```bash
# 依存関係インストール
pnpm install

# API型生成
pnpm generate:api

# 開発サーバー起動
pnpm dev
```

## プロジェクト構成

- `web/` - Next.js アプリケーション（Turbopack 対応）
- `wasm/` - Rust + WebGPU エフェクト（`wasm-pack` でビルドし `web/` から利用）
- `packages/` - WASM エフェクトなど共有モジュールを配置予定

### 品質チェック

```bash
# 全体品質チェック
pnpm check

# 自動修正
pnpm fix

# ビルド確認
pnpm build
```

環境構築詳細: @docs/tech-stack.md

## CI/CD Status

[![CI](https://github.com/your-repo/ai-research-poc/actions/workflows/ci.yml/badge.svg)](https://github.com/your-repo/ai-research-poc/actions/workflows/ci.yml)

- 🔍 **品質チェック**: ESLint, Prettier, TypeScript
- 🏗️ **ビルド検証**: Next.js本番ビルド
- 🧪 **テスト実行**: Vitest単体テスト

## 現在のステータス

- ✅ Phase 0: プロダクトビジョン・要件定義（完了）
- 🔄 Phase 1準備: 技術スタック選定（Issue #2）
- 📋 Phase 1: 基盤機能開発（Issue #3）

## コア体験

**テキスト選択 + 音声コマンド** による直感的な未来のリサーチ体験

詳細: @docs/product-vision.md

---

_このPOCで未来のリサーチ体験を実証しましょう！_

## Architecture Quick Guide（Ports & Adapters）

- **原則**: UseCaseはPort（抽象）に依存し、実装はAdapter側（Infrastructure）に置く。依存注入はFactory経由。
- **ファクトリ**
  - LLM: `@/shared/infrastructure/external/llm/factory`
    - `createContentProcessingAdapter()`, `createQueryOptimizationAdapter()`
  - Search: `@/shared/infrastructure/external/search/factory`
    - `createResearchRepository({ apiKey })`
  - STT: `@/shared/infrastructure/external/stt/factory`
    - `createSpeechToTextAdapter()`
- **プロンプト**: `src/shared/ai/prompts/*` に共通化（プロバイダ非依存）。
- **ログ/HTTP**: `src/shared/lib/logger.ts` / `src/shared/api/http/http.ts` を使用。

### Importの禁止事項（移行中）

- 次のバレル import は段階的廃止。新規コードは禁止。
  - NG: `import { ... } from "@/shared/infrastructure/external/bedrock";`
  - OK: Factory/Adapterを直接利用する。

### 旧→新の移行例

```ts
// 旧: bedrock の直接依存
import { BedrockContentProcessingClient } from "@/shared/infrastructure/external/bedrock";

// 新: Factory/Port経由
import { createContentProcessingAdapter } from "@/shared/infrastructure/external/llm/factory";
const contentPort = createContentProcessingAdapter();
```

詳細は @docs/architecture.md / @docs/development.md を参照
