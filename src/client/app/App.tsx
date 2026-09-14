import { CheckoutPage } from '../features/checkout/CheckoutPage'
import { PurchasePage } from '../features/purchases/PurchasePage'
import { HistoryPage } from '../features/purchases/HistoryPage'
import { MerchantPage } from '../features/merchant/MerchantPage'
import heroImage from '../assets/nimpurchase-hero.png'

export function App() {
  const checkoutMatch = window.location.pathname.match(/^\/checkout\/([^/]+)$/)
  if (checkoutMatch) return <CheckoutPage purchaseId={checkoutMatch[1]} />
  const purchaseMatch = window.location.pathname.match(/^\/purchases\/([^/]+)$/)
  if (purchaseMatch) return <PurchasePage purchaseId={purchaseMatch[1]} />
  if (window.location.pathname === '/purchases') return <HistoryPage />
  if (window.location.pathname === '/merchant') return <MerchantPage />
  return (
    <main className="landing">
      <nav className="landing-nav" aria-label="Main navigation"><a className="wordmark" href="/">NimPurchase</a><a className="nav-link" href="/merchant">For merchants</a></nav>
      <section className="hero">
        <div className="hero-copy"><p className="eyebrow">Direct payment. Useful after.</p><h1>Keep every purchase useful.</h1><p className="hero-lede">Pay a merchant directly with NIM. NimPurchase keeps your verified receipt, support, and reward progress in one card.</p><div className="hero-actions"><a className="primary" href="/merchant">Create a checkout</a><a className="text-link" href="#how-it-works">See how it works</a></div><p className="trust-note">Your money goes straight to the merchant. NimPurchase never holds it.</p></div>
        <img className="hero-image" src={heroImage} alt="Coffee and a printed purchase receipt on a café counter" />
      </section>
      <section className="flow" id="how-it-works" aria-labelledby="flow-heading"><p className="eyebrow">How it works</p><h2 id="flow-heading">A purchase that stays useful.</h2><div className="flow-grid"><article><span>01</span><h3>Merchant creates checkout</h3><p>Set an item and NIM price, then share one compact link.</p></article><article><span>02</span><h3>Customer pays directly</h3><p>Nimiq Pay asks the customer to approve payment to the merchant wallet.</p></article><article><span>03</span><h3>Purchase becomes useful</h3><p>After verification, the card keeps receipt, support, and loyalty progress together.</p></article></div></section>
    </main>
  )
}
