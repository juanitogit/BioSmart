import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ShoppingCart, Tag, Plus, Edit, Trash2, Star, CheckCircle2, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';

interface Product {
  id: number;
  name: string;
  slug?: string;
  description: string;
  price: string;
  image: string | null;
  category: string;
  stock: number;
  rating?: string;
  reviewsCount?: number;
  sellerId: number;
  sellerName?: string;
}

export function Marketplace() {
  const { user, isSeller } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [showMyProducts, setShowMyProducts] = useState(false);

  // Create/Edit product form
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', price: '', category: 'kits', stock: '10', image: '' });
  const [uploading, setUploading] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (user && isSeller) fetchMyProducts();
  }, [user]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/products');
      setProducts(data.products || []);
    } catch (err) {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyProducts = async () => {
    try {
      const data = await apiGet('/products/mine');
      setMyProducts(data.products || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64 and upload via API
    const reader = new FileReader();
    reader.onload = async () => {
      setUploading(true);
      try {
        const formDataUpload = new FormData();
        formDataUpload.append('image', file);
        
        const res = await fetch('/api/products/upload-image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: formDataUpload,
        });
        
        if (!res.ok) throw new Error('Error al subir imagen');
        const data = await res.json();
        setFormData(prev => ({ ...prev, image: data.url }));
        toast.success('Imagen subida a Cloudinary');
      } catch (err) {
        toast.error('Error al subir imagen. Puedes pegar un URL manualmente.');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProduct = async () => {
    if (!formData.name || !formData.price) {
      toast.error('Nombre y precio son requeridos');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        category: formData.category,
        stock: parseInt(formData.stock) || 0,
        image: formData.image || null,
      };

      if (editingProduct) {
        await apiPut(`/products/${editingProduct.id}`, payload);
        toast.success('Producto actualizado');
      } else {
        await apiPost('/products', payload);
        toast.success('Producto publicado exitosamente');
      }

      setShowForm(false);
      setEditingProduct(null);
      setFormData({ name: '', description: '', price: '', category: 'kits', stock: '10', image: '' });
      fetchProducts();
      fetchMyProducts();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar producto');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    try {
      await apiDelete(`/products/${id}`);
      toast.success('Producto eliminado');
      fetchProducts();
      fetchMyProducts();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      category: product.category || 'kits',
      stock: String(product.stock || 0),
      image: product.image || '',
    });
    setShowForm(true);
  };

  const handleBuy = async (productId: number) => {
    try {
      await apiPost(`/products/${productId}/buy`, { quantity: 1 });
      toast.success('¡Compra realizada con éxito!');
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || 'Error al comprar');
    }
  };

  const displayProducts = showMyProducts ? myProducts : products;
  const filteredProducts = displayProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (p.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = category === 'all' || p.category === category;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative flex-grow max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Buscar productos agrícolas, sensores, abonos..." 
            className="pl-10 h-12 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {isSeller && (
            <>
              <Button 
                variant={showMyProducts ? "default" : "outline"}
                className="rounded-xl h-12"
                onClick={() => setShowMyProducts(!showMyProducts)}
              >
                {showMyProducts ? "Ver Todo" : "Mis Productos"}
              </Button>
              <Button 
                className="rounded-xl h-12 gap-2"
                onClick={() => { setEditingProduct(null); setFormData({ name: '', description: '', price: '', category: 'kits', stock: '10', image: '' }); setShowForm(true); }}
              >
                <Plus size={18} /> Publicar Producto
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 flex-wrap">
        {categories.slice(0, 8).map(cat => (
          <Button 
            key={cat}
            variant={category === cat ? "default" : "outline"}
            className="capitalize rounded-xl h-10 px-5 text-sm"
            onClick={() => setCategory(cat)}
          >
            {cat === 'all' ? 'Todos' : cat}
          </Button>
        ))}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-[400px] rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="h-full group hover:shadow-xl transition-all duration-300 border-border/50 overflow-hidden rounded-2xl flex flex-col">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted cursor-pointer" onClick={() => setLocation(`/productos-detalle/${product.id}`)}>
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/20">
                        <Tag size={48} className="text-primary/30" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4 flex flex-col items-start gap-1">
                      <div className="h-[2px] w-4 bg-primary" />
                      <span className="text-[10px] font-bold tracking-widest uppercase text-white drop-shadow-md bg-black/40 px-2 py-0.5 rounded">
                        {product.category || 'general'}
                      </span>
                    </div>
                    {product.rating && parseFloat(product.rating) > 0 && (
                      <div className="absolute top-4 right-4 bg-black/60 text-yellow-400 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold">
                        <Star size={12} fill="currentColor" /> {parseFloat(product.rating).toFixed(1)}
                      </div>
                    )}
                  </div>
                  
                  <CardHeader className="pb-2 cursor-pointer" onClick={() => setLocation(`/productos-detalle/${product.id}`)}>
                    <div className="flex justify-between items-start mb-1">
                      <CardTitle className="text-lg font-bold truncate leading-tight">
                        {product.name}
                      </CardTitle>
                    </div>
                  </CardHeader>

                  <CardContent className="pb-4 flex-grow">
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                      {product.description || 'Sin descripción'}
                    </p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-2xl font-bold font-mono">${product.price}</span>
                      <span className="text-xs text-muted-foreground uppercase font-bold">USD</span>
                    </div>
                    {product.stock !== undefined && (
                      <p className="text-xs text-muted-foreground mt-1">Stock: {product.stock} unidades</p>
                    )}
                  </CardContent>

                  <CardFooter className="pt-0 pb-6 px-6">
                    {showMyProducts && product.sellerId === user?.id ? (
                      <div className="flex gap-2 w-full">
                        <Button variant="outline" className="flex-1 gap-1 rounded-xl h-10" onClick={() => openEditForm(product)}>
                          <Edit size={14} /> Editar
                        </Button>
                        <Button variant="destructive" className="gap-1 rounded-xl h-10 px-4" onClick={() => handleDeleteProduct(product.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        className="w-full gap-2 rounded-xl h-11" 
                        onClick={() => handleBuy(product.id)}
                        disabled={product.stock <= 0}
                      >
                        <ShoppingCart size={18} />
                        {product.stock > 0 ? 'Comprar Ahora' : 'Sin Stock'}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {!loading && filteredProducts.length === 0 && (
        <div className="text-center py-20 bg-muted/30 rounded-3xl border-2 border-dashed border-border">
          <Tag className="mx-auto mb-4 text-muted-foreground" size={48} />
          <h3 className="text-2xl font-bold mb-2">
            {showMyProducts ? 'No tienes productos publicados aún' : 'No se encontraron productos'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {showMyProducts ? 'Publica tu primer producto para empezar a vender.' : 'Intenta con otros términos de búsqueda o categorías.'}
          </p>
          {showMyProducts && isSeller && (
            <Button className="rounded-xl gap-2" onClick={() => { setEditingProduct(null); setFormData({ name: '', description: '', price: '', category: 'kits', stock: '10', image: '' }); setShowForm(true); }}>
              <Plus size={18} /> Publicar Producto
            </Button>
          )}
        </div>
      )}

      {/* Create/Edit Product Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar Producto' : 'Publicar Nuevo Producto'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Modifica la información de tu producto.' : 'Completa los datos para publicar en el marketplace.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <label className="text-sm font-bold mb-1 block">Nombre del producto</label>
              <Input 
                placeholder="Ej: Sensor de humedad IoT" 
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-bold mb-1 block">Descripción</label>
              <Textarea 
                placeholder="Describe tu producto..." 
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold mb-1 block">Precio (USD)</label>
                <Input 
                  type="number" 
                  step="0.01"
                  placeholder="25.00" 
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-bold mb-1 block">Stock</label>
                <Input 
                  type="number" 
                  placeholder="10" 
                  value={formData.stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-bold mb-1 block">Categoría</label>
              <Select value={formData.category} onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kits">Kits</SelectItem>
                  <SelectItem value="tecnología">Tecnología</SelectItem>
                  <SelectItem value="semillas">Semillas</SelectItem>
                  <SelectItem value="insumos">Insumos</SelectItem>
                  <SelectItem value="herramientas">Herramientas</SelectItem>
                  <SelectItem value="fertilizantes">Fertilizantes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-bold mb-1 block">Imagen del producto</label>
              <div className="flex gap-2">
                <Input 
                  placeholder="URL de la imagen o sube una" 
                  value={formData.image}
                  onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                  className="flex-1"
                />
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <Button type="button" variant="outline" className="gap-1" disabled={uploading} asChild>
                    <span><ImagePlus size={16} /> {uploading ? '...' : 'Subir'}</span>
                  </Button>
                </label>
              </div>
              {formData.image && (
                <img src={formData.image} alt="Preview" className="mt-2 h-24 w-24 object-cover rounded-lg border" />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmitProduct} className="w-full">
              {editingProduct ? 'Guardar Cambios' : 'Publicar Producto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
