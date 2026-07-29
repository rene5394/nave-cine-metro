import {
  Role,
  OrderStatus,
  TicketStatus,
  EventStatus,
  CategoryStatus,
  UserStatus,
} from "@/lib/generated/prisma/enums";
import type {
  User,
  Category,
  Event,
  Screening,
  Order,
  OrderItem,
  Ticket,
  PasswordResetToken,
} from "@/lib/generated/prisma/client";
import type { JWTPayload } from "@/lib/auth";

const FIXED_DATE = new Date("2026-01-01T00:00:00.000Z");

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    email: "user@example.com",
    name: "Test User",
    password: "hashed-password",
    role: Role.CLIENT,
    status: UserStatus.ACTIVE,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    ...overrides,
  };
}

export function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    slug: "conciertos",
    name: "Conciertos",
    color: "#f59e0b",
    status: CategoryStatus.ACTIVE,
    description: "Category description",
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    ...overrides,
  };
}

export function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "33333333-3333-3333-3333-333333333333",
    n1coProductId: null,
    sku: "EVT-001",
    name: "Test Event",
    description: "Short description",
    longDescription: "Long description",
    categoryId: "22222222-2222-2222-2222-222222222222",
    image: "https://cdn.example.com/events/test.jpg",
    venue: "Test Venue",
    city: "Test City",
    priceInCents: 5000,
    featured: false,
    status: EventStatus.ACTIVE,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    ...overrides,
  };
}

export function makeScreening(overrides: Partial<Screening> = {}): Screening {
  return {
    id: "44444444-4444-4444-4444-444444444444",
    eventId: "33333333-3333-3333-3333-333333333333",
    date: "2026-12-31",
    time: "20:00",
    availableTickets: 100,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    ...overrides,
  };
}

export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "55555555-5555-5555-5555-555555555555",
    userId: null,
    emailSentAt: null,
    status: OrderStatus.PENDING,
    totalInCents: 5000,
    stripeSessionId: null,
    n1coSessionId: "N1CO-ORDER-CODE",
    buyerName: null,
    buyerEmail: null,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    ...overrides,
  };
}

export function makeOrderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: "66666666-6666-6666-6666-666666666666",
    orderId: "55555555-5555-5555-5555-555555555555",
    eventId: "33333333-3333-3333-3333-333333333333",
    screeningId: "44444444-4444-4444-4444-444444444444",
    quantity: 1,
    priceInCents: 5000,
    ...overrides,
  };
}

export function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "77777777-7777-7777-7777-777777777777",
    orderItemId: "66666666-6666-6666-6666-666666666666",
    token: "abcdefabcdefabcdefabcdefabcdefab",
    status: TicketStatus.ISSUED,
    redeemedAt: null,
    createdAt: FIXED_DATE,
    ...overrides,
  };
}

export function makePasswordResetToken(
  overrides: Partial<PasswordResetToken> = {},
): PasswordResetToken {
  return {
    id: "88888888-8888-8888-8888-888888888888",
    userId: "11111111-1111-1111-1111-111111111111",
    tokenHash: "a".repeat(64),
    expiresAt: new Date(FIXED_DATE.getTime() + 60 * 60 * 1000),
    usedAt: null,
    createdAt: FIXED_DATE,
    ...overrides,
  };
}

export function makeSession(overrides: Partial<JWTPayload> = {}): JWTPayload {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    email: "admin@example.com",
    name: "Test Admin",
    role: Role.ADMIN,
    ...overrides,
  };
}
