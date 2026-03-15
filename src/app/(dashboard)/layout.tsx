import { getUserContext } from '@/lib/auth/get-user-profile'
import Sidebar from '@/components/dashboard/Sidebar'
import { ToastProvider } from '@/components/dashboard/Toast'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await getUserContext()

  return (
    <ToastProvider>
      <div className="flex h-screen bg-[#fafafa]">
        <Sidebar
          clientName={ctx?.clientName ?? null}
          userEmail={ctx?.email ?? 'Admin'}
          displayName={ctx?.profile?.display_name ?? null}
          ownerName={ctx?.ownerName ?? null}
          productsEnabled={ctx?.productsEnabled ?? []}
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
            {children}
          </main>
          <footer className="border-t border-gray-200 bg-white px-4 py-3 text-center">
            <p className="text-xs text-gray-400">
              Powered by{' '}
              <span className="font-medium text-gray-600">Tom Agency</span>
            </p>
          </footer>
        </div>
      </div>
    </ToastProvider>
  )
}
