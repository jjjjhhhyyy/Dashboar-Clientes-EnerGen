import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wrench, AlertTriangle, Activity } from "lucide-react";

const Index = () => {
  // Mock data for now
  const stats = [
    { title: "Total Clientes", value: "0", icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "Servicios del Mes", value: "0", icon: Wrench, color: "text-green-600", bg: "bg-green-100" },
    { title: "En Mantenimiento", value: "0", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100" },
    { title: "Equipos Activos", value: "0", icon: Activity, color: "text-indigo-600", bg: "bg-indigo-100" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-energen-slate">Dashboard</h2>
        <p className="text-gray-500">Resumen general de operaciones.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="border-l-4 border-l-energen-blue shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-energen-slate">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity Placeholder */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10 text-gray-500">
            No hay actividad reciente registrada.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;