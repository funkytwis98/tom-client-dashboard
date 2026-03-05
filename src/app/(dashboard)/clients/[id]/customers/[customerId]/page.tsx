import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getClient } from '@/app/actions/clients'
import { getCustomerWithHistory } from '@/app/actions/customers'
import { CustomerProfile } from '@/components/dashboard/CustomerProfile'

interface Props {
  params: Promise<{ id: string; customerId: string }>
}

export default async function CustomerDetailPage({ params }: Props) {
  const { id, customerId } = await params
  const [client, result] = await Promise.all([
    getClient(id),
    getCustomerWithHistory(customerId, id),
  ])

  if (!client || !result) notFound()

  return (
    <div className="p-8">
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/clients" className="hover:text-gray-900 transition-colors">Clients</Link>
        <span>/</span>
        <Link href={`/clients/${id}`} className="hover:text-gray-900 transition-colors">{client.name}</Link>
        <span>/</span>
        <Link href={`/clients/${id}/customers`} className="hover:text-gray-900 transition-colors">Customers</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{result.customer.name}</span>
      </nav>

      <CustomerProfile
        clientId={id}
        customer={result.customer}
        calls={result.calls}
        leads={result.leads}
      />
    </div>
  )
}
