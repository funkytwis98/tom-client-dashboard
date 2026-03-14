// Tests for classifyIntent — Intent Classifier

import { classifyIntent } from '@/lib/brain/intent-classifier'
import type { SubscriptionTier } from '@/lib/brain/types'

describe('classifyIntent', () => {
  // ── Keyword routing ────────────────────────────────────────────────────

  describe('keyword routing', () => {
    it.each([
      ['post', 'social_media'],
      ['draft', 'social_media'],
      ['instagram', 'social_media'],
      ['facebook', 'social_media'],
      ['hashtag', 'social_media'],
      ['content', 'social_media'],
    ])('routes "%s" to %s', (message, expected) => {
      const result = classifyIntent(message, 'complete')
      expect(result.capability).toBe(expected)
      expect(result.gated).toBe(false)
    })

    it.each([
      ['website', 'website_analyst'],
      ['visitors', 'website_analyst'],
      ['traffic', 'website_analyst'],
      ['clicks', 'website_analyst'],
      ['page views', 'website_analyst'],
      ['analytics', 'website_analyst'],
    ])('routes "%s" to %s', (message, expected) => {
      const result = classifyIntent(message, 'complete')
      expect(result.capability).toBe(expected)
      expect(result.gated).toBe(false)
    })

    it.each([
      ['call', 'general_assistant'],
      ['missed call', 'general_assistant'],
      ['lead', 'general_assistant'],
      ['voicemail', 'general_assistant'],
    ])('routes "%s" to general_assistant (calls data)', (message, expected) => {
      const result = classifyIntent(message, 'complete')
      expect(result.capability).toBe(expected)
    })
  })

  // ── Post approval patterns ─────────────────────────────────────────────

  describe('post approval patterns', () => {
    it.each(['yes', 'no', 'approve', 'edit', 'reject'])(
      'routes exact "%s" to social_media',
      (message) => {
        const result = classifyIntent(message, 'complete')
        expect(result.capability).toBe('social_media')
      },
    )

    it('routes "change it to ..." to social_media', () => {
      const result = classifyIntent('change it to something about spring deals', 'complete')
      expect(result.capability).toBe('social_media')
    })

    it('is case-insensitive for exact matches', () => {
      const result = classifyIntent('YES', 'complete')
      expect(result.capability).toBe('social_media')
    })
  })

  // ── Default fallback ──────────────────────────────────────────────────

  describe('default fallback', () => {
    it('returns general_assistant for unrecognized messages', () => {
      const result = classifyIntent('hello there', 'complete')
      expect(result.capability).toBe('general_assistant')
      expect(result.gated).toBe(false)
    })

    it('returns general_assistant for empty-ish messages', () => {
      const result = classifyIntent('  ', 'complete')
      expect(result.capability).toBe('general_assistant')
      expect(result.gated).toBe(false)
    })
  })

  // ── Tier gating ───────────────────────────────────────────────────────

  describe('tier gating', () => {
    it('returns gated=true with upsell for social_media on "receptionist" tier', () => {
      const result = classifyIntent('post something about our sale', 'receptionist')
      expect(result.capability).toBe('social_media')
      expect(result.gated).toBe(true)
      expect(result.upsellMessage).toContain('Social Media package')
    })

    it('returns gated=true with upsell for website_analyst on "social" tier', () => {
      const result = classifyIntent('how many website visitors today?', 'social')
      expect(result.capability).toBe('website_analyst')
      expect(result.gated).toBe(true)
      expect(result.upsellMessage).toContain('Complete package')
    })

    it('returns gated=false when capability is allowed on tier', () => {
      const result = classifyIntent('draft a post', 'social')
      expect(result.capability).toBe('social_media')
      expect(result.gated).toBe(false)
    })

    it('allows all capabilities on the "complete" tier', () => {
      const tiers: SubscriptionTier[] = ['complete', 'the_works']
      for (const tier of tiers) {
        expect(classifyIntent('website traffic', tier).gated).toBe(false)
        expect(classifyIntent('post something', tier).gated).toBe(false)
        expect(classifyIntent('hello', tier).gated).toBe(false)
      }
    })

    it('handles unknown tier gracefully by falling back to free', () => {
      // cast to bypass type check — simulates unexpected DB value
      const result = classifyIntent('post something', 'unknown_tier' as SubscriptionTier)
      // free tier has all capabilities
      expect(result.gated).toBe(false)
    })
  })
})
