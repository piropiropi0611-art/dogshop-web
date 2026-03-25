# Dogshop Web

`shops.json` を公開データとして利用し、`dataset` ごとの `structured.csv` / `research.csv` 入力から更新できる Next.js 製のWebアプリです。

## 機能

- 一覧ページ
- 店舗詳細ページ
- `都道府県` `市区町村` `キーワード` `同伴エリア` での検索
- OpenStreetMap + Leaflet による地図表示
- Googleマップへの外部リンク

## 主要コマンド

```bash
npm run dev
npm run lint
npm run build
npm run build:data:preview -- --dataset=<datasetId>
npm run build:data:merge -- --dataset=<datasetId>
```

## ローカル起動

```bash
cd "/home/ubuntu/etc/dogshop/dogshop-web"
npm install
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開くと確認できます。

## 確認用リンク

- ローカル: [http://localhost:3000](http://localhost:3000)
- 本番: [https://dogshop-web.vercel.app](https://dogshop-web.vercel.app)

## データ構成

- `src/data/shops.json`
  - 公開用の正規化済みデータ
- `../datasets/<datasetId>/preview.json`
  - 各 dataset の取り込み候補を、公開用 `shops.json` と同じスキーマへ正規化したプレビューJSON
- `scripts/build-import-preview.mjs`
  - dataset 設定を読み、`structured.csv` と `research.csv` からプレビューJSONを生成する共通スクリプト
- `scripts/merge-import-shops.mjs`
  - プレビューJSONを現行 `shops.json` にマージする共通スクリプト
- `../datasets/<datasetId>/dataset.json`
  - dataset ごとの入出力パス、ID接頭辞、CSV列定義を管理する設定ファイル
- `../datasets/<datasetId>/structured.csv`
  - Web取り込み前の整形済み入力CSV
- `../datasets/<datasetId>/research.csv`
  - 調査・比較用の補助CSV

現行の dataset は、各ディレクトリ配下で `dataset.json` / `structured.csv` / `research.csv` をまとめて管理します。

例:

- `../datasets/fuchu/dataset.json`
- `../datasets/fuchu/structured.csv`
- `../datasets/fuchu/research.csv`
- `../datasets/fuchu/preview.json`

## dataset 運用ルール

- 1つの地域取り込み単位を `dataset` として扱います
- `structured.csv` は Web 取り込み前の整形済み入力、`research.csv` は調査・比較用の補助入力です
- CSVの列名は `datasets/<datasetId>/dataset.json` の `columns` に合わせて統一します
- 新しい地域を追加するときは、既存の `datasets/<datasetId>/` をコピーして使います
- 今後の更新はすべて `structured/research -> preview -> merge` の流れで行います

## データ更新フロー

1. 特定 dataset のプレビューJSONを生成する場合は以下を実行する

```bash
cd "/home/ubuntu/etc/dogshop/dogshop-web"
npm run build:data:preview -- --dataset=<datasetId>
```

2. 生成したプレビューJSONを現行公開データへ反映する場合は以下を実行する

```bash
cd "/home/ubuntu/etc/dogshop/dogshop-web"
npm run build:data:merge -- --dataset=<datasetId>
```

3. `src/data/shops.json` または `../datasets/<datasetId>/preview.json` を確認する
4. `npm run lint && npm run build` で確認する
5. Vercel に再デプロイする

## 表示制御フラグ

`src/data/shops.json` の各店舗に `isVisible` フラグを持たせられます。

- `true` または未指定: Webに表示
- `false`: 一覧・詳細ページの両方で非表示

例:

```json
{
  "slug": "fuchu-01",
  "isVisible": false
}
```

## 座標取得について

- 住所ベースのジオコーディングには国土地理院の検索APIを利用しています
- 住所解決できない場合のみ Google Maps URL をフォールバックとして使います

## デプロイ

Vercel へは `dogshop-web` ディレクトリをプロジェクトルートとしてデプロイします。
