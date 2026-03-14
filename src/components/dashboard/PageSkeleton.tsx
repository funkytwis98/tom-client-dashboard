export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${count} gap-3 mb-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="h-3 w-16 bg-gray-200 animate-pulse rounded mb-2" />
          <div className="h-7 w-12 bg-gray-200 animate-pulse rounded" />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 flex gap-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-3 w-16 bg-gray-200 animate-pulse rounded" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-4 border-t border-gray-100 flex gap-8">
          {Array.from({ length: 5 }).map((_, j) => (
            <div key={j} className="h-4 w-20 bg-gray-100 animate-pulse rounded" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="h-5 w-32 bg-gray-200 animate-pulse rounded mb-2" />
          <div className="h-3 w-24 bg-gray-100 animate-pulse rounded mb-3" />
          <div className="h-4 w-20 bg-gray-100 animate-pulse rounded" />
        </div>
      ))}
    </div>
  )
}

export function ChatSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div className={`rounded-lg p-3 ${i % 2 === 0 ? 'bg-gray-100' : 'bg-blue-100'} max-w-[65%]`}>
            <div className="h-3 w-16 bg-gray-200 animate-pulse rounded mb-2" />
            <div className="h-4 w-40 bg-gray-200 animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-4 md:mb-6">
      <div className="h-7 w-40 bg-gray-200 animate-pulse rounded mb-2" />
      <div className="h-4 w-64 bg-gray-100 animate-pulse rounded" />
    </div>
  )
}
