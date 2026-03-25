"use client";

import { Icon, LatLngBounds } from "leaflet";
import Link from "next/link";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import type { Shop } from "@/types/shop";

type ShopsMapCanvasProps = {
  shops: Shop[];
  activeSlug: string | null;
  focusMode?: "active" | "bounds" | "detail";
  heightClassName?: string;
};

type MarkerGroup = {
  key: string;
  lat: number;
  lng: number;
  shops: Shop[];
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

function MapViewport({
  shops,
  activeSlug,
  focusMode = "active",
}: ShopsMapCanvasProps) {
  const map = useMap();

  useEffect(() => {
    const positioned = shops.filter(
      (shop) => typeof shop.lat === "number" && typeof shop.lng === "number",
    );

    if (positioned.length === 0) {
      return;
    }

    if (positioned.length === 1) {
      const onlyShop = positioned[0];
      map.setView([onlyShop.lat as number, onlyShop.lng as number], 16, {
        animate: true,
      });
      return;
    }

    const activeShop = activeSlug
      ? positioned.find((shop) => shop.slug === activeSlug)
      : null;

    if ((focusMode === "active" || focusMode === "detail") && activeShop?.lat && activeShop.lng) {
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
  }, [activeSlug, focusMode, map, shops]);

  return null;
}

export default function ShopsMapCanvas({
  shops,
  activeSlug,
  focusMode = "active",
  heightClassName = "h-[520px]",
}: ShopsMapCanvasProps) {
  const positionedShops = shops.filter(
    (shop) => typeof shop.lat === "number" && typeof shop.lng === "number",
  );
  const markerGroups = Array.from(
    positionedShops.reduce((groups, shop) => {
      const lat = shop.lat as number;
      const lng = shop.lng as number;
      const key = `${lat.toFixed(6)}:${lng.toFixed(6)}`;
      const current = groups.get(key);

      if (current) {
        current.shops.push(shop);
        return groups;
      }

      groups.set(key, {
        key,
        lat,
        lng,
        shops: [shop],
      });
      return groups;
    }, new Map<string, MarkerGroup>()),
  ).map(([, group]) => group);

  if (positionedShops.length === 0) {
    return (
      <div
        className={`flex ${heightClassName} items-center justify-center rounded-[2rem] bg-zinc-100 text-sm text-zinc-500`}
      >
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
      className={`${heightClassName} w-full rounded-[2rem]`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewport
        shops={positionedShops}
        activeSlug={activeSlug}
        focusMode={focusMode}
      />
      {markerGroups.map((group) => {
        const hasActiveShop = group.shops.some((shop) => shop.slug === activeSlug);

        return (
          <Marker
            key={group.key}
            position={[group.lat, group.lng]}
            icon={hasActiveShop ? activeMarkerIcon : defaultMarkerIcon}
          >
            <Popup>
              <div className="space-y-3">
                {group.shops.length > 1 ? (
                  <>
                    <p className="font-semibold text-zinc-900">
                      同じ位置の店舗 {group.shops.length}件
                    </p>
                    <div className="space-y-3">
                      {group.shops.map((shop) => (
                        <div
                          key={shop.slug}
                          className="space-y-1 border-b border-zinc-200 pb-3 last:border-b-0 last:pb-0"
                        >
                          <p className="font-medium text-zinc-900">{shop.name}</p>
                          <p className="text-sm text-zinc-700">{shop.address}</p>
                          <Link
                            href={`/shops/${shop.slug}`}
                            className="text-sm font-medium text-green-700 underline underline-offset-2"
                          >
                            詳細を見る
                          </Link>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <p className="font-semibold text-zinc-900">
                      {group.shops[0]?.name}
                    </p>
                    <p className="text-sm text-zinc-700">
                      {group.shops[0]?.address}
                    </p>
                    <Link
                      href={`/shops/${group.shops[0]?.slug}`}
                      className="text-sm font-medium text-green-700 underline underline-offset-2"
                    >
                      詳細を見る
                    </Link>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
