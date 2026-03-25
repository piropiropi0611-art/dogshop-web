"use client";

import dynamic from "next/dynamic";

import type { Shop } from "@/types/shop";

type ShopsMapProps = {
  shops: Shop[];
  activeSlug: string | null;
  focusMode?: "active" | "bounds" | "detail";
  heightClassName?: string;
};

const LeafletMap = dynamic(() => import("@/components/shops-map-canvas"), {
  ssr: false,
  loading: () => null,
});

export function ShopsMap({
  shops,
  activeSlug,
  focusMode = "active",
  heightClassName = "h-[520px]",
}: ShopsMapProps) {
  return (
    <LeafletMap
      shops={shops}
      activeSlug={activeSlug}
      focusMode={focusMode}
      heightClassName={heightClassName}
    />
  );
}
