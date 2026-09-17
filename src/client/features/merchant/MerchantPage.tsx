import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { LUNA_PER_NIM } from '../../../shared/money'
import { getNimiqProvider, isProviderError, userFacingSigningError } from '../../lib/nimiq-provider'

type Sale = {
  id: string
  itemSummary: string
  merchantName: string
  expectedAmountLuna: number
  buyerWallet?: string
  purchasedAt?: string
  status: string
}

type SupportRequest = {
  id: string
  purchaseId: string
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED'
  message: string
  createdAt: string
}

type MerchantSession = { id: string; displayName: string; walletAddress: string }
type AuthChallenge = { challengeId: string; message: string; expiresAt: string }

const merchantStorageKey = 'nimpurchase:merchant-id'

const saleStatusLabel = (status: string) => ({
  PAYMENT_PENDING: 'Waiting for payment', PAYMENT_SUBMITTED: 'Payment sent',
  PAYMENT_DETECTED: 'Securing purchase', ACTIVE: 'Verified sale', EXPIRED: 'Expired',
  PAYMENT_MISMATCH: 'Needs attention', PAYMENT_FAILED: 'Payment failed', CANCELLED: 'Cancelled',
}[status] ?? status)

const supportStatusLabel = (status: SupportRequest['status']) => ({
  OPEN: 'Open', IN_REVIEW: 'In review', RESOLVED: 'Resolved',
}[status])

async function jsonResponse<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error || 'The request could not be completed.')
  return body
}

function merchantApi(path: string, init?: RequestInit): Promise<Response> {
  return fetch(path, { credentials: 'include', ...init })
}

