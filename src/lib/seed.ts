export function hashSeed(seed: string): number {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seededChoices(seed: string, count: number, optionCount: number): number[] {
  const random = mulberry32(hashSeed(seed))
  const choices: number[] = []

  for (let index = 0; index < count; index += 1) {
    choices.push(Math.floor(random() * optionCount))
  }

  return choices
}
