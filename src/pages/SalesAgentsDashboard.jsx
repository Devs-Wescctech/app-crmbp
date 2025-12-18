
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Trophy, 
  TrendingUp, 
  Users, 
  Target,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  Flame,
  Medal,
  Award,
  Activity,
  Filter
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SalesAgentsDashboard() {
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [sortBy, setSortBy] = useState("vendas"); // vendas, leads, conversao, receita

  const { data: agents = [] } = useQuery({
    queryKey: ['salesAgents'],
    queryFn: () => base44.entities.SalesAgent.list(),
    initialData: [],
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date', 5000),
    initialData: [],
  });

  // Extrair equipes únicas
  const teams = [...new Set(agents.map(a => a.team).filter(Boolean))];

  // Filtrar leads por período
  const filteredLeadsByDate = leads.filter(lead => {
    const leadDate = new Date(lead.created_date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return leadDate >= start && leadDate <= end;
  });

  // Calcular estatísticas por agente
  const agentStats = agents
    .filter(agent => {
      if (selectedTeam !== "all" && agent.team !== selectedTeam) {
        return false;
      }
      return agent.active;
    })
    .map(agent => {
      const agentLeads = filteredLeadsByDate.filter(l => l.agent_id === agent.id);
      
      // Totais
      const totalLeads = agentLeads.length;
      const novos = agentLeads.filter(l => l.stage === 'novo').length;
      const abordados = agentLeads.filter(l => l.stage === 'abordado').length;
      const qualificados = agentLeads.filter(l => l.stage === 'qualificado').length;
      const propostasEnviadas = agentLeads.filter(l => l.stage === 'proposta_enviada').length;
      const vendas = agentLeads.filter(l => l.stage === 'fechado_ganho').length;
      const perdidos = agentLeads.filter(l => l.stage === 'fechado_perdido').length;
      
      // Taxa de conversão
      const taxaConversao = totalLeads > 0 ? ((vendas / totalLeads) * 100) : 0;
      
      // Receita
      const receita = agentLeads
        .filter(l => l.stage === 'fechado_ganho')
        .reduce((sum, l) => sum + (l.deal_value || l.estimated_value || 0), 0);
      
      // Ticket médio
      const ticketMedio = vendas > 0 ? (receita / vendas) : 0;
      
      // Leads ativos (não fechados)
      const leadsAtivos = agentLeads.filter(l => 
        !l.concluded && !l.lost && 
        l.stage !== 'fechado_ganho' && 
        l.stage !== 'fechado_perdido'
      ).length;

      return {
        agent,
        totalLeads,
        novos,
        abordados,
        qualificados,
        propostasEnviadas,
        vendas,
        perdidos,
        leadsAtivos,
        taxaConversao: parseFloat(taxaConversao.toFixed(1)),
        receita,
        ticketMedio,
      };
    });

  // Ordenar agentes
  const sortedAgents = [...agentStats].sort((a, b) => {
    switch(sortBy) {
      case "vendas":
        return b.vendas - a.vendas;
      case "leads":
        return b.totalLeads - a.totalLeads;
      case "conversao":
        return b.taxaConversao - a.taxaConversao;
      case "receita":
        return b.receita - a.receita;
      default:
        return b.vendas - a.vendas;
    }
  });

  // Top 3
  const top3 = sortedAgents.slice(0, 3);
  
  // Totais gerais
  const totalGeralLeads = agentStats.reduce((sum, a) => sum + a.totalLeads, 0);
  const totalGeralVendas = agentStats.reduce((sum, a) => sum + a.vendas, 0);
  const totalGeralReceita = agentStats.reduce((sum, a) => sum + a.receita, 0);
  const taxaGeralConversao = totalGeralLeads > 0 ? ((totalGeralVendas / totalGeralLeads) * 100).toFixed(1) : 0;

  // Quick date filters
  const setQuickDate = (type) => {
    const today = new Date();
    switch(type) {
      case 'today':
        setStartDate(format(today, 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'last7':
        setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case 'month':
        setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
        break;
      case 'last30':
        setStartDate(format(subDays(today, 30), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard dos Vendedores</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Performance individual e ranking do time
        </p>
      </div>

      {/* Filtros */}
      <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <CardHeader className="border-b border-gray-200 dark:border-gray-800 pb-4">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Quick date buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setQuickDate('today')}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Hoje
            </button>
            <button
              onClick={() => setQuickDate('last7')}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Últimos 7 dias
            </button>
            <button
              onClick={() => setQuickDate('month')}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Este Mês
            </button>
            <button
              onClick={() => setQuickDate('last30')}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Últimos 30 dias
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <Label className="text-gray-900 dark:text-gray-100">Ordenar Por</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="mt-1 bg-white dark:bg-gray-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendas">Vendas Fechadas</SelectItem>
                  <SelectItem value="leads">Total de Leads</SelectItem>
                  <SelectItem value="conversao">Taxa de Conversão</SelectItem>
                  <SelectItem value="receita">Receita Total</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total de Leads</p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{totalGeralLeads}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {agentStats.length} agentes ativos
                </p>
              </div>
              <Users className="w-10 h-10 text-blue-500 dark:text-blue-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Vendas Fechadas</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">{totalGeralVendas}</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Taxa: {taxaGeralConversao}%
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500 dark:text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Receita Total</p>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                  R$ {totalGeralReceita.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  Ticket médio: R$ {totalGeralVendas > 0 ? (totalGeralReceita / totalGeralVendas).toFixed(0) : 0}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-purple-500 dark:text-purple-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Taxa de Conversão</p>
                <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{taxaGeralConversao}%</p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  Média do time
                </p>
              </div>
              <Target className="w-10 h-10 text-orange-500 dark:text-orange-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 3 Pódio */}
      {top3.length > 0 && (
        <Card className="border-2 border-yellow-300 dark:border-yellow-700 bg-gradient-to-r from-yellow-50 via-orange-50 to-red-50 dark:from-yellow-950 dark:via-orange-950 dark:to-red-950">
          <CardHeader className="border-b border-yellow-200 dark:border-yellow-800">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              🏆 Top 3 Vendedores - {sortBy === 'vendas' ? 'Vendas' : sortBy === 'leads' ? 'Leads' : sortBy === 'conversao' ? 'Conversão' : 'Receita'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-4">
              {top3.map((stat, idx) => {
                const Icon = idx === 0 ? Trophy : idx === 1 ? Medal : Award;
                const colorClass = idx === 0 ? 'from-yellow-400 to-yellow-600' : idx === 1 ? 'from-gray-400 to-gray-600' : 'from-orange-400 to-orange-600';
                
                return (
                  <Card key={stat.agent.id} className={`border-2 ${idx === 0 ? 'border-yellow-400 dark:border-yellow-600' : idx === 1 ? 'border-gray-400 dark:border-gray-600' : 'border-orange-400 dark:border-orange-600'} relative overflow-hidden`}>
                    {/* Position badge */}
                    <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
                      <span className="text-white font-bold text-2xl">{idx + 1}º</span>
                    </div>
                    
                    <CardContent className="p-6 text-center">
                      <div className="flex flex-col items-center">
                        {stat.agent.photo_url ? (
                          <img 
                            src={stat.agent.photo_url} 
                            alt={stat.agent.name}
                            className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg mb-3"
                          />
                        ) : (
                          <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-lg mb-3`}>
                            <span className="text-white font-bold text-2xl">
                              {stat.agent.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        
                        <Icon className={`w-8 h-8 mb-2 ${idx === 0 ? 'text-yellow-600' : idx === 1 ? 'text-gray-600' : 'text-orange-600'}`} />
                        
                        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1">
                          {stat.agent.name}
                        </h3>
                        {stat.agent.team && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {stat.agent.team}
                          </p>
                        )}
                        
                        <div className="grid grid-cols-2 gap-2 w-full mt-3">
                          <div className="bg-green-100 dark:bg-green-950 p-2 rounded">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Vendas</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                              {stat.vendas}
                            </p>
                          </div>
                          <div className="bg-blue-100 dark:bg-blue-950 p-2 rounded">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Leads</p>
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              {stat.totalLeads}
                            </p>
                          </div>
                          <div className="bg-purple-100 dark:bg-purple-950 p-2 rounded">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Conv.</p>
                            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                              {stat.taxaConversao}%
                            </p>
                          </div>
                          <div className="bg-orange-100 dark:bg-orange-950 p-2 rounded">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Receita</p>
                            <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                              R$ {stat.receita.toFixed(0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ranking Completo */}
      <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <CardHeader className="border-b border-gray-200 dark:border-gray-800">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <TrendingUp className="w-5 h-5" />
            Ranking Completo dos Vendedores
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {sortedAgents.map((stat, idx) => (
              <div 
                key={stat.agent.id} 
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Posição */}
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                      idx === 0 ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300' :
                      idx === 1 ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' :
                      idx === 2 ? 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300' :
                      'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                    }`}>
                      {idx + 1}º
                    </div>
                  </div>

                  {/* Foto e Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {stat.agent.photo_url ? (
                      <img 
                        src={stat.agent.photo_url} 
                        alt={stat.agent.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
                        <span className="text-white font-bold text-xl">
                          {stat.agent.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                        {stat.agent.name}
                      </h3>
                      {stat.agent.team && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {stat.agent.team}
                        </p>
                      )}
                      {stat.agent.phone && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {stat.agent.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Métricas em Grid */}
                  <div className="grid grid-cols-5 gap-3 flex-shrink-0">
                    <div className="text-center">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Leads</p>
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-lg font-bold">
                        {stat.totalLeads}
                      </Badge>
                    </div>

                    <div className="text-center">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Ativos</p>
                      <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-lg font-bold">
                        {stat.leadsAtivos}
                      </Badge>
                    </div>

                    <div className="text-center">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Vendas</p>
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 text-lg font-bold">
                        {stat.vendas}
                      </Badge>
                    </div>

                    <div className="text-center">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Conv.</p>
                      <Badge className={`${
                        stat.taxaConversao >= 30 ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' :
                        stat.taxaConversao >= 15 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      } text-lg font-bold`}>
                        {stat.taxaConversao}%
                      </Badge>
                    </div>

                    <div className="text-center">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Receita</p>
                      <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 text-sm font-bold">
                        R$ {stat.receita.toFixed(0)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Breakdown de Stages */}
                <div className="mt-4 grid grid-cols-5 gap-2 text-center text-xs">
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-2 rounded">
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Novos</p>
                    <p className="font-bold text-blue-600 dark:text-blue-400">{stat.novos}</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950/30 p-2 rounded">
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Abordados</p>
                    <p className="font-bold text-purple-600 dark:text-purple-400">{stat.abordados}</p>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded">
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Qualificados</p>
                    <p className="font-bold text-yellow-600 dark:text-yellow-400">{stat.qualificados}</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-950/30 p-2 rounded">
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Propostas</p>
                    <p className="font-bold text-orange-600 dark:text-orange-400">{stat.propostasEnviadas}</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/30 p-2 rounded">
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Perdidos</p>
                    <p className="font-bold text-red-600 dark:text-red-400">{stat.perdidos}</p>
                  </div>
                </div>

                {/* Barra de Progresso - Taxa de Conversão */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2 text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Performance de Conversão</span>
                    <span className={`font-semibold ${
                      stat.taxaConversao >= 30 ? 'text-green-600 dark:text-green-400' :
                      stat.taxaConversao >= 15 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {stat.taxaConversao}%
                    </span>
                  </div>
                  <Progress 
                    value={stat.taxaConversao} 
                    className="h-2" 
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
