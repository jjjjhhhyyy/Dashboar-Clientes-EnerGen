import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Calendar as CalendarIcon, ArrowRight, Edit, FileUp } from "lucide-react";
import { format, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Service } from "@/types";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  date: z.date({ required_error: "La fecha es requerida" }),
  description: z.string().min(3, "Describe el servicio"),
  technician: z.string().min(2, "Técnico"),
  equipment_id: z.string().optional(),
  next_service_date: z.date().optional(),
});

interface CreateServiceDialogProps {
  clientId: string;
  onServiceCreated: () => void;
  serviceToEdit?: Service; // Prop para edición
}

export function CreateServiceDialog({ clientId, onServiceCreated, serviceToEdit }: CreateServiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [equipments, setEquipments] = useState<{id: string, model: string}[]>([]);
  const [file, setFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      technician: "",
      description: "",
      equipment_id: "none",
    },
  });

  // Cargar datos al editar
  useEffect(() => {
    if (open && serviceToEdit) {
      form.reset({
        date: new Date(serviceToEdit.date + 'T00:00:00'), // Ajuste zona horaria simple
        technician: serviceToEdit.technician,
        description: serviceToEdit.description,
        equipment_id: serviceToEdit.equipment_id || "none",
      });
      setFile(null);
    } else if (open && !serviceToEdit) {
      form.reset({
        date: new Date(),
        technician: "",
        description: "",
        equipment_id: "none",
        next_service_date: undefined
      });
      setFile(null);
    }
  }, [open, serviceToEdit, form]);

  const selectedEquipment = form.watch("equipment_id");

  useEffect(() => {
    if (open) {
      const fetchEq = async () => {
        const { data } = await supabase.from("equipment").select("id, model").eq("client_id", clientId);
        if (data) setEquipments(data);
      };
      fetchEq();
    }
  }, [open, clientId]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      let uploadedFilePath = null;
      
      // Si hay archivo nuevo, subirlo
      if (file) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${clientId}/service_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        uploadedFilePath = filePath;
      }

      // Preparar datos
      const serviceData: any = {
        client_id: clientId,
        date: format(values.date, "yyyy-MM-dd"),
        description: values.description,
        technician: values.technician,
        equipment_id: values.equipment_id === "none" ? null : values.equipment_id,
      };

      // Solo actualizar path si subí uno nuevo, sino dejar el que estaba (en edición)
      if (uploadedFilePath) {
        serviceData.file_path = uploadedFilePath;
      }

      if (serviceToEdit) {
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", serviceToEdit.id);
        if (error) throw error;
        toast.success("Servicio actualizado");
      } else {
        const { error } = await supabase
          .from("services")
          .insert(serviceData);
        if (error) throw error;
        toast.success("Servicio registrado");
      }

      // Actualizar recordatorio de equipo (solo si se seleccionó fecha)
      if (values.equipment_id && values.equipment_id !== "none" && values.next_service_date) {
        const { error: eqError } = await supabase
          .from("equipment")
          .update({ next_service_date: format(values.next_service_date, "yyyy-MM-dd") })
          .eq("id", values.equipment_id);
          
        if (eqError) console.error("Error actualizando recordatorio", eqError);
        else toast.info("Recordatorio actualizado para el equipo");
      }

      setOpen(false);
      onServiceCreated();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const setNextDate = (months: number) => {
    const current = form.getValues("date") || new Date();
    form.setValue("next_service_date", addMonths(current, months));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {serviceToEdit ? (
          <Button variant="ghost" size="icon" className="hover:bg-blue-50 text-blue-600">
            <Edit className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="bg-energen-blue hover:bg-energen-blue/90">
            <Plus className="mr-2 h-4 w-4" /> Registrar Servicio
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{serviceToEdit ? "Editar Mantenimiento" : "Nuevo Mantenimiento"}</DialogTitle>
          <DialogDescription>Registra la actividad y agenda la próxima.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha Realizado</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "P", { locale: es }) : <span>Seleccionar</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="technician"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Técnico</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="equipment_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipo (Importante para el recordatorio)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar equipo..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Ninguno / General</SelectItem>
                      {equipments.map((eq) => (
                        <SelectItem key={eq.id} value={eq.id}>{eq.model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detalle del Trabajo</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Cambio de aceite, filtros, revisión general..." 
                      className="resize-none h-20"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Subida de archivo (Reporte) */}
            <div className="space-y-2">
              <FormLabel>Reporte de Servicio (PDF/Foto) - Opcional</FormLabel>
              <div className="flex items-center gap-2">
                <Input 
                  type="file" 
                  accept=".pdf,image/*" 
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="cursor-pointer"
                />
              </div>
              {serviceToEdit && (serviceToEdit as any).file_path && !file && (
                <p className="text-xs text-green-600 flex items-center">
                   <FileUp className="h-3 w-3 mr-1"/> Ya tiene un archivo adjunto
                </p>
              )}
            </div>

            {/* SECCIÓN DE RECORDATORIO */}
            {selectedEquipment && selectedEquipment !== "none" && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-100 dark:border-blue-800">
                <FormField
                  control={form.control}
                  name="next_service_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-energen-blue dark:text-blue-300 flex items-center gap-2">
                         <CalendarIcon className="h-4 w-4" /> ¿Cuándo es el próximo service?
                      </FormLabel>
                      <div className="flex gap-2 mb-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setNextDate(1)}>+1 Mes</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setNextDate(3)}>+3 Meses</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setNextDate(6)}>+6 Meses</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setNextDate(12)}>+1 Año</Button>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full pl-3 text-left font-normal border-blue-200", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha manualmente</span>}
                              <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full bg-energen-blue">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Servicio
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}