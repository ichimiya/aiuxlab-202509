# 技術仕様書

## 技術スタック

### フレームワーク・コア技術

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **パッケージ管理**: pnpm
- **状態管理**: Zustand + React Query
- **スタイリング**: Tailwind CSS + Shadcn/ui

### API・データフェッチング

- **API層**: Next.js API Routes (Route Handlers)
- **APIクライアント**: Orval (OpenAPI自動生成)
- **データフェッチング**: React Query (TanStack Query)
- **開発手法**: OpenAPI駆動開発
- **HTTP**: Axios

### 可視化・インタラクション

- **3D可視化**: Three.js + @react-three/fiber + @react-three/drei
- **音声認識**: Web Speech API
- **優先API**: Perplexity API

### 開発・テスト環境

- **テスト**: Vitest + React Testing Library
- **開発ツール**: ESLint + Prettier + Husky
- **アーキテクチャ**: MVVM + クリーンアーキテクチャ + コロケーション

## プロジェクト構造

```
src/
├── app/                               # Next.js App Router
│   ├── api/research/                 # API Routes
│   │   ├── route.ts                  # リサーチ実行API
│   │   └── route.test.ts             # APIテスト
│   ├── research/[id]/page.tsx        # リサーチ詳細ページ
│   ├── page.tsx                      # ホームページ
│   ├── layout.tsx                    # レイアウト
│   ├── providers.tsx                 # Providers設定
│   └── globals.css                   # グローバルスタイル
├── features/                          # フィーチャーベース設計
│   ├── research/
│   │   └── components/               # リサーチ関連UI
│   │       ├── ResearchInterface.tsx
│   │       ├── ResearchDetailView.tsx
│   │       └── ResearchResultDisplay/
│   │           ├── index.tsx         # コンポーネント
│   │           └── useResearchResultDisplayViewModel.ts # ViewModel
│   └── visualization/
│       └── components/               # 3D可視化
│           └── ResearchVisualization.tsx
└── shared/                           # 共通層（クリーンアーキテクチャ）
    ├── infrastructure/external/     # Infrastructure層
    │   ├── perplexity/              # Perplexity API通信
    │   │   ├── index.ts             # PerplexityClient
    │   │   └── index.test.ts        # テスト
    │   └── bedrock/                 # Bedrock API通信
    │       └── index.ts             # BedrockClient
    ├── domain/research/             # Domain層
    │   ├── services.ts              # ResearchDomainService
    │   └── services.test.ts         # ドメインロジックテスト
    ├── useCases/                    # Application層
    │   ├── ExecuteResearchUseCase/  # リサーチ実行ユースケース
    │   │   ├── index.ts             # UseCase本体
    │   │   └── index.test.ts        # テスト
    │   └── index.ts                 # エクスポート
    ├── api/                         # API関連
    │   ├── generated/               # Orval自動生成
    │   │   ├── models/              # 型定義
    │   │   ├── zod/                 # Zodスキーマ
    │   │   └── api.ts               # HTTPクライアント
    │   ├── schemas/
    │   │   └── openapi.yaml         # OpenAPI定義
    │   └── mutator.ts               # Axios設定
    ├── stores/                      # Zustand状態管理
    │   ├── researchStore.ts         # リサーチ状態
    │   └── researchStore.test.ts    # テスト
    ├── components/                  # 共通UIコンポーネント
    │   └── HydrationBoundary.tsx    # SSRハイドレーション
    └── lib/                         # ユーティリティ
        ├── queryClient.ts           # React Query設定
        ├── serverQueryClient.ts     # サーバー用Query Client
        └── *.test.ts                # テストファイル
```

## 環境構築手順

### 1. プロジェクト初期化

```bash
pnpm create next-app@latest ai-research-poc --typescript --tailwind --eslint --app --src-dir
cd ai-research-poc
```

### 2. 依存パッケージインストール

```bash
# 状態管理・HTTP
pnpm add zustand axios
pnpm add @tanstack/react-query @tanstack/react-query-devtools

# 可視化
pnpm add three @react-three/fiber @react-three/drei

# 開発・ビルドツール
pnpm add -D orval @types/three vitest prettier husky

# UIコンポーネント
pnpx shadcn-ui@latest init
```

