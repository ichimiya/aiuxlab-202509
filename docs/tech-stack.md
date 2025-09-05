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
├── app/
│   ├── api/research/route.ts          # API Routes
│   └── (features)/research/page.tsx   # 機能別ルート
├── shared/                            # 共通層
│   ├── api/
│   │   ├── generated/                 # Orval自動生成
│   │   │   ├── models/               # 型定義
│   │   │   ├── client.ts             # HTTPクライアント
│   │   │   └── hooks.ts              # React Query hooks
│   │   ├── schemas/
│   │   │   └── openapi.yaml          # OpenAPI定義
│   │   └── orval.config.js           # Orval設定
│   ├── stores/                        # Zustand状態管理
│   └── lib/                          # 共通ユーティリティ
└── features/                          # 機能コロケーション
    └── research/
        ├── components/               # UIコンポーネント
        ├── hooks/                   # カスタムhooks
        └── services/                # ビジネスロジック
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
- `src/shared/api/generated/client.ts` - HTTPクライアント
- `src/shared/api/generated/hooks.ts` - React Queryフック

### 4. 使用例

```typescript
import { useGetResearchQuery } from "@/shared/api/generated/hooks";

const { data, isLoading } = useGetResearchQuery({
  id: researchId,
});
```

## Orval設定例

```javascript
// orval.config.js
module.exports = {
  api: {
    input: "./src/shared/api/schemas/openapi.yaml",
    output: {
      target: "./src/shared/api/generated",
      client: "react-query",
      mode: "split",
      schemas: "./src/shared/api/generated/models",
    },
  },
};
```

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

## 設計方針

### UX最優先

- **可視化パフォーマンス**: 60fps維持が最重要
- **直感的操作**: 説明不要で使える操作感
- **未来感の演出**: 既存ツールとの差別化を体験で示す

### 開発手法

- **OpenAPI駆動**: スキーマファーストな型安全開発
- **コロケーション**: 機能別にコードを集約
- **エンティティ共有**: フロント・API間でOrval生成型を共有

### 技術制約

- **音声認識**: Web Speech API制約を考慮
- **外部API**: Perplexity/OpenAI APIの応答時間制約
- **ブラウザ対応**: Chrome/Edge中心（Web Speech API必須）
