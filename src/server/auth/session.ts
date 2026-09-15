import { createHash, randomBytes } from 'node:crypto'

export const merchantSessionCookie = 'nimpurchase_merchant_session'
export const merchantSessionLifetimeSeconds = 60 * 60 * 24 * 7

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function readCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined
  for (const item of cookieHeader.split(';')) {
    const separator = item.indexOf('=')
    if (separator < 0) continue
    if (item.slice(0, separator).trim() === name) return decodeURIComponent(item.slice(separator + 1).trim())
  }
  return undefined
}

export function sessionCookie(token: string, secure: boolean): string {
  return `${merchantSessionCookie}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${merchantSessionLifetimeSeconds}${secure ? '; Secure' : ''}`
}

export function expiredSessionCookie(secure: boolean): string {
  return `${merchantSessionCookie}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure ? '; Secure' : ''}`
}
