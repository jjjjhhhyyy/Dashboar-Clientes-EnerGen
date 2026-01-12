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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  type: z.string().min(1, "El tipo es requerido"),
  model: z.string().min(1, "El modelo es requerido"),
  serial_number: z.string().optional(), // Ahora es opcional por si no lo tienen a mano
  kva: z.coerce.number().optional(),
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
      type: "Generador",
      model: "",
      serial_number: "",
      kva: 0,
    },
  });

  const selectedType = form.watch("type");
  const isGenerator = selectedType === "Generador";

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    try {
      const { error } = await supabase.from("equipment").insert({
        client_id: clientId,
        type: values.type,
        model: values.model,
        serial_number: values.serial_number || "S/N", // Valor por defecto
        kva: isGenerator ? values.kva : null,
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
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Registrar Equipo</DialogTitle>
          <DialogDescription>
            Datos básicos del equipo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Generador">Generador</SelectItem>
                      <SelectItem value="Tractor">Tractor</SelectItem>
                      <SelectItem value="Sampi">Sampi / Autoelevador</SelectItem>
                      <SelectItem value="Máquina">Máquina Vial</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo / Marca</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Cummins 20kVA" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
              
            {isGenerator && (
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
            )}

            <FormField
              control={form.control}
              name="serial_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>N° Serie (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. XYZ-123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full bg-energen-blue">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}