import { resendSendMock, qrcodeToBufferMock } from "@/tests/mocks/email-deps";
import { prismaMock } from "@/tests/mocks/prisma";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { sendTicketsEmail, sendPasswordResetEmail } from "@/lib/email";
import { formatDate, formatTime12h } from "@/lib/events-shared";

// Minimal shape matching the `include` clause in sendTicketsEmail's
// prisma.order.findUnique call. This is a query-result shape, not a raw
// `Order` model row, so it's built by hand rather than via makeOrder().
type FindUniqueOrderResult = {
  id: string;
  n1coSessionId: string | null;
  items: Array<{
    event: { name: string };
    screening: { date: string; time: string } | null;
    tickets: Array<{ token: string }>;
  }>;
};

// resendSendMock and qrcodeToBufferMock (unlike prismaMock) don't get an
// automatic reset between tests, so calls/return values would otherwise
// leak across tests in this file.
afterEach(() => {
  resendSendMock.mockReset();
  qrcodeToBufferMock.mockReset();
});

function makeOrderQueryResult(
  overrides: Partial<FindUniqueOrderResult> = {},
): FindUniqueOrderResult {
  return {
    id: "55555555-5555-5555-5555-555555555555",
    n1coSessionId: "N1CO-ORDER-CODE",
    items: [
      {
        event: { name: "Test Event" },
        screening: { date: "2026-12-31", time: "20:00" },
        tickets: [{ token: "abcdefabcdefabcdefabcdefabcdefab" }],
      },
    ],
    ...overrides,
  };
}

describe("sendTicketsEmail", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "test-key";
    qrcodeToBufferMock.mockResolvedValue(Buffer.from("fake-png"));
    resendSendMock.mockResolvedValue({ data: { id: "email-id" }, error: null });
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it("returns an error when the order is not found", async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);

    const result = await sendTicketsEmail("missing-order-id", { email: "buyer@example.com" });

    expect(result).toEqual({ ok: false, error: "Orden no encontrada" });
    expect(resendSendMock).not.toHaveBeenCalled();
  });

  it("returns an error when RESEND_API_KEY is not configured, without updating the order", async () => {
    delete process.env.RESEND_API_KEY;
    prismaMock.order.findUnique.mockResolvedValue(makeOrderQueryResult() as never);

    const result = await sendTicketsEmail("order-1", { email: "buyer@example.com" });

    expect(result).toEqual({ ok: false, error: "RESEND_API_KEY no configurado" });
    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });

  it("returns the resend error message when sending fails, without updating the order", async () => {
    prismaMock.order.findUnique.mockResolvedValue(makeOrderQueryResult() as never);
    resendSendMock.mockResolvedValue({
      data: null,
      error: { name: "validation_error", message: "Invalid recipient" },
    });

    const result = await sendTicketsEmail("order-1", { email: "buyer@example.com" });

    expect(result).toEqual({ ok: false, error: "Invalid recipient" });
    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });

  it("sends one QR attachment per ticket with sequential cids across all order items, subject from the first item, and marks the order as sent", async () => {
    const order = makeOrderQueryResult({
      items: [
        {
          event: { name: "First Event" },
          screening: { date: "2026-12-31", time: "20:00" },
          tickets: [{ token: "token-a" }, { token: "token-b" }],
        },
        {
          event: { name: "Second Event" },
          screening: null,
          tickets: [{ token: "token-c" }],
        },
      ],
    });
    prismaMock.order.findUnique.mockResolvedValue(order as never);

    const result = await sendTicketsEmail("order-1", {
      email: "buyer@example.com",
      name: "Jane Doe",
    });

    expect(result).toEqual({ ok: true });

    expect(qrcodeToBufferMock).toHaveBeenCalledTimes(3);
    expect(qrcodeToBufferMock).toHaveBeenNthCalledWith(1, "token-a", { margin: 1, width: 280 });
    expect(qrcodeToBufferMock).toHaveBeenNthCalledWith(2, "token-b", { margin: 1, width: 280 });
    expect(qrcodeToBufferMock).toHaveBeenNthCalledWith(3, "token-c", { margin: 1, width: 280 });

    expect(resendSendMock).toHaveBeenCalledTimes(1);
    const call = resendSendMock.mock.calls[0][0];

    expect(call.subject).toBe("Tus entradas para First Event");
    expect(call.to).toBe("buyer@example.com");

    expect(call.attachments).toEqual([
      {
        filename: "ticket-1.png",
        content: Buffer.from("fake-png").toString("base64"),
        contentType: "image/png",
        contentId: "qr-1@entradasya",
      },
      {
        filename: "ticket-2.png",
        content: Buffer.from("fake-png").toString("base64"),
        contentType: "image/png",
        contentId: "qr-2@entradasya",
      },
      {
        filename: "ticket-3.png",
        content: Buffer.from("fake-png").toString("base64"),
        contentType: "image/png",
        contentId: "qr-3@entradasya",
      },
    ]);

    // The item with a screening renders a formatted date line; the item
    // without one (screening: null) omits it entirely.
    const expectedDateLine = `${formatDate("2026-12-31")} · ${formatTime12h("20:00")}`;
    expect(call.html).toContain(expectedDateLine);
    expect(call.html).toContain("cid:qr-1@entradasya");
    expect(call.html).toContain("cid:qr-2@entradasya");
    expect(call.html).toContain("cid:qr-3@entradasya");
    expect(call.html).toContain("Aquí están tus 3 entradas");
    expect(call.html).toContain("¡Hola Jane!");

    expect(prismaMock.order.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { emailSentAt: expect.any(Date) },
    });
  });

  it("escapes HTML-unsafe characters from the event name and ticket token", async () => {
    const dangerousName = `<script>alert('x')</script> & "quoted"`;
    const dangerousToken = `token"'<>&`;
    const order = makeOrderQueryResult({
      items: [
        {
          event: { name: dangerousName },
          screening: null,
          tickets: [{ token: dangerousToken }],
        },
      ],
    });
    prismaMock.order.findUnique.mockResolvedValue(order as never);

    const result = await sendTicketsEmail("order-1", { email: "buyer@example.com" });

    expect(result).toEqual({ ok: true });

    const html = resendSendMock.mock.calls[0][0].html as string;
    expect(html).not.toContain(dangerousName);
    expect(html).not.toContain(dangerousToken);
    expect(html).toContain(
      "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; &quot;quoted&quot;",
    );
    expect(html).toContain("token&quot;&#39;&lt;&gt;&amp;");
  });

  it("returns an error instead of throwing when the prisma query rejects", async () => {
    prismaMock.order.findUnique.mockRejectedValue(new Error("connection lost"));

    const result = await sendTicketsEmail("order-1", { email: "buyer@example.com" });

    expect(result).toEqual({ ok: false, error: "connection lost" });
  });

  it("returns an error instead of throwing when QR generation rejects", async () => {
    prismaMock.order.findUnique.mockResolvedValue(makeOrderQueryResult() as never);
    qrcodeToBufferMock.mockRejectedValue(new Error("qr generation failed"));

    const result = await sendTicketsEmail("order-1", { email: "buyer@example.com" });

    expect(result).toEqual({ ok: false, error: "qr generation failed" });
    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });
});

