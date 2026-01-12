import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wrench, Activity, AlertCircle, CheckCircle2, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Equipment } from "../types";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [stats, setStats] = useState({
    clients: 0,
    servicesMonth: 0,
    equipment: 0,
    overdue: 0
  });
  const [alerts, setAlerts] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // 1. Contadores básicos
      const { count: clientsCount } = await supabase.from('clients').select('*', { count: 'exact', head: true });
      const { count: equipCount } = await supabase.from('equipment').select('*', { count: 'exact', head: true });
      
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const { count: servicesCount } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .gte('date', startOfMonth.toISOString());

      // 2. Buscar Alertas (Equipos con next_service_date)
      // Added serial_number to satisfy Equipment interface
      const { data: alertData } = await supabase
        .from('equipment')
        .select(`
          id, model, type, serial_number, next_service_date, client_id,
          clients ( name, city )
        `)
        .not('next_service_date', 'is', null)
        .order('next_service_date', { ascending: true });

      const today = new Date();
      let overdueCount = 0;
      let upcomingAlerts: Equipment[] = [];

      if (alertData) {
        // Filtramos: Vencidos o que vencen en los próximos 30 días
        // We use unknown casting as a safety net if join types don't perfectly match, 
        // but now serial_number is present.
        upcomingAlerts = (alertData as unknown as Equipment[]).filter(eq => {
          if (!eq.next_service_date) return false;
          const diff = differenceInDays(new Date(eq.next_service_date), today);
          
          if (diff < 0) overdueCount++; // Ya venció
          return diff <= 30; // Mostrar si vence en el próximo mes
        });
      }

      setStats({
        clients: clientsCount || 0,
        equipment: equipCount || 0,
        servicesMonth: servicesCount || 0,
        overdue: overdueCount
      });

      setAlerts(upcomingAlerts);
      setLoading(false);
    };

    fetchData();
  }, []);

  const statCards = [
    { title: "Total Clientes", value: stats.clients, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "Servicios (Mes)", value: stats.servicesMonth, icon: Wrench, color: "text-green-600", bg: "bg-green-100" },
    { title: "Equipos", value: stats.equipment, icon: Activity, color: "text-indigo-600", bg: "bg-indigo-100" },
    { title: "Vencidos", value: stats.overdue, icon: AlertCircle, color: "text-red-600", bg: "bg-red-100" },
  ];

  const getAlertStatus = (dateString: string) => {
    const days = differenceInDays(new Date(dateString), new Date());
    if (days < 0) return { label: "VENCIDO", color: "bg-red-100 text-red-700 border-red-200", days: Math.abs(days) + " días atrasado" };
    if (days <= 7) return { label: "URGENTE", color: "bg-amber-100 text-amber-700 border-amber-200", days: "En " + days + " días" };
    return { label: "PRÓXIMO", color: "bg-blue-50 text-blue-700 border-blue-200", days: "En " + days + " días" };
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-energen-slate dark:text-white">Panel de Control</h2>
        <p className="text-gray-500 dark:text-gray-400">Resumen de operaciones y alertas de mantenimiento.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-l-4 border-l-energen-blue shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bg} dark:bg-gray-700`}>
                <stat.icon className={`h-4 w-4 ${stat.color} dark:text-white`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-energen-slate dark:text-white">
                {loading ? "-" : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alertas de Vencimiento */}
      <Card className="mt-6 border-t-4 border-t-amber-500 dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-white">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Alertas de Mantenimiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-gray-500">Analizando flota...</div>
          ) : alerts.length === 0 ? (
             <div className="text-center py-10 text-gray-500 flex flex-col items-center">
               <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
               <p>¡Todo al día! No hay servicios pendientes para los próximos 30 días.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((item) => {
                const status = getAlertStatus(item.next_service_date!);
                return (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border rounded-lg hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => navigate(`/clients/${item.client_id}`)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full">
                        <CalendarDays className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-energen-slate dark:text-white group-hover:text-energen-blue transition-colors">
                          {item.clients?.name}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {item.model} ({item.type}) - {item.clients?.city}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                        {format(new Date(item.next_service_date!), 'dd/MM/yyyy')}
                      </span>
                      <span className="text-xs text-gray-400">
                        {status.days}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;