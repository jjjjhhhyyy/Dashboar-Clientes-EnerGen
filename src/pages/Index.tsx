import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wrench, AlertTriangle, Activity, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const Index = () => {
  const [stats, setStats] = useState({
    clients: 0,
    servicesMonth: 0,
    equipment: 0,
    maintenance: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // 1. Counts
      const { count: clientsCount } = await supabase.from('clients').select('*', { count: 'exact', head: true });
      const { count: equipCount } = await supabase.from('equipment').select('*', { count: 'exact', head: true });
      
      // Services this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const { count: servicesCount } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .gte('date', startOfMonth.toISOString());

      setStats({
        clients: clientsCount || 0,
        equipment: equipCount || 0,
        servicesMonth: servicesCount || 0,
        maintenance: 0 // Placeholder logic for now
      });

      // 2. Recent Activity (Latest Services joined with Clients)
      const { data: activity } = await supabase
        .from('services')
        .select(`
          id, 
          date, 
          description, 
          clients (name),
          equipment (model, type)
        `)
        .order('date', { ascending: false })
        .limit(5);

      if (activity) {
        setRecentActivity(activity);
      }
      
      setLoading(false);
    };

    fetchData();
  }, []);

  const statCards = [
    { title: "Total Clientes", value: stats.clients, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "Servicios (Este Mes)", value: stats.servicesMonth, icon: Wrench, color: "text-green-600", bg: "bg-green-100" },
    { title: "Equipos / Máquinas", value: stats.equipment, icon: Activity, color: "text-indigo-600", bg: "bg-indigo-100" },
    { title: "Pendientes", value: "-", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-energen-slate dark:text-white">Dashboard</h2>
        <p className="text-gray-500 dark:text-gray-400">Resumen general de operaciones.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-l-4 border-l-energen-blue shadow-sm hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
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

      {/* Recent Activity */}
      <Card className="mt-6 dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-gray-500">Cargando actividad...</div>
          ) : recentActivity.length === 0 ? (
             <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              No hay actividad reciente registrada.
            </div>
          ) : (
            <div className="space-y-6">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-start border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-full mr-4 shrink-0">
                    <Wrench className="h-5 w-5 text-energen-blue dark:text-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none text-energen-slate dark:text-white">
                      {item.clients?.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {item.description}
                    </p>
                    <div className="flex gap-2 text-xs text-gray-400 items-center mt-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(item.date), "PPP", { locale: es })}
                      {item.equipment && (
                         <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">
                           {item.equipment.type}: {item.equipment.model}
                         </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;