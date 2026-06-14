import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, Bot, Sparkles, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiPost, apiGet } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

export function AIChatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load chat history when chatbot opens
  useEffect(() => {
    if (isOpen && user && !historyLoaded) {
      apiGet<{ history: any[] }>('/ai/history')
        .then(data => {
          if (data.history && data.history.length > 0) {
            const restored: any[] = [];
            data.history.forEach((h: any) => {
              restored.push({ role: 'user', content: h.message });
              restored.push({ role: 'assistant', content: h.response });
            });
            setMessages(restored);
          }
          setHistoryLoaded(true);
        })
        .catch(() => setHistoryLoaded(true));
    }
  }, [isOpen, user, historyLoaded]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    if (!user) {
      toast.error('Inicia sesión para usar el asistente IA');
      return;
    }

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await apiPost('/ai/chat', { message: input });
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err: any) {
      toast.error(err.message || 'Error al conectar con la IA');
      setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, no puedo responder en este momento. Verifica tu conexión o plan de suscripción.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-50 group overflow-hidden"
      >
        <motion.div
           animate={{ rotate: [0, 10, -10, 0] }}
           transition={{ repeat: Infinity, duration: 3 }}
        >
          <MessageSquare size={28} />
        </motion.div>
        <div className="absolute inset-0 bg-white/20 scale-0 group-hover:scale-150 transition-transform duration-500 rounded-full" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-24 right-6 w-[400px] h-[600px] bg-background border border-border shadow-2xl rounded-3xl flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 bg-foreground text-background flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
                  <Bot size={24} />
                </div>
                <div>
                  <h3 className="font-bold flex items-center gap-2">
                    BioSmart AI
                    <Sparkles size={14} className="text-primary" />
                  </h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Experto en Agricultura Urbana</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-grow overflow-y-auto p-6 space-y-4 scroll-smooth"
            >
              {messages.length === 0 && (
                <div className="text-center py-10">
                  <Bot size={48} className="mx-auto mb-4 text-primary opacity-20" />
                  <p className="text-sm text-muted-foreground">¡Hola! Soy tu asistente experto en agricultura urbana. Pregúntame sobre riego, plagas, compostaje, sensores IoT o automatización.</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-none shadow-lg' 
                    : 'bg-muted border border-border/50 rounded-tl-none'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-4 rounded-2xl rounded-tl-none animate-pulse">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-muted-foreground/30 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/30 rounded-full animate-bounce delay-75" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/30 rounded-full animate-bounce delay-150" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-6 border-t border-border/50">
              <div className="relative">
                <Input 
                  placeholder="Escribe tu duda aquí..."
                  className="pr-12 h-12 rounded-xl focus-visible:ring-primary shadow-inner"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button 
                  onClick={handleSend}
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
