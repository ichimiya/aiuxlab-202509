# Neon Network 3D — Design Artboard

このドキュメントは、`web/network3d.html` で表示する3Dネットワークグラフのデザイン仕様（アートボード）です。実装とUI/UX、配色、パラメータ、インタラクションを一枚で把握できるようにまとめています。

## Overview
- コンセプト: ネオン調のシアン×マゼンタを基調とした3Dネットワーク。アディティブ合成で発光感を表現。
- レイアウト: 中心付近で緩やかに回転する多層シェル構造のノード群。視界奥行に応じてフォグで減衰。
- 技術: WebGPU + Rust(wgpu)/WASM。エッジ/ノードはビルボード板ポリをインスタンシング描画。

## Canvas & Background
- キャンバス: `#gfx` — 全画面（`100vw x 100vh`）。
- 背景色: `#0D0D15`（暗いネイビー/パープル系）。
- パネル: 左上固定、半透明ネオン枠（Cyan系の外枠グロー）。

## Color Palette
- Primary Cyan: `#00FFFF`（Palette::Cyan）
- Primary Magenta: `#FF00FF`（Palette::Magenta）
- Accent Sky: `#00BFFF`（Palette::Sky）
- Text: `#E0E0E0`
- Muted: `#A0A0A0`
- Panel BG: `#1A1A2A`

## Visual Mapping
- Edge（線）
  - Mesh: Cyan
  - Extra: Magenta
  - 太さ: スクリーンスペース（NDC）で固定厚、横方向ガウス減衰＋フロー縞。
  - ブレンド: Additive（発光感）。
- Node（点）
  - Hub（`i % 23 == 0`）: Magenta
  - Normal: Cyan
  - 形状: 円盤ビルボード。中心は強い発光、外周へソフトグロー。
  - サイズ: NDCスケール。ランダムなフェーズで微スパーク。
- Fog（霧）
  - NDC z を [0,1] に正規化し、開始〜終了を `smoothstep` で減衰。
  - 強度は加算光に対して乗算で抑制。

## Default Parameters
- Edge Thickness: 0.006
- Node Size: 0.08
- Flow Speed: 1.0
- Rotate Speed: 0.04（デフォルト。UI初期値も同値）
- Fog Start: 0.55
- Fog End: 0.95
- Fog Strength: 0.8（デフォルト。UI初期値も同値）

対応コード
- Rust 定数: `src/lib.rs`
  - `DEFAULT_GRAPH_EDGE_THICKNESS = 0.006`
  - `DEFAULT_GRAPH_NODE_SIZE = 0.08`
  - `DEFAULT_GRAPH_FLOW_SPEED = 1.0`
  - `DEFAULT_GRAPH_ROT_SPEED = 0.04`
  - `DEFAULT_GRAPH_FOG_START = 0.55`
  - `DEFAULT_GRAPH_FOG_END = 0.95`
  - `DEFAULT_GRAPH_FOG_STRENGTH = 0.8`
- UI 初期値: `web/network3d.html`
  - `id="rs"` value="0.04"
  - `id="fgi"` value="0.8"

## UI Controls (左上パネル)
- Edge Thickness (`th`): 0.001–0.02 / step 0.001
- Node Size (`ns`): 0.03–0.20 / step 0.005
- Flow Speed (`fs`): 0.2–3.0 / step 0.05
- Rotate Speed (`rs`): -1.0–1.0 / step 0.02（初期 0.04）
- Fog Start (`fgs`): 0.0–1.0 / step 0.01（初期 0.55）
- Fog End (`fge`): 0.0–1.0 / step 0.01（初期 0.95）
- Fog Strength (`fgi`): 0.0–2.0 / step 0.05（初期 0.8）

## Interaction
- 常時回転（`rot_speed`）＋アニメーション（フロー縞/スパーク）。
- リサイズ: `ResizeObserver` でキャンバス再設定、`resize_graph` へ伝達。
- 将来拡張: `devicePixelRatio` 対応で高DPI最適化、シード/ノード数再生成UI。

## Rendering Pipeline
- インスタンシング: Quad頂点（4）× Edge/Nodeインスタンス。
- 頂点→フラグメント: いずれも NDC 空間で処理、深度テストあり（書き込み off）。
- ブレンド: すべて Additive。
- シェーダ: `src/graph_shader.wgsl`
  - `vs_edge`/`fs_edge`: 厚み付与・フロー・フォグ減衰
  - `vs_node`/`fs_node`: ビルボード・コア/グロー・スパーク・フォグ

## Data Generation
- 配置: `src/graph3d.rs` — 多層シェル（Fibonacci分布）
- エッジ: 近傍 k-NN + 隣接レイヤ接続 + ハブ増線 + ランダム長距離
- 種: 決定論的 LCG（seed: 1337）

## File Map
- Web: `web/network3d.html`（UI/ブートストラップ）
- WASMエントリ: `src/lib.rs`（`start_graph`, `frame_graph`, `resize_graph`, setters）
- レイアウト: `src/graph3d.rs`
- シェーダ: `src/graph_shader.wgsl`
- テスト: `tests/graph_theme_tests.rs`, `tests/graph_defaults_tests.rs`, `tests/ui_defaults_tests.rs`

## Notes
- 現状 `EdgeKind3::Extra` は未生成のため、エッジは主に Cyan で表示（生成に応じて Magenta が混在）。
- 深度書き込みは off（Additive の重ね順で雰囲気維持）。ノードでの隠蔽表現が必要なら別途検討。

---
更新履歴
- 2025-09-09: 初版作成（シアン⇄マゼンタ割当、既定回転0.04/フォグ0.8を反映）

