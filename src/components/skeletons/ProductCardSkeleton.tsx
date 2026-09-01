// src/components/skeletons/ProductCardSkeleton.tsx — V2 port
export default function ProductCardSkeleton() {
  return (
    <div className="ticket-card">
      <div className="p-3">
        <div className="skeleton aspect-square rounded-2xl" />
      </div>
      <div className="p-5 pt-2 flex flex-col gap-2">
        <div className="skeleton h-3 w-16 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="skeleton h-5 w-20 rounded mt-2" />
      </div>
    </div>
  );
}
