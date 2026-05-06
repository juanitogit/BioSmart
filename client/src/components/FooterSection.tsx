import React, { useState } from 'react';
import { Leaf, Twitter, Linkedin, Instagram, Mail, MapPin, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiPost } from '@/lib/api';
import { toast } from 'sonner';

export function FooterSection() {
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleSubscribe = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Por favor ingresa un email válido');
      return;
    }
    
    setIsSubscribing(true);
    try {
      await apiPost('/donations/subscribe', { email });
      toast.success('¡Notificaciones activadas! Revisa tu correo.');
      setEmail('');
    } catch (err: any) {
      toast.error(err.message || 'Error al suscribirse');
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <footer id="contact" className="bg-zinc-950 text-zinc-400 py-20 border-t border-zinc-900">
      <div className="container mx-auto px-6">
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="lg:col-span-2">
              <div className="relative w-10 h-10 overflow-hidden rounded-xl">
                <img src="/logo.png" alt="BioSmart Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-2xl tracking-tight text-white">BioSmart</span>
            <p className="max-w-md text-zinc-400 mb-8 leading-relaxed">
              Hackeando la agricultura urbana. Combinamos biotecnología, IoT e inteligencia artificial para crear sistemas alimentarios resilientes en el corazón de las ciudades.
            </p>
            <div className="flex gap-4">
              <SocialIcon icon={<Twitter size={20} />} />
              <SocialIcon icon={<Linkedin size={20} />} />
              <SocialIcon icon={<Instagram size={20} />} />
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-sm">Plataforma</h4>
            <ul className="space-y-4">
              <FooterLink text="Granjas Verticales" />
              <FooterLink text="Red IoT de Sensores" />
              <FooterLink text="API para Desarrolladores" />
              <FooterLink text="Open Source Hardware" />
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-sm">Contacto</h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <Mail size={16} className="text-primary" />
                <span>hola@biosmart.eco</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={16} className="text-primary mt-1" />
                <span>Distrito de Innovación<br/>Ciudad de México, MX</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter / CTA */}
        <div className="rounded-3xl bg-zinc-900 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 border border-zinc-800 mb-12">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">Mantente Actualizado</h3>
            <p className="text-zinc-400">Recibe reportes de impacto y nuevas tecnologías.</p>
          </div>
          <div className="flex w-full md:w-auto">
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com" 
              className="bg-zinc-950 border border-zinc-800 rounded-l-lg px-4 py-3 text-white focus:outline-none focus:border-primary w-full md:w-64"
            />
            <button 
              onClick={handleSubscribe}
              disabled={isSubscribing}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-r-lg font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubscribing ? 'Suscribiendo...' : 'Suscribir'} <ArrowUpRight size={16} />
            </button>
          </div>
        </div>

        <div className="border-t border-zinc-900 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <p>© {new Date().getFullYear()} BioSmart Technologies. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacidad</a>
            <a href="#" className="hover:text-white transition-colors">Términos</a>
            <a href="#" className="hover:text-white transition-colors">Manifiesto</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <a href="#" className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all">
      {icon}
    </a>
  );
}

function FooterLink({ text }: { text: string }) {
  return (
    <li>
      <a href="#" className="hover:text-primary transition-colors flex items-center gap-2 group">
        <span className="w-1 h-1 rounded-full bg-zinc-700 group-hover:bg-primary transition-colors" />
        {text}
      </a>
    </li>
  );
}
