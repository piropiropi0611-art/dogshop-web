import Link from "next/link";

import { ShopLinkIcons } from "@/components/shop-link-icons";
import type { Shop } from "@/types/shop";

type ShopCardProps = {
  shop: Shop;
  isActive?: boolean;
  onSelect?: (slug: string) => void;
};

export function ShopCard({ shop, isActive = false, onSelect }: ShopCardProps) {
  return (
    <article
      className={`flex h-full flex-col rounded-3xl border bg-white p-6 shadow-sm shadow-black/5 transition ${
        isActive
          ? "border-green-500 ring-2 ring-green-100"
          : "border-black/10 hover:border-green-200"
      }`}
      onMouseEnter={() => onSelect?.(shop.slug)}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
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

      <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
        {shop.name}
      </h2>
      <div className="mt-2 flex items-start justify-between gap-3">
        <p className="text-sm leading-6 text-zinc-600">{shop.address}</p>
        <ShopLinkIcons
          googleMapsUrl={shop.googleMapsUrl}
          tabelogUrl={shop.tabelogUrl}
          instagramUrl={shop.instagramUrl}
        />
      </div>

      <dl className="mt-5 space-y-2 text-sm text-zinc-700">
        <div>
          <dt className="font-medium text-zinc-900">営業時間</dt>
          <dd>{shop.hours}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-900">同伴エリア</dt>
          <dd>{shop.dogArea}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-900">駐車場</dt>
          <dd>
            {shop.parking}
            {shop.parkingSpaces && !shop.parking.includes(`${shop.parkingSpaces}台`)
              ? ` / ${shop.parkingSpaces}台`
              : ""}
          </dd>
        </div>
      </dl>

      <p className="mt-5 line-clamp-3 text-sm leading-6 text-zinc-600">
        {shop.intro}
      </p>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Link
          href={`/shops/${shop.slug}`}
          className="inline-flex items-center rounded-full bg-green-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800"
        >
          詳細を見る
        </Link>
      </div>
    </article>
  );
}
