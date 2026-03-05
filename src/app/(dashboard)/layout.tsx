import { getUserContext } from '@/lib/auth/get-user-profile'
import Sidebar from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await getUserContext()

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        role={ctx?.role ?? 'admin'}
        clientId={ctx?.clientId ?? null}
        userEmail={ctx?.email ?? 'Admin'}
        displayName={ctx?.profile?.display_name ?? null}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
