export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Command Center</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor your AI receptionist activity</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Calls Today</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">—</p>
          <p className="text-xs text-gray-400 mt-1">Real data in Plan 08</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Leads This Week</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">—</p>
          <p className="text-xs text-gray-400 mt-1">Real data in Plan 08</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Active Clients</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">—</p>
          <p className="text-xs text-gray-400 mt-1">Real data in Plan 08</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Avg Call Duration</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">—</p>
          <p className="text-xs text-gray-400 mt-1">Real data in Plan 08</p>
        </div>
      </div>

      {/* Recent calls */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Recent Calls</h2>
        </div>
        <div className="px-6 py-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
          <p className="mt-3 text-sm text-gray-500">No calls yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Calls will appear here once Retell AI is connected
          </p>
        </div>
      </div>
    </div>
  )
}
