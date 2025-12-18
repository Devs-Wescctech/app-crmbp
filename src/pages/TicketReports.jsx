import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Download, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Users,
  Calendar,
  FileBarChart
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function TicketReports() {
  const [period, setPeriod] = useState('7'); // days
  const [selectedQueue, setSelectedQueue] = useState('all');

  const { data: allTickets = [], isLoading } = useQuery({
    queryKey: ['allTickets'],
    queryFn: async () => {
      const tickets = await base44.entities.Ticket.list('-created_date', 2000);
      return tickets.filter(t => t.ticket_type === 'support' || !t.ticket_type);
    },
    initialData: [],
  });

  const { data: queues = [] } = useQuery({
    queryKey: ['queues'],
    queryFn: () => base44.entities.Queue.list(),
    initialData: [],
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list(),
    initialData: [],
  });

  // Filtrar por período
  const startDate = startOfDay(subDays(new Date(), parseInt(period)));
  const endDate = endOfDay(new Date());

  const filteredTickets = allTickets.filter(t => {
    const ticketDate = new Date(t.created_date);
    const inPeriod = ticketDate >= startDate && ticketDate <= endDate;
    const inQueue = selectedQueue === 'all' || t.queue_id === selectedQueue;
    return inPeriod && inQueue;
  });

  // Estatísticas Gerais
  const totalTickets = filteredTickets.length;
  const completedTickets = filteredTickets.filter(t => ['resolvido', 'fechado'].includes(t.status)).length;
  const activeTickets = filteredTickets.filter(t => !['resolvido', 'fechado'].includes(t.status)).length;
  const breachedTickets = filteredTickets.filter(t => t.sla_breached).length;
  const avgResolutionTime = filteredTickets
    .filter(t => t.time_to_resolution)
    .reduce((sum, t) => sum + t.time_to_resolution, 0) / 
    (filteredTickets.filter(t => t.time_to_resolution).length || 1);

  // Taxa de resolução
  const resolutionRate = totalTickets > 0 ? ((completedTickets / totalTickets) * 100).toFixed(1) : 0;
  const slaCompliance = totalTickets > 0 ? (((totalTickets - breachedTickets) / totalTickets) * 100).toFixed(1) : 0;

  // Tickets por dia
  const ticketsByDay = [];
  for (let i = parseInt(period) - 1; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dateStr = format(date, 'dd/MM', { locale: ptBR });
    const count = filteredTickets.filter(t => {
      const ticketDate = new Date(t.created_date);
      return format(ticketDate, 'dd/MM') === dateStr;
    }).length;
    ticketsByDay.push({ date: dateStr, tickets: count });
  }

  // Tickets por status
  const ticketsByStatus = [
    { name: 'Novo', value: filteredTickets.filter(t => t.status === 'novo').length },
    { name: 'Atribuído', value: filteredTickets.filter(t => t.status === 'atribuido').length },
    { name: 'Em Atendimento', value: filteredTickets.filter(t => t.status === 'em_atendimento').length },
    { name: 'Aguardando', value: filteredTickets.filter(t => t.status === 'aguardando_cliente').length },
    { name: 'Resolvido', value: filteredTickets.filter(t => t.status === 'resolvido').length },
  ].filter(item => item.value > 0);

  // Tickets por prioridade
  const ticketsByPriority = [
    { name: 'P1 - Crítica', value: filteredTickets.filter(t => t.priority === 'P1').length, color: '#ef4444' },
    { name: 'P2 - Alta', value: filteredTickets.filter(t => t.priority === 'P2').length, color: '#f59e0b' },
    { name: 'P3 - Média', value: filteredTickets.filter(t => t.priority === 'P3').length, color: '#3b82f6' },
    { name: 'P4 - Baixa', value: filteredTickets.filter(t => t.priority === 'P4').length, color: '#6b7280' },
  ].filter(item => item.value > 0);

  // Performance por agente
  const agentPerformance = agents.map(agent => {
    const agentTickets = filteredTickets.filter(t => t.agent_id === agent.id);
    const resolved = agentTickets.filter(t => ['resolvido', 'fechado'].includes(t.status)).length;
    return {
      name: agent.name,
      total: agentTickets.length,
      resolved: resolved,
      rate: agentTickets.length > 0 ? ((resolved / agentTickets.length) * 100).toFixed(0) : 0
    };
  }).filter(a => a.total > 0).sort((a, b) => b.total - a.total).slice(0, 10);

  // Tickets por categoria
  const ticketsByCategory = {};
  filteredTickets.forEach(t => {
    const cat = t.completion_category || t.category || 'Sem categoria';
    ticketsByCategory[cat] = (ticketsByCategory[cat] || 0) + 1;
  });
  const categoryData = Object.entries(ticketsByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const handleExport = () => {
    try {
      const csv = [
        ['Período', 'Total', 'Finalizados', 'Em Atendimento', 'Taxa Resolução', 'SLA Compliance', 'Tempo Médio'].join(','),
        [
          `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`,
          totalTickets,
          completedTickets,
          activeTickets,
          `${resolutionRate}%`,
          `${slaCompliance}%`,
          `${(avgResolutionTime / 60).toFixed(1)}h`
        ].join(','),
        '',
        ['Agente', 'Total', 'Resolvidos', 'Taxa'].join(','),
        ...agentPerformance.map(a => [a.name, a.total, a.resolved, `${a.rate}%`].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio-tickets-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      
      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar relatório');
      console.error(error);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Relatórios de Atendimento</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
            <FileBarChart className="w-4 h-4" />
            Análises e métricas detalhadas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedQueue} onValueChange={setSelectedQueue}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas as filas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as filas</SelectItem>
              {queues.map(q => (
                <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="15">Últimos 15 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="60">Últimos 60 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalTickets}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Finalizados</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedTickets}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Em Atendimento</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{activeTickets}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Taxa Resolução</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{resolutionRate}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-cyan-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">SLA Compliance</p>
                <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{slaCompliance}%</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tempo Médio</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {(avgResolutionTime / 60).toFixed(1)}h
                </p>
              </div>
              <Clock className="w-8 h-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Tickets por Dia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Volume Diário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ticketsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="tickets" stroke="#3b82f6" strokeWidth={2} name="Tickets" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tickets por Status */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ticketsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {ticketsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance por Agente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Top 10 Agentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agentPerformance} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#3b82f6" name="Total" />
                <Bar dataKey="resolved" fill="#10b981" name="Resolvidos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tickets por Prioridade */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Prioridade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ticketsByPriority}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="Tickets">
                  {ticketsByPriority.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Categorias */}
      {categoryData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Categorias de Atendimento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" name="Tickets" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}