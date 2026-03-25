# 府中ワンコ同伴店ガイド

`favorite.csv` と `fuchu_20260325.txt` を元に、府中市のワンコ同伴可能なお店を検索できる Next.js 製のWebアプリです。

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
npm run build:data
npm run build:data:fuchu-preview
npm run build:data:fuchu-merge
```

## ローカル起動

```bash
cd "/home/ubuntu/etc/dogshop/dogshop-web"
npm install
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開くと確認できます。

## データ構成

- `src/data/shops.json`
  - 公開用の正規化済みデータ
- `src/data/fuchu-import-preview.json`
  - `fuchu_posts_final_structured.csv` と `fuchu_posts_research.csv` から生成する、閉店店舗を除外した府中拡張取り込み用プレビューJSON
- `scripts/build-shops.mjs`
  - 元データから `shops.json` を生成するスクリプト
- `scripts/build-fuchu-import-preview.mjs`
  - `fuchu_posts_final_structured.csv` と `fuchu_posts_research.csv` から Web 取り込み前の下準備JSONを生成するスクリプト
- `scripts/merge-fuchu-shops.mjs`
  - `fuchu-import-preview.json` を現行 `shops.json` と統合し、公開済み18件を優先しながら府中拡張版の `shops.json` を生成するスクリプト

現在の生成スクリプトは、プロジェクトの1つ上の階層にある以下のファイルを参照します。

- `../favorite.csv`
- `../fuchu_20260325.txt`
- `../fuchu_posts_final_structured.csv`
- `../fuchu_posts_research.csv`

## データ更新フロー

1. 親ディレクトリにある `favorite.csv` を更新する
2. 必要に応じて `fuchu_20260325.txt` を更新する
3. 既存18件の公開データを再生成する場合は以下を実行する

```bash
cd "/home/ubuntu/etc/dogshop/dogshop-web"
npm run build:data
```

4. 今回作成した府中拡張データの取り込み下準備を更新する場合は以下を実行する

```bash
cd "/home/ubuntu/etc/dogshop/dogshop-web"
npm run build:data:fuchu-preview
```

5. 下準備JSONを現行公開データへ反映する場合は以下を実行する

```bash
cd "/home/ubuntu/etc/dogshop/dogshop-web"
npm run build:data:fuchu-merge
```

6. `src/data/shops.json` または `src/data/fuchu-import-preview.json` を確認する
7. `npm run lint && npm run build` で確認する
8. Vercel に再デプロイする

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