### 3. package.json scripts設定

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "pnpm generate:api && next build",
    "generate:api": "orval",
    "generate:watch": "orval --watch",
    "test": "vitest"
  }
}
```

### 4. 環境変数設定

```bash
# .env.local
PERPLEXITY_API_KEY=your_perplexity_api_key
OPENAI_API_KEY=your_openai_api_key
CLAUDE_API_KEY=your_claude_api_key
```

## OpenAPI駆動開発フロー

### 1. OpenAPI定義作成/更新

`src/shared/api/schemas/openapi.yaml` でAPIスキーマを定義

### 2. 型・クライアント生成

```bash
pnpm generate:api  # 手動実行
# または
pnpm generate:watch  # ファイル監視で自動実行
```

### 3. 生成されるファイル

- `src/shared/api/generated/models/` - 型定義
- `src/shared/api/generated/zod/` - Zodバリデーションスキーマ
- `src/shared/api/generated/api.ts` - HTTPクライアント

### 4. 使用例

```typescript
// 型定義の使用
import type {
  Research,
  CreateResearchRequest,
} from "@/shared/api/generated/models";

// Zodスキーマによるバリデーション
import { executeResearchBody } from "@/shared/api/generated/zod";

const validation = executeResearchBody.safeParse(requestBody);
if (!validation.success) {
  // バリデーションエラーの処理
}
```

## Orval設定例

現在の設定は`orval.config.ts`に定義されています：

```typescript
// orval.config.ts
export default {
  api: {
    input: "./src/shared/api/schemas/openapi.yaml",
    output: {
      target: "./src/shared/api/generated",
      mode: "split",
      client: "axios",
      schemas: "./src/shared/api/generated/models",
    },
    hooks: {
      afterAllFilesWrite: "prettier --write",
    },
  },
};
```

**設定の特徴:**

- **split mode**: ファイル分割により型とAPIクライアントを分離
- **axios client**: Next.js API Routesとの連携に最適化
- **自動フォーマット**: 生成後にPrettierで整形

## 開発コマンド

### 通常開発

```bash
pnpm dev  # Next.js開発サーバー起動
```

### API更新時

```bash
pnpm generate:api  # 型・クライアント手動生成
pnpm generate:watch  # ファイル監視で自動生成
```

### 本番ビルド

```bash
pnpm build  # API生成 + Next.jsビルド
```

## アーキテクチャ設計

### クリーンアーキテクチャの層構造

**Infrastructure層** (`src/shared/infrastructure/external/`)

- 外部システム（Perplexity API、AWS Bedrock）との通信
- データの永続化やネットワーク通信を担当
- ビジネスロジックを含まない純粋なI/O処理

**Domain層** (`src/shared/domain/research/`)

- ビジネスルールとドメインロジック
- 外部システムに依存しない純粋なビジネスルール
- エンティティの変換、計算、検証を実装

**Application層** (`src/shared/useCases/`)

- ユースケース（アプリケーションサービス）の実装
- Infrastructure層とDomain層を組み合わせてビジネスフローを制御
- 依存性注入によりInfrastructure実装を抽象化

### MVVM + フィーチャーベース設計

**View** (`src/features/*/components/`)

- React コンポーネント（プレゼンテーション層）
- UI状態のみを管理、ビジネスロジックは含まない

**ViewModel** (`**/useXxxViewModel.ts`)

- ViewとModelの仲介役
- UI用の状態変換とイベントハンドリング
- 現在の実装: `useResearchResultDisplayViewModel.ts`のみ

**Model** (`src/shared/useCases/`, `src/shared/stores/`)

- UseCase（ビジネスロジック）とZustand Store（状態管理）

### 設計方針

**UX最優先**

- **可視化パフォーマンス**: 60fps維持が最重要
- **直感的操作**: 説明不要で使える操作感
- **未来感の演出**: 既存ツールとの差別化を体験で示す

**開発手法**

- **OpenAPI駆動**: スキーマファーストな型安全開発
- **クリーンアーキテクチャ**: 依存性の方向を制御した疎結合設計
- **コロケーション**: 機能別にUIコンポーネントを集約
- **エンティティ共有**: フロント・API間でOrval生成型を共有

**POC設計の特徴**

- **シンプル実装**: 不要な抽象化を避けた実用的な構造
- **段階的実装**: MVVMパターンは必要な箇所のみ適用
- **実証重視**: アーキテクチャよりも動作する実装を優先

### 技術制約

- **音声認識**: Web Speech API制約を考慮
- **外部API**: Perplexity/AWS Bedrock APIの応答時間制約
- **ブラウザ対応**: Chrome/Edge中心（Web Speech API必須）
- **可視化**: Three.js による3D可視化（実装進行中）
