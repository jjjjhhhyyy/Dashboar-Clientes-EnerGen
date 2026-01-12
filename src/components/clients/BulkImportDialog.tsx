import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ClipboardPaste } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

interface BulkImportDialogProps {
  onImportComplete: () => void;
}

export function BulkImportDialog({ onImportComplete }: BulkImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");

  const handleImport = async () => {
    if (!text.trim()) {
      toast.error("Pega la lista de clientes primero");
      return;
    }

    setLoading(true);
    try {
      const rows = text.split(/\r?\n/);
      let importedCount = 0;
      let errorCount = 0;

      for (const row of rows) {
        if (!row.trim()) continue;

        // Intentar separar por TAB (Excel/Word) o coma o punto y coma
        let parts = row.split(/\t/);
        if (parts.length < 2) parts = row.split(/[,;]/); // Fallback a coma

        // Asumimos formato: NOMBRE | PROVINCIA | CIUDAD (o variantes)
        // Si solo hay 1 columna, asumimos que es el Nombre.
        
        let name = parts[0]?.trim().replace(/^"|"$/g, '');
        let province = parts[1]?.trim().replace(/^"|"$/g, '') || "Desconocida";
        let city = parts[2]?.trim().replace(/^"|"$/g, '') || "Desconocida";

        // Si el usuario pego: Nombre, Ciudad (sin provincia)
        // Tratamos de inferir
        if (parts.length === 2) {
           city = parts[1]?.trim().replace(/^"|"$/g, '');
           province = "Misiones"; // Default más probable
        }

        if (name && name.length > 2) {
          const { error } = await supabase.from("clients").insert({
            name,
            province,
            city,
            address: "-",
            phone: "-",
            status: "Activo"
          });
          
          if (!error) importedCount++;
          else errorCount++;
        }
      }

      toast.success(`${importedCount} clientes importados.`);
      if (errorCount > 0) toast.warning(`${errorCount} fallaron (posiblemente duplicados).`);
      
      setOpen(false);
      setText("");
      onImportComplete();
    } catch (error: any) {
      toast.error("Error crítico: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <ClipboardPaste className="mr-2 h-4 w-4" /> Pegar Lista (Word/Excel)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Importación Rápida</DialogTitle>
          <DialogDescription>
            Copia tu tabla de Word o Excel y pégala aquí. 
            <br />
            Formato ideal: <strong>Nombre [TAB] Provincia [TAB] Ciudad</strong>
          </DialogDescription>
        </DialogHeader>
        
        <Textarea 
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Ejemplo:\nSupermercado Ruta 12\tMisiones\tJardín América\nAserradero El Pino\tCorrientes\tVirasoro\n...`}
          className="min-h-[300px] font-mono text-xs"
        />

        <DialogFooter>
          <Button onClick={handleImport} disabled={loading} className="w-full bg-energen-blue">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Procesar e Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}