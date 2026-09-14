import { formatNim } from '../../../shared/money'
import { useState } from 'react'
import type { PurchaseView } from '../../lib/api'

export function PurchaseCard({ purchase }: { purchase: PurchaseView }) {
  const [message, setMessage] = useState(''); const [notice, setNotice] = useState(''); const [sending, setSending] = useState(false)
  const progress = Math.min(purchase.reward.current, purchase.reward.threshold)
  const purchaseDate = purchase.purchasedAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(purchase.purchasedAt)) : undefined
  async function support() {
    setSending(true); setNotice('')
    try {
      const response = await fetch(`/api/purchases/${purchase.id}/support`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ buyerWallet: purchase.buyerWallet, message }) })
      setNotice(response.ok ? 'Support request sent to the merchant.' : 'We could not send your request. Please try again.')
      if (response.ok) setMessage('')
    } catch { setNotice('We could not send your request. Please try again.') } finally { setSending(false) }
  }
  return <article className="purchase-card purchase-receipt"><p className="eyebrow">Verified with Nimiq</p><h1>{purchase.itemSummary}</h1><p className="merchant-name">{purchase.merchantName}</p><p className="amount">{formatNim(purchase.expectedAmountLuna)}</p>
    <section className="reward-panel" aria-label="Reward progress"><div><p className="section-label">Your reward progress</p><strong>{progress} of {purchase.reward.threshold} purchases</strong></div><progress value={progress} max={purchase.reward.threshold}>{progress} of {purchase.reward.threshold}</progress><p>{purchase.reward.description}</p></section>
    {(purchaseDate || purchase.warrantyNote || purchase.returnNote) && <section className="receipt-notes" aria-label="Purchase details"><p className="section-label">Purchase details</p>{purchaseDate && <p><span>Date</span>{purchaseDate}</p>}{purchase.warrantyNote && <p><span>Warranty</span>{purchase.warrantyNote}</p>}{purchase.returnNote && <p><span>Returns</span>{purchase.returnNote}</p>}</section>}
    <section className="support-panel" aria-labelledby="support-heading"><p className="section-label" id="support-heading">Need help?</p><p>Send a message to {purchase.merchantName}. Your payment stays direct and cannot be reversed here.</p><label htmlFor="support-message">Your message</label><textarea id="support-message" value={message} maxLength={1000} onChange={(event) => setMessage(event.target.value)} placeholder="How can the merchant help?" /><button disabled={!message.trim() || sending} onClick={() => void support()}>{sending ? 'Sending…' : 'Get support'}</button>{notice && <p className="support-notice" role="status">{notice}</p>}</section>
  </article>
}
