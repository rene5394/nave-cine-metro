import { describe, it, expect, vi } from "vitest";
import { mockFetch } from "@/tests/mocks/fetch";
import {
  createProducts,
  syncCollections,
  updateProducts,
  getLatestProduct,
  createCheckoutLink,
  getCheckoutOrder,
  type N1COProductSync,
  type N1COCollection,
  type N1COCheckoutLinkParams,
} from "@/lib/n1co";

const TOKEN_RESPONSE = {
  ok: true,
  json: async () => ({ accessToken: "token-123" }),
};

function makeProduct(overrides: Partial<N1COProductSync> = {}): N1COProductSync {
  return {
    productId: "prod-1",
    sku: "sku-1",
    name: "Widget",
    description: "A widget",
    stock: 10,
    price: 100,
    collections: [],
    enable: true,
    salesChannel: ["online"],
    locations: [],
    modifiers: [],
    images: ["https://example.com/a.png"],
    ...overrides,
  };
}

const COLLECTION: N1COCollection = {
  code: "col-1",
  name: "Collection 1",
  description: "desc",
  image: "https://example.com/col.png",
};

describe("createProducts", () => {
  it("throws when N1CO credentials are not configured, without calling fetch", async () => {
    const originalId = process.env.N1CO_CLIENT_ID;
    const originalSecret = process.env.N1CO_CLIENT_SECRET;
    delete process.env.N1CO_CLIENT_ID;
    delete process.env.N1CO_CLIENT_SECRET;
    vi.resetModules();
    const { createProducts: createProductsUnconfigured } = await import("@/lib/n1co");

    const fetchMock = mockFetch();
    await expect(createProductsUnconfigured([])).rejects.toThrow("N1CO credentials not configured");
    expect(fetchMock).not.toHaveBeenCalled();

    process.env.N1CO_CLIENT_ID = originalId;
    process.env.N1CO_CLIENT_SECRET = originalSecret;
    vi.resetModules();
  });

  it("fetches a token, then POSTs to Products/Sync with the token as a bearer header", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce(TOKEN_RESPONSE).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await createProducts([makeProduct()]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/Token"),
      expect.objectContaining({ method: "POST" }),
    );

    const [url, options] = fetchMock.mock.calls[1];
    expect(url).toContain("/Products/Sync");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer token-123");
  });

  it("throws when the token request itself fails", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce({
      ok: false,
      statusText: "Unauthorized",
    });

    await expect(createProducts([makeProduct()])).rejects.toThrow("N1CO auth failed: Unauthorized");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("strips the images field from each product before sending, keeping other fields", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce(TOKEN_RESPONSE).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await createProducts([makeProduct({ sku: "sku-42", images: ["https://x.com/1.png"] })]);

    const [, options] = fetchMock.mock.calls[1];
    const body = JSON.parse(options.body);
    expect(body.products).toHaveLength(1);
    expect(body.products[0]).not.toHaveProperty("images");
    expect(body.products[0].sku).toBe("sku-42");
  });

  it("sends the given collections alongside the products", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce(TOKEN_RESPONSE).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await createProducts([makeProduct()], [COLLECTION]);

    const [, options] = fetchMock.mock.calls[1];
    const body = JSON.parse(options.body);
    expect(body.collections).toEqual([COLLECTION]);
  });

  it("defaults collections to an empty array when not provided", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce(TOKEN_RESPONSE).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await createProducts([makeProduct()]);

    const [, options] = fetchMock.mock.calls[1];
    const body = JSON.parse(options.body);
    expect(body.collections).toEqual([]);
  });

  it("throws with status and body text when the sync response is not ok", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce(TOKEN_RESPONSE).mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: async () => "invalid sku",
    });

    await expect(createProducts([makeProduct()])).rejects.toThrow(
      "N1CO product sync failed (422): invalid sku",
    );
  });

  it("returns the parsed JSON response on success", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce(TOKEN_RESPONSE).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, syncedCount: 1 }),
    });

    const result = await createProducts([makeProduct()]);

    expect(result).toEqual({ success: true, syncedCount: 1 });
  });
});

