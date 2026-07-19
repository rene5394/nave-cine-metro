// Hand-rolled mocks of resend and qrcode, used only by lib/email.test.ts —
// no new dependency needed since both surfaces are tiny.
//
// Note: the const declaration and its export must be separate statements
// (not `export const x = vi.hoisted(...)`) — Vitest's hoisting transform
// rejects exporting a hoisted variable inline, since it can't hoist the
// `vi.mock` factory above other imports while also hoisting the export.
const resendSendMock = vi.hoisted(() => vi.fn());
export { resendSendMock };

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendSendMock };
  },
}));

const qrcodeToBufferMock = vi.hoisted(() => vi.fn());
export { qrcodeToBufferMock };

vi.mock("qrcode", () => ({
  default: { toBuffer: qrcodeToBufferMock },
}));
