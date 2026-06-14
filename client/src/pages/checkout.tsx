import React, { useState, useEffect, useRef } from 'react';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/hooks/use-auth';
import { apiPost } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { FooterSection } from '@/components/FooterSection';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, ArrowLeft, Shield, CheckCircle2, Tag, Loader2, Lock, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

// PayPal SDK loader
function loadPayPalScript(clientId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('paypal-sdk')) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'paypal-sdk';
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Error al cargar PayPal'));
    document.head.appendChild(script);
  });
}

// PayPal client ID - uses sandbox for development
const PAYPAL_CLIENT_ID = (import.meta as any).env?.VITE_PAYPAL_CLIENT_ID || 'sb';

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [processing, setProcessing] = useState(false);
  const [paypalReady, setPaypalReady] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const paypalRendered = useRef(false);

  useEffect(() => {
    if (items.length === 0 && !paymentSuccess) {
      setLocation('/marketplace');
    }
  }, [items.length, paymentSuccess]);

  useEffect(() => {
    if (items.length === 0 || paypalRendered.current) return;

    loadPayPalScript(PAYPAL_CLIENT_ID)
      .then(() => {
        setPaypalReady(true);
        renderPayPalButtons();
      })
      .catch((err) => {
        console.error(err);
        toast.error('Error al inicializar PayPal. Puedes reintentar.');
      });
  }, [items.length]);

  const renderPayPalButtons = () => {
    if (paypalRendered.current) return;
    if (!paypalContainerRef.current) return;
    if (!(window as any).paypal) return;

    paypalRendered.current = true;

    (window as any).paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'paypal',
        height: 50,
      },
      createOrder: (_data: any, actions: any) => {
        return actions.order.create({
          purchase_units: [{
            description: `BioSmart Market - ${items.length} productos`,
            amount: {
              currency_code: 'USD',
              value: totalPrice.toFixed(2),
              breakdown: {
                item_total: { currency_code: 'USD', value: totalPrice.toFixed(2) },
              },
            },
            items: items.map(item => ({
              name: item.name.substring(0, 127),
              unit_amount: { currency_code: 'USD', value: parseFloat(item.price).toFixed(2) },
              quantity: String(item.quantity),
              category: 'PHYSICAL_GOODS',
            })),
          }],
        });
      },
      onApprove: async (_data: any, actions: any) => {
        setProcessing(true);
        try {
          const details = await actions.order.capture();
          setOrderId(details.id);

          // Register purchases in backend
          for (const item of items) {
            try {
              await apiPost(`/products/${item.id}/buy`, {
                quantity: item.quantity,
                paypalOrderId: details.id,
              });
            } catch (err) {
              console.error(`Error registering purchase for ${item.name}:`, err);
            }
          }

          setPaymentSuccess(true);
          clearCart();
          toast.success('¡Pago completado con éxito!');
        } catch (err) {
          console.error('PayPal capture error:', err);
          toast.error('Error al procesar el pago. Intenta nuevamente.');
        } finally {
          setProcessing(false);
        }
      },
      onError: (err: any) => {
        console.error('PayPal error:', err);
        toast.error('Error en PayPal. Intenta nuevamente.');
      },
      onCancel: () => {
        toast.info('Pago cancelado.');
      },
    }).render(paypalContainerRef.current);
  };

  // Re-render PayPal buttons when ref becomes available
  useEffect(() => {
    if (paypalReady && paypalContainerRef.current && !paypalRendered.current) {
      renderPayPalButtons();
    }
  }, [paypalReady]);

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <main className="flex-grow pt-32 pb-20 container mx-auto px-6 max-w-3xl">
          <div className="text-center py-20">
            <div className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-8 animate-in zoom-in duration-500">
              <CheckCircle2 size={48} className="text-green-500" />
            </div>
            <h1 className="text-4xl font-bold mb-4">¡Pago Exitoso!</h1>
            <p className="text-lg text-muted-foreground mb-2">Tu compra ha sido procesada correctamente.</p>
            {orderId && (
              <p className="text-sm text-muted-foreground mb-8 font-mono">
                ID de orden: {orderId}
              </p>
            )}
            <div className="flex gap-4 justify-center">
              <Button
                variant="outline"
                className="rounded-xl h-12"
                onClick={() => setLocation('/marketplace')}
              >
                Seguir Comprando
              </Button>
              <Button
                className="rounded-xl h-12"
                onClick={() => setLocation('/dashboard')}
              >
                Ir al Dashboard
              </Button>
            </div>
          </div>
        </main>
        <FooterSection />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-grow pt-32 pb-20 container mx-auto px-6 max-w-5xl">
        <Button variant="ghost" onClick={() => setLocation('/marketplace')} className="mb-8 gap-2">
          <ArrowLeft size={16} /> Volver a la Tienda
        </Button>

        <h1 className="text-3xl md:text-4xl font-bold mb-2">Checkout</h1>
        <p className="text-muted-foreground mb-10">Revisa tu pedido y completa el pago con PayPal.</p>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-3 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <ShoppingCart size={18} />
              Resumen del Pedido ({items.length} {items.length === 1 ? 'producto' : 'productos'})
            </h2>

            {items.map(item => (
              <div
                key={item.id}
                className="flex gap-4 p-5 rounded-2xl bg-muted/30 border border-border/50"
              >
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Tag size={24} className="text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{item.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{item.category}</p>
                  <div className="flex items-center gap-6 mt-3">
                    <span className="text-sm text-muted-foreground">Cantidad: <b className="text-foreground font-mono">{item.quantity}</b></span>
                    <span className="text-sm text-muted-foreground">Precio: <b className="text-foreground font-mono">${item.price}</b></span>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-lg font-bold font-mono text-primary">
                    ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Payment Panel */}
          <div className="lg:col-span-2">
            <Card className="sticky top-28 rounded-2xl border-primary/20 overflow-hidden">
              <div className="bg-primary/5 p-6 border-b border-border/50">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <CreditCard size={18} className="text-primary" />
                  Resumen de Pago
                </h2>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3 text-sm">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between">
                      <span className="text-muted-foreground truncate mr-2">{item.name} × {item.quantity}</span>
                      <span className="font-mono font-bold">${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-lg">Total</span>
                    <span className="text-3xl font-bold font-mono text-primary">${totalPrice.toFixed(2)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">USD</span>
                </div>

                {/* PayPal Button */}
                <div className="pt-4">
                  {processing ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <Loader2 size={32} className="animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground font-medium">Procesando pago...</p>
                    </div>
                  ) : (
                    <div ref={paypalContainerRef} className="min-h-[55px]">
                      {!paypalReady && (
                        <div className="flex items-center justify-center py-4 gap-2">
                          <Loader2 size={16} className="animate-spin text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Cargando PayPal...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Trust badges */}
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield size={14} className="text-green-500 flex-shrink-0" />
                    <span>Protección al comprador de PayPal</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Lock size={14} className="text-green-500 flex-shrink-0" />
                    <span>Conexión segura SSL / TLS</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                    <span>Satisfacción o reembolso a 30 días</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
