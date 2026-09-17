import { useEffect, useState } from 'react'
import { purchaseApi, type PurchaseView } from '../../lib/api'
import { getNimiqProvider, isProviderError } from '../../lib/nimiq-provider'
import { formatNim } from '../../../shared/money'
import { recentPassportIds } from './passport-storage'

function uniquePurchases(purchases: PurchaseView[]): PurchaseView[] {
  return [...new Map(purchases.map((purchase) => [purchase.id, purchase])).values()]
}

export function HistoryPage() {
  const [purchases, setPurchases] = useState<PurchaseView[]>(); const [walletUnavailable, setWalletUnavailable] = useState(false)
  useEffect(() => { void (async () => {
    const savedPassports = await Promise.all(recentPassportIds().map((id) => purchaseApi.get(id).catch(() => undefined)))
    let walletPurchases: PurchaseView[] = []
    try {
      const accounts = await (await getNimiqProvider()).listAccounts()
      if (isProviderError(accounts) || !accounts[0]) throw new Error()
      walletPurchases = await purchaseApi.history(accounts[0])
    } catch { setWalletUnavailable(true) }
    setPurchases(uniquePurchases([...walletPurchases, ...savedPassports.filter((purchase): purchase is PurchaseView => Boolean(purchase && purchase.status === 'ACTIVE'))]))
  })() }, [])
  if (!purchases) return <main className="app-shell product-page"><p className="eyebrow">Your Purchase Passports</p><div className="skeleton title-skeleton" /><div className="skeleton history-skeleton" /><div className="skeleton history-skeleton" /></main>
  const relationships = [...purchases.reduce((map, purchase) => map.set(purchase.merchantName, (map.get(purchase.merchantName) ?? 0) + 1), new Map<string, number>())].sort(([, a], [, b]) => b - a)
  const strongest = relationships[0]
  return <main className="app-shell product-page history-page"><header className="product-header"><a className="app-wordmark" href="/">⬡ NimPurchase</a><a href="/merchant">Merchant</a></header><p className="eyebrow">Your Purchase Passports</p><h1>Keep what you paid for.</h1><p className="page-lede">Receipts, rewards and support—ready when you need them.</p>{walletUnavailable && <p className="recovery-notice" role="status">We can’t read your wallet history right now. Passports opened on this device are still here.</p>}{strongest && <section className="relationship-card"><p>Your closest merchant</p><h2>{strongest[0]}</h2><strong>{strongest[1]} verified {strongest[1] === 1 ? 'purchase' : 'purchases'}</strong><a href={`/purchases/${purchases.find((purchase) => purchase.merchantName === strongest[0])?.id}`}>Open latest Passport →</a></section>}<section className="history-section"><div className="section-heading"><h2>Recent purchases</h2><span>{purchases.length} verified</span></div>{purchases.length ? <div className="history-list">{purchases.map((purchase) => <a className="history-item" href={`/purchases/${purchase.id}`} key={purchase.id}><div className="history-verified">✓</div><div><strong>{purchase.itemSummary}</strong><span>{purchase.merchantName}</span></div><div className="history-amount"><strong>{formatNim(purchase.expectedAmountLuna)}</strong><span>Passport</span></div></a>)}</div> : <section className="empty-state"><h2>Your first Passport is waiting</h2><p>Your verified NIM purchases will appear here after you pay. You can also reopen a checkout link to save its Passport on this device.</p></section>}</section></main>
}
