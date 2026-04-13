import { type N1COProduct } from "@/lib/n1co"
import { NextRequest, NextResponse } from "next/server"

// Mock storage (in production, this would be a database or N1CO API)
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = (await request.json()) as Partial<N1COProduct>
    
    const productIndex = MOCK_PRODUCTS.findIndex(p => p.id === id)
    if (productIndex === -1) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    // Update the product
    const updatedProduct: N1COProduct = {
      ...MOCK_PRODUCTS[productIndex],
      ...body,
      id, // Ensure ID doesn't change
    }

    MOCK_PRODUCTS[productIndex] = updatedProduct
    
    return NextResponse.json(updatedProduct)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const productIndex = MOCK_PRODUCTS.findIndex(p => p.id === id)
    if (productIndex === -1) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    MOCK_PRODUCTS.splice(productIndex, 1)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    )
  }
}
