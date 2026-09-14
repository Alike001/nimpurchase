import { useEffect, useState } from 'react'
import { purchaseApi, type PurchaseView } from '../../lib/api'
import { getNimiqProvider, isProviderError } from '../../lib/nimiq-provider'

export function HistoryPage() {
  const [purchases, setPurchases] = useState<PurchaseView[]>(); const [error, setError] = useState<string>()
  useEffect(() => { void (async () => { try { const accounts = await (await getNimiqProvider()).listAccounts(); if (isProviderError(accounts) || !accounts[0]) throw new Error(); setPurchases(await purchaseApi.history(accounts[0])) } catch { setError('Open this page in Nimiq Pay to see your purchases.') } })() }, [])
  if (error) return <main className="app-shell"><p>{error}</p></main>
  if (!purchases) return <main className="app-shell"><p>Loading your purchases…</p></main>
  return <main className="app-shell"><p className="eyebrow">Your purchases</p><h1>Purchase history</h1>{purchases.length ? purchases.map((purchase) => <a className="purchase-card" href={`/purchases/${purchase.id}`} key={purchase.id}><strong>{purchase.itemSummary}</strong><br />{purchase.merchantName}</a>) : <p>No verified purchases yet.</p>}</main>
}
