import { CheckoutPage } from '../features/checkout/CheckoutPage'
import { PurchasePage } from '../features/purchases/PurchasePage'
import { HistoryPage } from '../features/purchases/HistoryPage'
import { MerchantPage } from '../features/merchant/MerchantPage'
import { PassportPreview } from '../features/purchases/PassportPreview'

export function App() {
  const checkoutMatch = window.location.pathname.match(/^\/checkout\/([^/]+)$/)
  if (checkoutMatch) return <CheckoutPage purchaseId={checkoutMatch[1]} />
  const purchaseMatch = window.location.pathname.match(/^\/purchases\/([^/]+)$/)
  if (purchaseMatch) return <PurchasePage purchaseId={purchaseMatch[1]} />
  if (window.location.pathname === '/purchases') return <HistoryPage />
  if (window.location.pathname === '/merchant') return <MerchantPage />
  return (
    <main className="landing">
      <a className="skip-link" href="#main-content">Skip to content</a><nav className="landing-nav" aria-label="Main navigation"><a className="wordmark" href="/"><span aria-hidden="true">⬡</span>NimPurchase</a><a className="nav-link" href="/merchant">Merchant workspace</a></nav>
      <section className="hero" id="main-content"><div className="hero-copy"><p className="eyebrow">NIM payments that keep working</p><h1>Pay once. You’re already a regular.</h1><p className="hero-lede">Every NIM payment becomes a verified purchase card with receipts, rewards and merchant support. No loyalty signup required.</p><ol className="hero-loop" aria-label="How NimPurchase works"><li><span>1</span>Pay the merchant</li><li><span>2</span>Payment is verified</li><li><span>3</span>Keep your Passport</li></ol><div className="hero-actions"><a className="primary" href="/merchant">Create a sale</a><a className="text-link" href="#how-it-works">See the loop</a></div><ul className="trust-list"><li>Paid directly to the merchant</li><li>Verified with Nimiq</li><li>No customer account to create</li></ul></div><PassportPreview /></section>
      <section className="flow" id="how-it-works" aria-labelledby="flow-heading"><p className="eyebrow">The Purchase Passport loop</p><h2 id="flow-heading">A payment that brings customers back.</h2><div className="flow-grid"><article><span>01</span><h3>Create a sale</h3><p>A merchant sets an item and NIM price, then shares one checkout.</p></article><article><span>02</span><h3>Pay directly</h3><p>Nimiq Pay confirms a direct payment to the merchant’s account.</p></article><article><span>03</span><h3>Keep the Passport</h3><p>The verified card carries a receipt, reward progress and support.</p></article></div></section>
    </main>
  )
}
