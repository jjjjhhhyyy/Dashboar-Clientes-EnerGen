import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, Loader2, Zap } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast.success("Bienvenido a EnerGen");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="absolute inset-0 bg-gradient-to-br from-energen-blue/10 to-transparent pointer-events-none" />
      
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-energen-blue z-10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto bg-energen-blue w-16 h-16 rounded-xl flex items-center justify-center shadow-lg">
            <Zap className="h-8 w-8 text-white" fill="currentColor" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-energen-slate">EnerGen Ingeniería</CardTitle>
            <CardDescription>Gestión Técnica de Grupos Electrógenos</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tecnico@energen.com"
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
                  Iniciando...
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t pt-6 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} EnerGen Ingeniería. Sistema de Gestión.</p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;