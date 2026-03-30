# Dogshop Web

`dogshop-web` は、東京都府中市を中心としたワンコ同伴可能なお店を一覧・詳細・地図で閲覧できる Next.js アプリです。  
公開データは `src/data/shops.json` を基準とし、`datasets/<datasetId>/` 配下の入力から更新します。

## 概要

- 一覧ページ
- 店舗詳細ページ
- `都道府県` `市区町村` `キーワード` `同伴エリア` による検索
- OpenStreetMap + Leaflet による地図表示
- Googleマップ、食べログ、Instagram など外部リンク

本番公開先:

- [https://dogshop-web.vercel.app](https://dogshop-web.vercel.app)

## 技術スタック

- `Next.js 16.2.1`
- `React 19`
- `Leaflet`
- `react-leaflet`
- `TypeScript`

## ローカル起動

```bash
cd "/home/ubuntu/etc/dogshop/dogshop-web"
npm install
npm run dev
```

既定の確認先:

- [http://localhost:3000](http://localhost:3000)

ポートを固定したい場合:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3001
```

補足:

- 開発中は `npm run dev` を使います
- `npm run start` は `npm run build` の成果物確認用です

## 主要ディレクトリ

- `src/app/`
  - App Router のページ・画面実装
- `src/data/shops.json`
  - 公開用の正規化済み店舗データ
- `datasets/<datasetId>/`
  - 取り込み用データと設定
- `scripts/`
  - データ生成・統合スクリプト
- `address_tools/`
  - 住所取得や補助整形のツール
- `input/`
  - 元データや補助入力
- `public/`
  - 画像などの静的アセット

## 主要コマンド

```bash
npm run dev
npm run lint
npm run build
npm run build:data:preview -- --dataset=<datasetId>
npm run build:data:merge -- --dataset=<datasetId>
npm run vercel:pull:prod
npm run vercel:build:prod
npm run vercel:deploy:prod:direct
```

## データ運用

公開データ更新は `datasets/<datasetId>/` を単位として行います。

主なファイル:

- `datasets/<datasetId>/dataset.json`
  - dataset 設定
- `datasets/<datasetId>/structured.csv`
  - 取り込み用の整形済み CSV
- `datasets/<datasetId>/research.csv`
  - 調査用 CSV
- `datasets/<datasetId>/preview.json`
  - 中間生成 JSON

主なスクリプト:

- `scripts/build-import-preview.mjs`
  - `structured.csv` と `research.csv` から `preview.json` を生成
- `scripts/merge-import-shops.mjs`
  - `preview.json` を `src/data/shops.json` に反映

例:

- `datasets/fuchu/dataset.json`
- `datasets/fuchu/structured.csv`
- `datasets/fuchu/research.csv`
- `datasets/fuchu/preview.json`

`dataset` 運用ルール:

- 1つの地域取り込み単位を `dataset` として扱います
- `structured.csv` は Web 取り込み前の整形済み入力です
- `research.csv` は調査・比較用の補助入力です
- CSV の列名は `datasets/<datasetId>/dataset.json` の `columns` に合わせます
- 新しい地域を追加するときは既存の `datasets/<datasetId>/` をコピーして使います
- 公開データの更新は `structured -> research -> preview -> merge` の流れを前提にします

更新フロー:

1. 特定 dataset の入力を整える

```bash
cd "/home/ubuntu/etc/dogshop/dogshop-web"
# datasets/<datasetId>/structured.csv
# datasets/<datasetId>/research.csv
```

2. プレビュー JSON を生成する

```bash
cd "/home/ubuntu/etc/dogshop/dogshop-web"
npm run build:data:preview -- --dataset=<datasetId>
```

3. 生成結果を確認する

- `datasets/<datasetId>/preview.json`
- 必要に応じて `structured.csv` / `research.csv` を修正して再生成

4. 現行公開データへ反映する

```bash
cd "/home/ubuntu/etc/dogshop/dogshop-web"
npm run build:data:merge -- --dataset=<datasetId>
```

5. 反映後の公開データを確認する

- `src/data/shops.json`

6. アプリ全体として検証する

```bash
cd "/home/ubuntu/etc/dogshop/dogshop-web"
npm run lint
npm run build
```

7. 必要に応じて本番へ反映する

- 通常は `git push origin HEAD`
- 非常時は `npm run vercel:deploy:prod:direct`

## 表示制御

`src/data/shops.json` の各店舗には `isVisible` フラグを持たせられます。

- `true` または未指定: Web に表示
- `false`: 一覧・詳細ページの両方で非表示

例:

```json
{
  "slug": "fuchu-01",
  "isVisible": false
}
```

## 住所取得ツール

住所取得関連の補助スクリプトは `address_tools/` にまとめています。

主なファイル:

- `address_tools/add_address.py`
- `address_tools/extract_google_maps_info.py`
- `address_tools/extract_address_from_maps_browser.mjs`

既定入出力:

- 入力: `input/favorite.csv`
- 出力: `input/web_places_input.csv`

補足:

- 住所ベースのジオコーディングには国土地理院 API を利用
- 補完が必要な場合は Google Maps URL を使う

## デプロイ

通常の本番デプロイは、GitHub に push して Vercel 連携デプロイを発火させます。

通常運用:

```bash
git push origin HEAD
```

非常用の直デプロイ:

GitHub 連携でのデプロイが使えない場合は、このリポジトリから直接 Vercel CLI で本番反映できます。

```bash
npm run vercel:pull:prod
npm run vercel:build:prod
npm run vercel:deploy:prod:direct
```

補足:

- `.vercel/project.json` の `projectId` / `orgId` を自動利用します
- `.vercelignore` で `.next` と `node_modules` をアップロード対象から外しています
