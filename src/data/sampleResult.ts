export interface CardStat {
  key: string
  label: string
  value: number
}

export interface SampleResult {
  id: string
  title: string
  tagline: string
  summary: string
  lore: string
  signals: string[]
  stats: CardStat[]
  dominantPair: string
  style: string
  risk: string
  partyRole: string
  growthQuest: string
  signatureItem: string
  battleHabit: string
}

export const sampleResult: SampleResult = {
  id: 'class_spellblade',
  title: 'Spellblade',
  tagline: 'Steel and Spell in One Breath',
  summary:
    'You move through conflict as a hybrid duelist, blending precision swordplay with controlled arcane force.',
  lore:
    'Spellblades are field scholars who learn under pressure, not in silence. They bind runes into steel, answer chaos with tempo, and strike where certainty breaks open.',
  signals: [
    'You trust practiced technique and intuition equally.',
    'You perform best when plans must adapt in real time.',
    'You prefer decisive finishes over prolonged standoffs.',
  ],
  stats: [
    { key: 'might', label: 'Might', value: 8 },
    { key: 'finesse', label: 'Finesse', value: 14 },
    { key: 'arcana', label: 'Arcana', value: 16 },
    { key: 'spirit', label: 'Spirit', value: 6 },
    { key: 'guile', label: 'Guile', value: 4 },
    { key: 'resolve', label: 'Resolve', value: 9 },
    { key: 'empathy', label: 'Empathy', value: 1 },
    { key: 'instinct', label: 'Instinct', value: 11 },
  ],
  dominantPair: 'Arcana + Finesse',
  style: 'Adaptive Burst',
  risk: 'Overextension',
  partyRole: 'Arcane Duelist / Frontline Finisher',
  growthQuest: 'Commit to one tempo before expanding your toolkit.',
  signatureItem: 'Runic Longsword of the Split Current',
  battleHabit: 'Break a stalemate with a sudden weave-step strike.',
}
