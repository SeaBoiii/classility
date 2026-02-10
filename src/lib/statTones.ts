interface StatTone {
  positive: string
  negative: string
}

const STAT_TONE_BY_ID: Record<string, StatTone> = {
  power: { positive: '#c85c2f', negative: '#7f3b1f' },
  guard: { positive: '#b58e46', negative: '#6f5829' },
  swift: { positive: '#2f98c2', negative: '#1d5f78' },
  tactic: { positive: '#5f71cc', negative: '#374383' },
  arcana: { positive: '#944ad5', negative: '#562b7a' },
  faith: { positive: '#7aac4a', negative: '#49672d' },
  guile: { positive: '#3ea287', negative: '#235c4c' },
  command: { positive: '#be5b76', negative: '#723546' },
}

const FALLBACK_STAT_TONES: StatTone[] = [
  { positive: '#c85c2f', negative: '#7f3b1f' },
  { positive: '#b58e46', negative: '#6f5829' },
  { positive: '#2f98c2', negative: '#1d5f78' },
  { positive: '#5f71cc', negative: '#374383' },
]

export function resolveStatTone(dimensionId: string, index: number): StatTone {
  return STAT_TONE_BY_ID[dimensionId] ?? FALLBACK_STAT_TONES[index % FALLBACK_STAT_TONES.length]
}
