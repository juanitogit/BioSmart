import React, { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogIn, UserPlus, Github, Chrome, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { login, register, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const handleTraditionalAuth = async (e: React.FormEvent<HTMLFormElement>, mode: "login" | "register") => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      if (mode === "login") {
        await login(data.email as string, data.password as string);
        toast.success("Bienvenido de nuevo");
      } else {
        await register(
          data.name as string,
          data.email as string,
          data.password as string
        );
        toast.success("Cuenta creada con éxito");
      }
      setLocation("/");
    } catch (error: any) {
      toast.error(error.message || "Error al autenticar");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || "https://bio-smart-eight.vercel.app"}/api/auth/google`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="container relative z-10 flex-grow flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8 group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Volver al inicio
          </Link>

          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
               <div className="relative w-24 h-24 overflow-hidden">
                <img src="/logo.png" alt="BioSmart Logo" className="w-full h-full object-contain" />
              </div>
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-foreground">
              BIO<span className="text-primary italic">SMART</span>
            </h1>
            <p className="text-muted-foreground mt-2 font-medium">Gestiona tu ecosistema inteligente</p>
          </div>

          <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl rounded-[32px] overflow-hidden">
            <CardHeader className="p-0">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="w-full h-14 bg-muted/30 p-1 rounded-none border-b border-border/50">
                  <TabsTrigger value="login" className="flex-1 h-full rounded-none data-[state=active]:bg-background data-[state=active]:shadow-none border-none font-bold">
                    Iniciar Sesión
                  </TabsTrigger>
                  <TabsTrigger value="register" className="flex-1 h-full rounded-none data-[state=active]:bg-background data-[state=active]:shadow-none border-none font-bold">
                    Registrarse
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="p-8 pb-4">
                  <form onSubmit={(e) => handleTraditionalAuth(e, "login")} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-login">Correo Electrónico</Label>
                      <Input 
                        id="email-login" 
                        name="email" 
                        type="email" 
                        placeholder="ejemplo@biosmart.eco" 
                        required 
                        className="h-12 rounded-xl bg-background/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="pass-login">Contraseña</Label>
                        <button type="button" className="text-xs text-primary hover:underline">¿Olvidaste tu contraseña?</button>
                      </div>
                      <Input 
                        id="pass-login" 
                        name="password" 
                        type="password" 
                        placeholder="••••••••" 
                        required 
                        className="h-12 rounded-xl bg-background/50"
                      />
                    </div>
                    <Button type="submit" className="w-full h-12 rounded-xl font-bold mt-2" disabled={isLoading}>
                      {isLoading ? <Loader2 className="animate-spin mr-2" /> : <LogIn size={18} className="mr-2" />}
                      Ingresar
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="p-8 pb-4">
                  <form onSubmit={(e) => handleTraditionalAuth(e, "register")} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name-reg">Nombre Completo</Label>
                      <Input 
                        id="name-reg" 
                        name="name" 
                        type="text" 
                        placeholder="Juan Pérez" 
                        required 
                        className="h-12 rounded-xl bg-background/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-reg">Correo Electrónico</Label>
                      <Input 
                        id="email-reg" 
                        name="email" 
                        type="email" 
                        placeholder="juan@biosmart.eco" 
                        required 
                        className="h-12 rounded-xl bg-background/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pass-reg">Contraseña</Label>
                      <Input 
                        id="pass-reg" 
                        name="password" 
                        type="password" 
                        placeholder="Mínimo 8 caracteres" 
                        required 
                        className="h-12 rounded-xl bg-background/50"
                      />
                    </div>
                    <Button type="submit" className="w-full h-12 rounded-xl font-bold mt-2" disabled={isLoading}>
                      {isLoading ? <Loader2 className="animate-spin mr-2" /> : <UserPlus size={18} className="mr-2" />}
                      Crear Cuenta
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardHeader>

            <CardContent className="p-8 pt-0">
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-transparent px-2 text-muted-foreground font-bold">O continuar con</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Button 
                  variant="outline" 
                  className="h-12 rounded-xl border-border bg-background/50 hover:bg-muted font-bold"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  <Chrome size={18} className="mr-2 text-primary" />
                  Google
                </Button>
              </div>
            </CardContent>

            <CardFooter className="p-8 pt-0 justify-center">
              <p className="text-xs text-muted-foreground text-center line-clamp-2">
                Al continuar, aceptas nuestros <button className="hover:text-primary underline">Términos de Servicio</button> y <button className="hover:text-primary underline">Política de Privacidad</button>.
              </p>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
