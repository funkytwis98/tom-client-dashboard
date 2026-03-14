import { PageHeaderSkeleton, StatCardsSkeleton } from '@/components/dashboard/PageSkeleton'

export default function LearnLoading() {
  return (
    <div className="p-4 md:p-8">
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={3} />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-gray-200 p-4">
            <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded mb-2" />
            <div className="h-3 w-1/2 bg-gray-100 animate-pulse rounded mb-3" />
            <div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
