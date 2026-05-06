import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Menu, X, Leaf, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { LogIn, LogOut, User, LayoutDashboard, ShoppingBag, GraduationCap, Heart, Activity } from "lucide-react";
import { Button } from "./ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const { user, logout, isAdmin } = useAuth();
  
  const isHomePage = location === '/';
  const isDarkBg = isHomePage && !scrolled;
  const textColor = isDarkBg ? "text-white" : "text-foreground";
  const textMuted = isDarkBg ? "text-white/80" : "text-foreground/70";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Inicio", href: "/", type: 'link' },
    { name: "Marketplace", href: "/marketplace", icon: <ShoppingBag size={16} />, type: 'link' },
    { name: "Educación", href: "/education", icon: <GraduationCap size={16} />, type: 'link' },
    { name: "Donaciones", href: "/donations", icon: <Heart size={16} />, type: 'link' },
    { name: "GopherMind AI", href: "/telemetry", icon: <Activity size={16} />, type: 'link' },
    { name: "Sistema", href: "/#dashboard", icon: <LayoutDashboard size={16} />, type: 'scroll' },
  ];

  const handleLogin = () => {
    // Redirect to Google OAuth
    window.location.href = "/api/auth/google";
  };

  const scrollTo = (id: string) => {
    if (location !== '/') {
      setLocation('/');
      setTimeout(() => {
        const el = document.querySelector(id);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      const el = document.querySelector(id);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isHomePage && !scrolled
          ? "bg-transparent py-5"
          : "bg-background/90 backdrop-blur-md border-b border-border/50 py-3 shadow-lg"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative w-10 h-10 overflow-hidden rounded-xl">
            <img src="/logo.png" alt="BioSmart Logo" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" />
          </div>
          <span className={`text-2xl font-black tracking-tighter ${textColor}`}>
            BIO<span className="text-primary italic">SMART</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = location === link.href || (link.href === '/' && location === '/');
            return link.type === 'scroll' ? (
              <button
                key={link.name}
                onClick={() => scrollTo(link.href.replace('/', ''))}
                className={`text-sm font-bold hover:text-primary transition-all flex flex-col items-center group relative ${textMuted}`}
              >
                {link.name}
                <span className="absolute -bottom-1 w-0 h-[2px] bg-primary group-hover:w-full transition-all duration-300" />
              </button>
            ) : (
              <Link key={link.name} href={link.href}>
                <span className={`text-sm font-bold flex flex-col items-center group relative cursor-pointer transition-all ${
                  isActive ? "text-primary" : `${textMuted} hover:text-primary`
                }`}>
                  {link.name}
                  <span className={`absolute -bottom-1 h-[2px] bg-primary transition-all duration-300 ${
                    isActive ? "w-full" : "w-0 group-hover:w-full"
                  }`} />
                </span>
              </Link>
            )
          })}
          
          <div className="h-4 w-[1px] bg-border mx-2" />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={`rounded-full w-10 h-10 transition-colors ${isDarkBg ? 'hover:bg-white/10' : 'hover:bg-primary/10'}`}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 text-yellow-500" />
            ) : (
              <Moon className={`h-5 w-5 ${isDarkBg ? 'text-white' : 'text-slate-700'}`} />
            )}
            <span className="sr-only">Cambiar tema</span>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="cursor-pointer ml-2">
                  <Avatar className="h-9 w-9 border-2 border-primary/20 hover:border-primary transition-all">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {user.name[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
                <div className="px-2 py-1.5 mb-2">
                  <p className="text-sm font-bold truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                    <LayoutDashboard size={16} /> Dashboard
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center gap-2 cursor-pointer">
                      <User size={16} /> Admin Panel
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-500 hover:text-red-600 cursor-pointer">
                  <LogOut size={16} /> Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth">
              <Button 
                className="gap-2 rounded-xl px-6 font-bold ml-2"
              >
                <LogIn size={18} />
                Ingresar
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={`rounded-full w-10 h-10 ${isDarkBg ? 'hover:bg-white/10' : 'hover:bg-primary/10'}`}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 text-yellow-500" />
            ) : (
              <Moon className={`h-5 w-5 ${isDarkBg ? 'text-white' : 'text-slate-700'}`} />
            )}
          </Button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2 ${textColor}`}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-border absolute top-full left-0 right-0 overflow-hidden"
          >
            <div className="flex flex-col py-4 px-4 gap-4">
              {navLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => {
                    if (link.type === 'link') {
                      setLocation(link.href);
                      setMobileMenuOpen(false);
                    } else {
                      scrollTo(link.href.replace('/', ''));
                    }
                  }}
                  className="text-left text-lg font-medium text-foreground py-2 border-b border-border/50"
                >
                  {link.name}
                </button>
              ))}
              <Link href="/auth">
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="bg-primary w-full text-primary-foreground px-5 py-3 rounded-lg font-medium text-center mt-2">
                  Unirse a la Red
                </button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
