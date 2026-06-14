import React from 'react';
import { motion } from 'framer-motion';
import { Leaf, Box, Layers } from 'lucide-react';

export function VerticalGardensSection() {
  const features = [
    {
      icon: <Layers size={24} />,
      title: "Optimización Espacial",
      description: "Multiplicamos el rendimiento por metro cuadrado utilizando estructuras verticales modulares que se adaptan a cualquier entorno urbano."
    },
    {
      icon: <Box size={24} />,
      title: "Módulos Inteligentes",
      description: "Cada nivel opera de manera independiente con micro-climas controlados para diferentes especies vegetales simultáneamente."
    },
    {
      icon: <Leaf size={24} />,
      title: "Ciclo Cerrado",
      description: "Recirculación del 98% del agua utilizada. Cero desperdicio, máxima eficiencia de recursos hídricos en entornos de escasez."
    }
  ];

  return (
    <section id="technology" className="py-32 relative bg-background overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <div className="mb-8">
              <div className="w-12 h-[2px] bg-secondary mb-3" />
              <span className="text-xs font-bold tracking-widest uppercase text-secondary">Ecosistemas Elevados</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Naturaleza <br/> Elevada a la <span className="text-primary">Máxima Potencia</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
              Transformamos paredes de concreto en ecosistemas vivos. Nuestros jardines verticales integran hidroponía avanzada con iluminación LED de espectro optimizado, permitiendo cosechas abundantes durante todo el año, independientemente del clima exterior.
            </p>

            <div className="space-y-8">
              {features.map((feature, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex gap-4 group"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-foreground">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Image/Visual Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 aspect-[4/5]">
              <img 
                src="/images/hydroponics-lab.png" 
                alt="Laboratorio Hidropónico" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
              
              {/* Overlay Glass Card */}
              <div className="absolute bottom-6 left-6 right-6 p-6 rounded-2xl bg-background/60 backdrop-blur-xl border border-white/10 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Estado del Módulo Alpha</span>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse delay-75" />
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse delay-150" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Crecimiento</p>
                    <p className="text-xl font-mono font-bold text-primary">+45%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Cosecha en</p>
                    <p className="text-xl font-mono font-bold text-foreground">12 d</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Salud</p>
                    <p className="text-xl font-mono font-bold text-emerald-400">Óptima</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating decoration */}
            <motion.div
              animate={{ y: [-10, 10, -10] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
