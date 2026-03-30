"use client";

import { useMemo, useState } from "react";

import { ShopCard } from "@/components/shop-card";
import { ShopsMap } from "@/components/shops-map";
import type { DogAreaFilterGroup, Shop } from "@/types/shop";

const IS_VISITED_OPTIONS = [
  { value: "true", label: "ピロプー訪店済" },
  { value: "false", label: "未訪店" },
] as const;

type ShopBrowserProps = {
  shops: Shop[];
};

export function ShopBrowser({ shops }: ShopBrowserProps) {
  const [prefecture, setPrefecture] = useState("");
  const [city, setCity] = useState("");
  const [keyword, setKeyword] = useState("");
  const [dogArea, setDogArea] = useState<DogAreaFilterGroup | "">("");
  const [isVisited, setIsVisited] = useState<"" | "true" | "false">("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    shops[0]?.slug ?? null,
  );

  const prefectures = useMemo(
    () => Array.from(new Set(shops.map((shop) => shop.prefecture))).sort(),
    [shops],
  );

  const cities = useMemo(() => {
    const filtered = prefecture
      ? shops.filter((shop) => shop.prefecture === prefecture)
      : shops;

    return Array.from(new Set(filtered.map((shop) => shop.city))).sort();
  }, [prefecture, shops]);

  const dogAreas = useMemo(
    () =>
      Array.from(
        new Set(shops.flatMap((shop) => shop.dogAreaFilterGroups)),
      ) as DogAreaFilterGroup[],
    [shops],
  );

  const filteredShops = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return shops.filter((shop) => {
      if (prefecture && shop.prefecture !== prefecture) {
        return false;
      }

      if (city && shop.city !== city) {
        return false;
      }

      if (dogArea && !shop.dogAreaFilterGroups.includes(dogArea)) {
        return false;
      }

      if (isVisited && String(shop.isVisited) !== isVisited) {
        return false;
      }

      if (
        normalizedKeyword &&
        !shop.keywordText.toLowerCase().includes(normalizedKeyword)
      ) {
        return false;
      }

      return true;
    });
  }, [city, dogArea, keyword, prefecture, shops, isVisited]);

  const activeSlug = filteredShops.some((shop) => shop.slug === selectedSlug)
    ? selectedSlug
    : (filteredShops[0]?.slug ?? null);

  return (
    <section className="space-y-8">
      <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-2 text-sm font-medium text-zinc-700">
            <span>都道府県</span>
            <select
              value={prefecture}
              onChange={(event) => {
                setPrefecture(event.target.value);
                setCity("");
              }}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-green-600"
            >
              <option value="">すべて</option>
              {prefectures.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-zinc-700">
            <span>市区町村</span>
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-green-600"
            >
              <option value="">すべて</option>
              {cities.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-zinc-700">
            <span>キーワード</span>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="店名・住所・特徴で検索"
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-green-600"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-zinc-700">
            <span>同伴エリア</span>
            <select
              value={dogArea}
              onChange={(event) =>
                setDogArea(event.target.value as DogAreaFilterGroup | "")
              }
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-green-600"
            >
              <option value="">すべて</option>
              {dogAreas.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-zinc-700">
            <span>訪店ステータス</span>
            <select
              value={isVisited}
              onChange={(event) => setIsVisited(event.target.value as "" | "true" | "false")}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-green-600"
            >
              <option value="">すべて</option>
              {IS_VISITED_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600">
          <p>
            {filteredShops.length}件 / 全{shops.length}件
          </p>
          <button
            type="button"
            onClick={() => {
              setPrefecture("");
              setCity("");
              setKeyword("");
              setDogArea("");
              setIsVisited("");
            }}
            className="rounded-full border border-zinc-200 px-4 py-2 font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            条件をリセット
          </button>
        </div>
      </div>

      {filteredShops.length > 0 ? (
        <div className="space-y-5">
          <div className="hidden overflow-hidden rounded-[2rem] border border-black/10 bg-white p-3 shadow-sm shadow-black/5 md:sticky md:top-4 md:z-20 md:block">
            <div className="mb-3 flex items-center justify-between gap-3 px-2 pt-2">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">地図</h3>
                <p className="text-sm text-zinc-600">
                  一覧を絞り込むと地図も同時に更新されます。
                </p>
              </div>
            </div>
            <ShopsMap
              shops={filteredShops}
              activeSlug={activeSlug}
              heightClassName="h-[220px] xl:h-[240px]"
            />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {filteredShops.map((shop) => (
              <ShopCard
                key={shop.id}
                shop={shop}
                isActive={shop.slug === activeSlug}
                onSelect={setSelectedSlug}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-600">
          条件に一致する店舗が見つかりませんでした。
        </div>
      )}
    </section>
  );
}
