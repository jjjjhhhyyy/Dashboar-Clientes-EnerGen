import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Client } from "../types";
import { ClientDialog } from "@/components/clients/ClientDialog";
import { BulkImportDialog } from "@/components/clients/BulkImportDialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Search, MapPin, Phone, ArrowRight, FileDown, Upload, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const fetchClients = async () => {
    // Solo mostramos loading global si la lista está vacía
    if (clients.length === 0) setLoading(true);
    
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setClients(data as Client[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleExportCSV = () => {
    if (clients.length === 0) return;
    
    const headers = ["ID", "Nombre", "Provincia", "Ciudad", "Dirección", "Teléfono", "Estado"];
    const csvContent = [
      headers.join(","),
      ...clients.map(c => 
        `"${c.id}","${c.name}","${c.province}","${c.city}","${c.address}","${c.phone}","${c.status}"`
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `clientes_energen_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSVLine = (text: string) => {
    const result = [];
    let cell = '';
    let quote = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        quote = !quote;
      } else if (char === ',' && !quote) {
        result.push(cell);
        cell = '';
      } else {
        cell += char;
      }
    }
    result.push(cell);
    return result.map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split(/\r?\n/).slice(1);
        let importedCount = 0;

        for (const row of rows) {
          if (!row.trim()) continue;
          const cols = parseCSVLine(row);
          // CSV Format expectation: ID, Name, Province, City... OR Name, Province, City
          let name, province, city;
          
          if (cols.length >= 3) {
             // Try to detect column mapping loosely
             if (cols[1] && cols[1].length > 2) { // Probably name in col 1 (if col 0 is ID)
                name = cols[1];
                province = cols[2];
                city = cols[3];
             } else {
                name = cols[0];
                province = cols[1];
                city = cols[2];
             }
          } else {
             name = cols[0]; // Just name
          }

          if (name) {
             await supabase.from("clients").insert({
                name,
                province: province || "Desconocida",
                city: city || "Desconocida",
                address: "-",
                phone: "-",
                status: "Activo"
             });
             importedCount++;
          }
        }
        toast.success(`${importedCount} clientes importados.`);
        fetchClients();
      } catch (err) {
        toast.error("Error al importar CSV");
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.province.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Activo": return "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300";
      case "Mantenimiento": return "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300";
      case "Suspendido": return "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-energen-slate dark:text-white">Clientes</h2>
          <p className="text-gray-500 dark:text-gray-400">Gestión de cartera y equipos instalados.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Hidden CSV Input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".csv" 
            onChange={handleImportCSV} 
          />
          
          <BulkImportDialog onImportComplete={fetchClients} />
          
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            CSV
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <FileDown className="mr-2 h-4 w-4" /> Exportar
          </Button>
          <ClientDialog onClientSaved={fetchClients} />
        </div>
      </div>

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar por nombre, ciudad o provincia..."
              className="pl-9 max-w-sm border-energen-blue/20 focus-visible:ring-energen-blue dark:bg-gray-900 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border dark:border-gray-700">
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-gray-900">
                <TableRow className="dark:border-gray-700">
                  <TableHead className="dark:text-gray-300">Cliente</TableHead>
                  <TableHead className="dark:text-gray-300">Ubicación</TableHead>
                  <TableHead className="dark:text-gray-300">Contacto</TableHead>
                  <TableHead className="dark:text-gray-300">Estado</TableHead>
                  <TableHead className="text-right dark:text-gray-300">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 dark:text-gray-400">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-energen-blue" />
                        <span>Cargando clientes...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-gray-500 dark:text-gray-400">
                      No se encontraron clientes.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow key={client.id} className="group cursor-pointer hover:bg-blue-50/30 dark:hover:bg-blue-900/10 dark:border-gray-700" onClick={() => navigate(`/clients/${client.id}`)}>
                      <TableCell className="font-medium text-energen-slate dark:text-white">
                        {client.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-gray-500 dark:text-gray-400">
                          <MapPin className="mr-1 h-3 w-3" />
                          {client.city}, {client.province}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-gray-500 dark:text-gray-400">
                          <Phone className="mr-1 h-3 w-3" />
                          {client.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(client.status)} border-0`}>
                          {client.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="h-4 w-4 text-energen-blue" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Clients;