# Dogshop Web

`dogshop-web` は、東京都府中市を中心としたワンコ同伴可能なお店を一覧・詳細・地図で閲覧できる Next.js アプリです。  
公開データは `src/data/shops.json` を基準とし、`datasets/<datasetId>/` 配下の入力から更新します。

## 概要

- 一覧ページ
- 店舗詳細ページ
- `都道府県` `市区町村` `キーワード` `同伴エリア` による検索
- OpenStreetMap + Leaflet による地図表示
- Googleマップ、公式サイト、食べログ、Instagram など外部リンク

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
  - dataset 固有設定
  - その dataset だけが持つ追加設定を書く
  - dataset 固有設定がなければファイル自体を置かなくても構いません
- `datasets/_shared.json`
  - dataset 共通設定
  - 複数 dataset で共通利用する取り込みルールを書く
- `datasets/<datasetId>/structured.csv`
  - 取り込み用の整形済み CSV
- `datasets/<datasetId>/preview.json`
  - 中間生成 JSON
  - 座標や geocode 状態は持たず、CSV 内容の確認用として使う

主なスクリプト:

- `scripts/build-import-preview.mjs`
  - `structured.csv` から `preview.json` を生成
- `scripts/merge-import-shops.mjs`
  - `preview.json` を `src/data/shops.json` に反映
  - 新規店追加時のみ geocode を行い、`shops.json` に座標を補完

例:

- `datasets/<datasetId>/dataset.json`
- `datasets/_shared.json`
- `datasets/<datasetId>/structured.csv`
- `datasets/<datasetId>/preview.json`

`dataset` 運用ルール:

- 1つの地域取り込み単位を `dataset` として扱います
- `structured.csv` は Web 取り込み前の整形済み入力です
- `datasets/<datasetId>/dataset.json` には、その地域固有の設定だけを書きます
- `datasets/_shared.json` には、地域によらず共通で使う取り込み設定を書きます
- 実行時は `datasets/_shared.json` を先に読み込み、その上に `datasets/<datasetId>/dataset.json` を重ねて使います
- `datasets/<datasetId>/dataset.json` が無い場合は空設定 `{}` として扱います
- `datasetId` は `dataset.json` ではなくディレクトリ名から決まります
- `publicSlug` の接頭辞もディレクトリ名から自動決定します
- `preview.json` の仮 `id` / 仮 `slug` の接頭辞は固定で `import` を使います
- `paths` は現在 `datasets/_shared.json` に集約しています
- 現在の主要なブーリアン列は `is_visited` / `is_hidden` です
- 新しい地域を追加するときは既存の `datasets/<datasetId>/` をコピーして使います
- 公開データの更新は `structured -> preview -> merge` の流れを前提にします
- `dogAreaCategories` / `dogAreaFilterGroups` は `structured.csv` の内容から毎回導出します
- そのため、既存店のカテゴリ修正は `shops.json` ではなく CSV 側を更新して反映します
- 既存店の座標と geocode 状態は `src/data/shops.json` を正本として扱います
- `preview.json` は座標確認用ではなく、CSV 由来の表示項目確認用です

## CSVロジック反映ルール

`structured.csv` の一部列は、そのまま表示するのではなくスクリプトで整形・導出してから使います。

- `address`
  - 先頭に郵便番号形式 (`〒NNN-NNNN` または `〒NNNNNNN`) があれば除去します
  - 検索条件に使用する `prefecture` / `city` を住所文字列から正規表現で抽出します
- `intro`
  - 文字列を整形したうえで、`。 ` は `。\n` に置換して改行を入れます
- `dog_area`
  - 空欄の場合は `同伴条件は店舗案内に準ずる` を入れます
- `dog_menu`
  - 空欄の場合は `なし` を入れます
- `rules`
  - `/` を区切り文字として複数ルールに分割します
  - 例: `カフェマット: 必須 / カート入店: OK`
  - 空要素は捨てます
  - `要確認` `未確認` `記載なし` `案内に準ずる` などの文言を含む要素はルールとして採用しません
  - ルールらしいキーワード (`カフェマット` `カート` `同伴` `禁煙` など) を含む要素だけ採用します
- `dogAreaCategories` / `dogAreaFilterGroups`
  - `dog_area` 単体ではなく、`dog_area + memo + rules + extra_memo` をまとめて判定します
  - `テラス` `サンルーム` `外席` `ベンチ` `店内OK` などの語を見てカテゴリを導出します
  - カテゴリが1つも判定できない場合は `その他` にします
- `parking`
  - 最初に見つかった `(\d+)台` を `parkingSpaces` として抽出します
  - 見つからなければ `null` です
- `is_visited`
  - 真偽値列として扱います
  - 判定ルール:

    | CSV値 | 既存店に同一 slug がある | 生成値 |
    | --- | --- | --- |
    | `true` / `1` / `yes` | 問わない | `true` |
    | `false` / `0` / `no` | 問わない | `false` |
    | 空欄または上記以外 | ある | 既存の `isVisited` 値を維持 |
    | 空欄または上記以外 | ない | `false` |

  - 画面表示では `true => ピロプー訪店済`, `false => 未訪店` に変換します
- `is_hidden`
  - 非表示フラグとして扱います
  - 判定ルール:

    | CSV値 | 既存店に同一 slug がある | 生成値 |
    | --- | --- | --- |
    | `true` / `1` / `yes` | 問わない | `true` |
    | `false` / `0` / `no` | 問わない | `false` |
    | 空欄または上記以外 | ある | 既存の `isHidden` 値を維持 |
    | 空欄または上記以外 | ない | `false` |

  - 意味は `true => 非表示`, `false => 表示` です
- `official_site_url` / `tabelog_url` / `instagram_url` / `google_maps_url`
  - URL列として扱い、空欄は `null` に正規化します
  - 各列とも CSV 値を優先してそのまま反映します

- 文字列整形 (`sanitizeText`)
  - 連続改行は1つの改行に畳みます
  - 連続スペース / タブは1つの半角スペースに畳みます
  - 前後の空白は除去します
更新フロー:

1. 特定 dataset の入力を整える

```bash
cd "/home/ubuntu/etc/dogshop/dogshop-web"
# datasets/<datasetId>/structured.csv
```

2. プレビュー JSON を生成する

```bash
cd "/home/ubuntu/etc/dogshop/dogshop-web"
npm run build:data:preview -- --dataset=<datasetId>
```

3. 生成結果を確認する

- `datasets/<datasetId>/preview.json`
- 座標は含まれないため、店名・住所・営業時間・紹介文・メモなどを確認
- `dogAreaCategories` / `dogAreaFilterGroups` もこの段階で CSV 由来の生成結果として確認
- 必要に応じて `structured.csv` を修正して再生成

4. 現行公開データへ反映する

```bash
cd "/home/ubuntu/etc/dogshop/dogshop-web"
npm run build:data:merge -- --dataset=<datasetId>
```

5. 反映後の公開データを確認する

- `src/data/shops.json`
- 新規店はこの段階で座標・`geocodeSource`・`geocodeStatus` が補完されます
- 必要に応じて `shops.json` の座標を手修正し、その値を正本として保持します
- 既存店の `dogAreaCategories` / `dogAreaFilterGroups` は `shops.json` を直接直さず、CSV を修正して再生成します

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

`src/data/shops.json` の各店舗には `isHidden` フラグを持たせられます。

- `true`: 一覧・詳細ページの両方で非表示
- `false` または未指定: Web に表示

例:

```json
{
  "slug": "<datasetId>-01",
  "isHidden": true
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
