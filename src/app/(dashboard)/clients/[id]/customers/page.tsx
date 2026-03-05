import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getClient } from '@/app/actions/clients'
import { getCustomersForClient } from '@/app/actions/customers'
import { CustomerList } from '@/components/dashboard/CustomerList'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CustomersPage({ params }: Props) {
  const { id } = await params
  const [client, customers] = await Promise.all([
    getClient(id),
    getCustomersForClient(id).catch(() => []),
  ])

  if (!client) notFound()

  return (
    <div className="p-8">
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/clients" className="hover:text-gray-900 transition-colors">
          Clients
        </Link>
        <span>/</span>
        <Link href={`/clients/${id}`} className="hover:text-gray-900 transition-colors">
          {client.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Customers</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">{client.name}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <CustomerList clientId={id} initialCustomers={customers} />
      </div>
    </div>
  )
}
