import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, FileUp } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UploadDocumentDialogProps {
  clientId: string;
  onUploadComplete: () => void;
}

export function UploadDocumentDialog({ clientId, onUploadComplete }: UploadDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("report");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setFileName(e.target.files[0].name.split('.')[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Selecciona un archivo primero");
      return;
    }

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${clientId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('documents').insert({
        client_id: clientId,
        file_name: fileName,
        file_path: filePath,
        file_type: fileType,
      });

      if (dbError) throw dbError;

      toast.success("Archivo subido correctamente");
      setOpen(false);
      setFile(null);
      setFileName("");
      onUploadComplete();
    } catch (error: any) {
      console.error(error);
      toast.error("Error al subir: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-energen-blue hover:bg-energen-blue/90">
          <FileUp className="mr-2 h-4 w-4" /> Subir Archivo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Subir Documentación</DialogTitle>
          <DialogDescription>
            Carga facturas, reportes o imágenes de los equipos.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Tipo de Archivo</Label>
            <Select onValueChange={setFileType} defaultValue={fileType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="report">Reporte de Servicio</SelectItem>
                <SelectItem value="invoice">Factura</SelectItem>
                <SelectItem value="budget">Presupuesto</SelectItem>
                <SelectItem value="image">Imagen / Foto</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="file">Seleccionar Archivo</Label>
            <Input id="file" type="file" onChange={handleFileChange} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">Nombre visible</Label>
            <Input 
              id="name" 
              value={fileName} 
              onChange={(e) => setFileName(e.target.value)} 
              placeholder="Ej. Factura Mantenimiento Enero" 
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleUpload} disabled={loading || !file} className="w-full bg-energen-blue">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Subir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}