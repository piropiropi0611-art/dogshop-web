"use client";

import { ShopsMap } from "@/components/shops-map";
import type { Shop } from "@/types/shop";

type ShopMapProps = {
  shops: Shop[];
  activeSlug: string;
};

export default function ShopMap({ shops, activeSlug }: ShopMapProps) {
  return (
    <ShopsMap
      shops={shops}
      activeSlug={activeSlug}
      focusMode="detail"
      heightClassName="h-[360px]"
    />
  );
}
