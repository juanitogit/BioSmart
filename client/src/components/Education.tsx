import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Leaf, Sprout, Cpu, ArrowRight } from 'lucide-react';

const COURSES = [
  {
    category: "Huerta Urbana",
    title: "Iniciación al Cultivo en Terrazas",
    description: "Aprende a evaluar el sol, elegir recipientes y preparar el sustrato perfecto para tus primeras hortalizas.",
    icon: <Sprout size={24} />,
    color: "bg-green-500/10 text-green-600",
    image: "/images/hero-garden.png"
  },
  {
    category: "Compostaje",
    title: "El Arte del Oro Negro en Casa",
    description: "Domina el equilibrio entre nitrógeno y carbono para transformar tus residuos en el mejor abono orgánico.",
    icon: <Leaf size={24} />,
    color: "bg-amber-500/10 text-amber-600",
    image: "/images/rooftop-farm.png"
  },
  {
    category: "IoT",
    title: "Automatiza tu Huerto con Arduino",
    description: "Pasos básicos para conectar sensores de humedad y bombas de riego controladas desde tu celular.",
    icon: <Cpu size={24} />,
    color: "bg-blue-500/10 text-blue-600",
    image: "/images/smart-sensor.png"
  }
];

export function Education() {
  return (
    <div className="space-y-12">
      <div className="grid md:grid-cols-3 gap-8">
        {COURSES.map((course, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="overflow-hidden group hover:shadow-2xl transition-all duration-500 border-border/50 rounded-3xl h-full flex flex-col">
              <div className="relative aspect-video overflow-hidden">
                <img 
                  src={course.image} 
                  alt={course.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                <div className="absolute top-4 left-4 flex flex-col items-start gap-1">
                  <div className="h-[2px] w-6 bg-primary" />
                  <span className="text-[10px] font-bold tracking-widest uppercase text-white drop-shadow-md">
                    {course.category}
                  </span>
                </div>
              </div>
              
              <CardContent className="p-8 flex-grow flex flex-col">
                <div className={`w-12 h-12 rounded-2xl ${course.color} flex items-center justify-center mb-6`}>
                  {course.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4 leading-tight group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-8 flex-grow">
                  {course.description}
                </p>
                
                <button className="flex items-center gap-2 font-bold text-primary group/btn mt-auto">
                  Comenzar Aprendizaje
                  <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-2" />
                </button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Featured Resource */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="relative overflow-hidden rounded-[40px] bg-card border border-border text-foreground p-8 md:p-16 shadow-xl"
      >
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
          <img src="/images/hydroponics-lab.png" className="w-full h-full object-cover grayscale" />
        </div>
        
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-[1px] w-12 bg-primary" />
            <span className="text-xs font-bold tracking-widest uppercase text-primary">Recurso Exclusivo</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            Manual Maestro de <br/> <span className="text-primary italic">Hidroponía Urbana</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
            Descarga nuestra guía de 150 páginas sobre cómo montar sistemas de cultivo de alto rendimiento en apartamentos y espacios reducidos.
          </p>
          <button className="px-8 py-4 bg-primary text-white rounded-2xl font-bold flex items-center gap-3 shadow-lg hover:bg-primary/90 transition-all hover:-translate-y-1">
            <BookOpen size={20} />
            <a href="https://cipac.org.pa/wp-content/uploads/2024/11/Manual-sobre-la-Finca-Vertical_Espanol-19-08-24.pdf"><span>Descargar PDF (24MB)</span></a>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