describe("syncCollections", () => {
  it("delegates to createProducts with an empty products array and the given collections", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce(TOKEN_RESPONSE).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await syncCollections([COLLECTION]);

    const [, options] = fetchMock.mock.calls[1];
    const body = JSON.parse(options.body);
    expect(body.products).toEqual([]);
    expect(body.collections).toEqual([COLLECTION]);
  });
});

describe("updateProducts", () => {
  it("strips the singular image field but keeps the plural images field when present", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce(TOKEN_RESPONSE).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await updateProducts([
      makeProduct({
        image: "https://example.com/single.png",
        images: ["https://example.com/a.png"],
      }),
    ]);

    const [, options] = fetchMock.mock.calls[1];
    const body = JSON.parse(options.body);
    expect(body.products[0]).not.toHaveProperty("image");
    expect(body.products[0].images).toEqual(["https://example.com/a.png"]);
  });

  it("throws with status and body text when the update response is not ok", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce(TOKEN_RESPONSE).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "server error",
    });

    await expect(updateProducts([makeProduct()])).rejects.toThrow(
      "N1CO product update failed (500): server error",
    );
  });

  it("resolves to null when the success response body is not valid JSON", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce(TOKEN_RESPONSE).mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error("Unexpected end of JSON input");
      },
    });

    const result = await updateProducts([makeProduct()]);

    expect(result).toBeNull();
  });

  it("returns the parsed JSON response on success", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce(TOKEN_RESPONSE).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, updatedCount: 1 }),
    });

    const result = await updateProducts([makeProduct()]);

    expect(result).toEqual({ success: true, updatedCount: 1 });
  });
});

describe("getLatestProduct", () => {
  it("requests the Products endpoint sorted descending by productId, one per page", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce(TOKEN_RESPONSE).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ products: [], totalCount: 0 }),
    });

    await getLatestProduct();

    const [url, options] = fetchMock.mock.calls[1];
    expect(url).toContain("/Products?");
    expect(url).toContain("Sorts=-productId");
    expect(url).toContain("PageSize=1");
    expect(url).toContain("Page=1");
    expect(options.headers.Authorization).toBe("Bearer token-123");
  });

  it("returns the first product when the list is non-empty", async () => {
    const fetchMock = mockFetch();
    const product = { productId: 99, name: "Latest Widget", sku: "sku-99" };
    fetchMock.mockResolvedValueOnce(TOKEN_RESPONSE).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ products: [product], totalCount: 1 }),
    });

    const result = await getLatestProduct();

    expect(result).toEqual(product);
  });

  it("returns null when the products list is empty", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce(TOKEN_RESPONSE).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ products: [], totalCount: 0 }),
    });

    const result = await getLatestProduct();

    expect(result).toBeNull();
  });

  it("throws with status and body text when the response is not ok", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce(TOKEN_RESPONSE).mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => "unavailable",
    });

    await expect(getLatestProduct()).rejects.toThrow("N1CO get products failed (503): unavailable");
  });
});

function makeCheckoutParams(
  overrides: Partial<N1COCheckoutLinkParams> = {},
): N1COCheckoutLinkParams {
  return {
    orderName: "Order 1",
    orderReference: "ref-1",
    lineItems: [
      {
        sku: "sku-1",
        quantity: 2,
        product: {
          name: "Widget",
          price: 50,
          imageUrl: "https://example.com/w.png",
          requiresShipping: true,
        },
      },
    ],
    successUrl: "https://example.com/success",
    cancelUrl: "https://example.com/cancel",
    ...overrides,
  };
}

