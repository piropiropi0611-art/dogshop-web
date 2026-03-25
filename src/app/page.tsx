import { BackToTopButton } from "@/components/back-to-top-button";
import { ShopBrowser } from "@/components/shop-browser";
import { getAllShops } from "@/lib/shops";

export default function Home() {
  const shops = getAllShops();

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-zinc-900 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 sm:gap-10">
        <section className="rounded-[2rem] bg-gradient-to-br from-green-900 via-green-800 to-emerald-700 px-5 py-8 text-white shadow-xl shadow-green-950/10 sm:px-10 sm:py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-100">
            Dining with Your Dog
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:mt-4 sm:text-5xl">
            🐑ピロプーのお店めぐり🐑
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-green-50/90 sm:mt-4 sm:text-lg">
            条件で絞り込みながら、ワンコ同伴可能なお店を一覧と詳細ページで確認できます。
          </p>
        </section>

        <ShopBrowser shops={shops} />
      </div>
      <BackToTopButton />
    </main>
  );
}
