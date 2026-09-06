// src/components/skeletons/ProductPageSkeleton.tsx — V2 port
export default function ProductPageSkeleton() {
  return (
    <div className="max-w-350 mx-auto px-4 sm:px-6 pt-8 pb-16 animate-fade-in">
      <div className="skeleton h-3 w-40 rounded mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)_320px] gap-8 xl:gap-10">
        <div className="flex gap-3">
          <div className="hidden sm:flex flex-col gap-2.5 w-16 shrink-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton w-16 h-16 rounded-xl" />
            ))}
          </div>
          <div className="flex-1 skeleton aspect-square rounded-3xl" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="skeleton h-3 w-20 rounded" />
          <div className="skeleton h-7 w-4/5 rounded" />
          <div className="skeleton h-4 w-32 rounded" />
          <div className="skeleton h-9 w-full rounded-full mt-2" />
          <div className="skeleton h-20 w-full rounded-2xl mt-2" />
        </div>
        <div className="skeleton h-96 rounded-3xl" />
      </div>
    </div>
  );
}
