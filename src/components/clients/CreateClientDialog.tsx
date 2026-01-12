import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

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

const formSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  province: z.string().min(1, "Selecciona una provincia"),
  custom_province: z.string().optional(),
  city: z.string().min(1, "Selecciona una ciudad"),
  custom_city: z.string().optional(),
  address: z.string().min(5, "La dirección es requerida"),
  phone: z.string().min(6, "El teléfono es requerido"),
});

const PROVINCES = ["Misiones", "Corrientes", "Chaco", "Formosa", "Entre Ríos"];
const CITIES_BY_PROVINCE: Record<string, string[]> = {
  "Misiones": ["Posadas", "Oberá", "Eldorado", "Puerto Iguazú", "Apóstoles"],
  "Corrientes": ["Corrientes Capital", "Goya", "Paso de los Libres", "Curuzú Cuatiá"],
};

interface CreateClientDialogProps {
  onClientCreated: () => void;
}

export function CreateClientDialog({ onClientCreated }: CreateClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCustomProvince, setShowCustomProvince] = useState(false);
  const [showCustomCity, setShowCustomCity] = useState(false);

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

  const selectedProvince = form.watch("province");

  // Reset custom city when province changes
  const handleProvinceChange = (value: string) => {
    form.setValue("province", value);
    if (value === "other") {
      setShowCustomProvince(true);
      setShowCustomCity(true); // If custom province, city is likely custom too
      form.setValue("city", "other");
    } else {
      setShowCustomProvince(false);
      // Reset city selection logic based on new province
      const cities = CITIES_BY_PROVINCE[value];
      if (!cities) {
         // If no predefined cities for this province, default to manual input
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
    
    // Determine final values based on "other" selection
    const finalProvince = values.province === "other" ? values.custom_province : values.province;
    const finalCity = values.city === "other" ? values.custom_city : values.city;

    if (!finalProvince || !finalCity) {
      toast.error("Por favor completa la provincia y ciudad");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.from("clients").insert({
        name: values.name,
        province: finalProvince,
        city: finalCity,
        address: values.address,
        phone: values.phone,
        status: "Activo",
      });

      if (error) throw error;

      toast.success("Cliente creado exitosamente");
      setOpen(false);
      form.reset();
      onClientCreated();
    } catch (error: any) {
      toast.error("Error al crear cliente: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const currentCities = CITIES_BY_PROVINCE[selectedProvince] || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-energen-blue hover:bg-energen-blue/90">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Cliente</DialogTitle>
          <DialogDescription>
            Ingresa los datos del cliente para comenzar a gestionar sus equipos.
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
                    <Select onValueChange={handleProvinceChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROVINCES.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                        <SelectItem value="other">+ Agregar otra...</SelectItem>
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
                      defaultValue={field.value}
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
                        <SelectItem value="other">+ Agregar otra...</SelectItem>
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

            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full bg-energen-blue">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cliente
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}