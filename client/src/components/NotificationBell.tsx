import React, { useEffect, useState, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiGet, api } from '@/lib/api';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    connectSSE();

    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await apiGet('/notifications');
      setNotifications(data.notifications || []);
    } catch (_) {}
  };

  const connectSSE = () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const es = new EventSource(`/api/notifications/stream?token=${token}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const notif = JSON.parse(event.data);
        if (notif.type === 'connected') return;

        setNotifications(prev => [{
          id: Date.now(),
          type: notif.type,
          title: notif.title,
          message: notif.message,
          isRead: false,
          createdAt: new Date().toISOString(),
        }, ...prev]);

        if (permissionGranted && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(notif.title, { body: notif.message, icon: '/logo.png' });
        }

        if (notif.type === 'CRITICAL') {
          toast.error(`🚨 ${notif.title}: ${notif.message}`);
        } else {
          toast.info(`🔔 ${notif.title}`);
        }
      } catch (_) {}
    };

    es.onerror = () => {
      es.close();
      setTimeout(connectSSE, 5000);
    };
  };

  const requestPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setPermissionGranted(perm === 'granted');
      if (perm === 'granted') toast.success('Notificaciones nativas activadas');
    }
  };

  const markRead = async (id: number) => {
    try {
      await api(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (_) {}
  };

  const markAllRead = async () => {
    try {
      await api('/notifications/read-all', { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (_) {}
  };

  const clearAll = async () => {
    try {
      await api('/notifications/clear', { method: 'DELETE' });
      setNotifications([]);
      toast.success('Historial limpiado');
    } catch (_) {}
  };

  const typeColor = (type: string) => {
    if (type === 'CRITICAL') return 'text-red-500 bg-red-500/10';
    if (type === 'MONITOR') return 'text-yellow-500 bg-yellow-500/10';
    return 'text-blue-500 bg-blue-500/10';
  };

  if (!user) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-primary/10 transition-colors"
      >
        <Bell className="h-5 w-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg animate-in zoom-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-80 bg-background border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-primary" />
                <span className="font-bold text-sm">Notificaciones</span>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">{unreadCount}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {'Notification' in window && Notification.permission !== 'granted' && (
                  <button onClick={requestPermission} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Activar notificaciones nativas">
                    <Bell size={13} className="text-muted-foreground" />
                  </button>
                )}
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Marcar todas como leídas">
                    <CheckCheck size={13} className="text-muted-foreground" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={clearAll} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" title="Limpiar todo">
                    <Trash2 size={13} className="text-muted-foreground hover:text-red-500" />
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X size={13} className="text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  <Bell size={28} className="mx-auto mb-2 opacity-30" />
                  Sin notificaciones
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`px-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors ${!notif.isRead ? 'bg-primary/5' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeColor(notif.type)}`}>{notif.type}</span>
                          {!notif.isRead && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                        </div>
                        <p className="font-semibold text-sm">{notif.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                        <p className="text-xs text-muted-foreground/50 mt-1">
                          {new Date(notif.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {!notif.isRead && (
                        <button onClick={() => markRead(notif.id)} className="p-1.5 rounded-lg hover:bg-muted flex-shrink-0 mt-0.5" title="Marcar como leída">
                          <Check size={12} className="text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
