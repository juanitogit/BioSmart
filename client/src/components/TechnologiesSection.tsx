import React from 'react';
import { motion } from 'framer-motion';
import { Network, Recycle, Factory, LeafyGreen } from 'lucide-react';

export function TechnologiesSection() {
  const techs = [
    {
      title: "Hidroponía Dinámica",
      icon: <LeafyGreen size={32} />,
      desc: "Cultivo sin suelo donde las raíces reciben nutrientes exactos disueltos en agua. Nuestro sistema ajusta la receta según la fase de crecimiento de la planta.",
      color: "from-primary/20 to-primary/5"
    },
    {
      title: "Aeroponía de Precisión",
      icon: <Factory size={32} />,
      desc: "Nebulización de nutrientes directamente en las raíces suspendidas en el aire. Maximiza la oxigenación y acelera el crecimiento hasta un 40%.",
      color: "from-blue-500/20 to-blue-500/5"
    },
    {
      title: "Acuaponía Circular",
      icon: <Recycle size={32} />,
      desc: "Simbiosis entre peces y plantas. Los desechos acuáticos nutren las plantas, que a su vez purifican el agua que retorna limpia a los estanques.",
      color: "from-emerald-500/20 to-emerald-500/5"
    },
    {
      title: "IA & Machine Learning",
      icon: <Network size={32} />,
      desc: "Cámaras espectrales y algoritmos que detectan deficiencias nutricionales o patógenos antes de que sean visibles al ojo humano.",
      color: "from-purple-500/20 to-purple-500/5"
    }
  ];

  return (
    <section className="py-24 bg-background transition-colors">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Arquitectura de Cultivo</h2>
          <p className="text-muted-foreground text-lg">
            No dependemos de un solo método. Integramos múltiples tecnologías para crear el ecosistema perfecto para cada variedad de cultivo.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {techs.map((tech, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative rounded-3xl p-8 bg-card border border-border overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${tech.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative z-10">
                <div className="mb-6 inline-block p-4 rounded-2xl bg-background border border-border shadow-sm text-foreground">
                  {tech.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{tech.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {tech.desc}
                </p>
              </div>
              
              {/* Animated line on hover */}
              <div className="absolute bottom-0 left-0 h-1 bg-primary w-0 group-hover:w-full transition-all duration-500 ease-out" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
