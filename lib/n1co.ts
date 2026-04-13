const N1CO_BASE_URL =
  process.env.N1CO_ENV === 'live'
    ? 'https://api.n1co.com/api/v3'
    : 'https://api-sandbox.n1co.shop/api/v3'

const CLIENT_ID = process.env.NEXT_PUBLIC_N1CO_CLIENT_ID
const CLIENT_SECRET = process.env.N1CO_CLIENT_SECRET

export interface N1COProduct {
  id: string
  name: string
  description: string
  price: number
  currency: string
  image?: string
  category?: string
  metadata?: Record<string, string>
}

export interface N1COProductSync {
  sku: string
  name: string
  description: string
  extraDescription: string
  stock: number
  price: number
  collections: string[]
  image: string
  enabled: boolean
  salesChannels: string[]
  locations: Array<{
    locationCode: string
    isAvailable: boolean
  }>
  modifiers: Array<{
    code: string
    name: string
    description: string
    minOptions: number
    maxOptions: number
    isActive: boolean
    disabledLocations: string[]
    options: string[]
    order: number
  }>
  images: string[]
}

export interface N1COCollection {
  code: string
  name: string
  description: string
  image: string
  parentCode: string
}

export interface N1COPaymentSession {
  id: string
  sessionToken: string
  redirectUrl: string
  status: string
}

export interface N1COTransaction {
  id: string
  amount: number
  currency: string
  status: 'pending' | 'approved' | 'declined' | 'canceled'
  metadata?: Record<string, string>
}

function isN1COConfigured(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET)
}

async function getAccessToken(): Promise<string> {
  if (!isN1COConfigured()) {
    throw new Error('N1CO credentials not configured')
  }

  const response = await fetch(`${N1CO_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
    }),
  })

  if (!response.ok) {
    throw new Error(`N1CO auth failed: ${response.statusText}`)
  }

  const data = (await response.json()) as { access_token: string }
  return data.access_token
}

/**
 * Sync products to N1CO. Creates new products or updates existing ones by SKU.
 */
export async function syncProducts(
  products: N1COProductSync[],
  collections: N1COCollection[] = [],
) {
  const token = await getAccessToken()

  const response = await fetch(`${N1CO_BASE_URL}/Products/Sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ products, collections }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`N1CO product sync failed (${response.status}): ${body}`)
  }

  return response.json()
}

export async function createPaymentSession(params: {
  amount: number
  currency: string
  orderId: string
  returnUrl: string
  items: Array<{ name: string; quantity: number; price: number }>
}): Promise<N1COPaymentSession> {
  const token = await getAccessToken()

  const response = await fetch(`${N1CO_BASE_URL}/payments/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      orderId: params.orderId,
      returnUrl: params.returnUrl,
      items: params.items,
      metadata: { platform: 'cine-metro' },
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create payment session: ${response.statusText}`)
  }

  return (await response.json()) as N1COPaymentSession
}

export async function getTransaction(
  transactionId: string,
): Promise<N1COTransaction> {
  const token = await getAccessToken()

  const response = await fetch(
    `${N1CO_BASE_URL}/transactions/${transactionId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch transaction: ${response.statusText}`)
  }

  return (await response.json()) as N1COTransaction
}
