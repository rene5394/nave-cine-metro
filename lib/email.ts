import "server-only";
import QRCode from "qrcode";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { formatDate, formatTime12h } from "@/lib/events-shared";

const ACCENT = "#9e5656";

type SendResult = { ok: true } | { ok: false; error: string };

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendTicketsEmail(
  orderId: string,
  recipient: { email: string; name?: string | null },
): Promise<SendResult> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            event: { select: { name: true } },
            screening: { select: { date: true, time: true } },
            tickets: true,
          },
        },
      },
    });

    if (!order) return { ok: false, error: "Orden no encontrada" };

    const resend = getResend();
    if (!resend) return { ok: false, error: "RESEND_API_KEY no configurado" };

    const from = process.env.EMAIL_FROM ?? "EntradasYa <onboarding@resend.dev>";

    const ticketCards: string[] = [];
    const attachments: Array<{
      filename: string;
      content: string;
      contentType: string;
      contentId: string;
    }> = [];
    let firstEventName = "tu evento";
    let ticketIndex = 0;

    for (const item of order.items) {
      if (order.items.indexOf(item) === 0) firstEventName = item.event.name;
      for (const ticket of item.tickets) {
        ticketIndex += 1;
        const pngBuffer = await QRCode.toBuffer(ticket.token, {
          margin: 1,
          width: 280,
        });
        const cid = `qr-${ticketIndex}@entradasya`;
        attachments.push({
          filename: `ticket-${ticketIndex}.png`,
          content: pngBuffer.toString("base64"),
          contentType: "image/png",
          contentId: cid,
        });
        const dateLine = item.screening
          ? `${formatDate(item.screening.date)} · ${formatTime12h(item.screening.time)}`
          : "";
        ticketCards.push(`
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:16px 0;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;">
            <tr><td style="padding:20px;text-align:center;font-family:Arial,sans-serif;">
              <p style="margin:0 0 4px;font-size:16px;font-weight:bold;color:#111827;">${escapeHtml(item.event.name)}</p>
              ${dateLine ? `<p style="margin:0 0 16px;font-size:12px;color:#6b7280;">${escapeHtml(dateLine)}</p>` : ""}
              <img src="cid:${cid}" width="220" height="220" alt="Código QR" style="display:block;margin:0 auto;border:1px solid #f3f4f6;border-radius:8px;" />
              <p style="margin:12px 0 0;font-family:monospace;font-size:10px;color:#9ca3af;word-break:break-all;">${escapeHtml(ticket.token)}</p>
            </td></tr>
          </table>
        `);
      }
    }

    const totalTickets = ticketCards.length;
    const firstName = recipient.name?.trim().split(/\s+/)[0] ?? "";
    const greeting = firstName ? `¡Hola ${escapeHtml(firstName)}!` : "¡Gracias por tu compra!";
    const html = `
<!doctype html>
<html><body style="margin:0;padding:0;background:#f9fafb;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9fafb;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:Arial,sans-serif;">
        <tr><td style="background:${ACCENT};height:8px;line-height:8px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:32px 32px 8px;">
          <h1 style="margin:0;font-size:22px;color:#111827;">${greeting}</h1>
          <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">Aquí están tus ${totalTickets} ${totalTickets === 1 ? "entrada" : "entradas"} para <strong>${escapeHtml(firstEventName)}</strong>.</p>
          <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">Código de orden: <span style="font-family:monospace;color:#374151;">${escapeHtml(order.n1coSessionId ?? order.id)}</span></p>
        </td></tr>
        <tr><td style="padding:0 32px 8px;">${ticketCards.join("")}</td></tr>
        <tr><td style="padding:8px 32px 32px;">
          <p style="margin:0;font-size:13px;color:#6b7280;">Presenta cualquiera de estos códigos QR en la entrada del evento. Cada QR es válido para una sola persona.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const { error } = await resend.emails.send({
      from,
      to: recipient.email,
      subject: `Tus entradas para ${firstEventName}`,
      html,
      attachments,
    });

    if (error) {
      console.error("[email] send failed:", error.message ?? error.name);
      return { ok: false, error: error.message ?? "Error al enviar correo" };
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { emailSentAt: new Date() },
    });

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    console.error("[email] send threw:", msg);
    return { ok: false, error: msg };
  }
}
