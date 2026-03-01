import type { OwnerCommand } from '@/types/api'

// Regex patterns for each action type (case-insensitive)
const PATTERNS: Array<{ pattern: RegExp; action: OwnerCommand['action'] }> = [
  // contacted / call back
  {
    pattern: /\b(call\s+back|callback|call\s+them(\s+back)?)\b/i,
    action: 'contacted',
  },
  // booked
  {
    pattern: /\b(booked|scheduled|book\s+them|confirmed)\b/i,
    action: 'booked',
  },
  // lost
  {
    pattern: /\b(not\s+interested|pass|lost|no\s+thanks|ignore)\b/i,
    action: 'lost',
  },
  // pause
  {
    pattern: /\b(stop|pause(\s+notifications)?|too\s+many\s+texts)\b/i,
    action: 'pause',
  },
  // resume
  {
    pattern: /\b(resume|start|turn\s+on)\b/i,
    action: 'resume',
  },
]

/**
 * Parses a free-form SMS text from the business owner into a structured command.
 * Returns { action: 'unknown', raw } if no pattern matches.
 */
export function parseOwnerCommand(text: string): OwnerCommand {
  const trimmed = text.trim()

  for (const { pattern, action } of PATTERNS) {
    if (pattern.test(trimmed)) {
      return { action, raw: text }
    }
  }

  return { action: 'unknown', raw: text }
}
