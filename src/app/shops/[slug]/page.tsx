import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ShopLinkIcons } from "@/components/shop-link-icons";
import ShopMap from "@/components/shop-map";
import { getAllShops, getShopBySlug } from "@/lib/shops";

type ShopPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  return getAllShops().map((shop) => ({
    slug: shop.slug,
  }));
}

export async function generateMetadata({
  params,
}: ShopPageProps): Promise<Metadata> {
  const { slug } = await params;
  const shop = getShopBySlug(slug);

  if (!shop) {
    return {};
  }

  return {
    title: `${shop.name} | 府中ワンコ同伴店ガイド`,
    description: `${shop.city}の${shop.name}の営業時間、同伴エリア、地図を確認できます。`,
  };
}

export default async function ShopPage({ params }: ShopPageProps) {
  const { slug } = await params;
  const shops = getAllShops();
  const shop = getShopBySlug(slug);

  if (!shop) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-10 text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            一覧へ戻る
          </Link>
        </div>

        <section className="rounded-[2rem] bg-white p-8 shadow-sm shadow-black/5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
              {shop.prefecture}
            </span>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
              {shop.city}
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              {shop.dogAreaCategory}
            </span>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              {shop.visitStatus}
            </span>
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            {shop.name}
          </h1>
          <p className="mt-4 whitespace-pre-line text-base leading-8 text-zinc-700">
            {shop.intro}
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] bg-white p-8 shadow-sm shadow-black/5">
            <h2 className="text-xl font-semibold text-zinc-900">
              店舗インフォメーション
            </h2>
            <dl className="mt-6 space-y-4 text-sm leading-7 text-zinc-700">
              <div>
                <dt className="font-semibold text-zinc-900">住所</dt>
                <dd className="flex flex-wrap items-start justify-between gap-3">
                  <p>{shop.address}</p>
                  <ShopLinkIcons
                    googleMapsUrl={shop.googleMapsUrl}
                    tabelogUrl={shop.tabelogUrl}
                    instagramUrl={shop.instagramUrl}
                  />
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-zinc-900">営業時間</dt>
                <dd>{shop.hours}</dd>
              </div>
              <div>
                <dt className="font-semibold text-zinc-900">定休日</dt>
                <dd>{shop.closedDays}</dd>
              </div>
              <div>
                <dt className="font-semibold text-zinc-900">駐車場</dt>
                <dd>
                  {shop.parking}
                  {shop.parkingSpaces &&
                  !shop.parking.includes(`${shop.parkingSpaces}台`)
                    ? ` / ${shop.parkingSpaces}台`
                    : ""}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-[2rem] bg-white p-8 shadow-sm shadow-black/5">
            <h2 className="text-xl font-semibold text-zinc-900">
              ワンコ同伴ルール
            </h2>
            <dl className="mt-6 space-y-4 text-sm leading-7 text-zinc-700">
              <div>
                <dt className="font-semibold text-zinc-900">同伴エリア</dt>
                <dd>{shop.dogArea}</dd>
              </div>
              <div>
                <dt className="font-semibold text-zinc-900">訪店ステータス</dt>
                <dd>{shop.visitStatus}</dd>
              </div>
              <div>
                <dt className="font-semibold text-zinc-900">ワンコメニュー</dt>
                <dd>{shop.dogMenu}</dd>
              </div>
              {shop.rules.length > 0 ? (
                <div>
                  <dt className="font-semibold text-zinc-900">補足ルール</dt>
                  <dd className="space-y-1">
                    {shop.rules.map((rule) => (
                      <p key={rule}>{rule}</p>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </section>

        {shop.memo ? (
          <section className="rounded-[2rem] bg-white p-8 shadow-sm shadow-black/5">
            <h2 className="text-xl font-semibold text-zinc-900">メモ</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-zinc-700">
              {shop.memo}
            </p>
          </section>
        ) : null}

        <section className="rounded-[2rem] bg-white p-8 shadow-sm shadow-black/5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">地図</h2>
              <p className="mt-1 text-sm text-zinc-600">
                OpenStreetMap + Leaflet で対象店舗と他店舗の位置関係を確認できます。
              </p>
            </div>
          </div>

          {shop.lat && shop.lng ? (
            <ShopMap shops={shops} activeSlug={shop.slug} />
          ) : (
            <div className="flex h-[360px] items-center justify-center rounded-[2rem] bg-zinc-100 text-sm text-zinc-500">
              座標情報がまだありません。
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
