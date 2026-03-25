import shopsData from "@/data/shops.json";
import type {
  DogAreaCategory,
  DogAreaFilterGroup,
  Shop,
  VisitStatus,
} from "@/types/shop";

const shops = shopsData as Shop[];

export function getAllShops(): Shop[] {
  return shops;
}

export function getShopBySlug(slug: string): Shop | undefined {
  return shops.find((shop) => shop.slug === slug);
}

export function getPrefectures(): string[] {
  return Array.from(new Set(shops.map((shop) => shop.prefecture))).sort();
}

export function getCities(): string[] {
  return Array.from(new Set(shops.map((shop) => shop.city))).sort();
}

export function getDogAreaCategories(): DogAreaCategory[] {
  return Array.from(
    new Set(shops.map((shop) => shop.dogAreaCategory)),
  ) as DogAreaCategory[];
}

export function getDogAreaFilterGroups(): DogAreaFilterGroup[] {
  return Array.from(
    new Set(shops.map((shop) => shop.dogAreaFilterGroup)),
  ) as DogAreaFilterGroup[];
}

export function getVisitStatuses(): VisitStatus[] {
  return Array.from(new Set(shops.map((shop) => shop.visitStatus))) as VisitStatus[];
}
