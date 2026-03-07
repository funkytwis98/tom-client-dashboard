export default function LeadsLoading() {
  return (
    <div className="p-4 md:p-8 animate-pulse">
      {/* Header */}
      <div className="mb-6">
        <div className="h-7 w-24 bg-gray-200 rounded" />
        <div className="h-4 w-44 bg-gray-200 rounded mt-2" />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-200 pb-2">
        <div className="h-8 w-16 bg-gray-200 rounded" />
        <div className="h-8 w-16 bg-gray-200 rounded" />
        <div className="h-8 w-24 bg-gray-200 rounded" />
        <div className="h-8 w-20 bg-gray-200 rounded" />
      </div>

      {/* Secondary filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-1">
          <div className="h-4 w-16 bg-gray-200 rounded" />
          <div className="h-8 w-20 bg-gray-200 rounded" />
          <div className="h-8 w-16 bg-gray-200 rounded" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="border-b bg-gray-50 px-4 py-3 flex gap-8">
          <div className="h-3 w-16 bg-gray-200 rounded" />
          <div className="h-3 w-16 bg-gray-200 rounded" />
          <div className="h-3 w-20 bg-gray-200 rounded" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-gray-100 flex gap-8">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-4 w-20 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
