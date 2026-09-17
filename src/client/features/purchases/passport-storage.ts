const storageKey = 'nimpurchase:recent-passports'
const maxRememberedPassports = 12

function storage(): Storage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

export function rememberPassport(purchaseId: string): void {
  const localStorage = storage()
  if (!localStorage || !purchaseId) return
  const existing = recentPassportIds().filter((id) => id !== purchaseId)
  localStorage.setItem(storageKey, JSON.stringify([purchaseId, ...existing].slice(0, maxRememberedPassports)))
}

export function recentPassportIds(): string[] {
  const localStorage = storage()
  if (!localStorage) return []
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && id.length > 0).slice(0, maxRememberedPassports) : []
  } catch {
    return []
  }
}
