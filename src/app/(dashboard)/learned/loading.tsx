export default function LearnedLoading() {
  return (
    <div className="p-4 md:p-8 bg-[#fafafa] min-h-screen">
      <div className="mb-6">
        <div className="h-7 w-32 bg-gray-200 animate-pulse rounded mb-2" />
        <div className="h-4 w-64 bg-gray-100 animate-pulse rounded" />
      </div>
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-32 bg-gray-200 animate-pulse rounded-full" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-[14px] border border-[#e5e7eb] p-6">
            <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded mb-3" />
            <div className="h-3 w-1/2 bg-gray-100 animate-pulse rounded mb-4" />
            <div className="h-9 w-40 bg-gray-200 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
