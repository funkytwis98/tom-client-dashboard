'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, Plus, X, Check } from 'lucide-react'
import {
  saveKnowledgeEntry,
  deleteKnowledgeEntry,
} from '@/app/actions/knowledge'
import type { KnowledgeEntry } from '@/types/domain'

const CATEGORIES = [
  'services', 'pricing', 'faq', 'hours', 'policies',
  'location', 'team', 'promotions', 'competitors',
] as const

type Category = (typeof CATEGORIES)[number]

interface Props {
  clientId: string
  clientName: string
  initialEntries: KnowledgeEntry[]
}

interface FormState {
  id?: string
  title: string
  content: string
  category: Category
  priority: number
  is_active: boolean
}

const EMPTY_FORM: FormState = {
  title: '',
  content: '',
  category: 'services',
  priority: 0,
  is_active: true,
}

export function SettingsKnowledgeBase({ clientId, clientName, initialEntries }: Props) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>(initialEntries)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Group entries by category
  const grouped = new Map<string, KnowledgeEntry[]>()
  for (const entry of entries) {
    if (!entry.is_active) continue
    const list = grouped.get(entry.category) ?? []
    list.push(entry)
    grouped.set(entry.category, list)
  }

  function openAdd() {
    setShowAddForm(true)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
  }

  function openEdit(entry: KnowledgeEntry) {
    setEditingId(entry.id)
    setShowAddForm(false)
    setForm({
      id: entry.id,
      title: entry.title,
      content: entry.content,
      category: entry.category,
      priority: entry.priority,
      is_active: entry.is_active,
    })
    setError(null)
  }

  function cancel() {
    setShowAddForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
  }

  function handleSave() {
    if (!form.title.trim() || !form.content.trim()) {
      setError('Title and content are required.')
      return
    }
    setError(null)

    startTransition(async () => {
      try {
        const result = await saveKnowledgeEntry({
          ...(form.id ? { id: form.id } : {}),
          client_id: clientId,
          category: form.category,
          title: form.title.trim(),
          content: form.content.trim(),
          priority: form.priority,
          is_active: form.is_active,
        })
        if (form.id) {
          setEntries((prev) => prev.map((e) => (e.id === form.id ? result.entry : e)))
        } else {
          setEntries((prev) => [result.entry, ...prev])
        }
        cancel()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed.')
      }
    })
  }

  function handleDelete(entry: KnowledgeEntry) {
    if (!confirm(`Delete "${entry.title}"?`)) return

    startTransition(async () => {
      try {
        await deleteKnowledgeEntry(entry.id, clientId)
        setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, is_active: false } : e)))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed.')
      }
    })
  }

  function handleToggleActive(entry: KnowledgeEntry) {
    startTransition(async () => {
      try {
        const result = await saveKnowledgeEntry({
          id: entry.id,
          client_id: clientId,
          category: entry.category,
          title: entry.title,
          content: entry.content,
          priority: entry.priority,
          is_active: !entry.is_active,
        })
        setEntries((prev) => prev.map((e) => (e.id === entry.id ? result.entry : e)))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Toggle failed.')
      }
    })
  }

  const activeCount = entries.filter((e) => e.is_active).length

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Knowledge Base</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {clientName} &mdash; {activeCount} active {activeCount === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        {!showAddForm && editingId === null && (
          <button
            onClick={openAdd}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Entry
          </button>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {/* Add/Edit form */}
      {(showAddForm || editingId !== null) && (
        <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-sm font-semibold text-indigo-800 mb-3">
            {editingId ? 'Edit Entry' : 'New Entry'}
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Content *</label>
              <textarea
                rows={4}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
              />
            </div>
            <div className="flex gap-3">
              <div className="w-24">
                <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.priority}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, priority: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {isPending ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={cancel}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Grouped entries */}
      {grouped.size === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          No knowledge base entries yet.
        </p>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {category}
              </h3>
              <div className="space-y-2">
                {items.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">{entry.title}</p>
                        <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-xs text-gray-500">
                          P{entry.priority}
                        </span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                            entry.is_active
                              ? 'bg-green-50 text-green-700'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {entry.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                        {entry.content.slice(0, 120)}
                        {entry.content.length > 120 ? '...' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggleActive(entry)}
                        disabled={isPending}
                        title={entry.is_active ? 'Deactivate' : 'Activate'}
                        className={`rounded px-2 py-1 text-xs font-medium disabled:opacity-50 ${
                          entry.is_active
                            ? 'text-yellow-700 hover:bg-yellow-50'
                            : 'text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {entry.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => openEdit(entry)}
                        title="Edit"
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry)}
                        title="Delete"
                        disabled={isPending}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
