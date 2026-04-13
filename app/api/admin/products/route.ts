import { NextResponse } from "next/server"
import { type N1COProduct } from "@/lib/n1co"

// Mock products for development
let MOCK_PRODUCTS: N1COProduct[] = [
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
]

export async function GET() {
  try {
    return NextResponse.json({ products: MOCK_PRODUCTS })
  } catch (error) {
    return NextResponse.json({ products: MOCK_PRODUCTS })
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Omit<N1COProduct, 'id'>
    
    // Validate required fields
    if (!body.name || !body.description || body.price === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, price' },
        { status: 400 }
      )
    }

    // Generate new ID
    const maxId = Math.max(
      0,
      ...MOCK_PRODUCTS.map(p => {
        const num = parseInt(p.id)
        return isNaN(num) ? 0 : num
      })
    )
    const newId = String(maxId + 1)
    
    const newProduct: N1COProduct = {
      id: newId,
      name: body.name,
      description: body.description,
      price: body.price,
      currency: body.currency || 'MXN',
      image: body.image || '',
      category: body.category || 'cine',
    }

    MOCK_PRODUCTS.push(newProduct)
    
    return NextResponse.json(newProduct, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create product', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
