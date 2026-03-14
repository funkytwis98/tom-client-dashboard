// Emergency fallback prompts — static strings, no assembly needed

import type { Capability } from './types'

export const FALLBACK_PROMPTS: Record<Capability, string> = {
  receptionist:
    "Thank you for calling. I'm having a little trouble pulling up my notes right now, but I'd love to help. Can I get your name and number and have someone call you right back?",

  social_media: '', // Social media failures skip the current cycle

  website_analyst:
    "Hey! I'm having a brief technical hiccup. Give me a few minutes and text me again — I'll be right back.",

  general_assistant:
    "Hey! I'm having a brief technical hiccup. Give me a few minutes and text me again — I'll be right back.",
}
