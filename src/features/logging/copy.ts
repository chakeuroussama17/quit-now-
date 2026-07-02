/**
 * Post-log acknowledgments. Calm, adult, zero shame — the log itself is the win.
 * Phase 3 will occasionally replace these with a short AI reflection.
 */
const ACK_LINES = [
  'Logged. The pattern matters more than this one moment.',
  'Noted. Honesty is the whole game here.',
  'Okay. One log, no judgment.',
  'Recorded. Knowing your triggers is how you beat them.',
  'Logged. Every entry makes your map of this habit sharper.',
];

/**
 * Resisted-craving lines. Deliberately warmer than the smoke acknowledgments —
 * wins get celebrated more than slips get discouraged.
 */
const RESISTED_LINES = [
  'That’s the muscle. Most cravings die within 5 minutes — you outlasted this one.',
  'One craving down. Each one you surf makes the next one weaker.',
  'Logged the win. This is exactly how quitting actually happens.',
  'Strong. Your brain just learned that a craving isn’t a command.',
  'Held the line. That’s a rep for the person you’re becoming.',
];

export function randomAckLine(): string {
  return ACK_LINES[Math.floor(Math.random() * ACK_LINES.length)];
}

export function randomResistedLine(): string {
  return RESISTED_LINES[Math.floor(Math.random() * RESISTED_LINES.length)];
}
