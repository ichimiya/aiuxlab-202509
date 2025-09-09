# アーキテクチャ（Ports & Adapters）

本プロジェクトはクリーンアーキテクチャ/ヘキサゴナルを踏まえ、内側（UseCase/Domain）がPort（抽象）を所有し、外側（Infrastructure）のAdapter（実装）がそれを実装します。依存注入はFactoryで一元化します。

## レイヤ

- Domain: `src/shared/domain/*`（ドメインサービス/ルール）
- Application: `src/shared/useCases/*`（ユースケース/ポート定義）
  - Ports: `src/shared/useCases/ports/*`
- Infrastructure（外部接続）
  - LLM: `src/shared/infrastructure/external/llm/adapters/*` + `llm/factory.ts`
  - Search: `src/shared/infrastructure/external/search/adapters/*` + `search/factory.ts`
  - STT: `src/shared/infrastructure/external/stt/factory.ts`
- Cross-cutting
  - Prompts: `src/shared/ai/prompts/*`
  - Logger: `src/shared/lib/logger.ts`
  - HTTP Utils: `src/shared/api/http/http.ts`

## 依存関係の向き

UseCase → Port（抽象） ← Adapter（実装）

## 使い方（例）

```ts
import { createContentProcessingAdapter } from "@/shared/infrastructure/external/llm/factory";
const contentPort = createContentProcessingAdapter();
```

## プロバイダ切替

- 環境変数: `LLM_PROVIDER`（bedrock/vertex）、`SEARCH_PROVIDER`（perplexity/...）

## 非推奨（段階的廃止）

- `@/shared/infrastructure/external/bedrock` のバレルimportは禁止（互換のため当面残置）。`llm/factory` もしくは Adapter を直接使用してください。
