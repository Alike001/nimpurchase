export function paymentStatusCopy(status: string): string {
  switch (status) {
    case 'PAYMENT_PENDING': return 'Ready to pay'
    case 'PAYMENT_SUBMITTED': return 'Payment sent. Waiting for confirmation...'
    case 'PAYMENT_DETECTED': return 'Payment detected. Securing purchase...'
    case 'ACTIVE': return 'Purchase verified'
    case 'EXPIRED': return 'This checkout has expired. Ask the merchant for a new one.'
    case 'PAYMENT_MISMATCH': return 'This payment does not match this purchase. Contact the merchant for help.'
    case 'PAYMENT_FAILED': return 'We could not verify this payment. Please try again or contact the merchant.'
    default: return 'Checking your purchase…'
  }
}
