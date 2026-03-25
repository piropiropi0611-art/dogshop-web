type ShopLinkIconsProps = {
  googleMapsUrl?: string | null;
  tabelogUrl?: string | null;
  instagramUrl?: string | null;
  className?: string;
};

function iconClassName(colorClass: string) {
  return `inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-sm transition hover:-translate-y-0.5 hover:shadow-sm ${colorClass}`;
}

export function ShopLinkIcons({
  googleMapsUrl,
  tabelogUrl,
  instagramUrl,
  className = "",
}: ShopLinkIconsProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      {googleMapsUrl ? (
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Googleマップを開く"
          title="Googleマップを開く"
          className={iconClassName("text-green-700")}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
            <path d="M12 2a7 7 0 0 0-7 7c0 5.12 5.54 11.42 6.17 12.11a1.1 1.1 0 0 0 1.66 0C13.46 20.42 19 14.12 19 9a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5Z" />
          </svg>
        </a>
      ) : null}

      {tabelogUrl ? (
        <a
          href={tabelogUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="食べログを開く"
          title="食べログを開く"
          className={iconClassName("text-orange-700")}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-current" aria-hidden="true">
            <path
              d="M7 3v8M10 3v8M7 7h3M15 3v18M15 3c2.3 0 4 1.9 4 4.2S17.3 11.5 15 11.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </a>
      ) : null}

      {instagramUrl ? (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Instagramを開く"
          title="Instagramを開く"
          className={iconClassName("text-pink-600")}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-current" aria-hidden="true">
            <rect
              x="3.25"
              y="3.25"
              width="17.5"
              height="17.5"
              rx="5"
              fill="none"
              strokeWidth="1.8"
            />
            <circle cx="12" cy="12" r="4" fill="none" strokeWidth="1.8" />
            <circle cx="17.4" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
          </svg>
        </a>
      ) : null}
    </div>
  );
}
