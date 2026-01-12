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

const formSchema = z.object({
  model: z.string().min(1, "El modelo es requerido"),
  serial_number: z.string().min(1, "El número de serie es requerido"),
  kva: z.coerce.number().min(1, "La potencia en kVA es requerida"),
  engine: z.string().optional(),
  alternator: z.string().optional(),
  year: z.coerce.number().min(1900, "Año inválido").max(new Date().getFullYear() + 1, "Año inválido").optional(),
});

interface CreateEquipmentDialogProps {
  clientId: string;
  onEquipmentCreated: () => void;
}

export function CreateEquipmentDialog({ clientId, onEquipmentCreated }: CreateEquipmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      model: "",
      serial_number: "",
      kva: 0,
      engine: "",
      alternator: "",
      year: new Date().getFullYear(),
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    try {
      const { error } = await supabase.from("equipment").insert({
        client_id: clientId,
        model: values.model,
        serial_number: values.serial_number,
        kva: values.kva,
        engine: values.engine || null,
        alternator: values.alternator || null,
        year: values.year || null,
      });

      if (error) throw error;

      toast.success("Equipo registrado exitosamente");
      setOpen(false);
      form.reset();
      onEquipmentCreated();
    } catch (error: any) {
      toast.error("Error al registrar equipo: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-energen-blue hover:bg-energen-blue/90">
          <Plus className="mr-2 h-4 w-4" /> Agregar Equipo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Grupo Electrógeno</DialogTitle>
          <DialogDescription>
            Ingresa los detalles técnicos del generador.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. C110 D5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kva"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Potencia (kVA)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="serial_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Serie</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. L21L123456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="engine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motor</FormLabel>
                    <FormControl>
                      <Input placeholder="Marca/Modelo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="alternator"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alternador</FormLabel>
                    <FormControl>
                      <Input placeholder="Marca/Modelo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Año de Fab.</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full bg-energen-blue">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Equipo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}