import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Users, Globe, ArrowRight } from 'lucide-react';

export function ImpactSection() {
  const stats = [
    { value: "45K", label: "Comidas generadas", suffix: "/mes" },
    { value: "95%", label: "Ahorro de agua", suffix: "" },
    { value: "12", label: "Barrios impactados", suffix: "" },
    { value: "850", label: "Familias beneficiadas", suffix: "" }
  ];

  return (
    <section id="impact" className="py-32 bg-primary text-primary-foreground relative overflow-hidden">
      {/* Abstract Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="leaf-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M50 20 Q70 5 90 20 Q105 40 90 60 Q70 80 50 60 Q30 40 50 20 Z" fill="none" stroke="currentColor" strokeWidth="2"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#leaf-pattern)" />
        </svg>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="mb-6">
              <div className="w-12 h-[1px] bg-white mb-2" />
              <span className="font-bold tracking-widest uppercase text-xs text-white/60">Propósito BioSmart</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
              Erradicando el <br/>
              Hambre Urbana <br/>
              <span className="text-primary-foreground/70">Código a Código</span>
            </h2>
            
            <p className="text-lg md:text-xl text-primary-foreground/90 mb-10 leading-relaxed font-medium max-w-xl">
              La tecnología sin propósito es solo código. BioSmart nació con una misión clara: democratizar el acceso a alimentos frescos, orgánicos y nutritivos en desiertos alimentarios urbanos.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button className="px-8 py-4 rounded-full bg-white text-primary font-bold text-lg hover:bg-zinc-100 transition-colors shadow-xl">
                Únete al Movimiento
              </button>
              <button className="px-8 py-4 rounded-full border border-white/30 text-white font-bold text-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                Leer Manifiesto <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="rounded-3xl overflow-hidden shadow-2xl aspect-[4/3] relative">
              <img 
                src="/images/rooftop-farm.png" 
                alt="Granja urbana comunitaria" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent mix-blend-multiply" />
            </div>

            {/* Stats Overlay */}
            <div className="absolute -bottom-10 -left-10 lg:-left-20 bg-background text-foreground p-8 rounded-3xl shadow-2xl border border-border grid grid-cols-2 gap-8 w-[calc(100%+40px)] lg:w-[120%]">
              {stats.map((stat, i) => (
                <div key={i}>
                  <p className="text-4xl font-bold font-mono text-primary mb-1">
                    {stat.value}<span className="text-lg text-muted-foreground">{stat.suffix}</span>
                  </p>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
