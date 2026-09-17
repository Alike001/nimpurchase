import { formatNim } from '../../../shared/money'
import { useState } from 'react'
import type { PurchaseView } from '../../lib/api'
import { purchaseApi } from '../../lib/api'

export function PurchaseCard({ purchase }: { purchase: PurchaseView }) {
  const [message, setMessage] = useState(''); const [notice, setNotice] = useState(''); const [sending, setSending] = useState(false)
  const progress = Math.min(purchase.reward.current, purchase.reward.threshold); const remaining = Math.max(purchase.reward.threshold - progress, 0); const unlocked = progress >= purchase.reward.threshold
  const purchaseDate = purchase.purchasedAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(purchase.purchasedAt)) : undefined
  async function support() {
    setSending(true); setNotice('')
    try {
      await purchaseApi.sendSupport(purchase.id, message.trim())
      setNotice('Support request sent to the merchant.')
      setMessage('')
    } catch (reason) {
      setNotice(reason instanceof Error && /too many support requests/i.test(reason.message)
        ? 'Please wait a few minutes before sending another message.'
        : 'We could not send your request. Please try again.')
    } finally { setSending(false) }
  }
  return <article className="passport purchase-receipt"><div className="passport-notch" aria-hidden="true" /><p className="passport-kicker"><span className="verified-mark">✓</span> Verified with Nimiq</p><p className="passport-merchant">{purchase.merchantName}</p><h1>{purchase.itemSummary}</h1>{purchase.itemDescription && <p className="item-description">{purchase.itemDescription}</p>}<div className="passport-price"><strong>{formatNim(purchase.expectedAmountLuna)}</strong>{purchaseDate && <span>{purchaseDate}</span>}</div>
    <section className={`passport-stamps ${unlocked ? 'reward-unlocked' : ''}`} aria-label="Reward progress"><div><span>{unlocked ? 'Reward unlocked' : 'Loyalty stamps'}</span><strong aria-label={`${progress} of ${purchase.reward.threshold} purchases`}>{Array.from({ length: purchase.reward.threshold }, (_, index) => <i className={index < progress ? 'stamp-filled' : ''} key={index}>⬢</i>)}</strong></div><p>{unlocked ? <><b>✓ Reward unlocked</b> · {purchase.reward.description}</> : <>{progress} of {purchase.reward.threshold} purchases · {remaining} more → {purchase.reward.description}</>}</p></section>
    {(purchaseDate || purchase.warrantyNote || purchase.returnNote) && <section className="receipt-notes" aria-label="Purchase details"><p className="section-label">Purchase details</p>{purchaseDate && <p><span>Date</span>{purchaseDate}</p>}{purchase.warrantyNote && <p><span>Warranty</span>{purchase.warrantyNote}</p>}{purchase.returnNote && <p><span>Returns</span>{purchase.returnNote}</p>}</section>}
    <details className="transaction-details"><summary>Transaction details</summary><p>Verified direct NIM payment</p><p className="reference">Reference: {purchase.chainReference}</p></details><section className="support-panel" aria-labelledby="support-heading"><p className="section-label" id="support-heading">Need help?</p><p>Send a message to {purchase.merchantName} from this verified Purchase Passport. Your payment stays direct and cannot be reversed here.</p><label htmlFor="support-message">Your message</label><textarea id="support-message" value={message} maxLength={1000} onChange={(event) => setMessage(event.target.value)} placeholder="How can the merchant help?" /><button disabled={!message.trim() || sending} onClick={() => void support()}>{sending ? 'Sending…' : 'Get support'}</button>{notice && <p className="support-notice" role="status">{notice}</p>}</section>
  </article>
}
