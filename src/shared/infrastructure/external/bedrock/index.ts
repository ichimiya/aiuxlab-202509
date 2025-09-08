/**
 * DEPRECATED: このバレルは段階的廃止対象です。
 * 直接の利用は避け、以下を利用してください。
 * - LLM: `@/shared/infrastructure/external/llm/factory` or adapters under `llm/adapters/*`
 * - Bedrock base client: `@/shared/infrastructure/external/bedrock/base/BedrockClient`
 */
export * from "./ContentProcessing"; // 互換維持（新規コードは使用しないこと）
export * from "./QueryOptimization"; // 互換維持（新規コードは使用しないこと）
