import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
import { Client } from "@/types";

import { Button } from "@/components/ui/button";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

const formSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  province: z.string().min(1, "Selecciona una provincia"),
  custom_province: z.string().optional(),
  city: z.string().min(1, "Selecciona una ciudad"),
  custom_city: z.string().optional(),
  address: z.string().min(5, "La dirección es requerida"),
  phone: z.string().min(6, "El teléfono es requerido"),
});

// Ubicaciones iniciales VACÍAS para que se armen solo con lo que hay en BD
const INITIAL_PROVINCES: string[] = [];
const INITIAL_CITIES: Record<string, string[]> = {};

interface ClientDialogProps {
  clientToEdit?: Client;
  onClientSaved: () => void;
}

export function ClientDialog({ clientToEdit, onClientSaved }: ClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCustomProvince, setShowCustomProvince] = useState(false);
  const [showCustomCity, setShowCustomCity] = useState(false);
  
  // Estado para las listas dinámicas
  const [provincesList, setProvincesList] = useState<string[]>(INITIAL_PROVINCES);
  const [citiesMap, setCitiesMap] = useState<Record<string, string[]>>(INITIAL_CITIES);

  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      province: "",
      custom_province: "",
      city: "",
      custom_city: "",
      address: "",
      phone: "",
    },
  });

  // Cargar ubicaciones guardadas en la base de datos para "recordarlas"
  useEffect(() => {
    const fetchLocations = async () => {
      const { data } = await supabase.from('clients').select('province, city');
      
      if (data) {
        const newProvinces = new Set(INITIAL_PROVINCES);
        const newCitiesMap = { ...INITIAL_CITIES };

        data.forEach(item => {
          if (item.province) newProvinces.add(item.province);
          
          if (item.province && item.city) {
            if (!newCitiesMap[item.province]) {
              newCitiesMap[item.province] = [];
            }
            if (!newCitiesMap[item.province].includes(item.city)) {
              newCitiesMap[item.province].push(item.city);
            }
          }
        });

        setProvincesList(Array.from(newProvinces).sort());
        setCitiesMap(newCitiesMap);
      }
    };

    if (open) {
      fetchLocations();
    }
  }, [open]);

  // Cargar datos si es edición
  useEffect(() => {
    if (clientToEdit && open) {
      const isCustomProv = !provincesList.includes(clientToEdit.province);
      const isCustomCity = !citiesMap[clientToEdit.province]?.includes(clientToEdit.city);

      form.reset({
        name: clientToEdit.name,
        address: clientToEdit.address,
        phone: clientToEdit.phone,
        province: isCustomProv ? "other" : clientToEdit.province,
        custom_province: isCustomProv ? clientToEdit.province : "",
        city: isCustomCity ? "other" : clientToEdit.city,
        custom_city: isCustomCity ? clientToEdit.city : "",
      });
      setShowCustomProvince(isCustomProv);
      setShowCustomCity(isCustomCity);
    } else if (!clientToEdit && open) {
      form.reset({
         name: "", province: "", custom_province: "", city: "", custom_city: "", address: "", phone: ""
      });
      setShowCustomProvince(false);
      setShowCustomCity(false);
    }
  }, [clientToEdit, open, form, provincesList, citiesMap]);

  const selectedProvince = form.watch("province");

  const handleProvinceChange = (value: string) => {
    form.setValue("province", value);
    if (value === "other") {
      setShowCustomProvince(true);
      setShowCustomCity(true);
      form.setValue("city", "other");
    } else {
      setShowCustomProvince(false);
      const cities = citiesMap[value];
      if (!cities || cities.length === 0) {
         setShowCustomCity(true);
         form.setValue("city", "other");
      } else {
         setShowCustomCity(false);
         form.setValue("city", "");
      }
    }
  };

  const handleCityChange = (value: string) => {
    form.setValue("city", value);
    if (value === "other") {
      setShowCustomCity(true);
    } else {
      setShowCustomCity(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    
    const finalProvince = values.province === "other" ? values.custom_province : values.province;
    const finalCity = values.city === "other" ? values.custom_city : values.city;

    if (!finalProvince || !finalCity) {
      toast.error("Por favor completa la provincia y ciudad");
      setLoading(false);
      return;
    }

    try {
      const clientData = {
        name: values.name,
        province: finalProvince,
        city: finalCity,
        address: values.address,
        phone: values.phone,
        status: clientToEdit ? clientToEdit.status : "Activo",
      };

      let error;
      if (clientToEdit) {
        const { error: updateError } = await supabase
          .from("clients")
          .update(clientData)
          .eq("id", clientToEdit.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("clients")
          .insert(clientData);
        error = insertError;
      }

      if (error) throw error;

      toast.success(clientToEdit ? "Cliente actualizado" : "Cliente creado exitosamente");
      setOpen(false);
      onClientSaved();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async () => {
    if (!clientToEdit) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('clients').delete().eq('id', clientToEdit.id);
      if (error) throw error;
      
      toast.success("Cliente eliminado correctamente");
      setOpen(false);
      // Si estamos en la página de detalles, volver al listado
      if (window.location.pathname.includes(clientToEdit.id)) {
        navigate("/clients");
      } else {
        onClientSaved();
      }
    } catch (error: any) {
      toast.error("Error al eliminar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const currentCities = citiesMap[selectedProvince] || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {clientToEdit ? (
           <Button variant="outline" size="sm">
             <Edit className="h-4 w-4 mr-2" /> Editar
           </Button>
        ) : (
          <Button className="bg-energen-blue hover:bg-energen-blue/90">
            <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{clientToEdit ? "Editar Cliente" : "Agregar Nuevo Cliente"}</DialogTitle>
          <DialogDescription>
            {clientToEdit ? "Modifica los datos del cliente." : "Ingresa los datos del cliente para comenzar."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razón Social / Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Empresa S.A." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provincia</FormLabel>
                    <Select onValueChange={handleProvinceChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {provincesList.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                        <SelectItem value="other">+ Nueva / Otra...</SelectItem>
                      </SelectContent>
                    </Select>
                    {showCustomProvince && (
                      <Input 
                        placeholder="Escribir provincia..." 
                        className="mt-2"
                        {...form.register("custom_province")}
                      />
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad</FormLabel>
                    <Select 
                      onValueChange={handleCityChange} 
                      value={field.value}
                      disabled={!selectedProvince && !showCustomProvince}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currentCities.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                        <SelectItem value="other">+ Nueva / Otra...</SelectItem>
                      </SelectContent>
                    </Select>
                    {showCustomCity && (
                      <Input 
                        placeholder="Escribir ciudad..." 
                        className="mt-2"
                        {...form.register("custom_city")}
                      />
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Calle 123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="+54 9 ..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex gap-2 sm:justify-between">
              {clientToEdit && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" className="w-full sm:w-auto">
                      <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Se eliminará el cliente 
                        <strong> {clientToEdit.name} </strong> y todos sus equipos, servicios y documentos asociados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                        Sí, eliminar todo
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              
              <Button type="submit" disabled={loading} className="w-full sm:w-auto bg-energen-blue ml-auto">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {clientToEdit ? "Guardar Cambios" : "Guardar Cliente"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}