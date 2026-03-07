import { type ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: { label: string; href: string }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      <div className="mx-auto h-12 w-12 text-gray-300">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">{description}</p>
      {action && (
        <a
          href={action.href}
          className="mt-4 inline-block text-sm font-medium text-gray-700 hover:text-gray-900 underline"
        >
          {action.label}
        </a>
      )}
    </div>
  )
}
