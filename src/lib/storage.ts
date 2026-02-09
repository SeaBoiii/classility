const LAST_ATTEMPT_KEY = 'classility:lastAttempt'

export interface StoredAttempt {
  answers: number[]
  createdAt: string
}

export function saveAttempt(attempt: StoredAttempt): void {
  localStorage.setItem(LAST_ATTEMPT_KEY, JSON.stringify(attempt))
}

export function loadAttempt(): StoredAttempt | null {
  const raw = localStorage.getItem(LAST_ATTEMPT_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as StoredAttempt
    if (!Array.isArray(parsed.answers)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}
