export default function Loading() {
  return (
    <div className="p-4 md:p-8 animate-pulse">
      <div className="h-7 w-32 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-64 bg-gray-100 rounded mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 md:p-5">
            <div className="h-4 w-24 bg-gray-100 rounded mb-2" />
            <div className="h-6 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-6 h-48" />
    </div>
  )
}
