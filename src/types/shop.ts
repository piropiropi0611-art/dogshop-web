export type DogAreaCategory =
  | "店内OK"
  | "テラス席のみ"
  | "外席のみ"
  | "その他";

export type DogAreaFilterGroup = "店内OK" | "テラス・外席" | "その他";
export type GeocodeStatus = "ok" | "fallback" | "missing";
export type VisitStatus = "ピロプー訪店済" | "未訪店";

export type Shop = {
  id: string;
  slug: string;
  isVisible?: boolean;
  name: string;
  prefecture: string;
  city: string;
  address: string;
  lat: number | null;
  lng: number | null;
  geocodeSource: string | null;
  geocodeStatus: GeocodeStatus;
  intro: string;
  keywordText: string;
  dogArea: string;
  dogAreaCategory: DogAreaCategory;
  dogAreaFilterGroup: DogAreaFilterGroup;
  hours: string;
  closedDays: string;
  parking: string;
  parkingSpaces: number | null;
  dogMenu: string;
  rules: string[];
  memo: string | null;
  googleMapsUrl: string | null;
  tabelogUrl: string | null;
  instagramUrl: string | null;
  visitStatus: VisitStatus;
  sourceCsvMemo: string | null;
};
