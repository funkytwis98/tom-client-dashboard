import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClient } from '@/app/actions/clients'
import { CallDetail } from '@/components/dashboard/CallDetail'
import type { Call, Lead } from '@/types/domain'

interface CallDetailPageProps {
  params: Promise<{ id: string; callId: string }>
}

export default async function CallDetailPage({ params }: CallDetailPageProps) {
  const { id, callId } = await params

  const supabase = await createClient()

  const [clientResult, callResult] = await Promise.all([
    getClient(id),
    supabase
      .from('calls')
      .select('*')
      .eq('id', callId)
      .eq('client_id', id)
      .single(),
  ])

  if (!clientResult || callResult.error || !callResult.data) {
    notFound()
  }

  const call = callResult.data as Call

  // Fetch associated lead if one exists
  const { data: leadData } = await supabase
    .from('leads')
    .select('*')
    .eq('call_id', callId)
    .maybeSingle()

  const lead = leadData as Lead | null

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/clients" className="hover:text-gray-900 transition-colors">
          Clients
        </Link>
        <span>/</span>
        <Link href={`/clients/${id}/calls`} className="hover:text-gray-900 transition-colors">
          {clientResult.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Call Detail</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Call Detail</h1>
        <Link
          href={`/clients/${id}/calls`}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Calls
        </Link>
      </div>

      <CallDetail call={call} lead={lead ?? undefined} />
    </div>
  )
}
