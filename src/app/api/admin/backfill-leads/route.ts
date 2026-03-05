import { env } from '@/lib/utils/env'
import { createServiceClient } from '@/lib/supabase/service'
import { analyzeCallTranscript } from '@/lib/analysis/lead-extraction'

/**
 * POST /api/admin/backfill-leads
 * One-time admin endpoint to re-run lead extraction on calls that have
 * transcripts but no lead_score (i.e. extraction previously failed).
 *
 * Requires: Authorization: Bearer <REVALIDATE_SECRET>
 */
export async function POST(req: Request): Promise<Response> {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${env.revalidateSecret()}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Find calls with transcripts but no lead extraction
  const { data: calls, error } = await supabase
    .from('calls')
    .select('id, client_id, retell_call_id, transcript, caller_number')
    .is('lead_score', null)
    .not('transcript', 'is', null)
    .order('created_at', { ascending: true })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  if (!calls || calls.length === 0) {
    return Response.json({ message: 'No calls to backfill', processed: 0 })
  }

  const results: Array<{ call_id: string; status: string; lead_created: boolean }> = []

  for (const call of calls) {
    try {
      const analysis = await analyzeCallTranscript(call.transcript!)

      // Update call with analysis
      await supabase
        .from('calls')
        .update({
          sentiment: analysis.sentiment,
          lead_score: analysis.lead_score,
          summary: analysis.summary,
          caller_name: analysis.caller_name,
        })
        .eq('id', call.id)

      let leadCreated = false

      // Create lead if applicable
      if (analysis.is_lead) {
        const { error: leadError } = await supabase
          .from('leads')
          .insert({
            client_id: call.client_id,
            call_id: call.id,
            name: analysis.caller_name,
            phone: call.caller_number,
            service_interested: analysis.service_interested,
            notes: analysis.notes,
            urgency: analysis.urgency,
            status: 'new',
            owner_notified: false,
          })

        if (leadError) {
          console.error(`[backfill] Lead insert failed for call ${call.id}:`, leadError)
        } else {
          leadCreated = true
        }
      }

      results.push({ call_id: call.id, status: 'ok', lead_created: leadCreated })
    } catch (err) {
      console.error(`[backfill] Failed for call ${call.id}:`, err)
      results.push({ call_id: call.id, status: String(err), lead_created: false })
    }
  }

  return Response.json({
    message: `Processed ${calls.length} calls`,
    processed: calls.length,
    results,
  })
}
