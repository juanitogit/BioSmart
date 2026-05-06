import React, { useState, useEffect } from 'react';
import { apiGet, apiPut, apiDelete } from '@/lib/api';
import { 
  Users, Package, DollarSign, Brain, Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, Cell, PieChart, Pie
} from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit logic
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editRole, setEditRole] = useState("");
  const [editPlan, setEditPlan] = useState("");
  const [saving, setSaving] = useState(false);

  const handleUpdateUser = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const payload: any = { role: editRole };
      if (editPlan && editPlan !== "none") payload.planId = parseInt(editPlan);
      
      await apiPut(`/admin/users/${editingUser.id}`, payload);
      
      toast.success("Usuario actualizado correctamente");
      setEditingUser(null);
      // Refresh users
      const res = await apiGet<{ users: any[] }>('/admin/users');
      setUsers(res.users || []);
    } catch(e: any) {
      toast.error(e.message || "Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("¿Estás seguro de eliminar este usuario? Esta acción es irreversible.")) return;
    try {
      await apiDelete(`/admin/users/${userId}`);
      toast.success("Usuario eliminado");
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar");
    }
  };

  useEffect(() => {
    Promise.all([
      apiGet('/admin/stats'),
      apiGet('/admin/users')
    ]).then(([statsData, usersData]) => {
      setStats(statsData);
      setUsers(usersData.users || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Panel Administrativo</h1>
          <p className="text-muted-foreground mt-2">Monitoreo global de la plataforma BioSmart.</p>
        </div>
      </div>

      {/* High Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Usuarios Totales" value={stats.totalUsers} icon={<Users size={20} />} trend={`${users.length} registrados`} />
        <StatCard title="Ingresos Totales" value={`$${stats.totalRevenue}`} icon={<DollarSign size={20} />} trend="Suscripciones activas" color="text-green-600" />
        <StatCard title="Ventas Totales" value={stats.totalSales} icon={<Package size={20} />} trend="Marketplace" />
        <StatCard title="Uso de IA" value={stats.totalAiUsage} icon={<Brain size={20} />} trend="Interacciones chatbot" color="text-purple-600" />
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="users" className="rounded-lg px-8">Usuarios</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-lg px-8">Análisis</TabsTrigger>
          <TabsTrigger value="revenue" className="rounded-lg px-8">Finanzas</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="rounded-3xl border-border/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-bold">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="capitalize">
                      <div className={`border-l-2 pl-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        u.role === 'admin' ? 'border-red-500 text-red-500' : 
                        u.role === 'seller' ? 'border-blue-500 text-blue-500' : 
                        'border-primary text-primary'
                      }`}>
                        {u.role}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                      {u.role !== 'admin' ? (
                        <button 
                          onClick={() => {
                            setEditingUser(u);
                            setEditRole(u.role);
                            setEditPlan("none");
                          }}
                          className="text-xs font-bold text-primary hover:underline"
                        >
                          Editar
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground mr-2">Protegido</span>
                      )}
                      {u.role !== 'admin' && (
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-8">
          <div className="grid lg:grid-cols-2 gap-8">
            <Card className="rounded-3xl border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Ingresos por Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.revenueByMonth || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Crecimiento de Usuarios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.platformGrowth || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="users" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue">
          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 rounded-3xl">
              <CardHeader>
                <CardTitle>Ventas por Vendedor</CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.salesByVendor || []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                        <XAxis type="number" />
                        <YAxis dataKey="vendor" type="category" width={100} />
                        <RechartsTooltip />
                        <Bar dataKey="revenue" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                 </div>
              </CardContent>
            </Card>
            
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle>Usuarios por Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.usersByPlan || []}
                        dataKey="count"
                        nameKey="plan"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={60}
                        label
                      >
                        {(stats.usersByPlan || []).map((_:any, index:number) => (
                          <Cell key={`cell-${index}`} fill={['#22c55e', '#3b82f6', '#f59e0b'][index % 3]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* EDIT MODAL */}
      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Manejar Usuario</DialogTitle>
            <DialogDescription>
              Ajusta los roles y el plan contratado para <strong>{editingUser?.name}</strong> ({editingUser?.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-bold">Rol</label>
              <div className="col-span-3">
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger><SelectValue placeholder="Rol" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario Básico</SelectItem>
                    <SelectItem value="seller">Vendedor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label className="text-right text-sm font-bold">Plan</label>
              <div className="col-span-3">
                <Select value={editPlan} onValueChange={setEditPlan}>
                  <SelectTrigger><SelectValue placeholder="Sin cambios" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Mantener sin cambios</SelectItem>
                    <SelectItem value="1">1 - Raíz Solidaria</SelectItem>
                    <SelectItem value="2">2 - Desarrollo Rural</SelectItem>
                    <SelectItem value="3">3 - Impacto Global</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateUser} disabled={saving} className="w-full">
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ title, value, icon, trend, color = "text-primary" }: any) {
  return (
    <Card className="rounded-3xl border-border/50 hover:shadow-lg transition-all duration-300">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-2xl bg-muted/50 ${color}`}>
            {icon}
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-500 tracking-tighter">
            {trend}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-3xl font-bold font-mono mt-1">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}
