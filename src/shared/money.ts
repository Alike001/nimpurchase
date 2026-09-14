export const LUNA_PER_NIM = 100_000

export class MoneyError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'MoneyError'
  }
}

export function assertLuna(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new MoneyError('NIM amounts must be positive safe integers expressed in Luna.')
  }

  return value
}

export function formatNim(luna: number): string {
  assertLuna(luna)
  const nim = luna / LUNA_PER_NIM
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 5 }).format(nim)} NIM`
}
