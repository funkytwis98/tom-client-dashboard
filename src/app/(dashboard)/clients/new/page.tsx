import Link from 'next/link'
import { OnboardingWizard } from '@/components/dashboard/OnboardingWizard'

export default function NewClientPage() {
  return (
    <div className="p-8">
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/clients" className="hover:text-gray-900 transition-colors">
          Clients
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Onboard New Client</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Onboard New Client</h1>
        <p className="text-sm text-gray-500 mt-1">
          Set up a new AI receptionist in 4 steps
        </p>
      </div>

      <div className="max-w-3xl">
        <OnboardingWizard />
      </div>
    </div>
  )
}