export function MerchantPage() {
  const [merchantId, setMerchantId] = useState(() => window.localStorage.getItem(merchantStorageKey) ?? '')
  const [merchantName, setMerchantName] = useState('')
  const [merchantWallet, setMerchantWallet] = useState('')
  const [link, setLink] = useState('')
  const [error, setError] = useState('')
  const [sales, setSales] = useState<Sale[]>([])
  const [support, setSupport] = useState<SupportRequest[]>([])
  const [copied, setCopied] = useState(false)
  const [accounts, setAccounts] = useState<string[]>([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [manualEntry, setManualEntry] = useState(false)
  const [authenticating, setAuthenticating] = useState(false)

  function clearMerchant(message = ''): void {
    window.localStorage.removeItem(merchantStorageKey)
    setMerchantId('')
    setMerchantName('')
    setMerchantWallet('')
    setSales([])
    setSupport([])
    setLink('')
    setError(message)
  }

  async function loadWorkspace(): Promise<void> {
    if (!merchantId) return
    const [sessionResponse, salesResponse, supportResponse] = await Promise.all([
      merchantApi('/api/merchant-auth/session'),
      merchantApi(`/api/merchants/${merchantId}/purchases`),
      merchantApi(`/api/merchants/${merchantId}/support`),
    ])
    if (sessionResponse.status === 401 || salesResponse.status === 401 || supportResponse.status === 401) {
      clearMerchant('Confirm your receiving account to reopen this workspace.')
      return
    }
    const session = await jsonResponse<MerchantSession>(sessionResponse)
    const nextSales = await jsonResponse<Sale[]>(salesResponse)
    const nextSupport = await jsonResponse<SupportRequest[]>(supportResponse)
    setSales(nextSales)
    setSupport(nextSupport)
    setMerchantName(session.displayName)
    setMerchantWallet(session.walletAddress)
  }

  useEffect(() => {
    void loadWorkspace().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'We could not refresh your merchant workspace.')
    })
  }, [merchantId, link])

  useEffect(() => {
    if (merchantId) return
    void (async () => {
      try {
        const listed = await (await getNimiqProvider()).listAccounts()
        if (isProviderError(listed) || !listed.length) {
          setManualEntry(true)
          return
        }
        setAccounts(listed)
        setSelectedAccount(listed[0])
      } catch {
        setManualEntry(true)
      }
    })()
  }, [merchantId])

  async function authenticateMerchant(form: HTMLFormElement): Promise<void> {
    const data = new FormData(form)
    const displayName = String(data.get('name') ?? '').trim()
    const manualWallet = String(data.get('wallet') ?? '').trim()
    const walletAddress = manualEntry ? manualWallet : selectedAccount
    if (!displayName || !walletAddress) throw new Error('Enter a business name and choose a receiving account.')

    setAuthenticating(true)
    try {
      const challenge = await jsonResponse<AuthChallenge>(await merchantApi('/api/merchant-auth/challenge', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName, walletAddress }),
      }))
      const signed = await (await getNimiqProvider()).sign(challenge.message)
      if (isProviderError(signed)) throw signed
      const merchant = await jsonResponse<MerchantSession>(await merchantApi('/api/merchant-auth/verify', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ challengeId: challenge.challengeId, publicKey: signed.publicKey, signature: signed.signature }),
      }))
      window.localStorage.setItem(merchantStorageKey, merchant.id)
      setMerchantName(merchant.displayName)
      setMerchantWallet(merchant.walletAddress)
      setMerchantId(merchant.id)
      setError('')
    } catch (reason) {
      if (isProviderError(reason) || (reason instanceof Error && /denied|reject|cancel/i.test(reason.message))) {
        throw new Error(userFacingSigningError(reason), { cause: reason })
      }
      throw reason
    } finally {
      setAuthenticating(false)
    }
  }

  async function checkout(form: HTMLFormElement): Promise<void> {
    const data = new FormData(form)
    const nim = Number(data.get('price'))
    if (!Number.isFinite(nim) || !Number.isSafeInteger(nim * LUNA_PER_NIM)) {
      throw new Error('Enter a price with at most five decimal places.')
    }
    const body = await jsonResponse<{ checkoutPath: string; checkoutUrl?: string }>(await merchantApi(`/api/merchants/${merchantId}/purchases`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        itemName: data.get('item'), description: data.get('description'),
        priceLuna: Math.round(nim * LUNA_PER_NIM), warrantyNote: data.get('note'),
        threshold: Number(data.get('threshold')) || 5, rewardDescription: data.get('reward'),
      }),
    }))
    setLink(body.checkoutUrl ?? `${window.location.origin}${body.checkoutPath}`)
    form.reset()
  }

  async function updateSupport(requestId: string, status: SupportRequest['status']): Promise<void> {
    await jsonResponse(await merchantApi(`/api/merchants/${merchantId}/support/${requestId}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }),
    }))
    await loadWorkspace()
  }

  async function switchMerchant(): Promise<void> {
    await merchantApi('/api/merchant-auth/logout', { method: 'POST' }).catch(() => undefined)
    clearMerchant()
  }

  const submit = (fn: (form: HTMLFormElement) => Promise<void>) => (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    void fn(event.currentTarget).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'The request could not be completed.')
    })
  }

  const activeSales = sales.filter((sale) => sale.status === 'ACTIVE')
  const activeToday = activeSales.filter((sale) => sale.purchasedAt && new Date(sale.purchasedAt).toDateString() === new Date().toDateString())
  const todayLuna = activeToday.reduce((sum, sale) => sum + sale.expectedAmountLuna, 0)
  const returning = new Set(activeToday
    .filter((sale) => sale.buyerWallet && activeSales.filter((other) => other.buyerWallet === sale.buyerWallet).length > 1)
    .map((sale) => sale.buyerWallet)).size
  const abbreviatedWallet = merchantWallet ? `${merchantWallet.slice(0, 9)}…${merchantWallet.slice(-4)}` : ''

  return <main className="app-shell merchant-page product-page">
    <header className="product-header">
      <a className="app-wordmark" href="/">⬡ NimPurchase</a>
      {merchantId && <button className="quiet-button" onClick={() => void switchMerchant()}>Switch merchant</button>}
    </header>
    <p className="eyebrow">Merchant workspace</p>
    <h1>{merchantId ? `Hello, ${merchantName || sales[0]?.merchantName || 'merchant'}.` : 'Sell directly with NIM.'}</h1>
    {merchantId && abbreviatedWallet && <p className="merchant-account">Receiving to <span>{abbreviatedWallet}</span></p>}
    <p className="page-intro">Create a sale, share one checkout, and give customers a Purchase Passport after they pay.</p>

    {!merchantId ? <form className="form-card merchant-onboarding" onSubmit={submit(authenticateMerchant)}>
      <h2>Set up your receiving account</h2>
      <label>Business name<input name="name" placeholder="Alike Coffee" required /></label>
      {accounts.length > 0 && !manualEntry
        ? <label>Receiving account
          <select value={selectedAccount} onChange={(event) => setSelectedAccount(event.target.value)}>
            {accounts.map((account) => <option value={account} key={account}>{account}</option>)}
          </select>
          <em>Payment goes directly to this Nimiq account.</em>
        </label>
        : <label>Nimiq receiving address<input name="wallet" placeholder="NQ…" required /></label>}
      <button disabled={authenticating}>{authenticating ? 'Confirming account…' : 'Confirm with Nimiq Pay'}</button>
      {accounts.length > 0 && <button className="text-button" type="button" onClick={() => {
        setManualEntry((value) => !value)
        setSelectedAccount(manualEntry ? accounts[0] : '')
      }}>{manualEntry ? 'Use a Nimiq Pay account' : 'Enter an address manually'}</button>}
      {manualEntry && <p className="form-help">Manual addresses still require confirmation in Nimiq Pay. NimPurchase never accesses your private key.</p>}
    </form> : <>
      <section className="today-strip" aria-label="Today’s real activity">
        <div><span>Verified today</span><strong>{activeToday.length}</strong></div>
        <div><span>NIM received today</span><strong>{todayLuna / LUNA_PER_NIM} NIM</strong></div>
        <div><span>Returning today</span><strong>{returning}</strong></div>
      </section>
      <form className="form-card sale-form" onSubmit={submit(checkout)}>
        <div className="form-title"><p className="eyebrow">New sale</p><h2>Create a checkout in seconds</h2></div>
        <label>Item name<input name="item" placeholder="Flat white" required /></label>
        <label>Price in NIM<input name="price" inputMode="decimal" placeholder="1.50" required /></label>
        <details><summary>Add receipt details <em>optional</em></summary>
          <label>Short description<input name="description" placeholder="A creamy double espresso" /></label>
          <label>Warranty or return note<input name="note" placeholder="Ask us within 7 days" /></label>
        </details>
        <details><summary>Add a loyalty reward <em>optional</em></summary>
          <label>Purchases needed<input name="threshold" inputMode="numeric" placeholder="5" /></label>
          <label>Reward description<input name="reward" placeholder="Free coffee" /></label>
        </details>
        <button>Create checkout</button>
      </form>
      {link && <section className="ready-to-sell">
        <div className="ready-qr"><QRCodeSVG value={link} size={176} level="M" title="Checkout QR code" /></div>
        <div><p className="eyebrow">Ready to sell</p><h2>Show this QR to your customer</h2><p>The checkout opens directly. Payment goes to your Nimiq account.</p>
          <div className="share-actions">
            <button onClick={() => void navigator.clipboard.writeText(link).then(() => setCopied(true))}>{copied ? 'Link copied' : 'Copy link'}</button>
            {navigator.share && <button className="quiet-button" onClick={() => void navigator.share({ title: 'NimPurchase checkout', url: link })}>Share checkout</button>}
            <a className="text-link" href={link}>Open checkout</a>
          </div>
        </div>
      </section>}
      <section className="sales-section">
        <div className="section-heading"><div><p className="eyebrow">Sales</p><h2>Recent purchases</h2></div><span>{activeSales.length} verified</span></div>
        {sales.length ? <ul className="sales-list">{sales.map((sale) => <li key={sale.id}>
          <span className="sale-status-dot" /><div><strong>{sale.itemSummary}</strong><small>{saleStatusLabel(sale.status)}{sale.buyerWallet && activeSales.filter((other) => other.buyerWallet === sale.buyerWallet).length > 1 ? ' · Returning customer' : ''}</small></div><strong>{sale.expectedAmountLuna / LUNA_PER_NIM} NIM</strong>
        </li>)}</ul> : <p className="empty-copy">Create your first checkout. Payment goes directly to your Nimiq account.</p>}
      </section>
      <section className="support-inbox">
        <p className="eyebrow">Customer support</p><h2>Support requests</h2>
        {support.length ? <ul className="support-list">{support.map((request) => <li key={request.id}>
          <div><p className="support-message">{request.message}</p><small>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(request.createdAt))}</small></div>
          <label className="support-status">Status<select value={request.status} onChange={(event) => void updateSupport(request.id, event.target.value as SupportRequest['status']).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'We could not update this support request.'))}><option value="OPEN">{supportStatusLabel('OPEN')}</option><option value="IN_REVIEW">{supportStatusLabel('IN_REVIEW')}</option><option value="RESOLVED">{supportStatusLabel('RESOLVED')}</option></select></label>
        </li>)}</ul> : <p className="empty-copy">No support requests yet. Customers can contact you from a verified purchase card.</p>}
      </section>
    </>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </main>
}
