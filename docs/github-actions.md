# GitHub Actions CI/CD 設定

## 概要

プロジェクトの品質保証とデプロイメントを自動化するGitHub Actionsワークフローを設定しています。

## ワークフロー構成

### 1. CI ワークフロー (`.github/workflows/ci.yml`)

**トリガー**:

- `push`: main, develop, feature/\* ブランチ
- `pull_request`: main, develop ブランチ

**ジョブ構成**:

#### 品質チェック (quality-check)

- ESLint実行
- Prettier形式チェック
- TypeScript型チェック

#### ビルドチェック (build-check)

- Next.js本番ビルド検証
- 静的生成確認
- 環境変数設定検証

#### テスト実行 (test)

- Vitestによる単体テスト
- カバレッジレポート生成
- テスト結果アーティファクト保存

## セットアップ手順

### 1. リポジトリシークレット設定

GitHub リポジトリの Settings > Secrets and variables > Actions で以下を設定:

```bash
# 本番環境向け（必要に応じて追加）
NEXT_PUBLIC_API_URL: "https://your-api-domain.com/api"
```

### 2. ブランチ保護ルール推奨設定

Settings > Branches で `main` ブランチに以下を設定:

```yaml
Branch protection rules:
  ✅ Require a pull request before merging
  ✅ Require status checks to pass before merging
     Required status checks:
       - 品質チェック
       - ビルドチェック
       - テスト実行
  ✅ Require branches to be up to date before merging
  ✅ Require linear history
  ✅ Do not allow bypassing the above settings
```

### 3. 環境別設定

#### Development環境

- 自動デプロイ: develop ブランチ → Vercel Preview
- レビュー必須: false
- 全チェック実行: true

#### Production環境

- 自動デプロイ: main ブランチ → Vercel Production
- レビュー必須: true (2名以上)
- 全チェック実行 + 手動承認: true

## 実行時間の最適化

### 並列実行

- 品質チェック → ビルド・テスト並列実行
- 依存関係を最小限に抑制

### キャッシュ戦略

- pnpmキャッシュ: `cache: 'pnpm'`
- node_modules: 自動キャッシュ
- Next.jsビルド: `.next/cache`

### 推定実行時間

- 品質チェック: ~2分
- ビルドチェック: ~3分（並列実行）
- テスト実行: ~1分（並列実行）
- **合計**: ~3分（並列実行）

## エラー時の対応

### よくあるエラー

1. **Lint/Format エラー**

   ```bash
   # ローカルで修正
   pnpm fix
   git add . && git commit --amend
   ```

2. **型エラー**

   ```bash
   pnpm type-check
   # エラー箇所を修正
   ```

3. **ビルドエラー**

   ```bash
   pnpm build
   # 環境変数・依存関係を確認
   ```

4. **テストエラー**
   ```bash
   pnpm test
   # テストケース修正
   ```

### デバッグ方法

1. **GitHub Actions ログ確認**
   - Actions タブで詳細ログを確認
   - 各ステップの実行時間・エラー内容を分析

2. **ローカル再現**
   ```bash
   # CI環境の再現
   pnpm install --frozen-lockfile
   pnpm generate:api
   pnpm check
   pnpm build
   pnpm test --run
   ```

## 拡張計画

### Phase 2: デプロイメント自動化

- Vercel連携
- 環境別自動デプロイ
- ロールバック機能

### Phase 3: 高度な品質チェック

- E2Eテスト (Playwright)
- Visual Regression Test
- Performance Budget監視
- Security Scanning

### Phase 4: モニタリング

- デプロイメント通知 (Slack)
- パフォーマンス監視
- エラー追跡 (Sentry)

## トラブルシューティング

### CI実行時のよくある問題

1. **pnpm install失敗**
   - `pnpm-lock.yaml`の整合性確認
   - Node.jsバージョン確認

2. **Memory不足**
   - `NODE_OPTIONS: '--max_old_space_size=4096'`

3. **API生成失敗**
   - OpenAPIスキーマ構文確認
   - Orval設定確認

### パフォーマンス最適化

1. **並列実行の調整**
   - 依存関係の見直し
   - ジョブの統合・分離

2. **キャッシュ効率向上**
   - 適切なキャッシュキー設定
   - 不要な再実行防止

この設定により、コード品質の一貫性とデプロイメントの信頼性を確保できます。
