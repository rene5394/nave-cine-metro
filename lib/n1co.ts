const N1CO_BASE_URL =
  process.env.N1CO_ENV === "live"
    ? "https://api.n1co.com/api/v3"
    : "https://api-sandbox.n1co.shop/api/v3";

const N1CO_PAY_BASE_URL =
  process.env.N1CO_ENV === "live"
    ? "https://api-pay.n1co.shop/api"
    : "https://api-pay-sandbox.n1co.shop/api";

const CLIENT_ID = process.env.N1CO_CLIENT_ID;
const CLIENT_SECRET = process.env.N1CO_CLIENT_SECRET;
const PAY_SECRET = process.env.N1CO_PAY_SECRET;

export interface N1COCheckoutLinkParams {
  orderName: string;
  orderReference: string;
  lineItems: Array<{
    sku: string;
    quantity: number;
    product: {
      name: string;
      price: number;
      imageUrl: string;
      requiresShipping: boolean;
    };
  }>;
  successUrl: string;
  cancelUrl: string;
  expirationMinutes?: number;
}

export interface N1COCheckoutLinkResponse {
  orderCode: string;
  orderId: number;
  paymentLinkUrl: string;
}

export interface N1COOrderStatus {
  orderId: number;
  orderCode: string;
  orderReference: string;
  orderStatus: "PENDING" | "PAID" | "CANCELLED" | "FINALIZED";
  total: number;
}

export interface N1COProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image?: string;
  category?: string;
  metadata?: Record<string, string>;
}

export interface N1COProductSync {
  productId?: string;
  sku: string;
  name: string;
  description: string;
  stock?: number;
  price: number;
  collections: string[];
  image?: string;
  enable: boolean;
  salesChannel: string[];
  locations: Array<{
    locationCode: string;
    isAvailable: boolean;
  }>;
  modifiers: Array<{
    code: string;
    name: string;
    description: string;
    minOptions: number;
    maxOptions: number;
    isActive: boolean;
    disabledLocations: string[];
    options: string[];
    order: number;
  }>;
  images: string[];
}

export interface N1COCollection {
  code: string;
  name: string;
  description: string;
  image: string;
  parentCode?: string;
}

function isN1COConfigured(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET);
}

async function getAccessToken(): Promise<string> {
  if (!isN1COConfigured()) {
    throw new Error("N1CO credentials not configured");
  }

  const response = await fetch(`${N1CO_BASE_URL}/Token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clientId: CLIENT_ID!,
      clientSecret: CLIENT_SECRET!,
    }),
  });

  if (!response.ok) {
    throw new Error(`N1CO auth failed: ${response.statusText}`);
  }

  const data = (await response.json()) as { accessToken: string };
  return data.accessToken;
}

/**
 * Sync products to N1CO. Creates new products or updates existing ones by SKU.
 */
export async function createProducts(
  products: N1COProductSync[],
  collections: N1COCollection[] = [],
) {
  const token = await getAccessToken();

  const productsFormatted = products.map(({ images, ...rest }) => rest);

  const response = await fetch(`${N1CO_BASE_URL}/Products/Sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ products: productsFormatted, collections }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`N1CO product sync failed (${response.status}): ${body}`);
  }

  return response.json();
}

/**
 * Update an existing N1CO product by productId.
 */
export async function updateProducts(
  products: N1COProductSync[],
  collections: N1COCollection[] = [],
) {
  const token = await getAccessToken();

  const productsFormatted = products.map(({ image, ...rest }) => rest);

  const response = await fetch(`${N1CO_BASE_URL}/Products/Sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ products: productsFormatted, collections }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`N1CO product update failed (${response.status}): ${body}`);
  }

  return response.json().catch(() => null);
}

/**
 * Fetch the latest product created in N1CO by sorting by Id descending.
 */
export async function getLatestProduct(): Promise<{
  productId: number;
  name: string;
  sku: string | null;
} | null> {
  const token = await getAccessToken();

  const params = new URLSearchParams({
    Sorts: "-productId",
    PageSize: "1",
    Page: "1",
  });

  const response = await fetch(`${N1CO_BASE_URL}/Products?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`N1CO get products failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    products: Array<{ productId: number; name: string; sku: string | null }>;
    totalCount: number;
  };

  return data.products[0] ?? null;
}

export async function createCheckoutLink(
  params: N1COCheckoutLinkParams,
): Promise<N1COCheckoutLinkResponse> {
  if (!PAY_SECRET) {
    throw new Error("N1CO_PAY_SECRET not configured");
  }

  const response = await fetch(`${N1CO_PAY_BASE_URL}/paymentlink/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PAY_SECRET}`,
    },
    body: JSON.stringify({
      orderName: params.orderName,
      orderReference: params.orderReference,
      orderDescription: `Compra de ${params.lineItems.length} producto(s)`,
      lineItems: params.lineItems,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      expirationMinutes: params.expirationMinutes ?? 30,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`N1CO checkout link failed (${response.status}): ${body}`);
  }

  return (await response.json()) as N1COCheckoutLinkResponse;
}

export async function getCheckoutOrder(orderCode: string): Promise<N1COOrderStatus> {
  if (!PAY_SECRET) {
    throw new Error("N1CO_PAY_SECRET not configured");
  }

  const response = await fetch(`${N1CO_PAY_BASE_URL}/paymentlink/order/${orderCode}`, {
    headers: { Authorization: `Bearer ${PAY_SECRET}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch N1CO order: ${response.statusText}`);
  }

  return (await response.json()) as N1COOrderStatus;
}
