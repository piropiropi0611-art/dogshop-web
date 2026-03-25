"use client";

import dynamic from "next/dynamic";

type ShopMapProps = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

const LeafletMap = dynamic(() => import("@/components/shop-map-canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] items-center justify-center rounded-[2rem] bg-zinc-100 text-sm text-zinc-500">
      地図を読み込み中...
    </div>
  ),
});

export default function ShopMap({ name, address, lat, lng }: ShopMapProps) {
  return <LeafletMap name={name} address={address} lat={lat} lng={lng} />;
}
