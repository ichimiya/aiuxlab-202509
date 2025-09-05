# SSR + React Query Hydration パターン

## 概要

このプロジェクトでは、React QueryのSSR機能を活用してサーバーサイドでデータをプリフェッチし、クライアントサイドでハイドレーションする最適化されたパターンを実装しています。

## アーキテクチャ

### サーバーサイド

1. **QueryClient作成** (`server-query-client.ts`)
   - サーバー専用のQueryClient設定
   - React.cache()を使用してリクエスト単位でのシングルトン保証

2. **データプリフェッチ** (`prefetch-helpers.ts`)
   - 各ページで必要なデータを事前取得
   - dehydrate()でクライアント転送用のデータ作成

3. **ページレベル統合**
   - async Server Componentでプリフェッチ実行
   - HydrationBoundaryでクライアントにデータ転送

### クライアントサイド

1. **HydrationBoundary** (`hydration-boundary.tsx`)
   - TanStack QueryのHydrationBoundaryをラップ
   - サーバーからのdehydratedStateを受け取り

2. **React Queryフック**
   - 通常通りuseQuery/useMutationを使用
   - サーバーでプリフェッチされたデータが自動的に利用される

## 使用パターン

### 基本パターン（静的ページ）

```tsx
// pages/page.tsx
import { HydrationBoundary } from "@/shared/components/hydration-boundary";
import { prefetchHomePageData } from "@/shared/lib/prefetch-helpers";

export default async function HomePage() {
  const dehydratedState = await prefetchHomePageData();

  return (
    <HydrationBoundary state={dehydratedState}>
      <HomeContent />
    </HydrationBoundary>
  );
}
```

### 動的ルートパターン

```tsx
// pages/research/[id]/page.tsx
import { prefetchResearch } from "@/shared/lib/prefetch-helpers";

export default async function ResearchPage({
  params,
}: {
  params: { id: string };
}) {
  const dehydratedState = await prefetchResearch(params.id);

  return (
    <HydrationBoundary state={dehydratedState}>
      <ResearchDetail id={params.id} />
    </HydrationBoundary>
  );
}
```

### コンポーネントでの使用

```tsx
// components/research-interface.tsx
function ResearchInterface() {
  // サーバーでプリフェッチされたデータが自動的に使用される
  const { data, isLoading } = useGetResearchHistory();

  return (
    <div>
      {/* SSRでプリフェッチされているため、初期ローディングが短縮される */}
    </div>
  );
}
```

## カスタムプリフェッチの作成

```tsx
// prefetch-helpers.ts
export async function prefetchCustomPageData(userId: string) {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["user", userId],
    queryFn: () => getUser(userId),
    staleTime: 1000 * 60 * 5,
  });

  await queryClient.prefetchQuery({
    queryKey: ["user-posts", userId],
    queryFn: () => getUserPosts(userId),
    staleTime: 1000 * 60 * 2,
  });

  return dehydrate(queryClient);
}
```

## メリット

### パフォーマンス

- **初期表示速度向上**: サーバーでデータプリフェッチ済み
- **CLS削減**: レイアウトシフトの軽減
- **キャッシュ効率**: React Queryの統一されたキャッシュ管理

### 開発体験

- **型安全性**: OrvalによるTypeScript統合
- **一貫性**: 同じAPIフックをSSR/CSRで使用可能
- **デバッグ**: React Query DevToolsでキャッシュ状態確認

### SEO

- **メタデータ生成**: サーバーサイドでのOGP生成
- **検索エンジン**: 初期HTMLにデータ含有

## ベストプラクティス

### サーバーサイド

- **エラーハンドリング**: プリフェッチエラーでもページ表示継続
- **タイムアウト設定**: 長時間のAPI呼び出しを避ける
- **キャッシュ戦略**: staleTimeを適切に設定

### クライアントサイド

- **Suspense境界**: 非同期コンポーネントの適切な境界設定
- **エラー境界**: ErrorBoundaryでのエラーハンドリング
- **ローディング状態**: プリフェッチ失敗時のフォールバック

## 実装済みのページ

1. **ホームページ** (`/`)
   - リサーチ履歴のプリフェッチ
   - メイン機能の初期データ

2. **リサーチ詳細** (`/research/[id]`)
   - 特定リサーチデータのプリフェッチ
   - 関連データの先読み

## トラブルシューティング

### よくある問題

1. **Hydration Mismatch**
   - サーバーとクライアントの状態不整合
   - 解決: dehydratedStateの正確な受け渡し

2. **重複リクエスト**
   - サーバーとクライアントでの重複フェッチ
   - 解決: staleTimeの適切な設定

3. **メモリリーク**
   - サーバーサイドでのQueryClient使い回し
   - 解決: リクエスト毎のQueryClient作成
