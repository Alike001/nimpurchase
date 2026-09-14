import { useEffect, useState } from 'react'
import { purchaseApi, type PurchaseView } from '../../lib/api'
import { getNimiqProvider, isProviderError } from '../../lib/nimiq-provider'
import { formatNim } from '../../../shared/money'

export function HistoryPage() {
  const [purchases, setPurchases] = useState<PurchaseView[]>(); const [error, setError] = useState<string>()
  useEffect(() => { void (async () => { try { const accounts = await (await getNimiqProvider()).listAccounts(); if (isProviderError(accounts) || !accounts[0]) throw new Error(); setPurchases(await purchaseApi.history(accounts[0])) } catch { setError('Open this page in Nimiq Pay to see your purchases.') } })() }, [])
  if (error) return <main className="app-shell product-page"><p className="eyebrow">Your Purchase Passports</p><h1>Open in Nimiq Pay</h1><p>{error}</p></main>
  if (!purchases) return <main className="app-shell product-page"><p className="eyebrow">Your Purchase Passports</p><div className="skeleton title-skeleton" /><div className="skeleton history-skeleton" /><div className="skeleton history-skeleton" /></main>
  const relationships = [...purchases.reduce((map, purchase) => map.set(purchase.merchantName, (map.get(purchase.merchantName) ?? 0) + 1), new Map<string, number>())].sort(([, a], [, b]) => b - a)
  const strongest = relationships[0]
  return <main className="app-shell product-page history-page"><header className="product-header"><a className="app-wordmark" href="/">⬡ NimPurchase</a><a href="/merchant">Merchant</a></header><p className="eyebrow">Your Purchase Passports</p><h1>Keep what you paid for.</h1><p className="page-lede">Receipts, rewards and support—ready when you need them.</p>{strongest && <section className="relationship-card"><p>Your closest merchant</p><h2>{strongest[0]}</h2><strong>{strongest[1]} verified {strongest[1] === 1 ? 'purchase' : 'purchases'}</strong><a href={`/purchases/${purchases.find((purchase) => purchase.merchantName === strongest[0])?.id}`}>Open latest Passport →</a></section>}<section className="history-section"><div className="section-heading"><h2>Recent purchases</h2><span>{purchases.length} verified</span></div>{purchases.length ? <div className="history-list">{purchases.map((purchase) => <a className="history-item" href={`/purchases/${purchase.id}`} key={purchase.id}><div className="history-verified">✓</div><div><strong>{purchase.itemSummary}</strong><span>{purchase.merchantName}</span></div><div className="history-amount"><strong>{formatNim(purchase.expectedAmountLuna)}</strong><span>Passport</span></div></a>)}</div> : <section className="empty-state"><h2>Your first Passport is waiting</h2><p>Your verified NIM purchases will appear here.</p></section>}</section></main>
}
