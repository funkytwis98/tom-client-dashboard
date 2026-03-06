import { buildThemeVars } from '@/lib/website/theme'
import type { WebsiteConfig } from '@/types/website'

interface SiteThemeVarsProps {
  config: Pick<
    WebsiteConfig,
    'primary_color' | 'secondary_color' | 'accent_color' | 'background_color' | 'text_color'
  >
}

export function SiteThemeVars({ config }: SiteThemeVarsProps) {
  const vars = buildThemeVars(config)

  // Safe: buildThemeVars only produces CSS custom property declarations from hex color values
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `:root { ${vars} }`,
      }}
    />
  )
}
