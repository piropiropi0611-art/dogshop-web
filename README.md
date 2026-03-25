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
- `scripts/build-shops.mjs`
  - 元データから `shops.json` を生成するスクリプト

現在の生成スクリプトは、プロジェクトの1つ上の階層にある以下のファイルを参照します。

- `../favorite.csv`
- `../fuchu_20260325.txt`

## データ更新フロー

1. 親ディレクトリにある `favorite.csv` を更新する
2. 必要に応じて `fuchu_20260325.txt` を更新する
3. 以下を実行して公開用JSONを再生成する

```bash
cd "/home/ubuntu/etc/dogshop/dogshop-web"
npm run build:data
```

4. 生成された `src/data/shops.json` を確認する
5. `npm run lint && npm run build` で確認する
6. Vercel に再デプロイする

## 座標取得について

- 住所ベースのジオコーディングには国土地理院の検索APIを利用しています
- 住所解決できない場合のみ Google Maps URL をフォールバックとして使います

## デプロイ

Vercel へは `dogshop-web` ディレクトリをプロジェクトルートとしてデプロイします。
