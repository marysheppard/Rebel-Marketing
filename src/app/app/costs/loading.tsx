export default function CostsLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="skeleton h-9 w-64" />
        <div className="skeleton h-4 w-full max-w-xl" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="skeleton mb-3 h-3 w-24" />
            <div className="skeleton h-8 w-28" />
            <div className="skeleton mt-2 h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="mb-4 skeleton h-4 w-40" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-12 w-full" />
        </div>
      </div>

      <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
