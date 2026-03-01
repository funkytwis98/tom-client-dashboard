'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, Plus, X, Check } from 'lucide-react'
import {
  saveKnowledgeEntry,
  deleteKnowledgeEntry,
} from '@/app/actions/knowledge'
import type { KnowledgeEntry } from '@/types/domain'

type Category = KnowledgeEntry['category']

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'services', label: 'Services' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'faq', label: 'FAQ' },
  { key: 'hours', label: 'Hours' },
  { key: 'policies', label: 'Policies' },
  { key: 'location', label: 'Location' },
  { key: 'team', label: 'Team' },
  { key: 'promotions', label: 'Promotions' },
  { key: 'competitors', label: 'Competitors' },
]

interface EntryFormState {
  title: string
  content: string
  priority: number
}

const EMPTY_FORM: EntryFormState = { title: '', content: '', priority: 0 }

interface KnowledgeEditorProps {
  clientId: string
  initialEntries: KnowledgeEntry[]
}

export function KnowledgeEditor({ clientId, initialEntries }: KnowledgeEditorProps) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>(initialEntries)
  const [activeCategory, setActiveCategory] = useState<Category>('services')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState<EntryFormState>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const categoryEntries = entries.filter(
    (e) => e.category === activeCategory && e.is_active
  )

  // Active entries across all categories for token budget
  const activeEntries = entries.filter((e) => e.is_active)
  const totalChars = activeEntries.reduce((sum, e) => sum + e.content.length, 0)
  const estimatedTokens = Math.round(totalChars / 4)

  function charCountColor(len: number) {
    if (len < 1000) return 'bg-green-100 text-green-700'
    if (len <= 3000) return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }

  function openEdit(entry: KnowledgeEntry) {
    setEditingId(entry.id)
    setForm({ title: entry.title, content: entry.content, priority: entry.priority })
    setShowAddForm(false)
    setError(null)
  }

  function openAdd() {
    setShowAddForm(true)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
  }

  function cancelForm() {
    setShowAddForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
  }

  function handleSave() {
    if (!form.title.trim()) {
      setError('Title is required.')
      return
    }
    if (!form.content.trim()) {
      setError('Content is required.')
      return
    }
    setError(null)

    startTransition(async () => {
      try {
        const result = await saveKnowledgeEntry({
          ...(editingId ? { id: editingId } : {}),
          client_id: clientId,
          category: activeCategory,
          title: form.title.trim(),
          content: form.content.trim(),
          priority: form.priority,
          is_active: true,
        })
        if (editingId) {
          setEntries((prev) =>
            prev.map((e) => (e.id === editingId ? result.entry : e))
          )
        } else {
          setEntries((prev) => [result.entry, ...prev])
        }
        cancelForm()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed.')
      }
    })
  }

  function handleDelete(entry: KnowledgeEntry) {
    if (!confirm(`Delete "${entry.title}"? This cannot be undone.`)) return

    startTransition(async () => {
      try {
        await deleteKnowledgeEntry(entry.id, clientId)
        // Optimistic: hide entry immediately
        setEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, is_active: false } : e))
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed.')
      }
    })
  }

  return (
    <div>
      {/* Token budget panel */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Knowledge base:{' '}
          <span
            className={`font-semibold ${
              estimatedTokens > 5000 ? 'text-red-600' : 'text-gray-900'
            }`}
          >
            ~{estimatedTokens.toLocaleString()} tokens estimated
          </span>
        </span>
        <span className="text-xs text-gray-400">
          Recommended: keep under 5,000 tokens for best AI performance
        </span>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 mb-4 border-b border-gray-200 pb-2">
        {CATEGORIES.map(({ key, label }) => {
          const count = entries.filter(
            (e) => e.category === key && e.is_active
          ).length
          return (
            <button
              key={key}
              onClick={() => {
                setActiveCategory(key)
                cancelForm()
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
              {count > 0 && (
                <span
                  className={`ml-1.5 text-xs font-bold ${
                    activeCategory === key ? 'text-indigo-200' : 'text-gray-400'
                  }`}
                >
                  ({count})
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Add Entry button */}
      {!showAddForm && editingId === null && (
        <button
          onClick={openAdd}
          disabled={isPending}
          className="mb-4 flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </button>
      )}

      {/* Inline add form */}
      {showAddForm && (
        <EntryForm
          form={form}
          setForm={setForm}
          onSave={handleSave}
          onCancel={cancelForm}
          error={error}
          isPending={isPending}
          isEdit={false}
        />
      )}

      {/* Entry list */}
      {categoryEntries.length === 0 && !showAddForm ? (
        <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center">
          <p className="text-sm text-gray-400">
            No entries in{' '}
            <span className="font-semibold capitalize">{activeCategory}</span> yet.
          </p>
          <button
            onClick={openAdd}
            className="mt-3 text-sm text-indigo-600 hover:underline"
          >
            Add the first entry
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {categoryEntries.map((entry) => (
            <div key={entry.id}>
              {editingId === entry.id ? (
                <EntryForm
                  form={form}
                  setForm={setForm}
                  onSave={handleSave}
                  onCancel={cancelForm}
                  error={error}
                  isPending={isPending}
                  isEdit
                />
              ) : (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">
                          {entry.title}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${charCountColor(
                            entry.content.length
                          )}`}
                        >
                          {entry.content.length} chars
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          Priority {entry.priority}
                        </span>
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-600 font-medium">
                          Active
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-gray-500 line-clamp-2">
                        {entry.content.slice(0, 100)}
                        {entry.content.length > 100 ? '...' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(entry)}
                        title="Edit"
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry)}
                        title="Delete"
                        disabled={isPending}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface EntryFormProps {
  form: EntryFormState
  setForm: React.Dispatch<React.SetStateAction<EntryFormState>>
  onSave: () => void
  onCancel: () => void
  error: string | null
  isPending: boolean
  isEdit: boolean
}

function EntryForm({ form, setForm, onSave, onCancel, error, isPending, isEdit }: EntryFormProps) {
  const charLen = form.content.length

  function charColor() {
    if (charLen < 1000) return 'text-green-600'
    if (charLen <= 3000) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
      <p className="text-sm font-semibold text-indigo-800 mb-3">
        {isEdit ? 'Edit Entry' : 'New Entry'}
      </p>

      {error && (
        <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g., Tire Installation Services"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-gray-700">
              Content <span className="text-red-500">*</span>
            </label>
            <span className={`text-xs font-medium ${charColor()}`}>
              {charLen} chars
            </span>
          </div>
          <textarea
            rows={8}
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="Detailed information the AI will use when answering calls..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
          />
        </div>

        <div className="w-32">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Priority (0–100)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={form.priority}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                priority: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)),
              }))
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onSave}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {isPending ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      </div>
    </div>
  )
}
