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
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { ArrowLeft, MapPin, Phone, Zap, FileText, Download, Calendar, Trash2, Edit2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const ClientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [documents, setDocuments] = useState<(Document & { publicUrl?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para acciones
  const [deleteItem, setDeleteItem] = useState<{ type: 'equipment' | 'service' | 'document', id: string } | null>(null);
  const [renamingDoc, setRenamingDoc] = useState<Document | null>(null);
  const [newName, setNewName] = useState("");

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
    const { data: docData, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("client_id", id)
      .order("uploaded_at", { ascending: false });
    
    if (docError) {
      console.error("Error fetching documents:", docError);
    }

    if (docData) {
      // Usamos URLs públicas para mayor fiabilidad con PDFs y visualización
      const docsWithUrls = docData.map((doc) => {
        const { data } = supabase.storage.from("documents").getPublicUrl(doc.file_path);
        return { ...doc, publicUrl: data.publicUrl };
      });
      setDocuments(docsWithUrls);
    } else {
      setDocuments([]);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // --- Helper para abrir archivos ---
  const openFile = (filePath: string) => {
    const { data } = supabase.storage.from("documents").getPublicUrl(filePath);
    if (data?.publicUrl) {
      window.open(data.publicUrl, '_blank');
    } else {
      toast.error("No se pudo obtener el enlace del archivo");
    }
  };

  // --- Lógica de borrado ---
  const confirmDelete = async () => {
    if (!deleteItem) return;

    try {
      let table = "";
      if (deleteItem.type === 'equipment') table = 'equipment';
      if (deleteItem.type === 'service') table = 'services';
      if (deleteItem.type === 'document') table = 'documents';

      if (deleteItem.type === 'document' || deleteItem.type === 'service') {
        const doc = documents.find(d => d.id === deleteItem.id);
        const serv = services.find(s => s.id === deleteItem.id);
        
        const path = doc?.file_path || (serv as any)?.file_path;
        if (path) {
          await supabase.storage.from('documents').remove([path]);
        }
      }

      const { error } = await supabase.from(table).delete().eq('id', deleteItem.id);
      if (error) throw error;

      toast.success("Elemento eliminado");
      fetchAll();
    } catch (error: any) {
      toast.error("Error al eliminar: " + error.message);
    } finally {
      setDeleteItem(null);
    }
  };

  // --- Lógica de renombrado ---
  const startRenaming = (doc: Document) => {
    setRenamingDoc(doc);
    setNewName(doc.file_name);
  };

  const handleRename = async () => {
    if (!renamingDoc || !newName.trim()) return;

    try {
      const { error } = await supabase
        .from("documents")
        .update({ file_name: newName })
        .eq("id", renamingDoc.id);

      if (error) throw error;
      toast.success("Nombre actualizado");
      setRenamingDoc(null);
      fetchAll();
    } catch (error: any) {
      toast.error("Error al renombrar: " + error.message);
    }
  };

  const getServiceStatus = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    const days = differenceInDays(date, today);

    if (days < 0) return { color: "text-red-600 bg-red-50", text: `Vencido hace ${Math.abs(days)} días` };
    if (days <= 7) return { color: "text-amber-600 bg-amber-50", text: `Vence en ${days} días` };
    return { color: "text-green-600 bg-green-50", text: format(date, "dd/MM/yyyy") };
  };

  if (loading) return <div className="p-8 text-center dark:text-white">Cargando información...</div>;
  if (!client) return <div className="p-8 text-center dark:text-white">Cliente no encontrado</div>;

  return (
    <div className="space-y-6">
      {/* Dialogo Eliminar */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar elemento?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogo Renombrar */}
      <Dialog open={!!renamingDoc} onOpenChange={(open) => !open && setRenamingDoc(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Cambiar nombre del archivo</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)} 
              placeholder="Ej. Factura Enero 2024" 
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenamingDoc(null)}>Cancelar</Button>
            <Button onClick={handleRename} className="bg-energen-blue">Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
           <Button variant="outline" size="icon" onClick={fetchAll} title="Recargar datos">
             <RotateCw className="h-4 w-4" />
           </Button>
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
               <h3 className="text-lg font-medium dark:text-white">Flota de Equipos</h3>
             </div>
             <CreateEquipmentDialog clientId={client.id} onEquipmentCreated={fetchAll} />
          </div>

          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="dark:border-gray-700">
                    <TableHead className="dark:text-gray-300">Equipo</TableHead>
                    <TableHead className="dark:text-gray-300">Potencia</TableHead>
                    <TableHead className="dark:text-gray-300">Próximo Service</TableHead>
                    <TableHead className="text-right dark:text-gray-300">Acciones</TableHead>
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
                    equipments.map((eq) => {
                      const status = getServiceStatus(eq.next_service_date);
                      return (
                      <TableRow key={eq.id} className="dark:border-gray-700">
                        <TableCell className="font-medium dark:text-white">
                          <div className="flex items-center gap-2">
                            <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded text-blue-600 dark:text-blue-400">
                              <Zap size={16} />
                            </div>
                            <div>
                              <div>{eq.model}</div>
                              <div className="text-xs text-gray-400 font-mono">{eq.serial_number}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="dark:text-gray-300">
                          {eq.kva ? <><span className="font-bold">{eq.kva}</span> kVA</> : "-"}
                        </TableCell>
                        <TableCell>
                          {status ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border border-transparent ${status.color}`}>
                              {status.text}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <CreateEquipmentDialog clientId={client.id} onEquipmentCreated={fetchAll} equipmentToEdit={eq} />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => setDeleteItem({ type: 'equipment', id: eq.id })}
                            >
                               <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )})
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
               <h3 className="text-lg font-medium dark:text-white">Historial</h3>
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
                    <TableHead className="text-right dark:text-gray-300">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        No hay servicios registrados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    services.map((svc) => (
                      <TableRow key={svc.id} className="dark:border-gray-700">
                        <TableCell className="dark:text-white">
                           <div className="flex items-center gap-2">
                             <Calendar className="h-4 w-4 text-gray-400" />
                             {format(new Date(svc.date + 'T00:00:00'), 'dd/MM/yyyy')}
                           </div>
                        </TableCell>
                        <TableCell className="dark:text-gray-300 max-w-md truncate" title={svc.description}>
                          {svc.description}
                          {(svc as any).file_path && (
                             <Button variant="link" className="h-auto p-0 ml-2 text-blue-600" onClick={() => openFile((svc as any).file_path)}>
                               [Ver PDF]
                             </Button>
                          )}
                        </TableCell>
                        <TableCell className="dark:text-gray-300">
                          {svc.technician}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <CreateServiceDialog clientId={client.id} onServiceCreated={fetchAll} serviceToEdit={svc} />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => setDeleteItem({ type: 'service', id: svc.id })}
                            >
                               <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
             </div>
             <UploadDocumentDialog clientId={client.id} onUploadComplete={fetchAll} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             {documents.map((doc) => (
               <Card key={doc.id} className="dark:bg-gray-800 dark:border-gray-700 hover:shadow-md transition-shadow relative group">
                 {/* Acciones flotantes */}
                 <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-black/80 rounded-md p-1 z-10 shadow-sm">
                   <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-900"
                      title="Renombrar archivo"
                      onClick={(e) => { e.stopPropagation(); startRenaming(doc); }}
                   >
                     <Edit2 className="h-4 w-4 text-blue-600" />
                   </Button>
                   <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900"
                      title="Eliminar archivo"
                      onClick={(e) => { e.stopPropagation(); setDeleteItem({ type: 'document', id: doc.id }); }}
                   >
                     <Trash2 className="h-4 w-4 text-red-600" />
                   </Button>
                 </div>
                 
                 <div onClick={() => openFile(doc.file_path)} className="cursor-pointer">
                   {/* VISTA PREVIA SI ES IMAGEN */}
                   {doc.file_type === 'image' && doc.publicUrl ? (
                     <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-gray-100 dark:bg-gray-900 border-b dark:border-gray-700">
                        <img src={doc.publicUrl} alt={doc.file_name} className="w-full h-full object-cover transition-transform hover:scale-105" />
                     </div>
                   ) : (
                     <div className="aspect-[3/1] w-full bg-gray-50 dark:bg-gray-900 rounded-t-lg border-b dark:border-gray-700 flex items-center justify-center">
                        <FileText className="h-10 w-10 text-gray-300" />
                     </div>
                   )}

                   <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
                     <CardTitle className="text-sm font-medium dark:text-white truncate pr-2" title={doc.file_name}>
                       {doc.file_name}
                     </CardTitle>
                   </CardHeader>
                   <CardContent className="pb-4">
                     <div className="text-xs text-muted-foreground capitalize">{doc.file_type === 'image' ? 'Imagen' : doc.file_type}</div>
                     <Button variant="default" size="sm" className="w-full mt-2 bg-energen-blue/10 text-energen-blue hover:bg-energen-blue/20 dark:bg-energen-blue/20 dark:text-blue-300" onClick={(e) => {
                       e.stopPropagation();
                       openFile(doc.file_path);
                     }}>
                       <Download className="mr-2 h-4 w-4" /> Abrir / Descargar
                     </Button>
                   </CardContent>
                 </div>
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