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
      void purchaseApi.verify(purchaseId, txHash).then(({ status }) => { setError(undefined); setPurchase((current) => current && { ...current, status }) }).catch(() => setError('We can’t verify this payment yet. Your payment hasn’t been lost. We’ll keep checking.'))
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

  if (error && !purchase) return <main className="app-shell checkout-page"><p role="alert">{error}</p><button onClick={() => window.location.reload()}>Try again</button></main>
  if (!purchase) return <main className="app-shell checkout-page"><p className="eyebrow">NimPurchase</p><h1>Loading your checkout…</h1></main>
  const completed = purchase.status === 'ACTIVE'
  const status = isPaying ? 'Confirm payment in Nimiq Pay' : paymentStatusCopy(purchase.status)
  return <main className="app-shell checkout-page"><a className="back-link" href="/">NimPurchase</a><section className="checkout-card"><p className="eyebrow">{purchase.merchantName}</p><h1>{purchase.itemSummary}</h1>{purchase.itemDescription && <p className="checkout-description">{purchase.itemDescription}</p>}<p className="checkout-direction">Paying this merchant directly</p><p className="amount checkout-amount">{formatNim(purchase.expectedAmountLuna)}</p><div className={`payment-status status-${purchase.status.toLowerCase()}`} aria-live="polite"><span aria-hidden="true" />{status}</div>
    {!completed && <button className="primary checkout-button" disabled={isPaying || purchase.status !== 'PAYMENT_PENDING'} onClick={() => void pay()}>{isPaying ? 'Waiting for approval…' : 'Pay with NIM'}</button>}
    {completed && <div className="checkout-actions"><a className="primary checkout-button" href={`/purchases/${purchase.id}`}>Open purchase card</a><a className="text-link" href="/purchases">View purchase history</a></div>}
    {purchase.status === 'PAYMENT_PENDING' && <p className="checkout-reassurance">NimPurchase never holds your money.</p>}
    {error && <p className="checkout-error" role="alert">{error}</p>}
  </section>
  </main>
}
