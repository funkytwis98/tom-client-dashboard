import Link from 'next/link'

export default function SiteNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-6">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Site Not Found</h2>
        <p className="text-gray-500 mb-8">
          This business site doesn&apos;t exist or hasn&apos;t been published yet.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