describe("createCheckoutLink", () => {
  it("throws when N1CO_PAY_SECRET is not configured", async () => {
    const originalPaySecret = process.env.N1CO_PAY_SECRET;
    delete process.env.N1CO_PAY_SECRET;
    vi.resetModules();
    const { createCheckoutLink: createCheckoutLinkUnconfigured } = await import("@/lib/n1co");

    const fetchMock = mockFetch();
    await expect(createCheckoutLinkUnconfigured(makeCheckoutParams())).rejects.toThrow(
      "N1CO_PAY_SECRET not configured",
    );
    expect(fetchMock).not.toHaveBeenCalled();

    process.env.N1CO_PAY_SECRET = originalPaySecret;
    vi.resetModules();
  });

  it("defaults expirationMinutes to 30 when not provided", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ orderCode: "oc-1", orderId: 1, paymentLinkUrl: "https://pay" }),
    });

    await createCheckoutLink(makeCheckoutParams());

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.expirationMinutes).toBe(30);
  });

  it("uses the provided expirationMinutes when given", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ orderCode: "oc-1", orderId: 1, paymentLinkUrl: "https://pay" }),
    });

    await createCheckoutLink(makeCheckoutParams({ expirationMinutes: 15 }));

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.expirationMinutes).toBe(15);
  });

  it("omits the metadata key entirely when metadata is not provided", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ orderCode: "oc-1", orderId: 1, paymentLinkUrl: "https://pay" }),
    });

    await createCheckoutLink(makeCheckoutParams());

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body).not.toHaveProperty("metadata");
  });

  it("includes the metadata key when metadata is provided", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ orderCode: "oc-1", orderId: 1, paymentLinkUrl: "https://pay" }),
    });

    const metadata = [{ name: "orderId", value: "42" }];
    await createCheckoutLink(makeCheckoutParams({ metadata }));

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.metadata).toEqual(metadata);
  });

  it("sends the Authorization header using the pay secret as a bearer token", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ orderCode: "oc-1", orderId: 1, paymentLinkUrl: "https://pay" }),
    });

    await createCheckoutLink(makeCheckoutParams());

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("/paymentlink/checkout");
    expect(options.headers.Authorization).toBe("Bearer test-n1co-pay-secret");
  });

  it("throws with status and body text when the response is not ok", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => "bad request",
    });

    await expect(createCheckoutLink(makeCheckoutParams())).rejects.toThrow(
      "N1CO checkout link failed (400): bad request",
    );
  });

  it("returns the parsed JSON response on success", async () => {
    const fetchMock = mockFetch();
    const response = { orderCode: "oc-1", orderId: 1, paymentLinkUrl: "https://pay.example.com" };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => response,
    });

    const result = await createCheckoutLink(makeCheckoutParams());

    expect(result).toEqual(response);
  });
});

describe("getCheckoutOrder", () => {
  it("throws when N1CO_PAY_SECRET is not configured", async () => {
    const originalPaySecret = process.env.N1CO_PAY_SECRET;
    delete process.env.N1CO_PAY_SECRET;
    vi.resetModules();
    const { getCheckoutOrder: getCheckoutOrderUnconfigured } = await import("@/lib/n1co");

    const fetchMock = mockFetch();
    await expect(getCheckoutOrderUnconfigured("oc-1")).rejects.toThrow(
      "N1CO_PAY_SECRET not configured",
    );
    expect(fetchMock).not.toHaveBeenCalled();

    process.env.N1CO_PAY_SECRET = originalPaySecret;
    vi.resetModules();
  });

  it("requests the order by code with the pay secret as a bearer token", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        orderId: 1,
        orderCode: "oc-1",
        orderReference: "ref-1",
        orderStatus: "PAID",
        total: 100,
      }),
    });

    await getCheckoutOrder("oc-1");

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("/paymentlink/order/oc-1");
    expect(options.headers.Authorization).toBe("Bearer test-n1co-pay-secret");
  });

  it("throws using statusText when the response is not ok", async () => {
    const fetchMock = mockFetch();
    fetchMock.mockResolvedValueOnce({
      ok: false,
      statusText: "Not Found",
    });

    await expect(getCheckoutOrder("missing-order")).rejects.toThrow(
      "Failed to fetch N1CO order: Not Found",
    );
  });

  it("returns the parsed JSON response on success", async () => {
    const fetchMock = mockFetch();
    const order = {
      orderId: 1,
      orderCode: "oc-1",
      orderReference: "ref-1",
      orderStatus: "PAID" as const,
      total: 100,
    };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => order,
    });

    const result = await getCheckoutOrder("oc-1");

    expect(result).toEqual(order);
  });
});
