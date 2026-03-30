export type DogAreaCategory =
  | "店内OK"
  | "テラス席OK"
  | "外席OK"
  | "その他";

export type DogAreaFilterGroup = "店内OK" | "テラス・外席" | "その他";
export type GeocodeStatus = "ok" | "fallback" | "missing";

export type Shop = {
  id: string;
  slug: string;
  isHidden?: boolean;
  isVisited: boolean;
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
  dogAreaCategories: DogAreaCategory[];
  dogAreaFilterGroups: DogAreaFilterGroup[];
  dogAreaCategory?: DogAreaCategory;
  dogAreaFilterGroup?: DogAreaFilterGroup;
  hours: string;
  closedDays: string;
  parking: string;
  parkingSpaces: number | null;
  dogMenu: string;
  rules: string[];
  memo: string | null;
  googleMapsUrl: string | null;
  officialSiteUrl: string | null;
  tabelogUrl: string | null;
  instagramUrl: string | null;
  sourceCsvMemo: string | null;
};
