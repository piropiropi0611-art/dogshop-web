"use client";

import dynamic from "next/dynamic";

import type { Shop } from "@/types/shop";

type ShopsMapProps = {
  shops: Shop[];
  activeSlug: string | null;
};

const LeafletMap = dynamic(() => import("@/components/shops-map-canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[520px] items-center justify-center rounded-[2rem] bg-zinc-100 text-sm text-zinc-500">
      地図を読み込み中...
    </div>
  ),
});

export function ShopsMap({ shops, activeSlug }: ShopsMapProps) {
  return <LeafletMap shops={shops} activeSlug={activeSlug} />;
}
