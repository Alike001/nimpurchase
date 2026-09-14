export type PurchaseView = {
  id: string; merchantName: string; merchantWallet: string; itemSummary: string; expectedAmountLuna: number
  chainReference: string; status: string; buyerWallet?: string; expiresAt: string; purchasedAt?: string
  reward: { current: number; threshold: number; description: string }
}

const apiBase = import.meta.env.VITE_API_BASE_URL ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } })
  const body = await response.json() as T | { error: string }
  if (!response.ok) throw new Error(typeof body === 'object' && body !== null && 'error' in body ? body.error : 'Request failed.')
  return body as T
}

export const purchaseApi = {
  get: (purchaseId: string) => request<PurchaseView>(`/api/purchases/${purchaseId}`),
  submit: (purchaseId: string, txHash: string) => request<{ status: string }>(`/api/purchases/${purchaseId}/payment`, { method: 'POST', body: JSON.stringify({ txHash }) }),
  verify: (purchaseId: string, txHash: string) => request<{ status: string }>(`/api/purchases/${purchaseId}/verify`, { method: 'POST', body: JSON.stringify({ txHash }) }),
  history: (wallet: string) => request<PurchaseView[]>(`/api/purchases?buyerWallet=${encodeURIComponent(wallet)}`),
}
