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
- 📋 **PR検証**: セマンティックコミット確認

## 現在のステータス

- ✅ Phase 0: プロダクトビジョン・要件定義（完了）
- 🔄 Phase 1準備: 技術スタック選定（Issue #2）
- 📋 Phase 1: 基盤機能開発（Issue #3）

## コア体験

**テキスト選択 + 音声コマンド** による直感的な未来のリサーチ体験

詳細: @docs/product-vision.md

---

_このPOCで未来のリサーチ体験を実証しましょう！_
