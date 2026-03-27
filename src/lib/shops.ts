import shopsData from "@/data/shops.json";
import type {
  DogAreaCategory,
  DogAreaFilterGroup,
  Shop,
  VisitStatus,
} from "@/types/shop";

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function canonicalizeDogAreaCategory(
  category: DogAreaCategory | "テラス席のみ" | "外席のみ" | undefined,
): DogAreaCategory | undefined {
  if (category === "テラス席のみ") {
    return "テラス席OK";
  }

  if (category === "外席のみ") {
    return "外席OK";
  }

  return category;
}

function normalizeShop(shop: Shop): Shop {
  const dogAreaCategories: DogAreaCategory[] =
    shop.dogAreaCategories?.length > 0
      ? shop.dogAreaCategories
          .map((category) => canonicalizeDogAreaCategory(category))
          .filter((category): category is DogAreaCategory => Boolean(category))
      : shop.dogAreaCategory
        ? [canonicalizeDogAreaCategory(shop.dogAreaCategory)].filter(
            (category): category is DogAreaCategory => Boolean(category),
          )
        : ["その他"];
  const derivedDogAreaFilterGroups: DogAreaFilterGroup[] = [];

  if (dogAreaCategories.includes("店内OK")) {
    derivedDogAreaFilterGroups.push("店内OK");
  }

  if (
    dogAreaCategories.some(
      (category) => category === "テラス席OK" || category === "外席OK",
    )
  ) {
    derivedDogAreaFilterGroups.push("テラス・外席");
  }

  if (dogAreaCategories.includes("その他")) {
    derivedDogAreaFilterGroups.push("その他");
  }

  const dogAreaFilterGroups: DogAreaFilterGroup[] =
    shop.dogAreaFilterGroups?.length > 0
      ? shop.dogAreaFilterGroups
      : shop.dogAreaFilterGroup
        ? [shop.dogAreaFilterGroup]
        : derivedDogAreaFilterGroups;

  return {
    ...shop,
    isVisible: shop.isVisible !== false,
    dogAreaCategories: unique(dogAreaCategories),
    dogAreaFilterGroups: unique(dogAreaFilterGroups),
  };
}

const shops = (shopsData as Shop[]).map(normalizeShop);
const visibleShops = shops.filter((shop) => shop.isVisible);

export function getAllShops(): Shop[] {
  return visibleShops;
}

export function getShopBySlug(slug: string): Shop | undefined {
  return visibleShops.find((shop) => shop.slug === slug);
}

export function getPrefectures(): string[] {
  return Array.from(new Set(shops.map((shop) => shop.prefecture))).sort();
}

export function getCities(): string[] {
  return Array.from(new Set(shops.map((shop) => shop.city))).sort();
}

export function getDogAreaCategories(): DogAreaCategory[] {
  return Array.from(
    new Set(shops.flatMap((shop) => shop.dogAreaCategories)),
  ) as DogAreaCategory[];
}

export function getDogAreaFilterGroups(): DogAreaFilterGroup[] {
  return Array.from(
    new Set(shops.flatMap((shop) => shop.dogAreaFilterGroups)),
  ) as DogAreaFilterGroup[];
}

export function getVisitStatuses(): VisitStatus[] {
  return Array.from(new Set(shops.map((shop) => shop.visitStatus))) as VisitStatus[];
}
