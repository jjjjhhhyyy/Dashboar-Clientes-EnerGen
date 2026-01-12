import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Client, Equipment, Service, Document } from "../types";
import { CreateEquipmentDialog } from "../components/equipment/CreateEquipmentDialog";
import { CreateServiceDialog } from "../components/services/CreateServiceDialog";
import { UploadDocumentDialog } from "../components/documents/UploadDocumentDialog";
import { ClientDialog } from "../components/clients/ClientDialog";
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
import { ArrowLeft, MapPin, Phone, Zap, Settings, FileText, Download, Calendar } from "lucide-react";

const ClientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    
    // 1. Client
    const { data: clientData } = await supabase.from("clients").select("*").eq("id", id).single();
    if (clientData) setClient(clientData as Client);

    // 2. Equipments
    const { data: eqData } = await supabase.from("equipment").select("*").eq("client_id", id).order("created_at", { ascending: false });
    if (eqData) setEquipments(eqData as Equipment[]);

    // 3. Services
    const { data: servData } = await supabase.from("services").select("*").eq("client_id", id).order("date", { ascending: false });
    if (servData) setServices(servData as Service[]);

    // 4. Documents
    const { data: docData } = await supabase.from("documents").select("*").eq("client_id", id).order("created_at", { ascending: false });
    if (docData) setDocuments(docData as Document[]);

    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) return <div className="p-8 text-center dark:text-white">Cargando información...</div>;
  if (!client) return <div className="p-8 text-center dark:text-white">Cliente no encontrado</div>;

  const handleDownload = async (path: string, fileName: string) => {
    const { data } = supabase.storage.from("documents").getPublicUrl(path);
    if (data) {
      window.open(data.publicUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clients")} className="shrink-0">
            <ArrowLeft className="h-5 w-5 dark:text-white" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-energen-slate dark:text-white">{client.name}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
               <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {client.address}, {client.city}</span>
               <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {client.phone}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
           <ClientDialog clientToEdit={client} onClientSaved={fetchAll} />
        </div>
      </div>

      <Tabs defaultValue="equipment" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-800 p-1">
          <TabsTrigger value="equipment" className="data-[state=active]:text-energen-blue">Equipos</TabsTrigger>
          <TabsTrigger value="services" className="data-[state=active]:text-energen-blue">Servicios</TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:text-energen-blue">Archivos</TabsTrigger>
        </TabsList>
        
        {/* Tab: Equipos */}
        <TabsContent value="equipment" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
             <div>
               <h3 className="text-lg font-medium dark:text-white">Flota de Generadores</h3>
               <p className="text-sm text-muted-foreground">Administra los equipos instalados.</p>
             </div>
             <CreateEquipmentDialog clientId={client.id} onEquipmentCreated={fetchAll} />
          </div>

          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="dark:border-gray-700">
                    <TableHead className="dark:text-gray-300">Modelo</TableHead>
                    <TableHead className="dark:text-gray-300">N° Serie</TableHead>
                    <TableHead className="dark:text-gray-300">Potencia</TableHead>
                    <TableHead className="hidden md:table-cell dark:text-gray-300">Detalles</TableHead>
                    <TableHead className="dark:text-gray-300">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No hay equipos registrados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    equipments.map((eq) => (
                      <TableRow key={eq.id} className="dark:border-gray-700">
                        <TableCell className="font-medium dark:text-white">
                          <div className="flex items-center gap-2">
                            <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded text-blue-600 dark:text-blue-400">
                              <Zap size={16} />
                            </div>
                            {eq.model}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs dark:text-gray-300">{eq.serial_number}</TableCell>
                        <TableCell className="dark:text-gray-300">
                          <span className="font-bold">{eq.kva}</span> kVA
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-gray-500 dark:text-gray-400">
                          <div>M: {eq.engine || "-"}</div>
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
        <TabsContent value="services" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
             <div>
               <h3 className="text-lg font-medium dark:text-white">Historial de Mantenimientos</h3>
               <p className="text-sm text-muted-foreground">Registro de actividades técnicas.</p>
             </div>
             <CreateServiceDialog clientId={client.id} onServiceCreated={fetchAll} />
          </div>

          <Card className="dark:bg-gray-800 dark:border-gray-700">
             <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="dark:border-gray-700">
                    <TableHead className="dark:text-gray-300">Fecha</TableHead>
                    <TableHead className="dark:text-gray-300">Descripción</TableHead>
                    <TableHead className="dark:text-gray-300">Técnico</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                        No hay servicios registrados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    services.map((svc) => (
                      <TableRow key={svc.id} className="dark:border-gray-700">
                        <TableCell className="dark:text-white">
                           <div className="flex items-center gap-2">
                             <Calendar className="h-4 w-4 text-gray-400" />
                             {svc.date}
                           </div>
                        </TableCell>
                        <TableCell className="dark:text-gray-300 max-w-md truncate" title={svc.description}>
                          {svc.description}
                        </TableCell>
                        <TableCell className="dark:text-gray-300">
                          {svc.technician}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
             </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Archivos */}
        <TabsContent value="documents" className="mt-6 space-y-4">
           <div className="flex justify-between items-center">
             <div>
               <h3 className="text-lg font-medium dark:text-white">Documentación</h3>
               <p className="text-sm text-muted-foreground">Facturas, presupuestos e imágenes.</p>
             </div>
             <UploadDocumentDialog clientId={client.id} onUploadComplete={fetchAll} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             {documents.map((doc) => (
               <Card key={doc.id} className="dark:bg-gray-800 dark:border-gray-700 hover:shadow-md transition-shadow">
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                   <CardTitle className="text-sm font-medium dark:text-white truncate" title={doc.file_name}>
                     {doc.file_name}
                   </CardTitle>
                   <FileText className="h-4 w-4 text-muted-foreground" />
                 </CardHeader>
                 <CardContent>
                   <div className="text-xs text-muted-foreground mb-4 capitalize">{doc.file_type}</div>
                   <Button variant="outline" size="sm" className="w-full" onClick={() => handleDownload(doc.file_path, doc.file_name)}>
                     <Download className="mr-2 h-4 w-4" /> Descargar
                   </Button>
                 </CardContent>
               </Card>
             ))}
             {documents.length === 0 && (
               <div className="col-span-full text-center py-10 text-gray-500 border dashed border-gray-300 rounded-lg">
                 No hay documentos cargados.
               </div>
             )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientDetails;