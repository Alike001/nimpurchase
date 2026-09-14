import { CheckoutPage } from '../features/checkout/CheckoutPage'
import { PurchasePage } from '../features/purchases/PurchasePage'
import { HistoryPage } from '../features/purchases/HistoryPage'

export function App() {
  const checkoutMatch = window.location.pathname.match(/^\/checkout\/([^/]+)$/)
  if (checkoutMatch) return <CheckoutPage purchaseId={checkoutMatch[1]} />
  const purchaseMatch = window.location.pathname.match(/^\/purchases\/([^/]+)$/)
  if (purchaseMatch) return <PurchasePage purchaseId={purchaseMatch[1]} />
  if (window.location.pathname === '/purchases') return <HistoryPage />
  return (
    <main className="app-shell">
      <p className="eyebrow">NimPurchase</p>
      <h1>Keep every purchase useful.</h1>
      <p>
        Pay a merchant directly with NIM, then keep a verified purchase card with support and reward progress.
      </p>
    </main>
  )
}
