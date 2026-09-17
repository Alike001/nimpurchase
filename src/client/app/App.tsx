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
  if (window.location.pathname === '/privacy') return <PrivacyPage />
  if (window.nimiqPay || window.nimiq) return <HistoryPage />
  return (
    <main className="landing">
      <a className="skip-link" href="#main-content">Skip to content</a><nav className="landing-nav" aria-label="Main navigation"><a className="wordmark" href="/"><span aria-hidden="true">⬡</span>NimPurchase</a><a className="nav-link" href="/merchant">Merchant workspace</a></nav>
      <section className="hero" id="main-content"><div className="hero-copy"><p className="eyebrow">NIM payments that keep working</p><h1>Pay once. You’re already a regular.</h1><p className="hero-lede">Every NIM payment becomes a verified purchase card with receipts, rewards and merchant support. No loyalty signup required.</p><ol className="hero-loop" aria-label="How NimPurchase works"><li><span>1</span>Pay the merchant</li><li><span>2</span>Payment is verified</li><li><span>3</span>Keep your Passport</li></ol><div className="hero-actions"><a className="primary" href="/merchant">Create a sale</a><a className="text-link" href="#how-it-works">See the loop</a></div><ul className="trust-list"><li>Paid directly to the merchant</li><li>Verified with Nimiq</li><li>No customer account to create</li></ul></div><PassportPreview /></section>
      <section className="flow" id="how-it-works" aria-labelledby="flow-heading"><p className="eyebrow">The Purchase Passport loop</p><h2 id="flow-heading">A payment that brings customers back.</h2><div className="flow-grid"><article><span>01</span><h3>Create a sale</h3><p>A merchant sets an item and NIM price, then shares one checkout.</p></article><article><span>02</span><h3>Pay directly</h3><p>Nimiq Pay confirms a direct payment to the merchant’s account.</p></article><article><span>03</span><h3>Keep the Passport</h3><p>The verified card carries a receipt, reward progress and support.</p></article></div></section>
      <footer className="landing-footer"><span>Payments go directly to merchants.</span><a href="/privacy">Privacy</a></footer>
    </main>
  )
}

function PrivacyPage() {
  return <main className="app-shell product-page privacy-page">
    <header className="product-header"><a className="app-wordmark" href="/">⬡ NimPurchase</a></header>
    <p className="eyebrow">Privacy</p>
    <h1>Clear data, direct payments.</h1>
    <p className="page-intro">NimPurchase never holds NIM, private keys, seed phrases, or wallet passwords.</p>
    <section className="privacy-section"><h2>What NimPurchase stores</h2><p>To create a Purchase Passport, the app stores the merchant receiving address, purchase details, NIM amount, compact purchase reference, transaction hash, on-chain buyer address, reward progress, and any support messages.</p></section>
    <section className="privacy-section"><h2>Why it is stored</h2><p>This information lets the app independently verify a direct NIM payment, reopen a purchase card, calculate merchant-specific rewards, and connect support to the correct purchase.</p></section>
    <section className="privacy-section"><h2>What never happens</h2><p>Your payment is sent directly to the merchant. NimPurchase cannot reverse a transfer, access your wallet, or move funds on your behalf. Wallet signatures only prove control of a receiving address for merchant access.</p></section>
    <section className="privacy-section"><h2>Your choices</h2><p>Only create support messages you want the merchant to receive. For a question about a purchase record or support request, contact the relevant merchant through the Purchase Passport.</p></section>
  </main>
}
