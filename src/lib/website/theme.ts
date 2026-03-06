/**
 * Theme utilities for website templates.
 * Converts hex colors to CSS custom properties and builds Google Fonts URLs.
 */

/** Convert hex color (#1e40af) to HSL components string ("222 47% 40%") */
export function hexToHSL(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '0 0% 0%'

  const r = parseInt(result[1], 16) / 255
  const g = parseInt(result[2], 16) / 255
  const b = parseInt(result[3], 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

/** Build CSS custom properties string from website config colors */
export function buildThemeVars(config: {
  primary_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  text_color: string
}): string {
  return [
    `--site-primary: ${config.primary_color}`,
    `--site-primary-hsl: ${hexToHSL(config.primary_color)}`,
    `--site-secondary: ${config.secondary_color}`,
    `--site-secondary-hsl: ${hexToHSL(config.secondary_color)}`,
    `--site-accent: ${config.accent_color}`,
    `--site-accent-hsl: ${hexToHSL(config.accent_color)}`,
    `--site-bg: ${config.background_color}`,
    `--site-bg-hsl: ${hexToHSL(config.background_color)}`,
    `--site-text: ${config.text_color}`,
    `--site-text-hsl: ${hexToHSL(config.text_color)}`,
  ].join('; ')
}

/** Google Fonts display=swap URL for heading + body fonts */
export function googleFontsUrl(heading: string, body: string): string {
  const families = new Set([heading, body])
  const params = [...families]
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`)
    .join('&')
  return `https://fonts.googleapis.com/css2?${params}&display=swap`
}

/** Curated font list for the editor dropdown */
export const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Raleway',
  'Playfair Display',
  'Merriweather',
  'Source Sans 3',
  'Nunito',
  'Work Sans',
] as const
