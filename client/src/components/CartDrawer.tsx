import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';
import { ShoppingCart, X, Plus, Minus, Trash2, CreditCard, Tag } from 'lucide-react';
import { useLocation } from 'wouter';

export function CartDrawer() {
  const { items, removeItem, updateQuantity, clearCart, totalItems, totalPrice, isCartOpen, setCartOpen } = useCart();
  const [, setLocation] = useLocation();

  const handleCheckout = () => {
    setCartOpen(false);
    setLocation('/checkout');
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={() => setCartOpen(false)}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-background border-l border-border z-[101] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShoppingCart size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Mi Carrito</h2>
                  <p className="text-xs text-muted-foreground">{totalItems} {totalItems === 1 ? 'producto' : 'productos'}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCartOpen(false)} className="rounded-full">
                <X size={20} />
              </Button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                    <ShoppingCart size={32} className="text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Tu carrito está vacío</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-[250px]">
                    Explora el marketplace y agrega productos agrícolas a tu carrito.
                  </p>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => { setCartOpen(false); setLocation('/marketplace'); }}
                  >
                    Ir al Marketplace
                  </Button>
                </div>
              ) : (
                <AnimatePresence>
                  {items.map(item => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 100 }}
                      className="flex gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50 group hover:border-border transition-colors"
                    >
                      {/* Product Image */}
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Tag size={20} className="text-muted-foreground/40" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate">{item.name}</h4>
                        <p className="text-xs text-muted-foreground capitalize mt-0.5">{item.category}</p>
                        <p className="text-sm font-bold font-mono text-primary mt-2">${item.price} USD</p>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-sm font-bold font-mono w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock}
                            className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Subtotal & Remove */}
                      <div className="flex flex-col items-end justify-between">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-7 h-7 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                        <p className="text-sm font-bold font-mono">${(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-border p-6 space-y-4 bg-muted/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground font-medium">Subtotal</span>
                  <span className="text-2xl font-bold font-mono">${totalPrice.toFixed(2)} <span className="text-sm text-muted-foreground">USD</span></span>
                </div>

                <Button
                  className="w-full h-14 rounded-2xl font-bold text-lg gap-3 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-all"
                  onClick={handleCheckout}
                >
                  <CreditCard size={20} />
                  Ir a Pagar
                </Button>

                <Button
                  variant="ghost"
                  className="w-full text-xs text-muted-foreground hover:text-red-500"
                  onClick={clearCart}
                >
                  Vaciar Carrito
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
