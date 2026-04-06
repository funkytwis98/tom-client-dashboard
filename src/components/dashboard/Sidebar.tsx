'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getClientNav, type NavConfig } from '@/lib/navigation'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const iconMap: Record<string, React.ReactNode> = {
  home: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  phone: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  book: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  lightbulb: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  globe: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  contact: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  chart: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  sparkle: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
  megaphone: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
}

function getIcon(name: string): React.ReactNode {
  return iconMap[name] ?? iconMap.home
}

function buildClientNav(configs: NavConfig[]): NavItem[] {
  return configs.map((c) => ({
    label: c.label,
    href: c.href,
    icon: getIcon(c.icon),
  }))
}

// localStorage cache for sidebar collapsed state
const SIDEBAR_KEY = 'sidebar-collapsed'
const sidebarCache = new Map<string, string | null>()

function getCachedStorage(key: string): string | null {
  if (!sidebarCache.has(key)) {
    try {
      sidebarCache.set(key, localStorage.getItem(key))
    } catch {
      sidebarCache.set(key, null)
    }
  }
  return sidebarCache.get(key) ?? null
}

function setCachedStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
    sidebarCache.set(key, value)
  } catch {
    // ignore
  }
}

interface SidebarProps {
  clientName: string | null
  userEmail: string
  displayName: string | null
  productsEnabled: string[]
  ownerName: string | null
}

export default function Sidebar({ clientName, userEmail, displayName, productsEnabled, ownerName }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const stored = getCachedStorage(SIDEBAR_KEY)
    if (stored === 'true') setCollapsed(true)
  }, [])

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    setCachedStorage(SIDEBAR_KEY, String(next))
  }

  const navItems = buildClientNav(getClientNav(productsEnabled))
  const nameDisplay = ownerName || displayName || userEmail
  const initials = nameDisplay[0]?.toUpperCase() ?? '?'

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Expanded sidebar content (mobile + desktop expanded)
  const expandedContent = (
    <>
      {/* Brand header */}
      <div className="px-6 py-5 border-b border-gray-800">
        <h1 className="text-[#FFD700] font-bold text-lg truncate">{clientName ?? 'Dashboard'}</h1>
        <p className="text-[#666] text-[11px] mt-1 uppercase font-medium" style={{ letterSpacing: '0.5px' }}>
          Powered by Tom Integrations
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[rgba(255,215,0,0.08)] text-[#FFD700]'
                  : 'text-[#999] hover:bg-gray-900 hover:text-white'
              }`}
            >
              <span className={isActive ? 'text-[#FFD700]' : 'text-[#999]'}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Toggle collapse button (desktop only) */}
      <div className="hidden md:block px-3">
        <button
          onClick={toggleCollapsed}
          className="w-full flex items-center gap-2 px-3 py-2 text-[#666] hover:text-white hover:bg-gray-800 rounded-md text-xs transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          Collapse sidebar
        </button>
      </div>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-md">
          <div className="w-9 h-9 rounded-full bg-[#FFD700] flex items-center justify-center flex-shrink-0">
            <span className="text-[#111] text-sm font-bold">
              {initials}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{nameDisplay}</p>
            <p className="text-[#666] text-[10px]">Owner</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full mt-2 flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </>
  )

  // Collapsed sidebar content (desktop only)
  const collapsedContent = (
    <>
      {/* Collapsed header — just gold bar */}
      <div className="py-5 border-b border-gray-800 flex justify-center">
        <div className="w-8 h-8 rounded-full bg-[#FFD700] flex items-center justify-center">
          <span className="text-[#111] text-xs font-bold">T</span>
        </div>
      </div>

      {/* Navigation — icons only */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto flex flex-col items-center">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[rgba(255,215,0,0.08)] text-[#FFD700]'
                  : 'text-[#999] hover:bg-gray-900 hover:text-white'
              }`}
            >
              <span className={isActive ? 'text-[#FFD700]' : 'text-[#999]'}>{item.icon}</span>
            </Link>
          )
        })}
      </nav>

      {/* Expand button */}
      <div className="flex justify-center py-2">
        <button
          onClick={toggleCollapsed}
          className="flex items-center justify-center w-10 h-10 text-[#666] hover:text-white hover:bg-gray-800 rounded-md transition-colors"
          title="Expand sidebar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* User footer — avatar only */}
      <div className="py-4 border-t border-gray-800 flex flex-col items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-[#FFD700] flex items-center justify-center">
          <span className="text-[#111] text-sm font-bold">{initials}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center justify-center w-10 h-10 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
          title="Sign out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-30 flex md:hidden items-center h-14 px-4 bg-white border-b border-gray-200">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center w-10 h-10 -ml-2 text-[#333]"
          aria-label="Toggle navigation"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="ml-2 text-sm font-semibold text-[#111] truncate">{clientName ?? 'Dashboard'}</span>
      </div>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#111113] flex flex-col md:hidden transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {expandedContent}
      </div>

      {/* Desktop sidebar */}
      <div
        className="hidden md:flex bg-[#111113] flex-col flex-shrink-0 transition-all duration-200 ease-in-out"
        style={{ width: collapsed ? 64 : 256 }}
      >
        {collapsed ? collapsedContent : expandedContent}
      </div>
    </>
  )
}
