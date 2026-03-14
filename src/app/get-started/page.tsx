'use client'

import { useState } from 'react'

export default function GetStartedPage() {
  const [formData, setFormData] = useState({
    business_name: '',
    owner_name: '',
    owner_phone: '',
    owner_email: '',
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    try {
      const res = await fetch('/api/signup-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Something went wrong')
      }

      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-gold-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">You&apos;re All Set!</h2>
          <p className="text-gray-400 text-lg">
            Thanks! We&apos;ll be in touch within 24 hours to set up Tom for your business.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Get <span className="text-gold-500">Tom</span> for Your Business
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Tom is your AI-powered receptionist that answers calls 24/7, captures leads, and keeps
            you updated via text — so you never miss a customer again. Plus, Tom can manage your
            social media presence to drive even more business your way.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="business_name" className="block text-sm font-medium text-gray-300 mb-1.5">
              Business Name <span className="text-gold-500">*</span>
            </label>
            <input
              type="text"
              id="business_name"
              name="business_name"
              required
              value={formData.business_name}
              onChange={handleChange}
              placeholder="e.g. Interstate Tires"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="owner_name" className="block text-sm font-medium text-gray-300 mb-1.5">
              Your Name <span className="text-gold-500">*</span>
            </label>
            <input
              type="text"
              id="owner_name"
              name="owner_name"
              required
              value={formData.owner_name}
              onChange={handleChange}
              placeholder="e.g. John Smith"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="owner_phone" className="block text-sm font-medium text-gray-300 mb-1.5">
              Phone Number <span className="text-gold-500">*</span>
            </label>
            <input
              type="tel"
              id="owner_phone"
              name="owner_phone"
              required
              value={formData.owner_phone}
              onChange={handleChange}
              placeholder="e.g. (423) 555-0123"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="owner_email" className="block text-sm font-medium text-gray-300 mb-1.5">
              Email <span className="text-gray-500">(optional)</span>
            </label>
            <input
              type="email"
              id="owner_email"
              name="owner_email"
              value={formData.owner_email}
              onChange={handleChange}
              placeholder="e.g. john@interstatetires.com"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none transition-colors"
            />
          </div>

          {status === 'error' && (
            <p className="text-red-400 text-sm">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full rounded-lg bg-gold-500 px-4 py-3 text-base font-semibold text-gray-900 hover:bg-gold-400 focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'submitting' ? 'Submitting...' : 'Get Started'}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-8">
          By submitting, you agree to be contacted about Tom Agency services.
        </p>
      </div>
    </main>
  )
}
