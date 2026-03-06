function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function optionalEnv(name: string, defaultValue = ''): string {
  return process.env[name] ?? defaultValue
}

// Validated env — all accessors are lazy (functions) to avoid build-time throws
export const env = {
  // Supabase
  supabaseUrl: () => requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: () => requireEnv('SUPABASE_SERVICE_ROLE_KEY'),

  // Retell AI
  retellApiKey: () => requireEnv('RETELL_API_KEY'),

  // Twilio
  twilioAccountSid: () => requireEnv('TWILIO_ACCOUNT_SID'),
  twilioAuthToken: () => requireEnv('TWILIO_AUTH_TOKEN'),
  twilioPhoneNumber: () => requireEnv('TWILIO_PHONE_NUMBER'),
  twilioWebhookUrl: () => requireEnv('TWILIO_WEBHOOK_URL'),

  // Anthropic (Claude API)
  anthropicApiKey: () => requireEnv('ANTHROPIC_API_KEY'),

  // Stripe
  stripeSecretKey: () => requireEnv('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: () => requireEnv('STRIPE_WEBHOOK_SECRET'),
  stripePriceStandard: () => requireEnv('STRIPE_PRICE_STANDARD'),
  stripePricePremium: () => requireEnv('STRIPE_PRICE_PREMIUM'),
  stripePriceEnterprise: () => requireEnv('STRIPE_PRICE_ENTERPRISE'),

  // Other
  revalidateSecret: () => requireEnv('REVALIDATE_SECRET'),
  adminAlertPhone: () => optionalEnv('ADMIN_ALERT_PHONE', ''),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
} as const

// Type helper for environment-aware code
export const isProduction = () => env.nodeEnv === 'production'
export const isDevelopment = () => env.nodeEnv === 'development'
