## Server Actions Over API Routes

Always use **server actions** (`'use server'`) instead of API route handlers (`app/api/`) for data mutations and form handling.

**Exceptions:** Only use `app/api/` route handlers for:
- Webhook endpoints (e.g., Stripe webhooks) that require a public URL
- Third-party integrations that need to call back to a specific endpoint

**Conventions:**
- Place server actions in `app/actions/` organized by domain (e.g., `auth.ts`, `events.ts`)
- Always validate inputs with `zod` before processing
- Return structured results, not thrown errors
