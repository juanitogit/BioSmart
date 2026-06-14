import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiPost } from '@/lib/api';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Check, Zap, Rocket, Globe, Sparkles, CreditCard, Shield, Lock, CheckCircle2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';

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

const PAYPAL_CLIENT_ID = (import.meta as any).env?.VITE_PAYPAL_CLIENT_ID || 'sb';

const PLANS = [
  {
    id: 1,
    name: "Raíz Solidaria",
    price: "0",
    annualPrice: "0",
    description: "Ideal para individuos que están empezando su huerto.",
    features: ["Herramientas básicas", "Sección educativa completa", "Acceso al marketplace"],
    icon: <Zap size={24} className="text-primary" />,
    color: "bg-primary/10",
    btnText: "Empezar Gratis"
  },
  {
    id: 2,
    name: "Desarrollo Rural",
    price: "2",
    annualPrice: "20",
    description: "Potencia tu producción con tecnología inteligente.",
    features: ["Todo lo de Raíz Solidaria", "Chatbot con IA 24/7", "Estadísticas detalladas", "Soporte prioritario"],
    highlight: "Más Popular",
    icon: <Rocket size={24} className="text-blue-500" />,
    color: "bg-blue-500/10",
    btnText: "3 Meses GRATIS"
  },
  {
    id: 3,
    name: "Impacto Global",
    price: "4",
    annualPrice: "40",
    description: "Para productores que buscan escalabilidad total.",
    features: ["Todo lo de Desarrollo Rural", "Sugerencias IA automáticas", "Informes por email", "Reportes de impacto"],
    icon: <Globe size={24} className="text-emerald-500" />,
    color: "bg-emerald-500/10",
    btnText: "3 Meses GRATIS"
  }
];

