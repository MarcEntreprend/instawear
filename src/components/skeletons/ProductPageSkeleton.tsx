// src/components/skeletons/ProductPageSkeleton.tsx — même langage que
// ProductCardSkeleton (blocs .skeleton, gabarits = PDP réelle, pas de CLS).
export default function ProductPageSkeleton() {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto animate-fade-in"
      style={{ background: "var(--color-bg)" }}
      aria-busy="true"
      aria-label="Loading product"
    >
      <div className="max-w-350 mx-auto px-4 sm:px-6 py-6">
        <div className="skeleton h-5 w-24 rounded mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)_320px] gap-8 xl:gap-10">
          <div className="flex gap-3">
            <div className="hidden sm:flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton w-16 h-16 rounded-xl" />
              ))}
            </div>
            <div className="skeleton aspect-square rounded-2xl flex-1" />
          </div>
          <div className="flex flex-col gap-3">
            <div className="skeleton h-7 w-3/4 rounded" />
            <div className="skeleton h-4 w-1/3 rounded" />
            <div className="skeleton h-6 w-24 rounded mt-2" />
            <div className="skeleton h-11 w-full rounded-xl mt-2" />
            <div className="skeleton h-11 w-full rounded-xl" />
            <div className="skeleton h-24 w-full rounded-2xl mt-2" />
          </div>
          <div className="hidden lg:block">
            <div className="card-premium p-5 flex flex-col gap-3">
              <div className="skeleton h-6 w-1/2 rounded" />
              <div className="skeleton h-11 w-full rounded-xl" />
              <div className="skeleton h-11 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
