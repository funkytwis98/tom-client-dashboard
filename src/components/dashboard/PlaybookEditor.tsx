'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, Plus, X, Check } from 'lucide-react'
import { savePlaybookEntry, deletePlaybookEntry } from '@/app/actions/playbooks'
import type { SalesPlaybook, PlaybookCategory } from '@/types/domain'

const CATEGORIES: { key: PlaybookCategory; label: string; description: string }[] = [
  { key: 'objection_handling', label: 'Objection Handling', description: 'How to respond when a caller pushes back on price, timing, or need' },
  { key: 'upsell_trigger', label: 'Upsell Triggers', description: 'When a caller mentions X, suggest Y as an add-on' },
  { key: 'urgency_script', label: 'Urgency Scripts', description: 'Create a sense of urgency to book now' },
  { key: 'closing_technique', label: 'Closing Techniques', description: 'Scripts for getting the appointment or commitment' },
]

interface FormState {
  title: string
  trigger_phrase: string
  response_script: string
  priority: number
}

const EMPTY_FORM: FormState = { title: '', trigger_phrase: '', response_script: '', priority: 0 }

interface Props {
  clientId: string
  initialEntries: SalesPlaybook[]
}

export function PlaybookEditor({ clientId, initialEntries }: Props) {
  const [entries, setEntries] = useState<SalesPlaybook[]>(initialEntries)
  const [activeCategory, setActiveCategory] = useState<PlaybookCategory>('objection_handling')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const categoryEntries = entries.filter(
    (e) => e.category === activeCategory && e.is_active
  )

  const activeCategoryMeta = CATEGORIES.find((c) => c.key === activeCategory)

  function openEdit(entry: SalesPlaybook) {
    setEditingId(entry.id)
    setForm({
      title: entry.title,
      trigger_phrase: entry.trigger_phrase ?? '',
      response_script: entry.response_script,
      priority: entry.priority,
    })
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
    if (!form.response_script.trim()) {
      setError('Response script is required.')
      return
    }
    setError(null)

    startTransition(async () => {
      const result = await savePlaybookEntry({
        ...(editingId ? { id: editingId } : {}),
        client_id: clientId,
        category: activeCategory,
        title: form.title.trim(),
        trigger_phrase: form.trigger_phrase.trim() || null,
        response_script: form.response_script.trim(),
        priority: form.priority,
      })

      if ('error' in result && result.error) {
        setError(result.error)
        return
      }

      // Optimistic: update local state
      if (editingId) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === editingId
              ? {
                  ...e,
                  title: form.title.trim(),
                  trigger_phrase: form.trigger_phrase.trim() || null,
                  response_script: form.response_script.trim(),
                  priority: form.priority,
                  updated_at: new Date().toISOString(),
                }
              : e
          )
        )
      } else {
        // Re-fetch would be ideal, but for now add a placeholder
        setEntries((prev) => [
          {
            id: crypto.randomUUID(),
            client_id: clientId,
            category: activeCategory,
            title: form.title.trim(),
            trigger_phrase: form.trigger_phrase.trim() || null,
            response_script: form.response_script.trim(),
            is_active: true,
            priority: form.priority,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          ...prev,
        ])
      }
      cancelForm()
    })
  }

  function handleDelete(entry: SalesPlaybook) {
    if (!confirm(`Delete "${entry.title}"? This cannot be undone.`)) return

    startTransition(async () => {
      const result = await deletePlaybookEntry(entry.id, clientId)
      if ('error' in result && result.error) {
        setError(result.error)
        return
      }
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, is_active: false } : e))
      )
    })
  }

  return (
    <div>
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 mb-4 border-b border-gray-200 pb-2">
        {CATEGORIES.map(({ key, label }) => {
          const count = entries.filter((e) => e.category === key && e.is_active).length
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

      {/* Category description */}
      {activeCategoryMeta && (
        <p className="text-sm text-gray-500 mb-4">{activeCategoryMeta.description}</p>
      )}

      {/* Add button */}
      {!showAddForm && editingId === null && (
        <button
          onClick={openAdd}
          disabled={isPending}
          className="mb-4 flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add Script
        </button>
      )}

      {/* Add form */}
      {showAddForm && (
        <PlaybookForm
          form={form}
          setForm={setForm}
          onSave={handleSave}
          onCancel={cancelForm}
          error={error}
          isPending={isPending}
          isEdit={false}
          category={activeCategory}
        />
      )}

      {/* Entry list */}
      {categoryEntries.length === 0 && !showAddForm ? (
        <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center">
          <p className="text-sm text-gray-400">
            No scripts in <span className="font-semibold">{activeCategoryMeta?.label}</span> yet.
          </p>
          <button onClick={openAdd} className="mt-3 text-sm text-indigo-600 hover:underline">
            Add the first script
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {categoryEntries.map((entry) => (
            <div key={entry.id}>
              {editingId === entry.id ? (
                <PlaybookForm
                  form={form}
                  setForm={setForm}
                  onSave={handleSave}
                  onCancel={cancelForm}
                  error={error}
                  isPending={isPending}
                  isEdit
                  category={activeCategory}
                />
              ) : (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{entry.title}</p>
                      {entry.trigger_phrase && (
                        <p className="mt-1 text-xs text-gray-500">
                          Trigger: <span className="font-medium text-gray-700">&ldquo;{entry.trigger_phrase}&rdquo;</span>
                        </p>
                      )}
                      <p className="mt-1.5 text-sm text-gray-600">{entry.response_script}</p>
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

interface PlaybookFormProps {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  onSave: () => void
  onCancel: () => void
  error: string | null
  isPending: boolean
  isEdit: boolean
  category: PlaybookCategory
}

function PlaybookForm({ form, setForm, onSave, onCancel, error, isPending, isEdit, category }: PlaybookFormProps) {
  const triggerLabel = category === 'upsell_trigger'
    ? 'When caller mentions...'
    : category === 'objection_handling'
    ? 'When caller objects with...'
    : 'Trigger phrase (optional)'

  return (
    <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
      <p className="text-sm font-semibold text-indigo-800 mb-3">
        {isEdit ? 'Edit Script' : 'New Script'}
      </p>

      {error && (
        <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
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
            placeholder="e.g., Price too high"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {triggerLabel}
          </label>
          <input
            type="text"
            value={form.trigger_phrase}
            onChange={(e) => setForm((f) => ({ ...f, trigger_phrase: e.target.value }))}
            placeholder="e.g., That's too expensive, I need to think about it"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Response Script <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            value={form.response_script}
            onChange={(e) => setForm((f) => ({ ...f, response_script: e.target.value }))}
            placeholder="What the AI should say in response..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
          />
        </div>

        <div className="w-32">
          <label className="block text-xs font-medium text-gray-700 mb-1">Priority (0-100)</label>
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
