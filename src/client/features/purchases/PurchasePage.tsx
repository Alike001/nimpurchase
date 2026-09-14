import { useEffect, useState } from 'react'
import { purchaseApi, type PurchaseView } from '../../lib/api'
import { PurchaseCard } from './PurchaseCard'

export function PurchasePage({ purchaseId }: { purchaseId: string }) {
  const [purchase, setPurchase] = useState<PurchaseView>(); const [error, setError] = useState<string>()
  useEffect(() => { void purchaseApi.get(purchaseId).then(setPurchase).catch(() => setError('We could not reopen this purchase.')) }, [purchaseId])
  if (error) return <main className="app-shell"><p role="alert">{error}</p></main>
  if (!purchase) return <main className="app-shell"><p>Loading your purchase…</p></main>
  return <main className="app-shell"><PurchaseCard purchase={purchase} /></main>
}
