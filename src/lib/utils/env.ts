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

// Validated env — accessing any key throws if the var is missing
export const env = {
  // Supabase
  supabaseUrl: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: () => requireEnv('SUPABASE_SERVICE_ROLE_KEY'),  // lazy — server only

  // Retell AI
  retellApiKey: () => requireEnv('RETELL_API_KEY'),

  // Twilio
  twilioAccountSid: () => requireEnv('TWILIO_ACCOUNT_SID'),
  twilioAuthToken: () => requireEnv('TWILIO_AUTH_TOKEN'),
  twilioPhoneNumber: () => requireEnv('TWILIO_PHONE_NUMBER'),
  twilioWebhookUrl: () => requireEnv('TWILIO_WEBHOOK_URL'),

  // Anthropic (Claude API)
  anthropicApiKey: () => requireEnv('ANTHROPIC_API_KEY'),

  // Other
  revalidateSecret: () => requireEnv('REVALIDATE_SECRET'),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
} as const

// Type helper for environment-aware code
export const isProduction = () => env.nodeEnv === 'production'
export const isDevelopment = () => env.nodeEnv === 'development'
