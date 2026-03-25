# Dogshop Web

`shops.json` を公開データとして利用し、`dataset` ごとの `structured.csv` / `research.csv` 入力から更新できる Next.js 製のWebアプリです。住所取得ツール、比較メモ、dataset 入力もこのディレクトリ配下にまとめて管理します。

## 機能

- 一覧ページ
- 店舗詳細ページ
- `都道府県` `市区町村` `キーワード` `同伴エリア` での検索
- OpenStreetMap + Leaflet による地図表示
- Googleマップ、食べログ、Instagram への外部リンク

## 確認用リンク

- ローカル既定: [http://localhost:3000](http://localhost:3000)
- ローカル確認用ポート例: [http://127.0.0.1:3001](http://127.0.0.1:3001)
- 本番: [https://dogshop-web.vercel.app](https://dogshop-web.vercel.app)

## 主要ディレクトリ

- `src/data/shops.json`
  - 公開用の正規化済み店舗データ
- `datasets/<datasetId>/`
  - dataset ごとの設定、構造化CSV、調査CSV、プレビューJSON
- `address_tools/`
  - Google Maps URL やブラウザ操作から住所を取得する補助ツール
- `input/`
  - 住所取得ツールや投稿作成の入力ファイル
- `etc/`
  - 比較メモや旧原稿などの作業用ドキュメント
- `scripts/`
  - dataset プレビュー生成と `shops.json` マージの共通スクリプト

## ローカル起動

```bash
cd "/home/ubuntu/etc/dogshop/dogshop-web"
npm install
npm run dev
```

必要に応じてポートを固定する場合:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3001
```

## 主要コマンド

```bash
npm run dev
npm run lint
npm run build
npm run build:data:preview -- --dataset=<datasetId>
npm run build:data:merge -- --dataset=<datasetId>
```

## データ取り込みパイプライン

`dataset` は地域ごとの取り込み単位です。公開済みだった旧18件も、現行 dataset の `structured/research` 入力に統合済みです。

- `datasets/<datasetId>/dataset.json`
  - dataset ごとの入出力パス、ID接頭辞、CSV列定義を管理する設定ファイル
- `datasets/<datasetId>/structured.csv`
  - Web取り込み前の整形済み入力CSV
- `datasets/<datasetId>/research.csv`
  - 調査・比較用の補助CSV
- `datasets/<datasetId>/preview.json`
  - 公開スキーマへ正規化した中間JSON
- `scripts/build-import-preview.mjs`
  - `structured.csv` と `research.csv` から `preview.json` を生成
- `scripts/merge-import-shops.mjs`
  - `preview.json` を現行 `src/data/shops.json` にマージ

例:

- `datasets/fuchu/dataset.json`
- `datasets/fuchu/structured.csv`
- `datasets/fuchu/research.csv`
- `datasets/fuchu/preview.json`

### dataset 運用ルール

- 1つの地域取り込み単位を `dataset` として扱います
- `structured.csv` は Web 取り込み前の整形済み入力、`research.csv` は調査・比較用の補助入力です
- CSVの列名は `datasets/<datasetId>/dataset.json` の `columns` に合わせて統一します
- 新しい地域を追加するときは、既存の `datasets/<datasetId>/` をコピーして使います
- 今後の更新はすべて `structured/research -> preview -> merge` の流れで行います

### データ更新フロー

1. 特定 dataset のプレビューJSONを生成する

```bash
cd "/home/ubuntu/etc/dogshop/dogshop-web"
npm run build:data:preview -- --dataset=<datasetId>
```

2. 生成したプレビューJSONを現行公開データへ反映する

```bash
cd "/home/ubuntu/etc/dogshop/dogshop-web"
npm run build:data:merge -- --dataset=<datasetId>
```

3. `src/data/shops.json` または `datasets/<datasetId>/preview.json` を確認する
4. `npm run lint && npm run build` で確認する
5. Vercel に再デプロイする

## 住所取得ツール

住所取得まわりのスクリプトと依存関係は `address_tools/` にまとめています。

- `address_tools/extract_address_from_maps_browser.mjs`
- `address_tools/extract_google_maps_info.py`
- `address_tools/add_address.py`

既定の入出力先:

- 入力: `input/favorite.csv`
- 出力: `input/web_places_input.csv`

`input/prompt_make_post` は投稿原稿作成時のプロンプト入力として利用できます。

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

## GitHub CLI メモ

この環境では `gh` が利用可能です。GitHub アカウントを `piropiropi0611-art` に切り替えるときは、以下を実行します。

```bash
gh auth switch --user piropiropi0611-art
```

## デプロイ

Vercel へは `dogshop-web` ディレクトリをプロジェクトルートとしてデプロイします。
