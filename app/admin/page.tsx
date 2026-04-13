'use client'

import React, { useState } from "react"
import { useEffect } from 'react'
import { Plus, Trash2, Edit2, Loader, BarChart3, Package, Users } from 'lucide-react'
import { type N1COProduct } from '@/lib/n1co'

type AdminTab = 'dashboard' | 'products' | 'subscriptions'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')
  const [products, setProducts] = useState<N1COProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    currency: 'MXN',
    image: '',
    category: 'cine' as const,
  })

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/admin/products')
        if (!response.ok) throw new Error('Failed to fetch products')
        const data = (await response.json()) as { products: N1COProduct[] }
        setProducts(data.products)
        setError(null)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMsg)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingId ? `/api/admin/products/${editingId}` : '/api/admin/products'
      const method = editingId ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to save product')
      }

      const newProduct = (await response.json()) as N1COProduct

      if (editingId) {
        setProducts(products.map((p) => (p.id === editingId ? newProduct : p)))
      } else {
        setProducts([...products, newProduct])
      }

      setFormData({ name: '', description: '', price: 0, currency: 'MXN', image: '', category: 'cine' })
      setEditingId(null)
      setShowForm(false)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error saving product'
      setError(errorMsg)
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('¿Eliminar producto?')) return

    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete product')

      setProducts(products.filter((p) => p.id !== productId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting product')
    }
  }

  const handleEdit = (product: N1COProduct) => {
    setFormData({
      name: product.name,
      description: product.description,
      price: typeof product.price === 'number' ? product.price : parseFloat(String(product.price)) || 0,
      currency: product.currency,
      image: product.image || '',
      category: (product.category as any) || 'cine',
    })
    setEditingId(product.id)
    setShowForm(true)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b border-border bg-white shadow-sm" style={{ backgroundColor: "#333333" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img 
              src="/logo-nave.svg" 
              alt="EntradasYA" 
              className="h-10 w-auto"
            />
            <span className="text-xl font-bold text-white font-display hidden sm:inline">
              EntradasYA Admin
            </span>
          </div>
          <div className="text-sm text-white/80">
            Panel de administración
          </div>
        </div>
      </nav>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8">
        {/* Sidebar */}
        <aside className="w-48 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-primary text-white shadow-md'
                : 'text-foreground hover:bg-secondary'
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
              activeTab === 'products'
                ? 'bg-primary text-white shadow-md'
                : 'text-foreground hover:bg-secondary'
            }`}
          >
            <Package className="h-5 w-5" />
            Lista de Productos
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
              activeTab === 'subscriptions'
                ? 'bg-primary text-white shadow-md'
                : 'text-foreground hover:bg-secondary'
            }`}
          >
            <Users className="h-5 w-5" />
            Suscripciones
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h1 className="mb-2 text-3xl font-bold text-foreground font-display">Panel de Control</h1>
                <p className="text-muted-foreground">Bienvenido al panel administrativo de EntradasYA</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Productos</p>
                      <p className="text-2xl font-bold text-foreground">{products.length}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20">
                      <Users className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Suscriptores</p>
                      <p className="text-2xl font-bold text-foreground">0</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20">
                      <BarChart3 className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Ingresos</p>
                      <p className="text-2xl font-bold text-foreground">$0</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div>
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground font-display">Lista de Productos</h2>
                  <p className="text-muted-foreground">Gestiona todos tus productos</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setFormData({ name: '', description: '', price: 0, currency: 'MXN', image: '', category: 'cine' })
                    setShowForm(!showForm)
                  }}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:shadow-lg"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo Producto
                </button>
              </div>

              {error && (
                <div className="mb-4 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
                  {error}
                </div>
              )}

              {showForm && (
                <form
                  onSubmit={handleSubmit}
                  className="mb-8 rounded-lg border border-border bg-card p-6 shadow-sm"
                >
                  <h3 className="mb-4 text-lg font-bold text-foreground font-display">
                    {editingId ? 'Editar Producto' : 'Crear Producto'}
                  </h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Nombre"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Descripción"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
                      required
                    />
                    <input
                      type="text"
                      placeholder="URL de imagen"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
                      required
                    />
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
                      required
                    >
                      <option value="cine">Cine</option>
                      <option value="teatro">Teatro</option>
                      <option value="concierto">Concierto</option>
                      <option value="popup">Pop Up</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Precio"
                      value={formData.price || 0}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
                      required
                    />
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
                    >
                      <option value="MXN">MXN (Pesos)</option>
                      <option value="USD">USD (Dólares)</option>
                    </select>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="submit"
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-all hover:shadow-lg"
                    >
                      {editingId ? 'Actualizar' : 'Crear'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground transition-all hover:bg-secondary"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
                  <table className="w-full">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-bold text-foreground">
                          Imagen
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-bold text-foreground">
                          Nombre
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-bold text-foreground">
                          Categoría
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-bold text-foreground">
                          Precio
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-bold text-foreground">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                            No hay productos. Crea uno para empezar.
                          </td>
                        </tr>
                      ) : (
                        products.map((product) => (
                          <tr key={product.id} className="border-t border-border hover:bg-secondary/30">
                            <td className="px-6 py-4 text-sm">
                              {product.image && (
                                <img 
                                  src={product.image || "/placeholder.svg"} 
                                  alt={product.name}
                                  className="h-10 w-10 rounded object-cover"
                                />
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-foreground">
                              {product.name}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span className="inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary capitalize">
                                {product.category || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-primary">
                              {product.price} {product.currency}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEdit(product)}
                                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                                >
                                  <Edit2 className="h-3 w-3" />
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(product.id)}
                                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Subscriptions Tab */}
          {activeTab === 'subscriptions' && (
            <div>
              <div>
                <h2 className="text-2xl font-bold text-foreground font-display">Suscripciones</h2>
                <p className="text-muted-foreground">Gestiona las suscripciones de usuarios</p>
              </div>

              <div className="mt-6 rounded-lg border border-border bg-card p-8 text-center shadow-sm">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No hay suscripciones registradas aún</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
