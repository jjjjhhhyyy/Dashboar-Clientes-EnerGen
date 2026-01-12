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
import { Search, MapPin, Phone, ArrowRight, FileDown, Upload, Loader2, FileType } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const fetchClients = async () => {
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
    if (clients.length === 0) {
      toast.error("No hay clientes para exportar");
      return;
    }
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

  // --- Lógica de Importación Universal (Word, Excel, CSV) ---

  const processImportedData = async (rows: string[][]) => {
    let importedCount = 0;
    let errors = 0;

    for (const cols of rows) {
      // Validar fila mínima
      if (cols.length < 1 || !cols[0]) continue;

      let name = cols[0].trim();
      // Ignorar encabezados comunes
      if (["nombre", "cliente", "razón social", "name"].includes(name.toLowerCase())) continue;
      
      let province = "Misiones"; // Default inteligente
      let city = "Desconocida";
      let address = "-";
      let phone = "-";

      // Intentar mapear columnas según cantidad
      if (cols.length >= 3) {
        // Asumimos: Nombre, Provincia, Ciudad
        province = cols[1]?.trim() || province;
        city = cols[2]?.trim() || city;
        if (cols[3]) address = cols[3].trim();
        if (cols[4]) phone = cols[4].trim();
      } else if (cols.length === 2) {
        // Asumimos: Nombre, Ciudad (Provincia default)
        city = cols[1]?.trim() || city;
      }

      // Limpieza final
      name = name.replace(/^"|"$/g, '').replace(/\./g, '');
      
      if (name.length > 2) {
        const { error } = await supabase.from("clients").insert({
          name,
          province,
          city,
          address,
          phone,
          status: "Activo"
        });
        
        if (!error) importedCount++;
        else errors++;
      }
    }

    if (importedCount > 0) {
      toast.success(`${importedCount} clientes importados.`);
      fetchClients();
    } else {
      toast.warning("No se encontraron clientes válidos en el archivo.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const fileName = file.name.toLowerCase();

    try {
      // 1. Manejo de CSV
      if (fileName.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const text = event.target?.result as string;
          const rows = text.split(/\r?\n/).map(row => row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)); // Split by comma respecting quotes
          await processImportedData(rows);
        };
        reader.readAsText(file);
      }
      // 2. Manejo de Excel (.xlsx, .xls)
      else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          // Convertir a array de arrays
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];
          await processImportedData(jsonData);
        };
        reader.readAsArrayBuffer(file);
      }
      // 3. Manejo de Word (.docx)
      else if (fileName.endsWith('.docx')) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          // Convertir Docx a HTML para poder leer las tablas
          const result = await mammoth.convertToHtml({ arrayBuffer });
          const html = result.value;
          
          // Parsear el HTML generado
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const tables = doc.querySelectorAll('table');
          
          let allRows: string[][] = [];

          if (tables.length > 0) {
            // Si hay tablas, las leemos
            tables.forEach(table => {
              const rows = table.querySelectorAll('tr');
              rows.forEach(tr => {
                const cells = Array.from(tr.querySelectorAll('td, th')).map(td => td.textContent || "");
                if (cells.length > 0) allRows.push(cells);
              });
            });
          } else {
            // Si no hay tablas, intentamos leer por párrafos (quizás es una lista simple)
            const paragraphs = doc.querySelectorAll('p');
            paragraphs.forEach(p => {
              const text = p.textContent || "";
              if (text.includes('\t') || text.includes(',')) {
                 // Intentar dividir por tab o coma
                 allRows.push(text.split(/[\t,]/));
              } else if (text.trim().length > 3) {
                 // Asumir que es solo el nombre
                 allRows.push([text]);
              }
            });
          }
          
          await processImportedData(allRows);
        };
        reader.readAsArrayBuffer(file);
      } else {
        toast.error("Formato no soportado. Usa .docx, .xlsx o .csv");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error al leer el archivo: " + err.message);
    } finally {
      setImporting(false);
      e.target.value = ""; // Reset
    }
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
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".csv, .xlsx, .xls, .docx" 
            onChange={handleFileUpload} 
          />
          
          <BulkImportDialog onImportComplete={fetchClients} />
          
          <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileType className="mr-2 h-4 w-4" />}
            {importing ? "Leyendo..." : "Importar Archivo (Word/Excel)"}
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
                        <span>Cargando cartera de clientes...</span>
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