export function PricingSection() {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);
  const [paypalReady, setPaypalReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const paypalRenderedRef = useRef<string | null>(null);

  const handleSubscribe = (plan: typeof PLANS[0]) => {
    if (!user) {
      toast.error('Por favor inicia sesión para suscribirte');
      return;
    }

    // Free plan - subscribe directly
    if (plan.price === '0') {
      subscribeDirect(plan.id);
      return;
    }

    // Paid plan - show PayPal modal
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const subscribeDirect = async (planId: number) => {
    try {
      await apiPost('/plans/subscribe', { planId, billingCycle });
      toast.success('¡Suscripción activa! Revisa tu email.');
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar suscripción');
    }
  };

  // Load PayPal SDK when modal opens
  useEffect(() => {
    if (!showPaymentModal || !selectedPlan) return;
    
    loadPayPalScript(PAYPAL_CLIENT_ID)
      .then(() => setPaypalReady(true))
      .catch(() => toast.error('Error al cargar PayPal'));
  }, [showPaymentModal, selectedPlan]);

  // Render PayPal buttons when ready
  useEffect(() => {
    if (!paypalReady || !showPaymentModal || !selectedPlan || !paypalContainerRef.current) return;
    
    const planKey = `${selectedPlan.id}-${billingCycle}`;
    if (paypalRenderedRef.current === planKey) return;
    
    // Clear previous buttons
    if (paypalContainerRef.current) {
      paypalContainerRef.current.innerHTML = '';
    }
    
    paypalRenderedRef.current = planKey;

    const amount = billingCycle === 'annual'
      ? selectedPlan.annualPrice
      : selectedPlan.price;

    (window as any).paypal?.Buttons({
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
            description: `BioSmart - Plan ${selectedPlan.name} (${billingCycle === 'annual' ? 'Anual' : 'Mensual'})`,
            amount: {
              currency_code: 'USD',
              value: amount,
            },
          }],
        });
      },
      onApprove: async (_data: any, actions: any) => {
        setProcessing(true);
        try {
          await actions.order.capture();
          await apiPost('/plans/subscribe', {
            planId: selectedPlan.id,
            billingCycle,
            paypalPaid: true,
          });
          toast.success(`¡Suscripción a ${selectedPlan.name} activada con éxito!`);
          setShowPaymentModal(false);
          setSelectedPlan(null);
          paypalRenderedRef.current = null;
        } catch (err) {
          console.error(err);
          toast.error('Error al activar la suscripción');
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
  }, [paypalReady, showPaymentModal, selectedPlan, billingCycle]);

  // Reset when modal closes
  const handleCloseModal = () => {
    setShowPaymentModal(false);
    setSelectedPlan(null);
    paypalRenderedRef.current = null;
  };

  const getDisplayPrice = (plan: typeof PLANS[0]) => {
    if (billingCycle === 'annual') {
      return plan.annualPrice;
    }
    return plan.price;
  };

  return (
    <section id="pricing" className="py-32 relative bg-background overflow-hidden px-6">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
      
      <div className="container mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-[2px] w-6 bg-primary" />
            <span className="text-xs font-bold tracking-widest uppercase text-primary">Planes y Alcance</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Elige tu camino hacia la <br/> <span className="text-primary italic">Sostenibilidad</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Donamos el 30% de cada plan a proyectos de agricultura urbana comunitaria.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm font-bold ${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>Mensual</span>
          <button 
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
            className="w-14 h-8 bg-muted rounded-full relative p-1 transition-colors hover:bg-muted/80"
          >
            <motion.div 
              animate={{ x: billingCycle === 'monthly' ? 0 : 24 }}
              className="w-6 h-6 bg-primary rounded-full shadow-lg"
            />
          </button>
          <span className={`text-sm font-bold ${billingCycle === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}>Anual (Ahorra 20%)</span>
          <div className="px-3 py-1 border-l-2 border-emerald-500 bg-emerald-500/5 text-emerald-500 text-[10px] font-bold uppercase tracking-wider">Ahorro Activo</div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {PLANS.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`h-full flex flex-col relative overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border-border/50 rounded-3xl ${plan.highlight ? 'border-primary shadow-xl scale-105 z-20' : ''}`}>
                {plan.highlight && (
                  <div className="absolute top-0 right-0 p-8 pointer-events-none">
                    <Sparkles className="text-primary animate-pulse" />
                  </div>
                )}
                
                <CardHeader className="p-8">
                  <div className={`w-14 h-14 rounded-2xl ${plan.color} flex items-center justify-center mb-6`}>
                    {plan.icon}
                  </div>
                  <CardTitle className="text-2xl font-bold mb-2">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-5xl font-extrabold font-mono">${getDisplayPrice(plan)}</span>
                    <span className="text-muted-foreground font-bold">USD{plan.price !== '0' ? (billingCycle === 'annual' ? '/año' : '/mes') : ''}</span>
                  </div>
                  <p className="text-muted-foreground mt-4 leading-relaxed">
                    {plan.description}
                  </p>
                </CardHeader>

                <CardContent className="p-8 pt-0 flex-grow">
                  <ul className="space-y-4">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-center gap-3 text-sm font-medium">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                          <Check size={12} strokeWidth={3} />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="p-8 pt-0 mt-auto">
                  <Button 
                    className={`w-full h-14 rounded-2xl font-bold text-lg gap-2 ${plan.highlight ? 'bg-primary' : 'variant-outline'}`}
                    variant={plan.highlight ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(plan)}
                  >
                    {plan.price !== '0' && <CreditCard size={18} />}
                    {plan.btnText}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* PayPal Payment Modal for Subscriptions */}
      <Dialog open={showPaymentModal} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl p-0 overflow-hidden">
          <div className="bg-primary/5 p-6 border-b border-border/50">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-3">
                <CreditCard size={22} className="text-primary" />
                Pagar Suscripción
              </DialogTitle>
              <DialogDescription>
                Completa el pago con PayPal para activar tu plan.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-6">
            {/* Plan Summary */}
            {selectedPlan && (
              <div className="bg-muted/30 rounded-2xl p-5 border border-border/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${selectedPlan.color} flex items-center justify-center`}>
                      {selectedPlan.icon}
                    </div>
                    <div>
                      <h3 className="font-bold">{selectedPlan.name}</h3>
                      <p className="text-xs text-muted-foreground capitalize">{billingCycle === 'annual' ? 'Plan Anual' : 'Plan Mensual'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold font-mono text-primary">${getDisplayPrice(selectedPlan)}</span>
                    <span className="text-xs text-muted-foreground ml-1">USD</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  El 30% de tu pago (${(parseFloat(getDisplayPrice(selectedPlan)) * 0.3).toFixed(2)} USD) será donado a proyectos comunitarios.
                </p>
              </div>
            )}

            {/* PayPal Button */}
            {processing ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 size={36} className="animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-medium">Procesando pago...</p>
              </div>
            ) : (
              <div ref={paypalContainerRef} className="min-h-[55px]">
                {!paypalReady && (
                  <div className="flex items-center justify-center py-6 gap-2">
                    <Loader2 size={16} className="animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Cargando PayPal...</span>
                  </div>
                )}
              </div>
            )}

            {/* Trust badges */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield size={13} className="text-green-500 flex-shrink-0" />
                <span>Protección al comprador de PayPal</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock size={13} className="text-green-500 flex-shrink-0" />
                <span>Pago seguro con cifrado SSL</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
                <span>Cancela en cualquier momento</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
