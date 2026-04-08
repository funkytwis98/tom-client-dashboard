'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/dashboard/Toast'

interface SocialIdea {
  id: string
  client_id: string
  content: string
  status: string
  image_url: string | null
  created_at: string
}

function ideaStatusBadge(status: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    new: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'New' },
    used: { bg: 'bg-green-50', text: 'text-green-700', label: 'Used' },
    dismissed: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Dismissed' },
  }
  const s = map[status] ?? { bg: 'bg-gray-100', text: 'text-gray-500', label: status }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function MyIdeas({ clientId }: { clientId: string }) {
  const supabase = createClient()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [ideas, setIdeas] = useState<SocialIdea[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('social_ideas')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
      if (error) showToast('Failed to load ideas', 'error')
      setIdeas(data ?? [])
      setLoading(false)
    }
    load()
  }, [clientId])

  async function handleSubmit() {
    if (!content.trim()) return
    setSubmitting(true)

    let imageUrl: string | null = null

    // Upload image if selected
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${clientId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('social-idea-images')
        .upload(path, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        })

      if (uploadError) {
        showToast('Failed to upload image: ' + uploadError.message, 'error')
        setSubmitting(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('social-idea-images')
        .getPublicUrl(path)
      imageUrl = urlData.publicUrl
    }

    // Insert idea
    const { data, error } = await supabase
      .from('social_ideas')
      .insert({
        client_id: clientId,
        content: content.trim(),
        image_url: imageUrl,
        status: 'new',
      })
      .select()
      .single()

    if (error) {
      showToast('Failed to submit idea: ' + error.message, 'error')
    } else {
      setIdeas((prev) => [data, ...prev])
      setContent('')
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      showToast('Idea submitted!', 'success')
    }
    setSubmitting(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB', 'error')
      return
    }
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowed.includes(file.type)) {
      showToast('Only JPG, PNG, GIF, or WebP images are allowed', 'error')
      return
    }
    setSelectedFile(file)
  }

  return (
    <div className="space-y-6">
      {/* Input area */}
      <div className="bg-white rounded-[14px] border border-[#e5e7eb] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Got an idea? A promotion, event, or something you want posted — drop it here."
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
        />

        {/* File preview */}
        {selectedFile && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
            <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
            <span className="text-xs text-gray-600 truncate flex-1">{selectedFile.name}</span>
            <button
              onClick={() => {
                setSelectedFile(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
            </svg>
            Attach image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
            className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit idea'}
          </button>
        </div>
      </div>

      {/* Ideas list */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm text-gray-500">Loading ideas...</p>
        </div>
      ) : ideas.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">No ideas yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Drop your first idea above and your social media manager will turn it into polished content.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea) => (
            <div
              key={idea.id}
              className="bg-white rounded-[14px] border border-[#e5e7eb] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {ideaStatusBadge(idea.status)}
                    <span className="text-xs text-gray-400">{formatDate(idea.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{idea.content}</p>
                </div>
                {idea.image_url && (
                  <button
                    onClick={() => setExpandedImage(idea.image_url)}
                    className="flex-shrink-0"
                  >
                    <img
                      src={idea.image_url}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover border border-gray-100 hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expanded image modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <img src={expandedImage} alt="" className="w-full rounded-xl" />
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md text-gray-600 hover:text-gray-900"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
