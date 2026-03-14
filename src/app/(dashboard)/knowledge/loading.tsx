import { PageHeaderSkeleton, CardGridSkeleton } from '@/components/dashboard/PageSkeleton'

export default function KnowledgeLoading() {
  return (
    <div className="p-4 md:p-8">
      <PageHeaderSkeleton />
      <CardGridSkeleton count={3} />
    </div>
  )
}
