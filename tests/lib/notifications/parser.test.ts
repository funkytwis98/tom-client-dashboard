import { parseOwnerCommand } from '@/lib/notifications/parser'

describe('parseOwnerCommand', () => {
  // -------------------------
  // contacted / call back
  // -------------------------
  describe('contacted action', () => {
    it('parses "call back"', () => {
      expect(parseOwnerCommand('call back')).toEqual({ action: 'contacted', raw: 'call back' })
    })

    it('parses "callback"', () => {
      expect(parseOwnerCommand('callback')).toEqual({ action: 'contacted', raw: 'callback' })
    })

    it('parses "CALL BACK" (case insensitive)', () => {
      expect(parseOwnerCommand('CALL BACK')).toEqual({ action: 'contacted', raw: 'CALL BACK' })
    })

    it('parses "call them"', () => {
      expect(parseOwnerCommand('call them')).toEqual({ action: 'contacted', raw: 'call them' })
    })

    it('parses "call them back"', () => {
      expect(parseOwnerCommand('call them back')).toEqual({ action: 'contacted', raw: 'call them back' })
    })

    it('parses "  call back  " (trimmed)', () => {
      expect(parseOwnerCommand('  call back  ')).toEqual({ action: 'contacted', raw: '  call back  ' })
    })
  })

  // -------------------------
  // booked
  // -------------------------
  describe('booked action', () => {
    it('parses "booked"', () => {
      expect(parseOwnerCommand('booked')).toEqual({ action: 'booked', raw: 'booked' })
    })

    it('parses "scheduled"', () => {
      expect(parseOwnerCommand('scheduled')).toEqual({ action: 'booked', raw: 'scheduled' })
    })

    it('parses "book them"', () => {
      expect(parseOwnerCommand('book them')).toEqual({ action: 'booked', raw: 'book them' })
    })

    it('parses "confirmed"', () => {
      expect(parseOwnerCommand('confirmed')).toEqual({ action: 'booked', raw: 'confirmed' })
    })

    it('parses "BOOKED" (case insensitive)', () => {
      expect(parseOwnerCommand('BOOKED')).toEqual({ action: 'booked', raw: 'BOOKED' })
    })
  })

  // -------------------------
  // lost / not interested
  // -------------------------
  describe('lost action', () => {
    it('parses "not interested"', () => {
      expect(parseOwnerCommand('not interested')).toEqual({ action: 'lost', raw: 'not interested' })
    })

    it('parses "pass"', () => {
      expect(parseOwnerCommand('pass')).toEqual({ action: 'lost', raw: 'pass' })
    })

    it('parses "lost"', () => {
      expect(parseOwnerCommand('lost')).toEqual({ action: 'lost', raw: 'lost' })
    })

    it('parses "no thanks"', () => {
      expect(parseOwnerCommand('no thanks')).toEqual({ action: 'lost', raw: 'no thanks' })
    })

    it('parses "ignore"', () => {
      expect(parseOwnerCommand('ignore')).toEqual({ action: 'lost', raw: 'ignore' })
    })

    it('parses "NOT INTERESTED" (case insensitive)', () => {
      expect(parseOwnerCommand('NOT INTERESTED')).toEqual({ action: 'lost', raw: 'NOT INTERESTED' })
    })
  })

  // -------------------------
  // pause
  // -------------------------
  describe('pause action', () => {
    it('parses "stop"', () => {
      expect(parseOwnerCommand('stop')).toEqual({ action: 'pause', raw: 'stop' })
    })

    it('parses "pause notifications"', () => {
      expect(parseOwnerCommand('pause notifications')).toEqual({ action: 'pause', raw: 'pause notifications' })
    })

    it('parses "too many texts"', () => {
      expect(parseOwnerCommand('too many texts')).toEqual({ action: 'pause', raw: 'too many texts' })
    })

    it('parses "STOP" (case insensitive)', () => {
      expect(parseOwnerCommand('STOP')).toEqual({ action: 'pause', raw: 'STOP' })
    })
  })

  // -------------------------
  // resume
  // -------------------------
  describe('resume action', () => {
    it('parses "resume"', () => {
      expect(parseOwnerCommand('resume')).toEqual({ action: 'resume', raw: 'resume' })
    })

    it('parses "start"', () => {
      expect(parseOwnerCommand('start')).toEqual({ action: 'resume', raw: 'start' })
    })

    it('parses "turn on"', () => {
      expect(parseOwnerCommand('turn on')).toEqual({ action: 'resume', raw: 'turn on' })
    })

    it('parses "RESUME" (case insensitive)', () => {
      expect(parseOwnerCommand('RESUME')).toEqual({ action: 'resume', raw: 'RESUME' })
    })
  })

  // -------------------------
  // unknown
  // -------------------------
  describe('unknown action', () => {
    it('returns unknown for unrecognized text', () => {
      expect(parseOwnerCommand('offer 10% off')).toEqual({ action: 'unknown', raw: 'offer 10% off' })
    })

    it('returns unknown for empty string', () => {
      expect(parseOwnerCommand('')).toEqual({ action: 'unknown', raw: '' })
    })

    it('returns unknown for arbitrary text', () => {
      expect(parseOwnerCommand('thanks for the info')).toEqual({ action: 'unknown', raw: 'thanks for the info' })
    })

    it('preserves original raw text (not trimmed)', () => {
      const result = parseOwnerCommand('  offer something  ')
      expect(result.action).toBe('unknown')
      expect(result.raw).toBe('  offer something  ')
    })
  })
})
