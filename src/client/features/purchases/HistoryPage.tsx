import { useEffect, useState } from 'react'
import { purchaseApi, type PurchaseView } from '../../lib/api'
import { getNimiqProvider, isProviderError } from '../../lib/nimiq-provider'
import { formatNim } from '../../../shared/money'

export function HistoryPage() {
  const [purchases, setPurchases] = useState<PurchaseView[]>(); const [error, setError] = useState<string>()
  useEffect(() => { void (async () => { try { const accounts = await (await getNimiqProvider()).listAccounts(); if (isProviderError(accounts) || !accounts[0]) throw new Error(); setPurchases(await purchaseApi.history(accounts[0])) } catch { setError('Open this page in Nimiq Pay to see your purchases.') } })() }, [])
  if (error) return <main className="app-shell"><p className="eyebrow">Your purchases</p><h1>Open this in Nimiq Pay</h1><p>{error}</p></main>
  if (!purchases) return <main className="app-shell"><p className="eyebrow">Your purchases</p><h1>Loading your purchases…</h1></main>
  return <main className="app-shell history-page"><p className="eyebrow">Your purchases</p><h1>Purchase history</h1><p className="page-lede">Your verified purchase cards, ready when you need them.</p>{purchases.length ? <div className="history-list">{purchases.map((purchase) => <a className="history-item" href={`/purchases/${purchase.id}`} key={purchase.id}><div><strong>{purchase.itemSummary}</strong><span>{purchase.merchantName}</span></div><div className="history-amount"><strong>{formatNim(purchase.expectedAmountLuna)}</strong><span>Verified</span></div></a>)}</div> : <section className="empty-state"><h2>No verified purchases yet</h2><p>When you pay through a NimPurchase checkout, your purchase card will appear here.</p></section>}</main>
}
