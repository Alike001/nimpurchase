import { formatNim } from '../../../shared/money'
import type { PurchaseView } from '../../lib/api'

export function PurchaseCard({ purchase }: { purchase: PurchaseView }) {
  return <article className="purchase-card"><p className="eyebrow">Verified with Nimiq</p><h1>{purchase.itemSummary}</h1><p>{purchase.merchantName}</p><p className="amount">{formatNim(purchase.expectedAmountLuna)}</p><p>Reward progress: {purchase.reward.current}/{purchase.reward.threshold}</p><p>{purchase.reward.description}</p><button>Get support</button></article>
}
