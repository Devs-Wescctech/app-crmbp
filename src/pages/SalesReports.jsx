import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileBarChart, 
  Download, 
  Users, 
  TrendingUp, 
  Target,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Trophy,
  Filter,
  Calendar
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SalesReports() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all');

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date', 5000),
    initialData: [],
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['salesAgents'],
    queryFn: () => base44.entities.SalesAgent.list(),
    initialData: [],
  });

  // Filtrar leads por período e filtros
  const filteredLeads = leads.filter(lead => {
    const leadDate = new Date(lead.created_date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const dateMatch = leadDate >= start && leadDate <= end;
    const agentMatch = selectedAgent === 'all' || lead.agent_id === selectedAgent;
    const stageMatch = selectedStage === 'all' || lead.stage === selectedStage;
    
    // Team match
    let teamMatch = true;
    if (selectedTeam !== 'all') {
      const agent = agents.find(a => a.id === lead.agent_id);
      teamMatch = agent?.team === selectedTeam;
    }

    return dateMatch && agentMatch && teamMatch && stageMatch;
  });

  // Calcular métricas gerais
  const totalLeads = filteredLeads.length;
  const leadsEmAtendimento = filteredLeads.filter(l => !l.concluded && !l.lost).length;
  const leadsGanhos = filteredLeads.filter(l => l.concluded).length;
  const leadsPerdidos = filteredLeads.filter(l => l.lost).length;
  const taxaConversao = totalLeads > 0 ? ((leadsGanhos / totalLeads) * 100).toFixed(1) : 0;
  const receitaTotal = filteredLeads
    .filter(l => l.concluded)
    .reduce((sum, l) => sum + (l.estimated_value || l.monthly_value || 0), 0);

  // Agrupar por agente
  const agentStats = agents.map(agent => {
    const agentLeads = filteredLeads.filter(l => l.agent_id === agent.id);
    const working = agentLeads.filter(l => !l.concluded && !l.lost);
    const won = agentLeads.filter(l => l.concluded);
    const lost = agentLeads.filter(l => l.lost);
    const revenue = won.reduce((sum, l) => sum + (l.estimated_value || l.monthly_value || 0), 0);
    const conversionRate = agentLeads.length > 0 ? ((won.length / agentLeads.length) * 100).toFixed(1) : 0;

    return {
      agent,
      total: agentLeads.length,
      working: working.length,
      won: won.length,
      lost: lost.length,
      revenue,
      conversionRate: parseFloat(conversionRate)
    };
  }).filter(stat => stat.total > 0); // Mostrar apenas agentes com leads

  // Agrupar por equipe
  const teams = [...new Set(agents.map(a => a.team).filter(Boolean))];
  const teamStats = teams.map(team => {
    const teamAgents = agents.filter(a => a.team === team);
    const teamAgentIds = teamAgents.map(a => a.id);
    const teamLeads = filteredLeads.filter(l => teamAgentIds.includes(l.agent_id));
    const working = teamLeads.filter(l => !l.concluded && !l.lost);
    const won = teamLeads.filter(l => l.concluded);
    const lost = teamLeads.filter(l => l.lost);
    const revenue = won.reduce((sum, l) => sum + (l.estimated_value || l.monthly_value || 0), 0);
    const conversionRate = teamLeads.length > 0 ? ((won.length / teamLeads.length) * 100).toFixed(1) : 0;

    return {
      team,
      agentCount: teamAgents.length,
      total: teamLeads.length,
      working: working.length,
      won: won.length,
      lost: lost.length,
      revenue,
      conversionRate: parseFloat(conversionRate)
    };
  });

  // Quick date filters
  const setQuickDate = (type) => {
    const today = new Date();
    switch(type) {
      case 'today':
        setStartDate(format(today, 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'week':
        setStartDate(format(startOfWeek(today), 'yyyy-MM-dd'));
        setEndDate(format(endOfWeek(today), 'yyyy-MM-dd'));
        break;
      case 'month':
        setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
        break;
      case 'last7':
        setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'last30':
        setStartDate(format(subDays(today, 30), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
    }
  };

  // Exportar para Excel (CSV)
  const exportToExcel = () => {
    const csvContent = [
      // Header
      ['RELATÓRIO DE VENDAS - PERFORMANCE POR AGENTE'],
      [`Período: ${format(new Date(startDate), 'dd/MM/yyyy', { locale: ptBR })} a ${format(new Date(endDate), 'dd/MM/yyyy', { locale: ptBR })}`],
      [''],
      ['Agente', 'Equipe', 'Total Leads', 'Em Atendimento', 'Ganhos', 'Perdidos', 'Taxa Conversão', 'Receita'],
      ...agentStats.map(stat => [
        stat.agent.name,
        stat.agent.team || '-',
        stat.total,
        stat.working,
        stat.won,
        stat.lost,
        `${stat.conversionRate}%`,
        `R$ ${stat.revenue.toFixed(2)}`
      ]),
      [''],
      ['TOTAIS'],
      ['Total de Leads', totalLeads],
      ['Em Atendimento', leadsEmAtendimento],
      ['Ganhos', leadsGanhos],
      ['Perdidos', leadsPerdidos],
      ['Taxa de Conversão', `${taxaConversao}%`],
      ['Receita Total', `R$ ${receitaTotal.toFixed(2)}`],
    ].map(row => row.join(';')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-vendas-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Ordenar agentes por performance
  const sortedAgentStats = [...agentStats].sort((a, b) => b.won - a.won);
  const topPerformer = sortedAgentStats[0];

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Relatórios de Vendas</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
            <FileBarChart className="w-4 h-4" />
            Análise de performance por agente e equipe
          </p>
        </div>
        <Button 
          onClick={exportToExcel}
          className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar Excel
        </Button>
      </div>

      {/* Filtros */}
      <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <CardHeader className="border-b border-gray-200 dark:border-gray-800">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Quick date buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => setQuickDate('today')}>
              Hoje
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDate('week')}>
              Esta Semana
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDate('month')}>
              Este Mês
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDate('last7')}>
              Últimos 7 dias
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDate('last30')}>
              Últimos 30 dias
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label className="text-gray-900 dark:text-gray-100">Data Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 bg-white dark:bg-gray-800"
              />
            </div>

            <div>
              <Label className="text-gray-900 dark:text-gray-100">Data Fim</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 bg-white dark:bg-gray-800"
              />
            </div>

            <div>
              <Label className="text-gray-900 dark:text-gray-100">Agente</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="mt-1 bg-white dark:bg-gray-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Agentes</SelectItem>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-900 dark:text-gray-100">Equipe</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="mt-1 bg-white dark:bg-gray-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Equipes</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team} value={team}>
                      {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-900 dark:text-gray-100">Status</Label>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger className="mt-1 bg-white dark:bg-gray-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="abordado">Abordado</SelectItem>
                  <SelectItem value="qualificado">Qualificado</SelectItem>
                  <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem>
                  <SelectItem value="fechado_ganho">Fechado Ganho</SelectItem>
                  <SelectItem value="fechado_perdido">Fechado Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Métricas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total de Leads</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalLeads}</p>
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
                <p className="text-sm text-gray-500 dark:text-gray-400">Em Atendimento</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{leadsEmAtendimento}</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-950 rounded-xl">
                <Clock className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ganhos</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{leadsGanhos}</p>
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
                <p className="text-sm text-gray-500 dark:text-gray-400">Perdidos</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">{leadsPerdidos}</p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-950 rounded-xl">
                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Taxa Conversão</p>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{taxaConversao}%</p>
              </div>
              <div className="p-3 bg-indigo-100 dark:bg-indigo-950 rounded-xl">
                <Target className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receita Total</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  R$ {receitaTotal.toFixed(0)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-950 rounded-xl">
                <DollarSign className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performer */}
      {topPerformer && (
        <Card className="border-2 border-yellow-300 dark:border-yellow-700 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-yellow-400 dark:bg-yellow-600 rounded-full">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">🏆 TOP PERFORMER DO PERÍODO</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{topPerformer.agent.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {topPerformer.won} vendas fechadas • {topPerformer.conversionRate}% conversão • R$ {topPerformer.revenue.toFixed(2)} em receita
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela por Agente */}
      <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <CardHeader className="border-b border-gray-200 dark:border-gray-800">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <UserCheck className="w-5 h-5" />
            Performance por Agente
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Agente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Equipe
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Leads
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Em Atendimento
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ganhos
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Perdidos
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Taxa Conversão
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Receita
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedAgentStats.map((stat, idx) => (
                  <tr key={stat.agent.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {stat.agent.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{stat.agent.name}</p>
                          {idx === 0 && <Badge className="bg-yellow-100 text-yellow-700 text-xs mt-1">Top</Badge>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {stat.agent.team || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Badge variant="outline" className="font-semibold">{stat.total}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                        {stat.working}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                        {stat.won}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                        {stat.lost}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Badge className={
                        stat.conversionRate >= 30 ? 'bg-green-100 text-green-700' :
                        stat.conversionRate >= 15 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }>
                        {stat.conversionRate}%
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900 dark:text-gray-100">
                      R$ {stat.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 dark:bg-gray-800 font-semibold">
                <tr>
                  <td className="px-6 py-4" colSpan="2">TOTAL GERAL</td>
                  <td className="px-6 py-4 text-center">{totalLeads}</td>
                  <td className="px-6 py-4 text-center">{leadsEmAtendimento}</td>
                  <td className="px-6 py-4 text-center">{leadsGanhos}</td>
                  <td className="px-6 py-4 text-center">{leadsPerdidos}</td>
                  <td className="px-6 py-4 text-center">{taxaConversao}%</td>
                  <td className="px-6 py-4 text-right">R$ {receitaTotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tabela por Equipe */}
      {teamStats.length > 0 && (
        <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <CardHeader className="border-b border-gray-200 dark:border-gray-800">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Users className="w-5 h-5" />
              Performance por Equipe
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Equipe
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Agentes
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Total Leads
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Em Atendimento
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ganhos
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Perdidos
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Taxa Conversão
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Receita
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {teamStats
                    .sort((a, b) => b.won - a.won)
                    .map((stat) => (
                    <tr key={stat.team} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-white" />
                          </div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{stat.team}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600 dark:text-gray-400">
                        {stat.agentCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Badge variant="outline" className="font-semibold">{stat.total}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                          {stat.working}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                          {stat.won}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                          {stat.lost}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Badge className={
                          stat.conversionRate >= 30 ? 'bg-green-100 text-green-700' :
                          stat.conversionRate >= 15 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {stat.conversionRate}%
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900 dark:text-gray-100">
                        R$ {stat.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}