'use client'

import { useState, useTransition, useCallback } from 'react'
import { Eye, Save, Globe, Globe2, Upload, Palette, Type, Layout, MessageSquareQuote, Info } from 'lucide-react'
import {
  upsertWebsiteConfig,
  togglePublished,
  saveWebsiteContent,
  uploadWebsiteImage,
} from '@/app/actions/website'
import { TEMPLATE_META } from '@/components/templates/template-registry'
import { FONT_OPTIONS } from '@/lib/website/theme'
import type { WebsiteConfig, TemplateId, HeroContent, AboutContent, TestimonialsContent, TestimonialItem } from '@/types/website'

type Tab = 'template' | 'branding' | 'content' | 'testimonials' | 'seo'

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'template', label: 'Template', icon: <Layout className="h-4 w-4" /> },
  { key: 'branding', label: 'Branding', icon: <Palette className="h-4 w-4" /> },
  { key: 'content', label: 'Content', icon: <Type className="h-4 w-4" /> },
  { key: 'testimonials', label: 'Reviews', icon: <MessageSquareQuote className="h-4 w-4" /> },
  { key: 'seo', label: 'SEO', icon: <Info className="h-4 w-4" /> },
]

interface Props {
  clientId: string
  clientSlug: string
  initialConfig: WebsiteConfig | null
  initialHero: HeroContent | null
  initialAbout: AboutContent | null
  initialTestimonials: TestimonialsContent | null
}

