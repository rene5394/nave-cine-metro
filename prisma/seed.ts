import 'dotenv/config'
import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import { syncProducts, type N1COProductSync } from '../lib/n1co'
import { uploadImage, isS3Configured } from '../lib/s3'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

const EVENTS = [
  {
    sku: '000010',
    name: 'Dune: Parte III',
    description:
      'La epica conclusion de la saga de ciencia ficcion mas ambiciosa de la decada.',
    longDescription:
      'Sumergete en el desenlace de la saga Dune. Paul Atreides enfrenta su destino final mientras el universo conocido se tambalea al borde del caos. Una experiencia cinematografica inmersiva con sonido Dolby Atmos y proyeccion IMAX. Dirigida por Denis Villeneuve, esta pelicula promete ser el evento cinematografico del ano con efectos visuales sin precedentes y una banda sonora magistral de Hans Zimmer.',
    category: 'cine' as const,
    image: '/events/cinema-01.jpg',
    date: '2026-03-15',
    time: '19:30',
    venue: 'Cinepolis Diana',
    city: 'Ciudad de Mexico',
    priceInCents: 2500,
    availableTickets: 120,
    featured: true,
  },
  {
    sku: '000020',
    name: 'Dune: Parte III',
    description:
      'La epica conclusion de la saga de ciencia ficcion mas ambiciosa de la decada.',
    longDescription:
      'Sumergete en el desenlace de la saga Dune. Paul Atreides enfrenta su destino final mientras el universo conocido se tambalea al borde del caos. Una experiencia cinematografica inmersiva con sonido Dolby Atmos y proyeccion IMAX. Dirigida por Denis Villeneuve, esta pelicula promete ser el evento cinematografico del ano con efectos visuales sin precedentes y una banda sonora magistral de Hans Zimmer.',
    category: 'cine' as const,
    image: '/events/cinema-01.jpg',
    date: '2026-03-16',
    time: '15:30',
    venue: 'Cinepolis Santa Fe',
    city: 'Ciudad de Mexico',
    priceInCents: 2500,
    availableTickets: 150,
    featured: false,
  },
  {
    sku: '000030',
    name: 'Dune: Parte III',
    description:
      'La epica conclusion de la saga de ciencia ficcion mas ambiciosa de la decada.',
    longDescription:
      'Sumergete en el desenlace de la saga Dune. Paul Atreides enfrenta su destino final mientras el universo conocido se tambalea al borde del caos. Una experiencia cinematografica inmersiva con sonido Dolby Atmos y proyeccion IMAX. Dirigida por Denis Villeneuve, esta pelicula promete ser el evento cinematografico del ano con efectos visuales sin precedentes y una banda sonora magistral de Hans Zimmer.',
    category: 'cine' as const,
    image: '/events/cinema-01.jpg',
    date: '2026-03-17',
    time: '21:00',
    venue: 'Cinepolis Reforma',
    city: 'Ciudad de Mexico',
    priceInCents: 2500,
    availableTickets: 100,
    featured: false,
  },
  {
    sku: '000040',
    name: 'Hamlet Contemporaneo',
    description:
      'Una reinterpretacion audaz del clasico de Shakespeare con escenografia minimalista.',
    longDescription:
      'Esta adaptacion moderna de Hamlet transporta la tragedia shakesperiana a un contexto contemporaneo. Con una puesta en escena minimalista que utiliza proyecciones digitales y un elenco de primer nivel, esta version explora los temas eternos de la venganza, la locura y el poder politico. La direccion de escena crea una atmosfera intima que conecta al espectador directamente con el conflicto interno del principe de Dinamarca.',
    category: 'teatro' as const,
    image: '/events/teatro-01.jpg',
    date: '2026-03-22',
    time: '20:00',
    venue: 'Teatro Metropolitan',
    city: 'Ciudad de Mexico',
    priceInCents: 8500,
    availableTickets: 45,
    featured: true,
  },
  {
    sku: '000050',
    name: 'Hamlet Contemporaneo',
    description:
      'Una reinterpretacion audaz del clasico de Shakespeare con escenografia minimalista.',
    longDescription:
      'Esta adaptacion moderna de Hamlet transporta la tragedia shakesperiana a un contexto contemporaneo. Con una puesta en escena minimalista que utiliza proyecciones digitales y un elenco de primer nivel, esta version explora los temas eternos de la venganza, la locura y el poder politico. La direccion de escena crea una atmosfera intima que conecta al espectador directamente con el conflicto interno del principe de Dinamarca.',
    category: 'teatro' as const,
    image: '/events/teatro-01.jpg',
    date: '2026-03-23',
    time: '20:00',
    venue: 'Teatro Blanquita',
    city: 'Ciudad de Mexico',
    priceInCents: 8500,
    availableTickets: 50,
    featured: false,
  },
  {
    sku: '000060',
    name: 'Hamlet Contemporaneo',
    description:
      'Una reinterpretacion audaz del clasico de Shakespeare con escenografia minimalista.',
    longDescription:
      'Esta adaptacion moderna de Hamlet transporta la tragedia shakesperiana a un contexto contemporaneo. Con una puesta en escena minimalista que utiliza proyecciones digitales y un elenco de primer nivel, esta version explora los temas eternos de la venganza, la locura y el poder politico. La direccion de escena crea una atmosfera intima que conecta al espectador directamente con el conflicto interno del principe de Dinamarca.',
    category: 'teatro' as const,
    image: '/events/teatro-01.jpg',
    date: '2026-03-24',
    time: '19:00',
    venue: 'Teatro Nacional',
    city: 'Ciudad de Mexico',
    priceInCents: 8500,
    availableTickets: 40,
    featured: false,
  },
  {
    sku: '000070',
    name: 'Noche Electronica: ODESZA',
    description:
      'Un espectaculo audiovisual unico con el duo de musica electronica mas aclamado.',
    longDescription:
      'ODESZA regresa con su gira mundial presentando un show completamente nuevo. Con un escenario de 360 grados, visuales holograficas y un sistema de sonido envolvente, esta sera una experiencia sensorial completa. El set incluye material de su nuevo album junto con los clasicos que los catapultaron a la fama. Una noche que combinara musica electronica con arte visual de vanguardia.',
    category: 'concierto' as const,
    image: '/events/concierto-01.jpg',
    date: '2026-04-05',
    time: '21:00',
    venue: 'Foro Sol',
    city: 'Ciudad de Mexico',
    priceInCents: 15000,
    availableTickets: 500,
    featured: true,
  },
  {
    sku: '000080',
    name: 'Noche Electronica: ODESZA',
    description:
      'Un espectaculo audiovisual unico con el duo de musica electronica mas aclamado.',
    longDescription:
      'ODESZA regresa con su gira mundial presentando un show completamente nuevo. Con un escenario de 360 grados, visuales holograficas y un sistema de sonido envolvente, esta sera una experiencia sensorial completa. El set incluye material de su nuevo album junto con los clasicos que los catapultaron a la fama. Una noche que combinara musica electronica con arte visual de vanguardia.',
    category: 'concierto' as const,
    image: '/events/concierto-01.jpg',
    date: '2026-04-06',
    time: '21:00',
    venue: 'Palacio de los Deportes',
    city: 'Ciudad de Mexico',
    priceInCents: 15000,
    availableTickets: 400,
    featured: false,
  },
  {
    sku: '000090',
    name: 'Noche Electronica: ODESZA',
    description:
      'Un espectaculo audiovisual unico con el duo de musica electronica mas aclamado.',
    longDescription:
      'ODESZA regresa con su gira mundial presentando un show completamente nuevo. Con un escenario de 360 grados, visuales holograficas y un sistema de sonido envolvente, esta sera una experiencia sensorial completa. El set incluye material de su nuevo album junto con los clasicos que los catapultaron a la fama. Una noche que combinara musica electronica con arte visual de vanguardia.',
    category: 'concierto' as const,
    image: '/events/concierto-01.jpg',
    date: '2026-04-07',
    time: '20:00',
    venue: 'Auditorio Nacional',
    city: 'Ciudad de Mexico',
    priceInCents: 15000,
    availableTickets: 350,
    featured: false,
  },
  {
    sku: '000100',
    name: 'Arte Inmersivo: Luces del Futuro',
    description:
      'Una exposicion interactiva que fusiona arte digital con experiencias sensoriales.',
    longDescription:
      'Luces del Futuro es una experiencia inmersiva que transforma un espacio industrial en un universo de arte digital interactivo. Mas de 20 instalaciones creadas por artistas internacionales responden al movimiento y la presencia del visitante. Desde tuneles de luz infinita hasta salas de proyeccion 360, cada espacio ofrece una experiencia unica. Incluye zona gastronómica con cocteleria tematica y musica ambient en vivo.',
    category: 'popup' as const,
    image: '/events/popup-01.jpg',
    date: '2026-04-12',
    time: '18:00',
    venue: 'Nave Creativa',
    city: 'Ciudad de Mexico',
    priceInCents: 6500,
    availableTickets: 200,
    featured: false,
  },
  {
    sku: '000110',
    name: 'Arte Inmersivo: Luces del Futuro',
    description:
      'Una exposicion interactiva que fusiona arte digital con experiencias sensoriales.',
    longDescription:
      'Luces del Futuro es una experiencia inmersiva que transforma un espacio industrial en un universo de arte digital interactivo. Mas de 20 instalaciones creadas por artistas internacionales responden al movimiento y la presencia del visitante. Desde tuneles de luz infinita hasta salas de proyeccion 360, cada espacio ofrece una experiencia unica. Incluye zona gastronómica con cocteleria tematica y musica ambient en vivo.',
    category: 'popup' as const,
    image: '/events/popup-01.jpg',
    date: '2026-04-13',
    time: '18:00',
    venue: 'Espacios Abiertos',
    city: 'Ciudad de Mexico',
    priceInCents: 6500,
    availableTickets: 250,
    featured: false,
  },
  {
    sku: '000120',
    name: 'Arte Inmersivo: Luces del Futuro',
    description:
      'Una exposicion interactiva que fusiona arte digital con experiencias sensoriales.',
    longDescription:
      'Luces del Futuro es una experiencia inmersiva que transforma un espacio industrial en un universo de arte digital interactivo. Mas de 20 instalaciones creadas por artistas internacionales responden al movimiento y la presencia del visitante. Desde tuneles de luz infinita hasta salas de proyeccion 360, cada espacio ofrece una experiencia unica. Incluye zona gastronómica con cocteleria tematica y musica ambient en vivo.',
    category: 'popup' as const,
    image: '/events/popup-01.jpg',
    date: '2026-04-14',
    time: '17:00',
    venue: 'Centro Cultural',
    city: 'Ciudad de Mexico',
    priceInCents: 6500,
    availableTickets: 180,
    featured: false,
  },
  {
    sku: '000130',
    name: 'Matrix: La Resurreccion Final',
    description:
      'La ultima entrega de la saga que redefinio el cine de ciencia ficcion.',
    longDescription:
      'Neo regresa una vez mas en esta conclusion epica de la saga Matrix. Con efectos visuales revolucionarios y una narrativa que cuestiona los limites entre realidad y simulacion, esta pelicula lleva la franquicia a nuevas alturas. Disfruta la experiencia en pantalla IMAX con sonido inmersivo que te transportara directamente dentro de la Matrix.',
    category: 'cine' as const,
    image: '/events/cinema-02.jpg',
    date: '2026-04-20',
    time: '20:00',
    venue: 'Cineteca Nacional',
    city: 'Ciudad de Mexico',
    priceInCents: 2000,
    availableTickets: 80,
    featured: false,
  },
  {
    sku: '000140',
    name: 'Matrix: La Resurreccion Final',
    description:
      'La ultima entrega de la saga que redefinio el cine de ciencia ficcion.',
    longDescription:
      'Neo regresa una vez mas en esta conclusion epica de la saga Matrix. Con efectos visuales revolucionarios y una narrativa que cuestiona los limites entre realidad y simulacion, esta pelicula lleva la franquicia a nuevas alturas. Disfruta la experiencia en pantalla IMAX con sonido inmersivo que te transportara directamente dentro de la Matrix.',
    category: 'cine' as const,
    image: '/events/cinema-02.jpg',
    date: '2026-04-21',
    time: '18:30',
    venue: 'Cinepolis Polanco',
    city: 'Ciudad de Mexico',
    priceInCents: 2000,
    availableTickets: 120,
    featured: false,
  },
  {
    sku: '000150',
    name: 'Matrix: La Resurreccion Final',
    description:
      'La ultima entrega de la saga que redefinio el cine de ciencia ficcion.',
    longDescription:
      'Neo regresa una vez mas en esta conclusion epica de la saga Matrix. Con efectos visuales revolucionarios y una narrativa que cuestiona los limites entre realidad y simulacion, esta pelicula lleva la franquicia a nuevas alturas. Disfruta la experiencia en pantalla IMAX con sonido inmersivo que te transportara directamente dentro de la Matrix.',
    category: 'cine' as const,
    image: '/events/cinema-02.jpg',
    date: '2026-04-22',
    time: '19:00',
    venue: 'Cinepolis Acoxpa',
    city: 'Ciudad de Mexico',
    priceInCents: 2000,
    availableTickets: 90,
    featured: false,
  },
  {
    sku: '000160',
    name: 'El Lago de los Cisnes',
    description:
      'La obra maestra del ballet clasico interpretada por el Ballet Nacional.',
    longDescription:
      'El Ballet Nacional presenta su version magistral de El Lago de los Cisnes de Tchaikovsky. Con coreografia renovada que respeta la tradicion clasica mientras incorpora elementos contemporaneos, esta produccion cuenta con un elenco de 40 bailarines, vestuario diseñado por artistas de renombre y una orquesta en vivo de 60 musicos. Una experiencia que combina la elegancia del ballet clasico con la grandeza de una produccion moderna.',
    category: 'teatro' as const,
    image: '/events/teatro-02.jpg',
    date: '2026-05-03',
    time: '19:00',
    venue: 'Palacio de Bellas Artes',
    city: 'Ciudad de Mexico',
    priceInCents: 12000,
    availableTickets: 30,
    featured: false,
  },
  {
    sku: '000170',
    name: 'El Lago de los Cisnes',
    description:
      'La obra maestra del ballet clasico interpretada por el Ballet Nacional.',
    longDescription:
      'El Ballet Nacional presenta su version magistral de El Lago de los Cisnes de Tchaikovsky. Con coreografia renovada que respeta la tradicion clasica mientras incorpora elementos contemporaneos, esta produccion cuenta con un elenco de 40 bailarines, vestuario diseñado por artistas de renombre y una orquesta en vivo de 60 musicos. Una experiencia que combina la elegancia del ballet clasico con la grandeza de una produccion moderna.',
    category: 'teatro' as const,
    image: '/events/teatro-02.jpg',
    date: '2026-05-04',
    time: '18:00',
    venue: 'Teatro Universitario',
    city: 'Ciudad de Mexico',
    priceInCents: 12000,
    availableTickets: 50,
    featured: false,
  },
  {
    sku: '000180',
    name: 'El Lago de los Cisnes',
    description:
      'La obra maestra del ballet clasico interpretada por el Ballet Nacional.',
    longDescription:
      'El Ballet Nacional presenta su version magistral de El Lago de los Cisnes de Tchaikovsky. Con coreografia renovada que respeta la tradicion clasica mientras incorpora elementos contemporaneos, esta produccion cuenta con un elenco de 40 bailarines, vestuario diseñado por artistas de renombre y una orquesta en vivo de 60 musicos. Una experiencia que combina la elegancia del ballet clasico con la grandeza de una produccion moderna.',
    category: 'teatro' as const,
    image: '/events/teatro-02.jpg',
    date: '2026-05-05',
    time: '19:30',
    venue: 'Teatro Aldama',
    city: 'Ciudad de Mexico',
    priceInCents: 12000,
    availableTickets: 35,
    featured: false,
  },
  {
    sku: '000190',
    name: 'Festival de Jazz Nocturno',
    description:
      'Una noche intima con los mejores exponentes del jazz contemporaneo.',
    longDescription:
      'El Festival de Jazz Nocturno reune a los artistas mas destacados del jazz contemporaneo en un formato intimo y exclusivo. Tres escenarios simultáneos ofrecen desde jazz clasico hasta fusion experimental. El evento incluye catas de vino, gastronomia gourmet y sesiones de improvisacion que hacen cada noche irrepetible. Un oasis musical para los amantes del buen jazz.',
    category: 'concierto' as const,
    image: '/events/concierto-02.jpg',
    date: '2026-05-10',
    time: '20:30',
    venue: 'Lunario del Auditorio',
    city: 'Ciudad de Mexico',
    priceInCents: 9500,
    availableTickets: 150,
    featured: false,
  },
  {
    sku: '000200',
    name: 'Festival de Jazz Nocturno',
    description:
      'Una noche intima con los mejores exponentes del jazz contemporaneo.',
    longDescription:
      'El Festival de Jazz Nocturno reune a los artistas mas destacados del jazz contemporaneo en un formato intimo y exclusivo. Tres escenarios simultáneos ofrecen desde jazz clasico hasta fusion experimental. El evento incluye catas de vino, gastronomia gourmet y sesiones de improvisacion que hacen cada noche irrepetible. Un oasis musical para los amantes del buen jazz.',
    category: 'concierto' as const,
    image: '/events/concierto-02.jpg',
    date: '2026-05-11',
    time: '20:00',
    venue: 'Foro Indie Rocks',
    city: 'Ciudad de Mexico',
    priceInCents: 9500,
    availableTickets: 200,
    featured: false,
  },
  {
    sku: '000210',
    name: 'Festival de Jazz Nocturno',
    description:
      'Una noche intima con los mejores exponentes del jazz contemporaneo.',
    longDescription:
      'El Festival de Jazz Nocturno reune a los artistas mas destacados del jazz contemporaneo en un formato intimo y exclusivo. Tres escenarios simultáneos ofrecen desde jazz clasico hasta fusion experimental. El evento incluye catas de vino, gastronomia gourmet y sesiones de improvisacion que hacen cada noche irrepetible. Un oasis musical para los amantes del buen jazz.',
    category: 'concierto' as const,
    image: '/events/concierto-02.jpg',
    date: '2026-05-12',
    time: '21:00',
    venue: 'Gran Sala del Auditorio',
    city: 'Ciudad de Mexico',
    priceInCents: 9500,
    availableTickets: 180,
    featured: false,
  },
  {
    sku: '000220',
    name: 'Mercado Nocturno Gastronomico',
    description:
      'Un festival culinario con los mejores chefs y food trucks de la ciudad.',
    longDescription:
      'El Mercado Nocturno Gastronomico transforma un espacio al aire libre en el paraiso de los foodlovers. Mas de 30 puestos y food trucks ofrecen lo mejor de la gastronomia local e internacional. Desde tacos gourmet hasta cocina fusion asiatica, cada bocado es una aventura. Complementado con musica en vivo, cocteleria artesanal y talleres de cocina interactivos. Un evento para disfrutar con todos los sentidos.',
    category: 'popup' as const,
    image: '/events/popup-02.jpg',
    date: '2026-05-17',
    time: '17:00',
    venue: 'Explanada del Monumento',
    city: 'Ciudad de Mexico',
    priceInCents: 3500,
    availableTickets: 300,
    featured: false,
  },
  {
    sku: '000230',
    name: 'Mercado Nocturno Gastronomico',
    description:
      'Un festival culinario con los mejores chefs y food trucks de la ciudad.',
    longDescription:
      'El Mercado Nocturno Gastronomico transforma un espacio al aire libre en el paraiso de los foodlovers. Mas de 30 puestos y food trucks ofrecen lo mejor de la gastronomia local e internacional. Desde tacos gourmet hasta cocina fusion asiatica, cada bocado es una aventura. Complementado con musica en vivo, cocteleria artesanal y talleres de cocina interactivos. Un evento para disfrutar con todos los sentidos.',
    category: 'popup' as const,
    image: '/events/popup-02.jpg',
    date: '2026-05-18',
    time: '17:00',
    venue: 'Parque Hundido',
    city: 'Ciudad de Mexico',
    priceInCents: 3500,
    availableTickets: 350,
    featured: false,
  },
  {
    sku: '000240',
    name: 'Mercado Nocturno Gastronomico',
    description:
      'Un festival culinario con los mejores chefs y food trucks de la ciudad.',
    longDescription:
      'El Mercado Nocturno Gastronomico transforma un espacio al aire libre en el paraiso de los foodlovers. Mas de 30 puestos y food trucks ofrecen lo mejor de la gastronomia local e internacional. Desde tacos gourmet hasta cocina fusion asiatica, cada bocado es una aventura. Complementado con musica en vivo, cocteleria artesanal y talleres de cocina interactivos. Un evento para disfrutar con todos los sentidos.',
    category: 'popup' as const,
    image: '/events/popup-02.jpg',
    date: '2026-05-19',
    time: '18:00',
    venue: 'Paseo de la Reforma',
    city: 'Ciudad de Mexico',
    priceInCents: 3500,
    availableTickets: 280,
    featured: false,
  },
]

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminName = process.env.SEED_ADMIN_NAME
  const adminPassword = process.env.SEED_ADMIN_PASSWORD

  if (!adminEmail || !adminName || !adminPassword) {
    throw new Error(
      'Missing required env vars: SEED_ADMIN_EMAIL, SEED_ADMIN_NAME, SEED_ADMIN_PASSWORD',
    )
  }

  // Seed admin user
  const hashedPassword = await bcrypt.hash(adminPassword, 10)
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: adminName,
      password: hashedPassword,
      role: 'ADMIN',
    },
  })
  console.log(`Seeded admin user: ${admin.email}`)

  // Upload seed images to S3 and build image URL map
  const imageUrlMap = new Map<string, string>()
  const publicDir = path.resolve(__dirname, '../public')

  if (isS3Configured()) {
    const uniqueImages = [...new Set(EVENTS.map((e) => e.image))]
    for (const localPath of uniqueImages) {
      const filePath = path.join(publicDir, localPath)
      if (!fs.existsSync(filePath)) {
        console.warn(`Image not found: ${filePath}, keeping local path`)
        imageUrlMap.set(localPath, localPath)
        continue
      }
      const file = fs.readFileSync(filePath)
      const ext = path.extname(localPath)
      const key = `events/${path.basename(localPath, ext)}-${Date.now()}${ext}`
      const contentType = ext === '.png' ? 'image/png' : 'image/jpeg'
      const url = await uploadImage(file, key, contentType)
      imageUrlMap.set(localPath, url)
      console.log(`Uploaded ${localPath} -> ${url}`)
    }
    console.log(`Uploaded ${imageUrlMap.size} images to S3`)
  } else {
    console.warn('S3 not configured, keeping local image paths')
  }

  // Seed events (use S3 URLs when available)
  for (const event of EVENTS) {
    const image = imageUrlMap.get(event.image) ?? event.image
    await prisma.event.upsert({
      where: { sku: event.sku },
      update: {},
      create: { id: crypto.randomUUID(), ...event, image },
    })
  }
  console.log(`Seeded ${EVENTS.length} events`)

  // Sync products to N1CO
  const n1coProducts: N1COProductSync[] = EVENTS.map((event) => {
    const image = imageUrlMap.get(event.image) ?? event.image
    return {
      sku: event.sku,
      name: event.name,
      description: event.description,
      extraDescription: event.longDescription,
      stock: event.availableTickets,
      price: event.priceInCents / 100,
      collections: [event.category],
      image,
      enable: true,
      salesChannel: ['PaymentLink'],
      locations: [{ locationCode: event.venue, isAvailable: true }],
      modifiers: [],
      images: [image],
    }
  })

  const collections = [
    {
      code: 'cine',
      name: 'Cine',
      description: 'Peliculas',
      image: '',
    },
    {
      code: 'teatro',
      name: 'Teatro',
      description: 'Obras de teatro y ballet',
      image: '',
    },
    {
      code: 'concierto',
      name: 'Concierto',
      description: 'Conciertos y festivales',
      image: '',
    },
    {
      code: 'popup',
      name: 'Pop Up',
      description: 'Eventos pop-up y experiencias',
      image: '',
    },
  ]

  try {
    console.log(`\n--- N1CO Sync ---`)
    console.log(`Environment: ${process.env.N1CO_ENV || 'sandbox'}`)
    console.log(
      `API URL: ${process.env.N1CO_ENV === 'live' ? 'https://api.n1co.com/api/v3' : 'https://api-sandbox.n1co.shop/api/v3'}`,
    )
    console.log(`Client ID configured: ${!!process.env.N1CO_CLIENT_ID}`)
    console.log(`Client Secret configured: ${!!process.env.N1CO_CLIENT_SECRET}`)
    console.log(`Products to sync: ${n1coProducts.length}`)
    console.log(
      `Collections to sync: ${collections.map((c) => c.code).join(', ')}`,
    )
    console.log(`Authenticating...`)

    const result = await syncProducts(n1coProducts, collections)
    console.log(`Synced ${n1coProducts.length} products to N1CO`)
    console.log(`Response:`, JSON.stringify(result, null, 2))
  } catch (error) {
    console.error(`\n❌ N1CO sync failed`)
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`)
    } else {
      console.error(`Error:`, error)
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
