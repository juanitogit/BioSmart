import React from 'react';
import { motion } from 'framer-motion';
import { Sprout, RefreshCw, BarChart3 } from 'lucide-react';

export function CompostingSection() {
  return (
    <section className="py-32 relative bg-background overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Image Side */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="order-2 lg:order-1 relative"
          >
            <div className="relative rounded-full aspect-square max-w-md mx-auto p-4 border border-border bg-card/30 backdrop-blur-sm shadow-2xl">
              <div className="absolute inset-0 border-2 border-dashed border-primary/30 rounded-full animate-[spin_60s_linear_infinite]" />
              <img 
                src="/images/smart-sensor.png" 
                alt="Sensor inteligente en composta" 
                className="w-full h-full object-cover rounded-full"
              />
              
            </div>
          </motion.div>

          {/* Text Side */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="order-1 lg:order-2"
          >
            <div className="mb-8">
              <div className="w-12 h-[2px] bg-orange-500 mb-3" />
              <span className="text-xs font-bold tracking-widest uppercase text-orange-500">Circularidad Urbana</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Micro-cultivos y <br/> <span className="text-orange-500">Compostaje Inteligente</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              La basura orgánica de la ciudad no es un desperdicio, es nuestra materia prima. Red de biocompostadores distribuidos equipados con sensores que monitorean la humedad, temperatura y actividad microbiana para producir fertilizante premium en tiempo récord.
            </p>

            <ul className="space-y-6 mb-10">
              {[
                { title: "Sensores Bio-activos", desc: "Monitoreo 24/7 de la relación C/N (Carbono/Nitrógeno) y gases." },
                { title: "Gestión de Olores", desc: "Sistemas de filtrado activo de carbón para compostaje indoor sin olores." },
                { title: "Aceleración Térmica", desc: "Control térmico que reduce el tiempo de compostaje de meses a semanas." }
              ].map((item, i) => (
                <li key={i} className="flex gap-4">
                  <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <button className="px-6 py-3 rounded-xl border-2 border-orange-500 text-orange-500 font-bold hover:bg-orange-500 hover:text-white transition-colors">
              Ver Sistema de Compostaje
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