describe("sendPasswordResetEmail", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "test-key";
    resendSendMock.mockResolvedValue({ data: { id: "email-id" }, error: null });
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it("returns an error when RESEND_API_KEY is not configured", async () => {
    delete process.env.RESEND_API_KEY;

    const result = await sendPasswordResetEmail(
      { email: "user@example.com", name: "Jane" },
      "https://example.com/reset?token=abc",
    );

    expect(result).toEqual({ ok: false, error: "RESEND_API_KEY no configurado" });
    expect(resendSendMock).not.toHaveBeenCalled();
  });

  it("returns the resend error message when sending fails", async () => {
    resendSendMock.mockResolvedValue({
      data: null,
      error: { name: "validation_error", message: "Invalid recipient" },
    });

    const result = await sendPasswordResetEmail(
      { email: "user@example.com", name: "Jane" },
      "https://example.com/reset?token=abc",
    );

    expect(result).toEqual({ ok: false, error: "Invalid recipient" });
  });

  it("greets the user by their first name only when name has multiple words", async () => {
    const result = await sendPasswordResetEmail(
      { email: "user@example.com", name: "Jane Marie Doe" },
      "https://example.com/reset?token=abc",
    );

    expect(result).toEqual({ ok: true });
    const html = resendSendMock.mock.calls[0][0].html as string;
    expect(html).toContain("Hola Jane,");
    expect(html).not.toContain("Hola Jane Marie Doe,");
  });

  it("falls back to a generic greeting when name is absent", async () => {
    const result = await sendPasswordResetEmail(
      { email: "user@example.com" },
      "https://example.com/reset?token=abc",
    );

    expect(result).toEqual({ ok: true });
    const html = resendSendMock.mock.calls[0][0].html as string;
    expect(html).toContain(">Hola,<");
  });

  it("falls back to a generic greeting when name is null", async () => {
    const result = await sendPasswordResetEmail(
      { email: "user@example.com", name: null },
      "https://example.com/reset?token=abc",
    );

    expect(result).toEqual({ ok: true });
    const html = resendSendMock.mock.calls[0][0].html as string;
    expect(html).toContain(">Hola,<");
  });

  it("includes the reset URL in the email body and subject/recipient", async () => {
    const resetUrl = "https://example.com/reset?token=abc123";

    await sendPasswordResetEmail({ email: "user@example.com", name: "Jane" }, resetUrl);

    const call = resendSendMock.mock.calls[0][0];
    expect(call.to).toBe("user@example.com");
    expect(call.subject).toBe("Restablece tu contraseña");
    expect(call.html).toContain(resetUrl);
  });

  it("returns an error instead of throwing when resend.emails.send rejects", async () => {
    resendSendMock.mockRejectedValue(new Error("network down"));

    const result = await sendPasswordResetEmail(
      { email: "user@example.com", name: "Jane" },
      "https://example.com/reset?token=abc",
    );

    expect(result).toEqual({ ok: false, error: "network down" });
  });
});
