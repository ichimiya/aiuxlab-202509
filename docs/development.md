# 開発ガイド（抜粋）

## 依存注入

- LLM/Search/STT は Factory 経由で取得してUseCase/Serviceへ注入する。
- 例:

```ts
import { createQueryOptimizationAdapter } from "@/shared/infrastructure/external/llm/factory";
const repo = createQueryOptimizationAdapter();
```

## Port/Adapter

- Portは `src/shared/useCases/ports/*` に定義（アプリケーション層が所有）
- Adapterは `src/shared/infrastructure/external/**/adapters/*` に実装
- 新規コードで `@/shared/infrastructure/external/bedrock` バレルは使用しない（段階的廃止）

## 共通ユーティリティ

- ログ: `src/shared/lib/logger.ts`（LOG_LEVEL/NODE_ENV）
- HTTP: `src/shared/api/http/http.ts`（`ok/fail/parseJsonBody/withJsonValidation`）
- プロンプト: `src/shared/ai/prompts/*`（プロバイダ非依存）

## TDD

- Red→Green→Refactorで、小さく進める
- 重要なアーキテクチャルルールはテストでガード（例: `src/arch/*`）
