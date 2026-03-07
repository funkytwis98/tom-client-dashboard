export default function BillingLoading() {
  return (
    <div className="p-4 md:p-8 animate-pulse">
      {/* Header */}
      <div className="mb-6">
        <div className="h-7 w-24 bg-gray-200 rounded" />
        <div className="h-4 w-56 bg-gray-200 rounded mt-2" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border rounded-lg p-5">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-6 w-20 bg-gray-200 rounded mt-2" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="border-b bg-gray-50 px-6 py-3 flex gap-8">
          <div className="h-3 w-20 bg-gray-200 rounded" />
          <div className="h-3 w-16 bg-gray-200 rounded" />
          <div className="h-3 w-16 bg-gray-200 rounded" />
          <div className="h-3 w-28 bg-gray-200 rounded" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="px-6 py-4 border-b border-gray-100 flex gap-8">
            <div className="h-4 w-28 bg-gray-200 rounded" />
            <div className="h-4 w-20 bg-gray-200 rounded" />
            <div className="h-4 w-16 bg-gray-200 rounded" />
            <div className="h-4 w-36 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
