import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Client, Equipment } from "../types";
import { CreateEquipmentDialog } from "../components/equipment/CreateEquipmentDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { ArrowLeft, MapPin, Phone, Zap, Settings } from "lucide-react";

const ClientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEquipments, setLoadingEquipments] = useState(false);

  const fetchClient = useCallback(async () => {
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
  }, [id]);

  const fetchEquipments = useCallback(async () => {
    if (!id) return;
    setLoadingEquipments(true);
    const { data, error } = await supabase
      .from("equipment")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setEquipments(data as Equipment[]);
    }
    setLoadingEquipments(false);
  }, [id]);

  useEffect(() => {
    fetchClient();
    fetchEquipments();
  }, [fetchClient, fetchEquipments]);

  if (loading) return <div className="p-8 text-center">Cargando información...</div>;
  if (!client) return <div className="p-8 text-center">Cliente no encontrado</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clients")} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-energen-slate">{client.name}</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500 mt-1">
             <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {client.address}, {client.city}</span>
             <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {client.phone}</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="equipment" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1">
          <TabsTrigger value="equipment" className="data-[state=active]:bg-white data-[state=active]:text-energen-blue data-[state=active]:shadow-sm">Equipos</TabsTrigger>
          <TabsTrigger value="services" className="data-[state=active]:bg-white data-[state=active]:text-energen-blue data-[state=active]:shadow-sm">Servicios</TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-white data-[state=active]:text-energen-blue data-[state=active]:shadow-sm">Archivos</TabsTrigger>
        </TabsList>
        
        {/* Tab: Equipos */}
        <TabsContent value="equipment" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
             <div>
               <h3 className="text-lg font-medium">Flota de Generadores</h3>
               <p className="text-sm text-muted-foreground">Administra los equipos instalados en este cliente.</p>
             </div>
             <CreateEquipmentDialog clientId={client.id} onEquipmentCreated={fetchEquipments} />
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modelo</TableHead>
                    <TableHead>N° Serie</TableHead>
                    <TableHead>Potencia</TableHead>
                    <TableHead className="hidden md:table-cell">Motor / Alt.</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingEquipments ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">Cargando equipos...</TableCell>
                    </TableRow>
                  ) : equipments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No hay equipos registrados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    equipments.map((eq) => (
                      <TableRow key={eq.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="bg-blue-50 p-2 rounded text-blue-600">
                              <Zap size={16} />
                            </div>
                            {eq.model}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{eq.serial_number}</TableCell>
                        <TableCell>
                          <span className="font-bold">{eq.kva}</span> kVA
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-gray-500">
                          <div>M: {eq.engine || "-"}</div>
                          <div>A: {eq.alternator || "-"}</div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                             <Settings className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Servicios */}
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

        {/* Tab: Archivos */}
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