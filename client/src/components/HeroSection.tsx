import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { ArrowRight, Activity, Thermometer, Droplets, Sun, Wind } from 'lucide-react';

export function HeroSection() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, 400]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);

  const xSpring = useSpring(0, { stiffness: 100, damping: 20 });
  const ySpring = useSpring(0, { stiffness: 100, damping: 20 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      xSpring.set((e.clientX / window.innerWidth - 0.5) * 20);
      ySpring.set((e.clientY / window.innerHeight - 0.5) * 20);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [xSpring, ySpring]);

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden bg-background">
      {/* Background Image with Parallax */}
      <motion.div 
        style={{ y, opacity }}
        className="absolute inset-0 z-0"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/90 to-background z-10 hidden dark:block" />
        <img 
          src="/images/hero-garden.png" 
          alt="Futuristic Vertical Garden" 
          className="w-full h-full object-cover object-center scale-105"
        />
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-20 w-full pt-32 pb-8">
        <div className="container mx-auto px-6 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="mb-8"
          >
            <div className="h-[2px] w-24 bg-primary mx-auto" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            style={{ x: xSpring, y: ySpring }}
            className="text-5xl md:text-7xl lg:text-9xl font-bold tracking-tighter mb-8 drop-shadow-2xl text-white"
          >
            El Futuro <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-secondary drop-shadow-sm">
              Crece en la Ciudad
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="max-w-2xl text-lg md:text-2xl text-gray-200 font-medium mb-12 drop-shadow-md"
          >
            BioSmart fusiona agricultura vertical, hidroponía de precisión y redes IoT para erradicar el hambre urbana.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-6"
          >
            <button className="px-10 py-5 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(var(--primary),0.3)]">
              Explorar Tecnología
            </button>
            <button className="px-10 py-5 rounded-2xl bg-zinc-900 border border-white/10 text-white font-bold text-lg hover:bg-zinc-800 transition-all backdrop-blur-sm">
              Ver Impacto
            </button>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="relative z-20 flex flex-col items-center gap-2 text-muted-foreground pb-8 w-full"
      >
        <span className="text-xs tracking-widest uppercase">DESCUBRIR</span>
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-[1px] h-10 bg-gradient-to-b from-primary to-transparent"
        />
      </motion.div>
    </section>
  );
}
