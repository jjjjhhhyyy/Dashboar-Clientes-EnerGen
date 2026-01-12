import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Client } from "../types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MapPin, Phone } from "lucide-react";

const ClientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClient = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();
      
      if (!error && data) {
        setClient(data as Client);
      }
      setLoading(false);
    };

    fetchClient();
  }, [id]);

  if (loading) return <div className="p-8 text-center">Cargando información...</div>;
  if (!client) return <div className="p-8 text-center">Cliente no encontrado</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-energen-slate">{client.name}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
             <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {client.address}, {client.city}</span>
             <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {client.phone}</span>
          </div>
        </div>
        <div className="ml-auto">
           {/* Actions like Edit Client could go here */}
        </div>
      </div>

      <Tabs defaultValue="equipment" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100">
          <TabsTrigger value="equipment" className="data-[state=active]:bg-energen-blue data-[state=active]:text-white">Equipos</TabsTrigger>
          <TabsTrigger value="services" className="data-[state=active]:bg-energen-blue data-[state=active]:text-white">Servicios</TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-energen-blue data-[state=active]:text-white">Archivos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="equipment" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Grupos Electrógenos Instalados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Aquí se listarán los equipos (Próximamente).</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Mantenimientos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Aquí se listará el historial de servicios (Próximamente).</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Documentación Técnica</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Aquí se gestionarán los archivos (Próximamente).</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientDetails;