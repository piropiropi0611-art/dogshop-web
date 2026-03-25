"use client";

import { Icon, LatLngBounds } from "leaflet";
import Link from "next/link";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import type { Shop } from "@/types/shop";

type ShopsMapCanvasProps = {
  shops: Shop[];
  activeSlug: string | null;
};

const defaultMarkerIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const activeMarkerIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapViewport({ shops, activeSlug }: ShopsMapCanvasProps) {
  const map = useMap();

  useEffect(() => {
    const positioned = shops.filter(
      (shop) => typeof shop.lat === "number" && typeof shop.lng === "number",
    );

    if (positioned.length === 0) {
      return;
    }

    const activeShop = activeSlug
      ? positioned.find((shop) => shop.slug === activeSlug)
      : null;

    if (activeShop?.lat && activeShop.lng) {
      map.setView([activeShop.lat, activeShop.lng], 16, {
        animate: true,
      });
      return;
    }

    const bounds = new LatLngBounds(
      positioned.map((shop) => [shop.lat as number, shop.lng as number]),
    );

    map.fitBounds(bounds, {
      padding: [32, 32],
      maxZoom: 15,
    });
  }, [activeSlug, map, shops]);

  return null;
}

export default function ShopsMapCanvas({
  shops,
  activeSlug,
}: ShopsMapCanvasProps) {
  const positionedShops = shops.filter(
    (shop) => typeof shop.lat === "number" && typeof shop.lng === "number",
  );

  if (positionedShops.length === 0) {
    return (
      <div className="flex h-[520px] items-center justify-center rounded-[2rem] bg-zinc-100 text-sm text-zinc-500">
        地図に表示できる座標データがありません。
      </div>
    );
  }

  const first = positionedShops[0];

  return (
    <MapContainer
      center={[first.lat as number, first.lng as number]}
      zoom={14}
      scrollWheelZoom={false}
      className="h-[520px] w-full rounded-[2rem]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewport shops={positionedShops} activeSlug={activeSlug} />
      {positionedShops.map((shop) => (
        <Marker
          key={shop.id}
          position={[shop.lat as number, shop.lng as number]}
          icon={shop.slug === activeSlug ? activeMarkerIcon : defaultMarkerIcon}
        >
          <Popup>
            <div className="space-y-2">
              <p className="font-semibold text-zinc-900">{shop.name}</p>
              <p className="text-sm text-zinc-700">{shop.address}</p>
              <Link
                href={`/shops/${shop.slug}`}
                className="text-sm font-medium text-green-700 underline underline-offset-2"
              >
                詳細を見る
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
