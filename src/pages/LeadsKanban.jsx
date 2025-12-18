
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Calendar,
  User,
  Filter,
  Search,
  X,
  LayoutGrid,
  List,
  ExternalLink,
  Clock,
  TrendingUp,
  GripVertical,
  Bell,
  AlertCircle,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import QuickLeadForm from "../components/sales/QuickLeadForm";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { canViewAll, canViewTeam } from "@/components/utils/permissions";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STAGES = [
  { id: 'novo', label: 'Novos', color: 'bg-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950' },
  { id: 'abordado', label: 'Abordados', color: 'bg-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-950' },
  { id: 'qualificado', label: 'Qualificados', color: 'bg-indigo-500', bgColor: 'bg-indigo-50 dark:bg-indigo-950' },
  { id: 'proposta_enviada', label: 'Propostas', color: 'bg-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-950' },
  { id: 'fechado_ganho', label: 'Fechados', color: 'bg-green-500', bgColor: 'bg-green-50 dark:bg-green-950' },
  { id: 'fechado_perdido', label: 'Perdidos', color: 'bg-red-500', bgColor: 'bg-red-50 dark:bg-red-950' },
];

export default function LeadsKanban() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('kanban');
  const [filters, setFilters] = useState({
    search: '',
    agent: 'all',
    territory: 'all',
    dateFrom: '',
    dateTo: '',
  });

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

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const allLeads = await base44.entities.Lead.list('-created_date');

      if (user?.role === 'admin') {
        return allLeads.filter(l => !l.concluded && !l.lost);
      }

      if (!currentAgent) return [];

      const canSeeAll = canViewAll(currentAgent, 'leads');
      if (canSeeAll) {
        return allLeads.filter(l => !l.concluded && !l.lost);
      }

      const canSeeTeam = canViewTeam(currentAgent, 'leads');
      if (canSeeTeam) {
        const teamAgents = allAgents.filter(a => a.team_id === currentAgent.team_id);
        const teamAgentIds = teamAgents.map(a => a.id);

        return allLeads.filter(l =>
          (!l.concluded && !l.lost) &&
          (teamAgentIds.includes(l.agent_id) || teamAgentIds.includes(l.promoter_id))
        );
      }

      return allLeads.filter(l =>
        (!l.concluded && !l.lost) &&
        (l.agent_id === currentAgent.id || l.promoter_id === currentAgent.id)
      );
    },
    initialData: [],
  });

  const { data: salesAgents = [] } = useQuery({
    queryKey: ['salesAgents'],
    queryFn: () => base44.entities.SalesAgent.list(),
    initialData: [],
  });

  const { data: territories = [] } = useQuery({
    queryKey: ['territories'],
    queryFn: () => base44.entities.Territory.list(),
    initialData: [],
  });

  const { data: allActivities = [] } = useQuery({
    queryKey: ['allActivities'],
    queryFn: () => base44.entities.Activity.list(),
    initialData: [],
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  // MUTATION PARA COMPLETAR TAREFA
  const completeTaskMutation = useMutation({
    mutationFn: ({ taskId }) => base44.entities.Activity.update(taskId, {
      completed: true,
      completed_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allActivities'] });
      toast.success('✅ Tarefa concluída!');
    },
  });

  // MUTATION PARA DELETAR TAREFA
  const deleteTaskMutation = useMutation({
    mutationFn: ({ taskId }) => base44.entities.Activity.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allActivities'] });
      toast.success('Tarefa excluída!');
    },
  });

  const handleStageChange = async (leadId, newStage, fromStage = null) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const currentStage = fromStage || lead.stage;
    if (currentStage === newStage) return;

    const stageHistory = lead.stage_history || [];
    stageHistory.push({
      from: currentStage,
      to: newStage,
      changed_at: new Date().toISOString(),
      changed_by: user?.email,
    });

    await updateLeadMutation.mutateAsync({
      id: leadId,
      data: {
        stage: newStage,
        stage_history: stageHistory,
      }
    });

    toast.success('Lead movido com sucesso!');
  };

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStage = destination.droppableId;
    const oldStage = source.droppableId;

    handleStageChange(draggableId, newStage, oldStage);
  };

  const filteredLeads = leads.filter(lead => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (
        !lead.name?.toLowerCase().includes(searchLower) &&
        !lead.phone?.toLowerCase().includes(searchLower) &&
        !lead.email?.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    if (filters.agent !== 'all' && lead.agent_id !== filters.agent) {
      return false;
    }

    if (filters.territory !== 'all' && lead.territory_id !== filters.territory) {
      return false;
    }

    if (filters.dateFrom) {
      const leadDate = new Date(lead.created_date);
      const fromDate = new Date(filters.dateFrom);
      if (leadDate < fromDate) return false;
    }

    if (filters.dateTo) {
      const leadDate = new Date(lead.created_date);
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59);
      if (leadDate > toDate) return false;
    }

    return true;
  });

  const getLeadsByStage = (stage) => {
    return filteredLeads.filter(lead => lead.stage === stage);
  };

  const getPendingTasksCount = (leadId) => {
    return allActivities.filter(a =>
      a.lead_id === leadId &&
      a.type === 'task' &&
      !a.completed
    ).length;
  };

  // FUNÇÃO PARA BUSCAR TAREFAS PENDENTES DE UM LEAD
  const getPendingTasks = (leadId) => {
    return allActivities.filter(a =>
      a.lead_id === leadId &&
      a.type === 'task' &&
      !a.completed
    );
  };

  const totalValue = filteredLeads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);
  const avgValue = filteredLeads.length > 0 ? totalValue / filteredLeads.length : 0;

  const getAgentName = (agentId) => {
    const agent = salesAgents.find(a => a.id === agentId);
    return agent?.name || '-';
  };

  const getAgentData = (agentId) => {
    return salesAgents.find(a => a.id === agentId);
  };

  const getTerritoryName = (territoryId) => {
    const territory = territories.find(t => t.id === territoryId);
    return territory?.name || '-';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      agent: 'all',
      territory: 'all',
      dateFrom: '',
      dateTo: '',
    });
  };

  const hasActiveFilters = filters.search || filters.agent !== 'all' || filters.territory !== 'all' || filters.dateFrom || filters.dateTo;

  // COMPONENTE DE POPOVER DE TAREFAS
  const TasksPopover = ({ leadId, leadName }) => {
    const tasks = getPendingTasks(leadId);

    return (
      <PopoverContent className="w-80 p-0 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700" align="start">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            Tarefas Pendentes
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{leadName}</p>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              Nenhuma tarefa pendente
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {tasks.map((task) => (
                <div key={task.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                        {task.title}
                      </p>
                      {task.scheduled_for && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(task.scheduled_for), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 hover:bg-green-100 dark:hover:bg-green-950 hover:text-green-700 dark:hover:text-green-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          completeTaskMutation.mutate({ taskId: task.id });
                        }}
                        disabled={completeTaskMutation.isPending}
                        title="Marcar como concluída"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 hover:bg-red-100 dark:hover:bg-red-950 hover:text-red-700 dark:hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Deseja excluir esta tarefa?')) {
                            deleteTaskMutation.mutate({ taskId: task.id });
                          }
                        }}
                        disabled={deleteTaskMutation.isPending}
                        title="Excluir tarefa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <Button
            onClick={() => navigate(`${createPageUrl("LeadDetail")}?id=${leadId}`)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <ExternalLink className="w-3 h-3 mr-2" />
            Abrir Lead Completo
          </Button>
        </div>
      </PopoverContent>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Pipeline de Vendas</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Gerencie seus leads através do funil de vendas
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={hasActiveFilters ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700' : ''}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
              {hasActiveFilters && (
                <Badge className="ml-2 bg-blue-600 text-white">
                  {[filters.search, filters.agent !== 'all', filters.territory !== 'all', filters.dateFrom, filters.dateTo].filter(Boolean).length}
                </Badge>
              )}
            </Button>
            <Button onClick={() => setIsFormOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Lead
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Buscar
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Nome, telefone, email..."
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                      className="pl-10 bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Agente
                  </label>
                  <Select value={filters.agent} onValueChange={(val) => setFilters({...filters, agent: val})}>
                    <SelectTrigger className="bg-white dark:bg-gray-800">
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
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Território
                  </label>
                  <Select value={filters.territory} onValueChange={(val) => setFilters({...filters, territory: val})}>
                    <SelectTrigger className="bg-white dark:bg-gray-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os territórios</SelectItem>
                      {territories.map(territory => (
                        <SelectItem key={territory.id} value={territory.id}>{territory.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Data Inicial
                  </label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                    className="bg-white dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Data Final
                  </label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                    className="bg-white dark:bg-gray-800"
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mt-4 flex justify-end">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-2" />
                    Limpar Filtros
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total de Leads</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{filteredLeads.length}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Valor Total</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalValue)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Ticket Médio</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(avgValue)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Taxa de Conversão</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {filteredLeads.length > 0
                      ? `${((getLeadsByStage('fechado_ganho').length / filteredLeads.length) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Toggle */}
        <div className="flex justify-end">
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className={viewMode === 'kanban' ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Kanban
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              <List className="w-4 h-4 mr-2" />
              Lista
            </Button>
          </div>
        </div>

        {/* Kanban View with Drag and Drop */}
        {viewMode === 'kanban' && (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {STAGES.map(stage => {
                const stageLeads = getLeadsByStage(stage.id);
                const stageValue = stageLeads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);

                return (
                  <Card key={stage.id} className={`${stage.bgColor} border-gray-200 dark:border-gray-800`}>
                    <CardHeader className="pb-3 border-b border-gray-200 dark:border-gray-700">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {stage.label}
                          </span>
                        </div>
                        <Badge variant="outline" className="bg-white dark:bg-gray-800">
                          {stageLeads.length}
                        </Badge>
                      </CardTitle>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {formatCurrency(stageValue)}
                      </p>
                    </CardHeader>

                    <Droppable droppableId={stage.id}>
                      {(provided, snapshot) => (
                        <CardContent
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-400px)] overflow-y-auto transition-colors ${
                            snapshot.isDraggingOver ? 'bg-blue-100 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          {stageLeads.map((lead, index) => {
                            const pendingTasksCount = getPendingTasksCount(lead.id);
                            const agentData = getAgentData(lead.agent_id);

                            return (
                              <Draggable key={lead.id} draggableId={lead.id} index={index}>
                                {(provided, snapshot) => (
                                  <Card
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`bg-white dark:bg-gray-900 border-l-4 transition-all ${
                                      snapshot.isDragging
                                        ? 'shadow-2xl rotate-2 scale-105'
                                        : 'hover:shadow-md'
                                    }`}
                                    style={{
                                      borderLeftColor: stage.color.replace('bg-', '#'),
                                      ...provided.draggableProps.style
                                    }}
                                  >
                                    <CardContent className="p-3">
                                      <div className="space-y-2">
                                        {/* Drag Handle + Title + Sino */}
                                        <div
                                          {...provided.dragHandleProps}
                                          className="flex items-start justify-between cursor-grab active:cursor-grabbing"
                                        >
                                          <div className="flex items-start gap-2 flex-1">
                                            <GripVertical className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                            <h4
                                              className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2 flex-1 cursor-pointer hover:text-blue-600"
                                              onClick={() => navigate(`${createPageUrl("LeadDetail")}?id=${lead.id}`)}
                                            >
                                              {lead.name || 'Sem nome'}
                                            </h4>
                                          </div>
                                          <div className="flex items-center gap-1 flex-shrink-0">
                                            {/* SINO COM POPOVER */}
                                            {pendingTasksCount > 0 && (
                                              <Popover>
                                                <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                  <button className="relative hover:scale-110 transition-transform">
                                                    <Bell className="w-4 h-4 text-orange-600 dark:text-orange-400 fill-orange-600 dark:fill-orange-400 animate-pulse" />
                                                    <Badge className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] px-1 py-0 rounded-full min-w-[14px] h-3.5 flex items-center justify-center">
                                                      {pendingTasksCount}
                                                    </Badge>
                                                  </button>
                                                </PopoverTrigger>
                                                <TasksPopover leadId={lead.id} leadName={lead.name} />
                                              </Popover>
                                            )}
                                            <ExternalLink
                                              className="w-3 h-3 text-gray-400 hover:text-blue-600 cursor-pointer"
                                              onClick={() => navigate(`${createPageUrl("LeadDetail")}?id=${lead.id}`)}
                                            />
                                          </div>
                                        </div>

                                        {lead.phone && (
                                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                            <Phone className="w-3 h-3" />
                                            <span className="truncate">{lead.phone}</span>
                                          </div>
                                        )}

                                        {lead.estimated_value && (
                                          <div className="flex items-center gap-2 text-xs font-semibold text-green-600 dark:text-green-400">
                                            <DollarSign className="w-3 h-3" />
                                            <span>{formatCurrency(lead.estimated_value)}</span>
                                          </div>
                                        )}

                                        {agentData && (
                                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                                            {agentData.photo_url ? (
                                              <img
                                                src={agentData.photo_url}
                                                alt={agentData.name}
                                                className="w-5 h-5 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                                              />
                                            ) : (
                                              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] font-bold">
                                                {agentData.name.charAt(0).toUpperCase()}
                                              </div>
                                            )}
                                            <span className="truncate font-medium">{agentData.name}</span>
                                          </div>
                                        )}

                                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                                          <Clock className="w-3 h-3" />
                                          <span>{formatDate(lead.created_date)}</span>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}

                          {stageLeads.length === 0 && (
                            <div className="text-center py-8 text-gray-400 dark:text-gray-600 text-sm">
                              Arraste leads para cá
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Droppable>
                  </Card>
                );
              })}
            </div>
          </DragDropContext>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <Card className="bg-white dark:bg-gray-900">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Nome</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Telefone</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Etapa</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Valor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Agente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Território</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Tarefas</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Criado em</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredLeads.map(lead => {
                      const stage = STAGES.find(s => s.id === lead.stage);
                      const pendingTasksCount = getPendingTasksCount(lead.id);
                      const agentData = getAgentData(lead.agent_id);

                      return (
                        <tr
                          key={lead.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                          onClick={() => navigate(`${createPageUrl("LeadDetail")}?id=${lead.id}`)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stage?.color.replace('bg-', '#') || '#6b7280' }}></div>
                              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                {lead.name || 'Sem nome'}
                              </span>
                              {pendingTasksCount > 0 && (
                                <div className="relative">
                                  <Bell className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 fill-orange-600 dark:fill-orange-400" />
                                  <Badge className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] px-1 py-0 rounded-full">
                                    {pendingTasksCount}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Phone className="w-3 h-3" />
                              {lead.phone || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`${stage?.color} text-white`}>
                              {stage?.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-sm text-green-600 dark:text-green-400">
                              {formatCurrency(lead.estimated_value)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {agentData ? (
                              <div className="flex items-center gap-2">
                                {agentData.photo_url ? (
                                  <img
                                    src={agentData.photo_url}
                                    alt={agentData.name}
                                    className="w-6 h-6 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                    {agentData.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {agentData.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-600 dark:text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {getTerritoryName(lead.territory_id)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {pendingTasksCount > 0 ? (
                              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                                {pendingTasksCount} pendente{pendingTasksCount > 1 ? 's' : ''}
                              </Badge>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-500 dark:text-gray-500">
                              {formatDate(lead.created_date)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Select
                                value={lead.stage}
                                onValueChange={(newStage) => handleStageChange(lead.id, newStage)}
                              >
                                <SelectTrigger className="h-8 text-xs w-32 bg-white dark:bg-gray-800">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STAGES.map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                      {s.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`${createPageUrl("LeadDetail")}?id=${lead.id}`);
                                }}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredLeads.length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Nenhum lead encontrado</p>
                    <p className="text-sm mt-1">
                      {hasActiveFilters
                        ? 'Tente ajustar os filtros ou limpar a busca'
                        : 'Comece criando seu primeiro lead'
                      }
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog Novo Lead */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Novo Lead</DialogTitle>
          </DialogHeader>
          <QuickLeadForm
            onSuccess={() => {
              setIsFormOpen(false);
              queryClient.invalidateQueries({ queryKey: ['leads'] });
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
