import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, Loader2 } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // Estado para alternar entre Login y Registro
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Cuenta creada. Por favor verifica tu correo si es necesario.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Bienvenido a EnerGen");
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message || "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="absolute inset-0 bg-gradient-to-br from-energen-blue/10 to-transparent pointer-events-none" />
      
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-energen-blue z-10">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto flex justify-center mb-4">
             <img 
               src="https://storage.googleapis.com/msgsndr/W7R1X8YOEgKpF0ad1L2W/media/690661473081bc838e4020d0.png" 
               alt="EnerGen Logo" 
               className="h-20 w-auto object-contain"
             />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-energen-slate">
              {isSignUp ? "Crear Cuenta" : "EnerGen Ingeniería"}
            </CardTitle>
            <CardDescription>
              {isSignUp ? "Registra una nueva cuenta administrativa" : "Gestión Técnica de Grupos Electrógenos"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="nombre@energen.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="focus-visible:ring-energen-blue"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="focus-visible:ring-energen-blue pr-10"
                />
                <Lock className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-energen-blue hover:bg-energen-blue/90 h-11 text-base transition-all duration-200" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                isSignUp ? "Registrarse" : "Iniciar Sesión"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t pt-4 text-sm flex flex-col gap-2">
          <button 
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-energen-blue hover:underline font-medium"
          >
            {isSignUp ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate aquí"}
          </button>
          <p className="text-gray-400 text-xs mt-2">© {new Date().getFullYear()} EnerGen Ingeniería.</p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;