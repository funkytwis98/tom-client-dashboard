import { getUserContext } from '@/lib/auth/get-user-profile'
import { CRMContactDetail } from '@/components/dashboard/CRMContactDetail'

export default async function CRMContactPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await getUserContext()

  if (!ctx?.clientId) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-sm text-gray-500">Unauthorized</p>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#fafafa', minHeight: '100vh' }}>
      <CRMContactDetail
        contactId={id}
        clientId={ctx.clientId}
        agentName={ctx.agentName ?? 'Your receptionist'}
        ownerName={ctx.ownerName ?? 'Owner'}
      />
    </div>
  )
}
