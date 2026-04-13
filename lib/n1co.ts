// N1CO Payment Gateway Integration
// Client for N1CO API v3 - handles payment processing and product management

const N1CO_API_BASE = "https://api.n1co.com/v3"
const CLIENT_ID = process.env.NEXT_PUBLIC_N1CO_CLIENT_ID
const CLIENT_SECRET = process.env.N1CO_CLIENT_SECRET

// Mock products for development when N1CO is not configured
const MOCK_PRODUCTS: N1COProduct[] = [
  {
    id: "1",
    name: "Dune: Parte III",
    description: "La épica conclusión de la saga",
    price: 2500,
    currency: "MXN",
    image: "/events/cinema-01.jpg",
    category: "cine",
  },
  {
    id: "2",
    name: "Hamlet Contemporáneo",
    description: "Una reinterpretación audaz del clásico",
    price: 8500,
    currency: "MXN",
    image: "/events/teatro-01.jpg",
    category: "teatro",
  },
  {
    id: "3",
    name: "Noche Electrónica: ODESZA",
    description: "Un espectáculo audiovisual único",
    price: 15000,
    currency: "MXN",
    image: "/events/concierto-01.jpg",
    category: "concierto",
  },
]

export interface N1COProduct {
  id: string
  name: string
  description: string
  price: number
  currency: string
  image?: string
  category?: string
  metadata?: Record<string, any>
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
  status: "pending" | "approved" | "declined" | "canceled"
  metadata?: Record<string, any>
}

// Check if N1CO credentials are configured
function isN1COConfigured(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET)
}

// Get access token for N1CO API
async function getAccessToken(): Promise<string> {
  if (!isN1COConfigured()) {
    console.log("[v0] N1CO not configured, using mock mode")
    return "mock_token"
  }

  try {
    const response = await fetch(`${N1CO_API_BASE}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
      }),
    })

    if (!response.ok) {
      console.error(`[v0] N1CO Auth failed: ${response.statusText}`)
      return "mock_token"
    }

    const data = (await response.json()) as { access_token: string }
    return data.access_token
  } catch (error) {
    console.error("[v0] N1CO Auth error:", error)
    return "mock_token"
  }
}

// Create a payment session
export async function createPaymentSession(params: {
  amount: number
  currency: string
  orderId: string
  returnUrl: string
  items: Array<{ name: string; quantity: number; price: number }>
}): Promise<N1COPaymentSession> {
  const token = await getAccessToken()

  const response = await fetch(`${N1CO_API_BASE}/payments/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      orderId: params.orderId,
      returnUrl: params.returnUrl,
      items: params.items,
      metadata: {
        platform: "entradas",
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create payment session: ${response.statusText}`)
  }

  const data = (await response.json()) as N1COPaymentSession
  return data
}

// Get transaction details
export async function getTransaction(
  transactionId: string
): Promise<N1COTransaction> {
  const token = await getAccessToken()

  const response = await fetch(`${N1CO_API_BASE}/transactions/${transactionId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch transaction: ${response.statusText}`)
  }

  const data = (await response.json()) as N1COTransaction
  return data
}

// Create a product (for admin dashboard)
export async function createProduct(
  product: Omit<N1COProduct, "id">
): Promise<N1COProduct> {
  const token = await getAccessToken()

  const response = await fetch(`${N1CO_API_BASE}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(product),
  })

  if (!response.ok) {
    throw new Error(`Failed to create product: ${response.statusText}`)
  }

  const data = (await response.json()) as N1COProduct
  return data
}

// Get all products
export async function getN1COProducts(): Promise<N1COProduct[]> {
  if (!isN1COConfigured()) {
    console.log("[v0] N1CO not configured, returning mock products")
    return MOCK_PRODUCTS
  }

  try {
    const token = await getAccessToken()

    const response = await fetch(`${N1CO_API_BASE}/products`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      console.error(`[v0] Failed to fetch products: ${response.statusText}`)
      return MOCK_PRODUCTS
    }

    const data = (await response.json()) as { data: N1COProduct[] }
    return data.data
  } catch (error) {
    console.error("[v0] Error fetching N1CO products:", error)
    return MOCK_PRODUCTS
  }
}

// Update a product
export async function updateProduct(
  productId: string,
  updates: Partial<N1COProduct>
): Promise<N1COProduct> {
  const token = await getAccessToken()

  const response = await fetch(`${N1CO_API_BASE}/products/${productId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    throw new Error(`Failed to update product: ${response.statusText}`)
  }

  const data = (await response.json()) as N1COProduct
  return data
}

// Delete a product
export async function deleteProduct(productId: string): Promise<void> {
  const token = await getAccessToken()

  const response = await fetch(`${N1CO_API_BASE}/products/${productId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to delete product: ${response.statusText}`)
  }
}
