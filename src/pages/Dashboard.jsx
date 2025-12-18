
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { canAccessReports, canViewAll, canViewTeam } from "@/components/utils/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Inbox, Clock, CheckCircle, AlertTriangle, TrendingUp, Users, Activity, ArrowUp, ArrowDown } from "lucide-react";
import StatsCard from "../components/dashboard/StatsCard";
import SLAChart from "../components/dashboard/SLAChart";
import RecentTickets from "../components/dashboard/RecentTickets";
import TeamPerformance from "../components/dashboard/TeamPerformance";

export default function Dashboard() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allAgents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list(),
    initialData: [],
  });

  const currentAgent = allAgents.find(a => a.user_email === user?.email);

  // 🆕 Verificar se tem permissão para acessar dashboard
  const hasReportAccess = user?.role === 'admin' || (currentAgent && canAccessReports(currentAgent));

  const { data: tickets = [] } = useQuery({
    queryKey: ['tickets'],
    queryFn: async () => {
      const allTickets = await base44.entities.Ticket.list('-created_date', 100);
      
      // Admin vê tudo
      if (user?.role === 'admin') {
        return allTickets;
      }

      if (!currentAgent) return [];

      // Verificar permissões
      const canSeeAll = canViewAll(currentAgent, 'tickets');
      if (canSeeAll) return allTickets;

      const canSeeTeam = canViewTeam(currentAgent, 'tickets');
      if (canSeeTeam) {
        const teamAgents = allAgents.filter(a => a.team_id === currentAgent.team_id);
        const teamAgentIds = teamAgents.map(a => a.id);
        
        return allTickets.filter(t => 
          teamAgentIds.includes(t.agent_id) || 
          teamAgentIds.includes(t.created_by_agent_id)
        );
      }

      // Ver apenas seus tickets
      return allTickets.filter(t => 
        t.agent_id === currentAgent.id || 
        t.created_by_agent_id === currentAgent.id
      );
    },
    initialData: [],
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['displayAgents'],
    queryFn: async () => {
      const allDisplayAgents = await base44.entities.Agent.list();
      
      // Admin vê todos
      if (user?.role === 'admin') {
        return allDisplayAgents;
      }

      if (!currentAgent) return [];

      // Ver apenas agentes da equipe
      return allDisplayAgents.filter(a => a.team_id === currentAgent.team_id);
    },
    initialData: [],
  });

  // 🆕 Se não tem acesso ao dashboard, mostrar mensagem
  if (!hasReportAccess) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <Activity className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Dashboard não disponível
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
            Você não tem permissão para acessar o dashboard completo. Entre em contato com seu supervisor.
          </p>
        </div>
      </div>
    );
  }

  const totalTickets = tickets.length;
  const activeTickets = tickets.filter(t => ['new', 'assigned', 'in_progress'].includes(t.status)).length;
  const resolvedToday = tickets.filter(t => {
    if (!t.resolved_at) return false;
    const today = new Date();
    const resolvedDate = new Date(t.resolved_at);
    return resolvedDate.toDateString() === today.toDateString();
  }).length;
  
  const atRisk = tickets.filter(t => {
    if (t.status === 'resolved' || t.status === 'closed') return false;
    if (!t.sla_resolution_deadline) return false;
    const now = new Date();
    const deadline = new Date(t.sla_resolution_deadline);
    const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60);
    return hoursUntilDeadline > 0 && hoursUntilDeadline < 4;
  }).length;

  const breached = tickets.filter(t => t.sla_breached).length;
  const onlineAgents = agents.filter(a => a.online).length;

  // Comparação com ontem
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const ticketsYesterday = tickets.filter(t => {
    const created = new Date(t.created_date);
    return created.toDateString() === yesterday.toDateString();
  }).length;
  
  const ticketsToday = tickets.filter(t => {
    const created = new Date(t.created_date);
    return created.toDateString() === new Date().toDateString();
  }).length;

  const changePercent = ticketsYesterday > 0 
    ? ((ticketsToday - ticketsYesterday) / ticketsYesterday * 100).toFixed(1)
    : 0;

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Visão geral do atendimento em tempo real
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="px-3 py-1.5 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-full flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-medium">{onlineAgents} agentes online</span>
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            Atualizado agora
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard
          title="Total de Tickets"
          value={totalTickets}
          icon={Inbox}
          color="blue"
          trend={changePercent > 0 ? `+${changePercent}%` : `${changePercent}%`}
          trendUp={changePercent >= 0}
        />
        <StatsCard
          title="Em Atendimento"
          value={activeTickets}
          icon={Clock}
          color="purple"
          subtitle={`${((activeTickets/totalTickets)*100).toFixed(0)}% do total`}
        />
        <StatsCard
          title="Resolvidos Hoje"
          value={resolvedToday}
          icon={CheckCircle}
          color="green"
          trend="+8% vs ontem"
          trendUp={true}
        />
        <StatsCard
          title="SLA em Risco"
          value={atRisk}
          icon={AlertTriangle}
          color="orange"
          pulse={atRisk > 0}
        />
        <StatsCard
          title="SLA Violado"
          value={breached}
          icon={AlertTriangle}
          color="red"
          pulse={breached > 0}
        />
        <StatsCard
          title="Agentes Online"
          value={onlineAgents}
          icon={Users}
          color="indigo"
          subtitle={`${agents.length} total`}
        />
      </div>

      {/* Charts & Lists */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SLAChart tickets={tickets} />
          <RecentTickets tickets={tickets.slice(0, 10)} />
        </div>
        <div>
          <TeamPerformance agents={agents} tickets={tickets} />
        </div>
      </div>
    </div>
  );
}
