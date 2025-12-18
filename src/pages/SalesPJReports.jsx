import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Download,
  BarChart3,
  PieChart,
  Target,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';
import { canViewAll, canViewTeam } from "@/components/utils/permissions";

const STAGES_PJ = [
  { value: 'novo', label: 'Novo', color: '#3b82f6' },
  { value: 'qualificacao', label: 'Qualificação', color: '#8b5cf6' },
  { value: 'apresentacao', label: 'Apresentação', color: '#6366f1' },
  { value: 'proposta_enviada', label: 'Proposta', color: '#eab308' },
  { value: 'negociacao', label: 'Negociação', color: '#f97316' },
  { value: 'fechado_ganho', label: 'Fechado', color: '#22c55e' },
  { value: 'fechado_perdido', label: 'Perdido', color: '#ef4444' },
];

const COLORS = ['#3b82f6', '#8b5cf6', '#6366f1', '#eab308', '#f97316', '#22c55e', '#ef4444'];

export default function SalesPJReports() {
  const [period, setPeriod] = useState("month");
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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

  const { data: leadsPJ = [] } = useQuery({
    queryKey: ['leadsPJ'],
    queryFn: async () => {
      const allLeads = await base44.entities.LeadPJ.list('-created_date');
      
      if (user?.role === 'admin') {
        return allLeads;
      }

      if (!currentAgent) return [];

      const canSeeAll = canViewAll(currentAgent, 'leads');
      if (canSeeAll) {
        return allLeads;
      }

      const canSeeTeam = canViewTeam(currentAgent, 'leads');
      if (canSeeTeam) {
        const teamAgents = allAgents.filter(a => a.team_id === currentAgent.team_id);
        const teamAgentIds = teamAgents.map(a => a.id);
        
        return allLeads.filter(l => teamAgentIds.includes(l.agent_id));
      }

      return allLeads.filter(l => l.agent_id === currentAgent.id);
    },
    initialData: [],
  });

  const { data: salesAgents = [] } = useQuery({
    queryKey: ['salesAgents'],
    queryFn: () => base44.entities.SalesAgent.list(),
    initialData: [],
  });

  // Filtrar por período
  const filteredLeads = leadsPJ.filter(lead => {
    if (selectedAgent !== "all" && lead.agent_id !== selectedAgent) return false;

    if (dateFrom) {
      const leadDate = new Date(lead.created_date);
      const fromDate = new Date(dateFrom);
      if (leadDate < fromDate) return false;
    }

    if (dateTo) {
      const leadDate = new Date(lead.created_date);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59);
      if (leadDate > toDate) return false;
    }

    return true;
  });

  // KPIs
  const totalLeads = filteredLeads.length;
  const leadsAtivos = filteredLeads.filter(l => !l.concluded && !l.lost).length;
  const leadsFechados = filteredLeads.filter(l => l.concluded).length;
  const leadsPerdidos = filteredLeads.filter(l => l.lost).length;
  const totalValue = filteredLeads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);
  const totalFechado = filteredLeads.filter(l => l.concluded).reduce((sum, l) => sum + (l.deal_value || l.estimated_value || 0), 0);
  const avgTicket = leadsFechados > 0 ? totalFechado / leadsFechados : 0;
  const taxaConversao = totalLeads > 0 ? ((leadsFechados / totalLeads) * 100).toFixed(1) : 0;

  // Dados por Stage
  const stageData = STAGES_PJ.map(stage => ({
    name: stage.label,
    value: filteredLeads.filter(l => l.stage === stage.value).length,
    color: stage.color,
  }));

  // Dados por Agente
  const agentData = salesAgents.map(agent => ({
    name: agent.name,
    leads: filteredLeads.filter(l => l.agent_id === agent.id).length,
    fechados: filteredLeads.filter(l => l.agent_id === agent.id && l.concluded).length,
    valor: filteredLeads.filter(l => l.agent_id === agent.id).reduce((sum, l) => sum + (l.estimated_value || 0), 0),
  })).filter(a => a.leads > 0).sort((a, b) => b.valor - a.valor);

  // Dados por Porte
  const porteData = [
    { name: 'MEI', value: filteredLeads.filter(l => l.porte === 'MEI').length },
    { name: 'ME', value: filteredLeads.filter(l => l.porte === 'ME').length },
    { name: 'EPP', value: filteredLeads.filter(l => l.porte === 'EPP').length },
    { name: 'Médio', value: filteredLeads.filter(l => l.porte === 'Médio').length },
    { name: 'Grande', value: filteredLeads.filter(l => l.porte === 'Grande').length },
  ].filter(p => p.value > 0);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const handleExport = () => {
    // Preparar dados para CSV
    const csvData = filteredLeads.map(lead => ({
      'Razão Social': lead.razao_social || '',
      'Nome Fantasia': lead.nome_fantasia || '',
      'CNPJ': lead.cnpj || '',
      'Telefone': lead.phone || '',
      'Email': lead.email || '',
      'Cidade': lead.city || '',
      'Estado': lead.state || '',
      'Porte': lead.porte || '',
      'Stage': STAGES_PJ.find(s => s.value === lead.stage)?.label || '',
      'Valor Estimado': lead.estimated_value || 0,
      'Status': lead.concluded ? 'Concluído' : lead.lost ? 'Perdido' : 'Ativo',
      'Data Criação': new Date(lead.created_date).toLocaleDateString('pt-BR'),
    }));

    // Converter para CSV
    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_vendas_pj_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              Relatórios de Vendas PJ
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Análise completa do pipeline B2B
            </p>
          </div>
          <Button onClick={handleExport} className="bg-indigo-600 hover:bg-indigo-700">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-white dark:bg-gray-900">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Agente</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os agentes</SelectItem>
                    {salesAgents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Data Inicial</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Data Final</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedAgent("all");
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total de Empresas</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{totalLeads}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {leadsAtivos} ativas • {leadsFechados} fechadas • {leadsPerdidos} perdidas
                  </p>
                </div>
                <Building2 className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Valor em Pipeline</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalValue)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Total estimado
                  </p>
                </div>
                <DollarSign className="w-12 h-12 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Ticket Médio</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(avgTicket)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Por venda fechada
                  </p>
                </div>
                <Target className="w-12 h-12 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Taxa de Conversão</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{taxaConversao}%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {leadsFechados} de {totalLeads} leads
                  </p>
                </div>
                <TrendingUp className="w-12 h-12 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funil por Stage */}
          <Card className="bg-white dark:bg-gray-900">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100">Funil de Vendas B2B</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Distribuição por Porte */}
          <Card className="bg-white dark:bg-gray-900">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100">Distribuição por Porte</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={porteData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {porteData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Performance por Agente */}
        <Card className="bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-gray-100">Performance por Agente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {agentData.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Nenhum dado disponível para o período selecionado
                </p>
              ) : (
                agentData.map((agent, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{agent.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {agent.leads} empresas • {agent.fechados} fechadas
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(agent.valor)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {agent.leads > 0 ? `${((agent.fechados / agent.leads) * 100).toFixed(1)}%` : '0%'} conversão
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}