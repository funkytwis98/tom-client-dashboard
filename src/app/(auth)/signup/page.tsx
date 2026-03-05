import { Suspense } from 'react'
import SignupForm from './signup-form'

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}
