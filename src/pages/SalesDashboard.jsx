import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target, 
  Activity,
  Calendar,
  MapPin,
  CheckCircle,
  Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SalesDashboard() {
  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date'),
    initialData: [],
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['salesAgents'],
    queryFn: () => base44.entities.SalesAgent.list(),
    initialData: [],
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: () => base44.entities.Activity.list('-created_date', 50),
    initialData: [],
  });

  // Métricas
  const totalLeads = leads.length;
  const leadsNovos = leads.filter(l => l.stage === 'novo').length;
  const leadsQualificados = leads.filter(l => l.stage === 'qualificado').length;
  const vendas = leads.filter(l => l.stage === 'fechado_ganho').length;
  const taxaConversao = totalLeads > 0 ? ((vendas / totalLeads) * 100).toFixed(1) : 0;
  
  const receitaTotal = leads
    .filter(l => l.stage === 'fechado_ganho' && l.deal_value)
    .reduce((sum, l) => sum + l.deal_value, 0);

  const ticketMedio = vendas > 0 ? (receitaTotal / vendas).toFixed(2) : 0;

  // Atividades pendentes
  const atividadesPendentes = activities.filter(a => !a.completed && a.type === 'task').length;

  // Top performers
  const topAgents = agents
    .map(agent => {
      const agentLeads = leads.filter(l => l.agent_id === agent.id);
      const agentVendas = agentLeads.filter(l => l.stage === 'fechado_ganho').length;
      return { ...agent, vendas: agentVendas, total: agentLeads.length };
    })
    .sort((a, b) => b.vendas - a.vendas)
    .slice(0, 5);

  // Leads por stage
  const stageData = [
    { stage: 'Novo', count: leadsNovos, color: 'blue' },
    { stage: 'Abordado', count: leads.filter(l => l.stage === 'abordado').length, color: 'purple' },
    { stage: 'Qualificado', count: leadsQualificados, color: 'yellow' },
    { stage: 'Proposta Enviada', count: leads.filter(l => l.stage === 'proposta_enviada').length, color: 'orange' },
    { stage: 'Fechado', count: vendas, color: 'green' },
  ];

  const colorClasses = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300', gradient: 'from-blue-500 to-blue-600' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-300', gradient: 'from-purple-500 to-purple-600' },
    yellow: { bg: 'bg-yellow-100 dark:bg-yellow-950', text: 'text-yellow-700 dark:text-yellow-300', gradient: 'from-yellow-500 to-yellow-600' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-950', text: 'text-orange-700 dark:text-orange-300', gradient: 'from-orange-500 to-orange-600' },
    green: { bg: 'bg-green-100 dark:bg-green-950', text: 'text-green-700 dark:text-green-300', gradient: 'from-green-500 to-green-600' },
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard de Vendas</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Performance e métricas do time de vendas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300">
            {agents.filter(a => a.active).length} agentes ativos
          </Badge>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total de Leads</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalLeads}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{leadsNovos} novos</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-950 rounded-xl">
                <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Vendas Fechadas</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{vendas}</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">Taxa: {taxaConversao}%</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-950 rounded-xl">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receita Total</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  R$ {receitaTotal.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ticket médio: R$ {ticketMedio}</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-950 rounded-xl">
                <DollarSign className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tarefas Pendentes</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{atividadesPendentes}</p>
                <Link to={createPageUrl("SalesTasks")} className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block">
                  Ver tarefas
                </Link>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-950 rounded-xl">
                <Clock className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline & Performance */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pipeline por Stage */}
        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <CardHeader className="border-b border-gray-200 dark:border-gray-800">
            <CardTitle className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Pipeline de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {stageData.map((item) => {
                const colors = colorClasses[item.color];
                const percentage = totalLeads > 0 ? (item.count / totalLeads) * 100 : 0;
                
                return (
                  <div key={item.stage}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.stage}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{item.count}</span>
                        <Badge className={`${colors.bg} ${colors.text} text-xs`}>
                          {percentage.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <CardHeader className="border-b border-gray-200 dark:border-gray-800">
            <CardTitle className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {topAgents.map((agent, index) => (
                <div key={agent.id} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{agent.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{agent.total} leads • {agent.vendas} vendas</p>
                  </div>
                  <Badge className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300">
                    {agent.total > 0 ? ((agent.vendas / agent.total) * 100).toFixed(0) : 0}%
                  </Badge>
                </div>
              ))}
              {topAgents.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
                  Nenhum dado disponível
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link to={createPageUrl("LeadsKanban")}>
          <Card className="border-gray-200 dark:border-gray-800 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 hover:shadow-lg transition-all cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Pipeline de Vendas</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Gerencie seus leads</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl("LeadsMap")}>
          <Card className="border-gray-200 dark:border-gray-800 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 hover:shadow-lg transition-all cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <MapPin className="w-8 h-8 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Mapa de Leads</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Visão geográfica</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl("SalesTasks")}>
          <Card className="border-gray-200 dark:border-gray-800 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 hover:shadow-lg transition-all cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Tarefas & Follow-ups</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{atividadesPendentes} pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}