import { useEffect, useState } from 'react'
import { formatNim } from '../../../shared/money'
import { purchaseApi, type PurchaseView } from '../../lib/api'
import { getNimiqProvider, isProviderError, userFacingWalletError } from '../../lib/nimiq-provider'
import { paymentStatusCopy } from '../purchases/status-copy'

export function CheckoutPage({ purchaseId }: { purchaseId: string }) {
  const [purchase, setPurchase] = useState<PurchaseView>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<string>()
  const [isPaying, setIsPaying] = useState(false)

  useEffect(() => { void purchaseApi.get(purchaseId).then(setPurchase).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not load checkout.')) }, [purchaseId])
  useEffect(() => {
    if (!purchase || !['PAYMENT_SUBMITTED', 'PAYMENT_DETECTED'].includes(purchase.status)) return
    const poll = () => {
      void purchaseApi.verify(purchaseId, txHash).then(({ status }) => setPurchase((current) => current && { ...current, status })).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'We could not check your payment yet.'))
    }
    poll()
    const timer = window.setInterval(poll, 3_000)
    return () => window.clearInterval(timer)
  }, [purchase, purchaseId, txHash])

  async function pay(): Promise<void> {
    if (!purchase) return
    setError(undefined); setIsPaying(true)
    try {
      const provider = await getNimiqProvider()
      const result = await provider.sendBasicTransactionWithData({ recipient: purchase.merchantWallet, value: purchase.expectedAmountLuna, data: purchase.chainReference })
      if (isProviderError(result)) throw result
      setTxHash(result)
      const submitted = await purchaseApi.submit(purchase.id, result)
      setPurchase({ ...purchase, status: submitted.status })
    } catch (reason) { setError(userFacingWalletError(reason)) } finally { setIsPaying(false) }
  }

  if (error && !purchase) return <main className="app-shell"><p role="alert">{error}</p><button onClick={() => window.location.reload()}>Try again</button></main>
  if (!purchase) return <main className="app-shell"><p>Loading your purchase…</p></main>
  const completed = purchase.status === 'ACTIVE'
  return <main className="app-shell"><p className="eyebrow">{purchase.merchantName}</p><h1>{purchase.itemSummary}</h1><p className="amount">{formatNim(purchase.expectedAmountLuna)}</p><p aria-live="polite">{isPaying ? 'Confirm payment in Nimiq Pay' : paymentStatusCopy(purchase.status)}</p>
    {!completed && <button className="primary" disabled={isPaying || purchase.status !== 'PAYMENT_PENDING'} onClick={() => void pay()}>{isPaying ? 'Waiting for approval…' : 'Pay with NIM'}</button>}
    {completed && <a className="primary" href={`/purchases/${purchase.id}`}>Open purchase card</a>}
    {error && <p role="alert">{error}</p>}
  </main>
}
