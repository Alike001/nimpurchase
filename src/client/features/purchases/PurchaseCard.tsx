import { formatNim } from '../../../shared/money'
import { useState } from 'react'
import type { PurchaseView } from '../../lib/api'

export function PurchaseCard({ purchase }: { purchase: PurchaseView }) {
  const [message, setMessage] = useState(''); const [notice, setNotice] = useState('')
  async function support() { const response = await fetch(`/api/purchases/${purchase.id}/support`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ buyerWallet: purchase.buyerWallet, message }) }); setNotice(response.ok ? 'Support request sent.' : 'We could not send your request.') }
  return <article className="purchase-card"><p className="eyebrow">Verified with Nimiq</p><h1>{purchase.itemSummary}</h1><p>{purchase.merchantName}</p><p className="amount">{formatNim(purchase.expectedAmountLuna)}</p><p>Reward progress: {purchase.reward.current}/{purchase.reward.threshold}</p><p>{purchase.reward.description}</p><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="How can the merchant help?" /><button disabled={!message.trim()} onClick={() => void support()}>Get support</button>{notice && <p>{notice}</p>}</article>
}