export function WebsiteEditor({
  clientId,
  clientSlug,
  initialConfig,
  initialHero,
  initialAbout,
  initialTestimonials,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('template')
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<string | null>(null)

  // Config state
  const [templateId, setTemplateId] = useState<TemplateId>(initialConfig?.template_id ?? 'bold')
  const [primaryColor, setPrimaryColor] = useState(initialConfig?.primary_color ?? '#1e40af')
  const [secondaryColor, setSecondaryColor] = useState(initialConfig?.secondary_color ?? '#f59e0b')
  const [accentColor, setAccentColor] = useState(initialConfig?.accent_color ?? '#10b981')
  const [bgColor, setBgColor] = useState(initialConfig?.background_color ?? '#ffffff')
  const [textColor, setTextColor] = useState(initialConfig?.text_color ?? '#111827')
  const [fontHeading, setFontHeading] = useState(initialConfig?.font_heading ?? 'Inter')
  const [fontBody, setFontBody] = useState(initialConfig?.font_body ?? 'Inter')
  const [isPublished, setIsPublished] = useState(initialConfig?.is_published ?? false)
  const [metaTitle, setMetaTitle] = useState(initialConfig?.meta_title ?? '')
  const [metaDescription, setMetaDescription] = useState(initialConfig?.meta_description ?? '')

  // Content state
  const [heroHeadline, setHeroHeadline] = useState(initialHero?.headline ?? '')
  const [heroSubheadline, setHeroSubheadline] = useState(initialHero?.subheadline ?? '')
  const [heroCta, setHeroCta] = useState(initialHero?.cta_text ?? '')
  const [aboutText, setAboutText] = useState(initialAbout?.text ?? '')
  const [aboutMission, setAboutMission] = useState(initialAbout?.mission_statement ?? '')

  // Testimonials state
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(
    initialTestimonials?.items ?? [],
  )

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  function saveConfig() {
    startTransition(async () => {
      try {
        await upsertWebsiteConfig(clientId, {
          template_id: templateId,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
          background_color: bgColor,
          text_color: textColor,
          font_heading: fontHeading,
          font_body: fontBody,
          meta_title: metaTitle || null,
          meta_description: metaDescription || null,
        })
        showToast('Settings saved')
      } catch (e) {
        showToast(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    })
  }

  function saveHeroContent() {
    startTransition(async () => {
      try {
        const content: HeroContent = {}
        if (heroHeadline) content.headline = heroHeadline
        if (heroSubheadline) content.subheadline = heroSubheadline
        if (heroCta) content.cta_text = heroCta
        await saveWebsiteContent(clientId, 'hero', content as Record<string, unknown>)
        showToast('Hero content saved')
      } catch (e) {
        showToast(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    })
  }

  function saveAboutContent() {
    startTransition(async () => {
      try {
        const content: AboutContent = {}
        if (aboutText) content.text = aboutText
        if (aboutMission) content.mission_statement = aboutMission
        await saveWebsiteContent(clientId, 'about', content as Record<string, unknown>)
        showToast('About content saved')
      } catch (e) {
        showToast(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    })
  }

  function saveTestimonialsContent() {
    startTransition(async () => {
      try {
        const content: TestimonialsContent = { items: testimonials }
        await saveWebsiteContent(clientId, 'testimonials', content as unknown as Record<string, unknown>)
        showToast('Testimonials saved')
      } catch (e) {
        showToast(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    })
  }

  function handleTogglePublish() {
    startTransition(async () => {
      try {
        const result = await togglePublished(clientId)
        setIsPublished(result.published)
        showToast(result.published ? 'Site published!' : 'Site unpublished')
      } catch (e) {
        showToast(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    })
  }

  function handleImageUpload(type: 'logo' | 'hero') {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const fd = new FormData()
      fd.append('file', file)
      startTransition(async () => {
        try {
          await uploadWebsiteImage(clientId, fd, type)
          showToast(`${type === 'logo' ? 'Logo' : 'Hero image'} uploaded`)
        } catch (e) {
          showToast(`Upload error: ${e instanceof Error ? e.message : 'Unknown error'}`)
        }
      })
    }
    input.click()
  }

  function addTestimonial() {
    setTestimonials((curr) => [...curr, { name: '', text: '', rating: 5 }])
  }

  function removeTestimonial(index: number) {
    setTestimonials((curr) => curr.filter((_, i) => i !== index))
  }

  function updateTestimonial(index: number, field: keyof TestimonialItem, value: string | number) {
    setTestimonials((curr) =>
      curr.map((t, i) => (i === index ? { ...t, [field]: value } : t)),
    )
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleTogglePublish}
            disabled={isPending}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isPublished
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isPublished ? <Globe className="h-4 w-4" /> : <Globe2 className="h-4 w-4" />}
            {isPublished ? 'Published' : 'Unpublished'}
          </button>
          {isPublished ? (
            <a
              href={`/sites/${clientSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800"
            >
              <Eye className="h-4 w-4" />
              Preview Site
            </a>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {activeTab === 'template' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Choose a Template</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {TEMPLATE_META.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setTemplateId(tmpl.id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    templateId === tmpl.id
                      ? 'border-indigo-600 ring-2 ring-indigo-100'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div
                    className="w-full h-24 rounded-lg mb-3"
                    style={{ backgroundColor: tmpl.preview_color }}
                  />
                  <p className="font-semibold text-sm">{tmpl.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{tmpl.description}</p>
                </button>
              ))}
            </div>
            <button
              onClick={saveConfig}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save Template
            </button>
          </div>
        )}

        {activeTab === 'branding' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Colors & Typography</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { label: 'Primary', value: primaryColor, set: setPrimaryColor },
                { label: 'Secondary', value: secondaryColor, set: setSecondaryColor },
                { label: 'Accent', value: accentColor, set: setAccentColor },
                { label: 'Background', value: bgColor, set: setBgColor },
                { label: 'Text', value: textColor, set: setTextColor },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-gray-200"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      className="w-20 text-xs border rounded px-2 py-1"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Heading Font', value: fontHeading, set: setFontHeading },
                { label: 'Body Font', value: fontBody, set: setFontBody },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                  <select
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Images</h4>
              <div className="flex gap-3">
                <button
                  onClick={() => handleImageUpload('logo')}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />
                  Upload Logo
                </button>
                <button
                  onClick={() => handleImageUpload('hero')}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />
                  Upload Hero Image
                </button>
              </div>
            </div>
            <button
              onClick={saveConfig}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save Branding
            </button>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Hero Section</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Headline</label>
                  <input
                    type="text"
                    value={heroHeadline}
                    onChange={(e) => setHeroHeadline(e.target.value)}
                    placeholder="e.g., Your Trusted Tire Experts"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Subheadline</label>
                  <input
                    type="text"
                    value={heroSubheadline}
                    onChange={(e) => setHeroSubheadline(e.target.value)}
                    placeholder="e.g., Quality service you can trust"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">CTA Button Text</label>
                  <input
                    type="text"
                    value={heroCta}
                    onChange={(e) => setHeroCta(e.target.value)}
                    placeholder="e.g., Call Now"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={saveHeroContent}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  Save Hero
                </button>
              </div>
            </div>

            <hr className="border-gray-100" />

            <div>
              <h3 className="text-lg font-semibold mb-4">About Section</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">About Text</label>
                  <textarea
                    value={aboutText}
                    onChange={(e) => setAboutText(e.target.value)}
                    placeholder="Tell customers about your business..."
                    className="w-full border rounded-lg px-3 py-2 text-sm min-h-[120px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Mission Statement</label>
                  <input
                    type="text"
                    value={aboutMission}
                    onChange={(e) => setAboutMission(e.target.value)}
                    placeholder="e.g., Providing honest, quality service since 2005"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={saveAboutContent}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  Save About
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              Services, hours, and contact info are automatically pulled from the Knowledge Base.
            </p>
          </div>
        )}

        {activeTab === 'testimonials' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Customer Reviews</h3>
              <button
                onClick={addTestimonial}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
              >
                + Add Review
              </button>
            </div>
            {testimonials.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">
                No reviews yet. Add customer reviews to display on the site.
              </p>
            ) : (
              <div className="space-y-4">
                {testimonials.map((t, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-400">Review #{i + 1}</span>
                      <button
                        onClick={() => removeTestimonial(i)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                        <input
                          type="text"
                          value={t.name}
                          onChange={(e) => updateTestimonial(i, 'name', e.target.value)}
                          placeholder="Customer name"
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Rating (1-5)
                        </label>
                        <select
                          value={t.rating}
                          onChange={(e) => updateTestimonial(i, 'rating', Number(e.target.value))}
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                        >
                          {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>
                              {n} star{n > 1 ? 's' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Review Text</label>
                      <textarea
                        value={t.text}
                        onChange={(e) => updateTestimonial(i, 'text', e.target.value)}
                        placeholder="What did they say?"
                        className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Role (optional)
                      </label>
                      <input
                        type="text"
                        value={t.role ?? ''}
                        onChange={(e) => updateTestimonial(i, 'role', e.target.value)}
                        placeholder="e.g., Regular Customer"
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={saveTestimonialsContent}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save Reviews
            </button>
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">SEO Settings</h3>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Meta Title</label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Page title for search engines"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Meta Description</label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Short description for search results"
                className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
              />
            </div>
            <button
              onClick={saveConfig}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save SEO
            </button>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast ? (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
