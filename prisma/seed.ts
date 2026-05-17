import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { createProducts, type N1COProductSync } from "../lib/n1co";
import { uploadImage, isS3Configured } from "../lib/s3";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DEFAULT_CATEGORIES = [
  {
    slug: "publicaciones",
    name: "Publicaciones",
    color: "#f59e0b",
    description: null as string | null,
  },
  {
    slug: "talleres",
    name: "Talleres",
    color: "#f43f5e",
    description:
      "¡Inscríbete ahora en nuestros talleres artísticos! Sumérgete en un mundo de creatividad con expertos en el arte. Desarrolla tus habilidades, descubre nuevas técnicas y encuentra inspiración. Aprende y conecta con otros apasionados del arte. ¡Tu viaje artístico comienza aquí!",
  },
  {
    slug: "merch",
    name: "Merch",
    color: "#0ea5e9",
    description:
      "Explora nuestra tienda de ropa en línea, donde la moda se encuentra con el arte. Cada prenda es una expresión única, creada para apoyar y financiar proyectos artísticos. Descubre estilo con propósito, viste el arte y contribuye a cultivar la creatividad",
  },
  {
    slug: "teatro",
    name: "Teatro",
    color: "#10b981",
    description:
      "Experimenta la magia del teatro con nuestro exclusivo ticket de entrada. Compra tu pase online para disfrutar de una noche inolvidable de actuaciones cautivadoras. ¡Reserva ahora y asegura tu lugar en el espectáculo!",
  },
];

const EVENTS = [
  {
    sku: "000040",
    name: "Hamlet Contemporaneo",
    description:
      "Una reinterpretacion audaz del clasico de Shakespeare con escenografia minimalista.",
    longDescription:
      "Esta adaptacion moderna de Hamlet transporta la tragedia shakesperiana a un contexto contemporaneo. Con una puesta en escena minimalista que utiliza proyecciones digitales y un elenco de primer nivel, esta version explora los temas eternos de la venganza, la locura y el poder politico. La direccion de escena crea una atmosfera intima que conecta al espectador directamente con el conflicto interno del principe de Dinamarca.",
    categorySlug: "teatro",
    image: "/events/teatro-01.jpg",
    date: "2026-03-22",
    time: "20:00",
    venue: "Teatro Metropolitan",
    city: "Ciudad de Mexico",
    priceInCents: 8500,
    availableTickets: 45,
    featured: true,
  },
];

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminName = process.env.SEED_ADMIN_NAME;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminEmail || !adminName || !adminPassword) {
    throw new Error(
      "Missing required env vars: SEED_ADMIN_EMAIL, SEED_ADMIN_NAME, SEED_ADMIN_PASSWORD",
    );
  }

  // Seed default categories.
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log(`Seeded ${DEFAULT_CATEGORIES.length} categories`);

  // Build slug -> id map so events can attach to a category by slug.
  const allCategories = await prisma.category.findMany();
  const categoryIdBySlug = new Map(allCategories.map((c) => [c.slug, c.id]));

  // Seed admin user
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: adminName,
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log(`Seeded admin user: ${admin.email}`);

  // Upload seed images to S3 and build image URL map
  const imageUrlMap = new Map<string, string>();
  const publicDir = path.resolve(__dirname, "../public");

  if (isS3Configured()) {
    const uniqueImages = [...new Set(EVENTS.map((e) => e.image))];
    for (const localPath of uniqueImages) {
      const filePath = path.join(publicDir, localPath);
      if (!fs.existsSync(filePath)) {
        console.warn(`Image not found: ${filePath}, keeping local path`);
        imageUrlMap.set(localPath, localPath);
        continue;
      }
      const file = fs.readFileSync(filePath);
      const ext = path.extname(localPath);
      const key = `events/${path.basename(localPath, ext)}-${Date.now()}${ext}`;
      const contentType = ext === ".png" ? "image/png" : "image/jpeg";
      const url = await uploadImage(file, key, contentType);
      imageUrlMap.set(localPath, url);
      console.log(`Uploaded ${localPath} -> ${url}`);
    }
    console.log(`Uploaded ${imageUrlMap.size} images to S3`);
  } else {
    console.warn("S3 not configured, keeping local image paths");
  }

  // Seed events (use S3 URLs when available)
  for (const event of EVENTS) {
    const image = imageUrlMap.get(event.image) ?? event.image;
    const categoryId = categoryIdBySlug.get(event.categorySlug);
    if (!categoryId) {
      throw new Error(`Unknown categorySlug "${event.categorySlug}" in seed event ${event.sku}`);
    }
    const { categorySlug: _slug, ...rest } = event;
    await prisma.event.upsert({
      where: { sku: event.sku },
      update: {},
      create: { id: crypto.randomUUID(), ...rest, image, categoryId },
    });
  }
  console.log(`Seeded ${EVENTS.length} events`);

  // Sync products to N1CO. Collections are derived from the categories table
  // so they stay in sync as admins create/edit categories.
  const collections = allCategories.map((c) => ({
    code: c.slug,
    name: c.name,
    description: c.description ?? "",
    image: "",
  }));

  const n1coProducts: N1COProductSync[] = EVENTS.map((event) => {
    const image = imageUrlMap.get(event.image) ?? event.image;
    return {
      sku: event.sku,
      name: event.name,
      description: event.description,
      extraDescription: event.longDescription,
      stock: event.availableTickets,
      price: event.priceInCents / 100,
      collections: [event.categorySlug],
      image,
      enable: true,
      salesChannel: ["PaymentLink"],
      locations: [{ locationCode: event.venue, isAvailable: true }],
      modifiers: [],
      images: [image],
    };
  });

  try {
    console.log(`\n--- N1CO Sync ---`);
    console.log(`Environment: ${process.env.N1CO_ENV || "sandbox"}`);
    console.log(
      `API URL: ${process.env.N1CO_ENV === "live" ? "https://api.n1co.com/api/v3" : "https://api-sandbox.n1co.shop/api/v3"}`,
    );
    console.log(`Client ID configured: ${!!process.env.N1CO_CLIENT_ID}`);
    console.log(`Client Secret configured: ${!!process.env.N1CO_CLIENT_SECRET}`);
    console.log(`Products to sync: ${n1coProducts.length}`);
    console.log(`Collections to sync: ${collections.map((c) => c.code).join(", ")}`);
    console.log(`Authenticating...`);

    const result = await createProducts(n1coProducts, collections);
    console.log(`Synced ${n1coProducts.length} products to N1CO`);
    console.log(`Response:`, JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`\n❌ N1CO sync failed`);
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error(`Error:`, error);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
