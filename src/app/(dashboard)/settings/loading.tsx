export default function SettingsLoading() {
  return (
    <div className="p-4 md:p-8 animate-pulse">
      {/* Header */}
      <div className="mb-6">
        <div className="h-7 w-28 bg-gray-200 rounded" />
        <div className="h-4 w-56 bg-gray-200 rounded mt-2" />
      </div>

      <div className="max-w-2xl space-y-8">
        {/* Form section 1 */}
        <div className="bg-white rounded-lg border p-6">
          <div className="h-5 w-24 bg-gray-200 rounded mb-4" />
          <div className="space-y-4">
            <div>
              <div className="h-4 w-20 bg-gray-200 rounded" />
              <div className="h-10 w-full bg-gray-200 rounded mt-1" />
            </div>
            <div>
              <div className="h-4 w-16 bg-gray-200 rounded" />
              <div className="h-10 w-full bg-gray-200 rounded mt-1" />
            </div>
          </div>
        </div>

        {/* Form section 2 */}
        <div className="bg-white rounded-lg border p-6">
          <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3">
              <div>
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="h-3 w-40 bg-gray-200 rounded mt-1" />
              </div>
              <div className="h-6 w-24 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <div className="h-4 w-20 bg-gray-200 rounded" />
                <div className="h-3 w-36 bg-gray-200 rounded mt-1" />
              </div>
              <div className="h-6 w-24 bg-gray-200 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
