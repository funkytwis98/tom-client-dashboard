export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-8 animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="h-7 w-48 bg-gray-200 rounded" />
        <div className="h-4 w-64 bg-gray-200 rounded mt-2" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-white p-6">
            <div className="h-4 w-20 bg-gray-200 rounded" />
            <div className="h-7 w-16 bg-gray-200 rounded mt-2" />
          </div>
        ))}
      </div>

      {/* Recent calls skeleton */}
      <div className="bg-white rounded-lg border p-6">
        <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex-1 space-y-1">
                <div className="h-4 w-40 bg-gray-200 rounded" />
                <div className="h-3 w-64 bg-gray-200 rounded" />
              </div>
              <div className="h-4 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
