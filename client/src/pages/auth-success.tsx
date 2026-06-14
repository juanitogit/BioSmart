import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function AuthSuccessPage() {
  const [, setLocation] = useLocation();
  const { setAuthToken } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      setAuthToken(token);
      setLocation("/");
    } else {
      setLocation("/login");
    }
  }, [setAuthToken, setLocation]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Autenticación exitosa</h2>
        <p className="text-muted-foreground animate-pulse">Redirigiendo...</p>
      </div>
    </div>
  );
}
