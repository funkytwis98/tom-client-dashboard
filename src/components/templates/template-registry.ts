import type { ComponentType } from 'react'
import type { TemplateId, TemplateMeta, TemplateProps } from '@/types/website'
import { BoldTemplate } from './bold/BoldTemplate'
import { CleanTemplate } from './clean/CleanTemplate'
import { ClassicTemplate } from './classic/ClassicTemplate'

export const TEMPLATES: Record<TemplateId, ComponentType<TemplateProps>> = {
  bold: BoldTemplate,
  clean: CleanTemplate,
  classic: ClassicTemplate,
}

export const TEMPLATE_META: TemplateMeta[] = [
  {
    id: 'bold',
    name: 'Bold',
    description: 'High-contrast, dark hero, strong typography. Great for auto shops and heavy service.',
    preview_color: '#1e293b',
  },
  {
    id: 'clean',
    name: 'Clean',
    description: 'Minimal whitespace, light backgrounds, subtle shadows. Perfect for professional services.',
    preview_color: '#f8fafc',
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Warm, rounded corners, approachable. Ideal for general local businesses.',
    preview_color: '#fffbeb',
  },
]
