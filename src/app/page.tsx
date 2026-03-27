import Image from "next/image";

import { BackToTopButton } from "@/components/back-to-top-button";
import { ShopBrowser } from "@/components/shop-browser";
import { getAllShops } from "@/lib/shops";

export default function Home() {
  const shops = getAllShops();

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-zinc-900 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 sm:gap-10">
        <section className="rounded-[2rem] bg-gradient-to-br from-sky-900 via-sky-700 to-sky-500 px-5 py-8 text-white shadow-xl shadow-sky-900/20 sm:px-10 sm:py-10">
          <div className="flex flex-col items-center gap-5 text-center sm:items-start sm:text-left">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
              <div className="shrink-0">
                <div className="overflow-hidden rounded-full border-4 border-white/25 bg-white/10 shadow-lg shadow-green-950/20 ring-1 ring-white/20">
                  <Image
                    src="/images/piropoo-icon.png"
                    alt="ピロプーのお店めぐりのアイコン"
                    width={128}
                    height={128}
                    className="h-20 w-20 object-cover sm:h-24 sm:w-24 lg:h-28 lg:w-28"
                    priority
                  />
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/85">
                  Dining with Your Dog
                </p>
                <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:mt-2 sm:text-5xl">
                  ピロプーのお店めぐり
                </h1>
              </div>
            </div>

            <p className="max-w-3xl text-sm leading-7 text-white/90 sm:text-lg">
              条件で絞り込みながら、ワンコ同伴可能なお店を一覧と詳細ページで確認できます。
            </p>
          </div>
        </section>

        <ShopBrowser shops={shops} />
      </div>
      <BackToTopButton />
    </main>
  );
}
