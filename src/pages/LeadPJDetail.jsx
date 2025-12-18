import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building2,
  FileText,
  MessageSquare,
  Save,
  TrendingUp,
  Plus,
  CheckCircle,
  Clock,
  Send,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  CheckCircle2,
  XCircle,
  DollarSign,
  ListTodo,
  Activity,
  Bell,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

import LeadPJTimeline from "@/components/sales/LeadPJTimeline";
import LeadPJPipelineHistory from "@/components/sales/LeadPJPipelineHistory";

const STAGES_PJ = [
  { value: "novo", label: "Novo", color: "bg-gray-500", badge: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100" },
  { value: "qualificacao", label: "Qualificação", color: "bg-purple-500", badge: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100" },
  { value: "apresentacao", label: "Apresentação", color: "bg-indigo-500", badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100" },
  { value: "proposta_enviada", label: "Proposta Enviada", color: "bg-yellow-500", badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100" },
  { value: "negociacao", label: "Negociação", color: "bg-orange-500", badge: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100" },
  { value: "fechado_ganho", label: "Fechado - Ganho", color: "bg-green-500", badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
  { value: "fechado_perdido", label: "Fechado - Perdido", color: "bg-red-500", badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" },
];

const INTEREST_OPTIONS = [
  "Plano Funeral Empresarial",
  "Plano de Saúde Corporativo",
  "Seguro Empresarial",
  "Telemedicina Corporativa",
  "Assistência 24h",
  "Múltiplos Planos",
  "Outro",
];

export default function LeadPJDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const leadId = urlParams.get('id');
  
  const [editedLead, setEditedLead] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newTask, setNewTask] = useState({ title: "", scheduled_for: "" });
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [proposalUrl, setProposalUrl] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: lead, isLoading } = useQuery({
    queryKey: ['leadPJ', leadId],
    queryFn: () => base44.entities.LeadPJ.filter({ id: leadId }).then(res => res[0]),
    enabled: !!leadId,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['salesAgents'],
    queryFn: () => base44.entities.SalesAgent.list(),
    initialData: [],
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activitiesPJ', leadId],
    queryFn: () => base44.entities.ActivityPJ.filter({ lead_pj_id: leadId }),
    enabled: !!leadId,
    initialData: [],
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['proposalTemplates'],
    queryFn: () => base44.entities.ProposalTemplate.list(),
    initialData: [],
  });

  const updateLeadMutation = useMutation({
    mutationFn: (data) => base44.entities.LeadPJ.update(leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadPJ', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leadsPJ'] });
      toast.success('Lead atualizado com sucesso!');
      setHasChanges(false);
    },
  });

  const createActivityMutation = useMutation({
    mutationFn: (data) => base44.entities.ActivityPJ.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activitiesPJ', leadId] });
      setNewNote("");
      setNewTask({ title: "", scheduled_for: "" });
      toast.success('Atividade criada!');
    },
  });

  const concludeSaleMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();
      return base44.entities.LeadPJ.update(leadId, {
        concluded: true,
        concluded_at: new Date().toISOString(),
        concluded_by: currentUser.email,
        stage: 'fechado_ganho',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadPJ', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leadsPJ'] });
      
      createActivityMutation.mutate({
        lead_pj_id: leadId,
        type: 'note',
        title: '✅ Venda Concluída',
        description: 'Lead PJ marcado como CONCLUÍDO - Venda B2B finalizada com sucesso!',
        assigned_to: lead.agent_id || 'Sistema',
      });
      
      toast.success('🎉 Venda B2B concluída com sucesso!');
      
      setTimeout(() => {
        navigate(createPageUrl("LeadsPJKanban"));
      }, 2000);
    },
  });

  const markAsLostMutation = useMutation({
    mutationFn: async ({ reason }) => {
      const currentUser = await base44.auth.me();
      return base44.entities.LeadPJ.update(leadId, {
        lost: true,
        lost_at: new Date().toISOString(),
        lost_by: currentUser.email,
        lost_reason: reason,
        stage: 'fechado_perdido',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadPJ', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leadsPJ'] });
      
      createActivityMutation.mutate({
        lead_pj_id: leadId,
        type: 'note',
        title: '❌ Lead PJ Perdido',
        description: `Lead marcado como PERDIDO\nMotivo: ${lostReason}`,
        assigned_to: lead.agent_id || 'Sistema',
      });
      
      toast.success('Lead marcado como perdido');
      setShowLostDialog(false);
      setLostReason("");
      
      setTimeout(() => {
        navigate(createPageUrl("LeadsPJKanban"));
      }, 2000);
    },
  });

  // HANDLER PARA MUDANÇA DE STAGE VIA CLIQUE NO HISTÓRICO
  const handleStageChange = async (newStage) => {
    const currentLeadData = queryClient.getQueryData(['leadPJ', leadId]);
    const stageHistory = currentLeadData.stage_history ? [...currentLeadData.stage_history] : [];
    
    stageHistory.push({
      from: currentLeadData.stage,
      to: newStage,
      changed_at: new Date().toISOString(),
      changed_by: user?.email || 'Sistema',
    });

    try {
      await updateLeadMutation.mutateAsync({
        stage: newStage,
        stage_history: stageHistory,
      });

      await createActivityMutation.mutateAsync({
        lead_pj_id: leadId,
        type: 'stage_change',
        title: `Etapa alterada`,
        description: `Lead movido de "${STAGES_PJ.find(s => s.value === currentLeadData.stage)?.label}" para "${STAGES_PJ.find(s => s.value === newStage)?.label}"`,
        assigned_to: currentLeadData.agent_id,
        metadata: {
          from: currentLeadData.stage,
          to: newStage,
        }
      });

      toast.success(`✅ Lead movido para "${STAGES_PJ.find(s => s.value === newStage)?.label}"!`);
    } catch (error) {
      toast.error('Erro ao alterar stage');
    }
  };

  const handleFieldChange = (field, value) => {
    let processedValue = value;
    if (typeof value === 'string' && (field === 'monthly_value' || field === 'estimated_value' || field === 'monthly_revenue')) {
      processedValue = value.trim() === '' ? null : parseFloat(value);
    } else if (typeof value === 'string' && field === 'num_employees') {
      processedValue = value.trim() === '' ? null : parseInt(value, 10);
    }

    setEditedLead({ ...editedLead, [field]: processedValue });
    setHasChanges(true);
  };

  const handleSaveChanges = () => {
    updateLeadMutation.mutate(editedLead);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    createActivityMutation.mutate({
      lead_pj_id: leadId,
      type: 'note',
      title: 'Nota adicionada',
      description: newNote,
      assigned_to: lead.agent_id,
    });
  };

  const handleAddTask = () => {
    if (!newTask.title.trim()) return;
    createActivityMutation.mutate({
      lead_pj_id: leadId,
      type: 'task',
      title: newTask.title,
      description: newTask.description || "",
      scheduled_for: newTask.scheduled_for,
      assigned_to: lead.agent_id,
      completed: false,
    });
  };

  const handleGenerateProposal = async (templateId) => {
    setGeneratingProposal(true);
    try {
      const response = await base44.functions.invoke('generateProposal', {
        lead_id: leadId,
        template_id: templateId,
      });

      if (response.data.success) {
        setProposalUrl(response.data.proposal_url);
        queryClient.invalidateQueries({ queryKey: ['leadPJ', leadId] });
        toast.success('Proposta gerada com sucesso!');
      } else {
        toast.error(response.data.error || 'Erro ao gerar proposta');
      }
    } catch (error) {
      toast.error('Erro ao gerar proposta');
    }
    setGeneratingProposal(false);
  };

  const handleSendWhatsApp = async () => {
    if (!proposalUrl && !lead.proposal_url) {
      toast.error('Gere a proposta primeiro!');
      return;
    }

    setSendingWhatsApp(true);
    try {
      const response = await base44.functions.invoke('sendProposalWhatsApp', {
        leadId: leadId,
        proposalUrl: proposalUrl || lead.proposal_url,
      });

      if (response.data.success) {
        toast.success('Proposta enviada via WhatsApp!');
        createActivityMutation.mutate({
          lead_pj_id: leadId,
          type: 'note',
          title: 'Proposta enviada via WhatsApp',
          description: `Proposta enviada para ${lead.phone}`,
          assigned_to: lead.agent_id,
        });
      } else {
        toast.error(response.data.error || 'Erro ao enviar WhatsApp');
      }
    } catch (error) {
      toast.error('Erro ao enviar WhatsApp');
    }
    setSendingWhatsApp(false);
  };

  const handleSendEmail = async () => {
    if (!proposalUrl && !lead.proposal_url) {
      toast.error('Gere a proposta primeiro!');
      return;
    }

    if (!lead.email) {
      toast.error('Lead não possui e-mail cadastrado!');
      return;
    }

    setSendingEmail(true);
    try {
      const response = await base44.functions.invoke('sendProposalEmail', {
        lead_id: leadId,
        proposal_url: proposalUrl || lead.proposal_url,
      });

      if (response.data.success) {
        toast.success('Proposta enviada via e-mail!');
        createActivityMutation.mutate({
          lead_pj_id: leadId,
          type: 'note',
          title: 'Proposta enviada via E-mail',
          description: `Proposta enviada para ${lead.email}`,
          assigned_to: lead.agent_id,
        });
      } else {
        toast.error(response.data.error || 'Erro ao enviar e-mail');
      }
    } catch (error) {
      toast.error('Erro ao enviar e-mail');
    }
    setSendingEmail(false);
  };

  const formatCNPJ = (cnpj) => {
    if (!cnpj) return '-';
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  if (isLoading || !lead) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (user && user.role !== 'admin') {
    const userAgent = agents.find(a => a.user_email === user.email);
    const isOwnLead = userAgent && lead.agent_id === userAgent.id;
    
    if (!isOwnLead) {
      const leadAgent = agents.find(a => a.id === lead.agent_id);
      
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
          <Card className="max-w-md bg-white dark:bg-gray-900">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-950 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Acesso Restrito</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Este lead está sendo trabalhado por outro agente.
              </p>
              <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg mb-6">
                <p className="text-sm text-orange-900 dark:text-orange-300">
                  <strong>Agente responsável:</strong>
                  <br />
                  {leadAgent?.name || 'Não atribuído'}
                </p>
              </div>
              <Button onClick={() => navigate(createPageUrl("LeadsPJKanban"))}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Pipeline B2B
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  if (lead.concluded || lead.lost) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
        <Card className="max-w-md bg-white dark:bg-gray-900">
          <CardContent className="p-8 text-center">
            {lead.concluded ? (
              <>
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600 dark:text-green-400" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Venda B2B Concluída! 🎉</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Este lead foi concluído em {format(new Date(lead.concluded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                  Por: {lead.concluded_by}
                </p>
              </>
            ) : (
              <>
                <XCircle className="w-16 h-16 mx-auto mb-4 text-red-600 dark:text-red-400" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Lead Perdido</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Este lead foi marcado como perdido em {format(new Date(lead.lost_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                {lead.lost_reason && (
                  <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg mb-4">
                    <p className="text-sm font-semibold text-red-900 dark:text-red-300">Motivo:</p>
                    <p className="text-sm text-red-700 dark:text-red-400">{lead.lost_reason}</p>
                  </div>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                  Por: {lead.lost_by}
                </p>
              </>
            )}
            <Button onClick={() => navigate(createPageUrl("LeadsPJKanban"))}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Pipeline B2B
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStage = STAGES_PJ.find(s => s.value === (editedLead.stage !== undefined ? editedLead.stage : lead.stage));
  const pendingTasks = activities.filter(a => a.type === 'task' && !a.completed);
  const hasPendingTasks = pendingTasks.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl("LeadsPJKanban"))}
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {lead.nome_fantasia || lead.razao_social || "Empresa sem nome"}
                </h1>
                {hasPendingTasks && (
                  <div className="relative animate-pulse">
                    <Bell className="w-6 h-6 text-orange-600 dark:text-orange-400 fill-orange-600 dark:fill-orange-400" />
                    <Badge className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] h-5 flex items-center justify-center">
                      {pendingTasks.length}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-gray-500 dark:text-gray-400">CNPJ: {formatCNPJ(lead.cnpj)}</p>
                <Badge className={`${currentStage?.badge} text-sm font-semibold`}>
                  {currentStage?.label}
                </Badge>
                {hasPendingTasks && (
                  <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 text-xs animate-pulse">
                    <ListTodo className="w-3 h-3 mr-1" />
                    {pendingTasks.length} {pendingTasks.length === 1 ? 'tarefa pendente' : 'tarefas pendentes'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {(lead.stage === 'fechado_ganho' || lead.stage === 'negociacao') && !lead.concluded && (
              <Button
                onClick={() => {
                  if (confirm('🎉 Confirma a conclusão desta venda B2B?\n\nEste lead sairá do pipeline de vendas.')) {
                    concludeSaleMutation.mutate();
                  }
                }}
                disabled={concludeSaleMutation.isPending}
                className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white"
                size="lg"
              >
                {concludeSaleMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Concluindo...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    ✅ CONCLUIR VENDA
                  </>
                )}
              </Button>
            )}
            
            {!lead.lost && (
              <Button
                onClick={() => setShowLostDialog(true)}
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-50 dark:border-red-500 dark:text-red-500 dark:hover:bg-red-950"
                size="lg"
              >
                <XCircle className="w-5 h-5 mr-2" />
                ❌ MARCAR COMO PERDIDO
              </Button>
            )}
          </div>
        </div>

        {/* Save Changes Button */}
        {hasChanges && (
          <div className="mb-4">
            <Button
              onClick={handleSaveChanges}
              disabled={updateLeadMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>
        )}

        {/* Alerta de Tarefas Pendentes */}
        {hasPendingTasks && (
          <div className="mb-4">
            <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5 animate-pulse" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-300 mb-1">
                    {pendingTasks.length} {pendingTasks.length === 1 ? 'Tarefa Pendente' : 'Tarefas Pendentes'}
                  </h3>
                  <p className="text-sm text-orange-700 dark:text-orange-400">
                    Este lead possui tarefas aguardando sua atenção. Acesse a aba "Tarefas" para visualizar.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HISTÓRICO DO PIPELINE - HORIZONTAL INTERATIVO */}
        <Card className="mb-6 border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950">
          <CardHeader className="border-b border-indigo-200 dark:border-indigo-800">
            <CardTitle className="flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
              <TrendingUp className="w-5 h-5" />
              Histórico do Pipeline B2B - Clique para Mover
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <LeadPJPipelineHistory lead={lead} onStageChange={handleStageChange} />
          </CardContent>
        </Card>

        {/* Layout em Grid: Esquerda (Tabs) | Direita (Info) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUNA ESQUERDA: TABS (2/3) */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="activities" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-1">
                <TabsTrigger value="activities" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  <Activity className="w-4 h-4 mr-2" />
                  Atividades
                </TabsTrigger>
                <TabsTrigger value="tasks" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white relative">
                  <ListTodo className="w-4 h-4 mr-2" />
                  Tarefas
                  {hasPendingTasks && (
                    <Badge className="ml-2 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse">
                      {pendingTasks.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="proposal" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white">
                  <FileText className="w-4 h-4 mr-2" />
                  Proposta
                </TabsTrigger>
              </TabsList>

              <TabsContent value="activities" className="mt-6">
                <Card className="bg-white dark:bg-gray-900">
                  <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <MessageSquare className="w-5 h-5" />
                      Adicionar Nota Rápida
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <Textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Escreva uma nota sobre esta empresa..."
                      rows={3}
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                    <Button
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || createActivityMutation.isPending}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Nota
                    </Button>

                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Timeline de Atividades</h3>
                      <div className="max-h-[500px] overflow-y-auto">
                        <LeadPJTimeline activities={activities} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tasks" className="mt-6">
                <Card className="bg-white dark:bg-gray-900">
                  <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <ListTodo className="w-5 h-5" />
                      Nova Tarefa de Follow-up
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <Label className="text-gray-900 dark:text-gray-100">Título da Tarefa</Label>
                      <Input
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        placeholder="Ex: Agendar reunião com o diretor..."
                        className="mt-1 bg-gray-50 dark:bg-gray-800"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-900 dark:text-gray-100">Data e Hora</Label>
                      <Input
                        type="datetime-local"
                        value={newTask.scheduled_for}
                        onChange={(e) => setNewTask({ ...newTask, scheduled_for: e.target.value })}
                        className="mt-1 bg-gray-50 dark:bg-gray-800"
                      />
                    </div>
                    <Button
                      onClick={handleAddTask}
                      disabled={!newTask.title.trim() || createActivityMutation.isPending}
                      className="w-full bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Tarefa
                    </Button>

                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Tarefas Pendentes</h3>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {pendingTasks.map((task) => (
                          <div key={task.id} className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">{task.title}</p>
                                {task.scheduled_for && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    <Clock className="w-3 h-3 inline mr-1" />
                                    {format(new Date(task.scheduled_for), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </p>
                                )}
                              </div>
                              <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                          </div>
                        ))}
                        {pendingTasks.length === 0 && (
                          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                            Nenhuma tarefa pendente
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="proposal" className="mt-6">
                <Card className="bg-white dark:bg-gray-900">
                  <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <FileText className="w-5 h-5" />
                      Proposta Comercial B2B
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {!lead.proposal_url && !proposalUrl ? (
                      <>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Selecione um template para gerar a proposta:</p>
                        <div className="grid gap-2">
                          {templates.map(template => (
                            <Button
                              key={template.id}
                              variant="outline"
                              onClick={() => handleGenerateProposal(template.id)}
                              disabled={generatingProposal}
                              className="justify-start"
                            >
                              {generatingProposal ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <FileText className="w-4 h-4 mr-2" />
                              )}
                              {template.name}
                            </Button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-sm font-medium text-green-900 dark:text-green-300">✅ Proposta gerada com sucesso!</p>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => window.open(proposalUrl || lead.proposal_url, '_blank')}
                            className="p-0 h-auto text-green-700 dark:text-green-400"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Visualizar proposta
                          </Button>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={handleSendWhatsApp}
                            disabled={sendingWhatsApp}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            {sendingWhatsApp ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4 mr-2" />
                            )}
                            Enviar WhatsApp
                          </Button>
                          <Button
                            onClick={handleSendEmail}
                            disabled={sendingEmail || !lead.email}
                            variant="outline"
                            className="flex-1"
                          >
                            {sendingEmail ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Mail className="w-4 h-4 mr-2" />
                            )}
                            Enviar E-mail
                          </Button>
                        </div>

                        {lead.proposal_status && (
                          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 text-sm">
                              {lead.proposal_status === 'accepted' && (
                                <>
                                  <ThumbsUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  <span className="text-green-600 dark:text-green-400 font-medium">Proposta aceita!</span>
                                </>
                              )}
                              {lead.proposal_status === 'rejected' && (
                                <>
                                  <ThumbsDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                                  <span className="text-red-600 dark:text-red-400 font-medium">Proposta recusada</span>
                                </>
                              )}
                              {lead.proposal_status === 'viewed' && (
                                <>
                                  <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                  <span className="text-blue-600 dark:text-blue-400">Proposta visualizada</span>
                                </>
                              )}
                              {lead.proposal_status === 'pending' && (
                                <>
                                  <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                  <span className="text-gray-600 dark:text-gray-400">Aguardando visualização</span>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* COLUNA DIREITA: Agente + Info + Valores (1/3) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Agente Responsável */}
            {agents.find(a => a.id === lead.agent_id) && (
              <Card className="border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900">
                <CardHeader className="border-b border-indigo-200 dark:border-indigo-700">
                  <CardTitle className="flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
                    <Building2 className="w-5 h-5" />
                    Agente Responsável
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {(() => {
                    const agent = agents.find(a => a.id === lead.agent_id);
                    return agent ? (
                      <div className="flex items-center gap-4">
                        {agent.photo_url ? (
                          <img 
                            src={agent.photo_url} 
                            alt={agent.name}
                            className="w-16 h-16 rounded-full object-cover border-4 border-white dark:border-indigo-800 shadow-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-indigo-600 dark:bg-indigo-700 flex items-center justify-center border-4 border-white dark:border-indigo-800 shadow-lg">
                            <span className="text-2xl font-bold text-white">
                              {agent.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-bold text-lg text-indigo-900 dark:text-indigo-100">{agent.name}</p>
                          <div className="space-y-1 mt-2">
                            <p className="text-sm text-indigo-800 dark:text-indigo-200 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {agent.phone}
                            </p>
                            {agent.email && (
                              <p className="text-sm text-indigo-800 dark:text-indigo-200 flex items-center gap-1 truncate">
                                <Mail className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{agent.email}</span>
                              </p>
                            )}
                            {agent.team && (
                              <Badge className="mt-2 bg-white dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-600">
                                {agent.team}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Informações da Empresa */}
            <Card className="bg-white dark:bg-gray-900">
              <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Building2 className="w-5 h-5" />
                  Informações da Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div>
                  <Label className="text-gray-900 dark:text-gray-100">Razão Social</Label>
                  <Input
                    value={editedLead.razao_social !== undefined ? editedLead.razao_social : (lead.razao_social || "")}
                    onChange={(e) => handleFieldChange('razao_social', e.target.value)}
                    className="mt-1 bg-gray-50 dark:bg-gray-800"
                  />
                </div>

                <div>
                  <Label className="text-gray-900 dark:text-gray-100">Nome Fantasia</Label>
                  <Input
                    value={editedLead.nome_fantasia !== undefined ? editedLead.nome_fantasia : (lead.nome_fantasia || "")}
                    onChange={(e) => handleFieldChange('nome_fantasia', e.target.value)}
                    className="mt-1 bg-gray-50 dark:bg-gray-800"
                  />
                </div>

                <div>
                  <Label className="text-gray-900 dark:text-gray-100">Telefone Principal</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={editedLead.phone !== undefined ? editedLead.phone : (lead.phone || "")}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      className="flex-1 bg-gray-50 dark:bg-gray-800"
                    />
                    {lead.phone && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(`https://wa.me/55${lead.phone.replace(/\D/g, '')}`, '_blank')}
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-gray-900 dark:text-gray-100">E-mail</Label>
                  <Input
                    value={editedLead.email !== undefined ? editedLead.email : (lead.email || "")}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    className="mt-1 bg-gray-50 dark:bg-gray-800"
                  />
                </div>

                <div>
                  <Label className="text-gray-900 dark:text-gray-100">Interesse</Label>
                  <Select 
                    value={editedLead.interest !== undefined ? editedLead.interest : (lead.interest || "")} 
                    onValueChange={(val) => handleFieldChange('interest', val)}
                  >
                    <SelectTrigger className="mt-1 bg-gray-50 dark:bg-gray-800">
                      <SelectValue placeholder="Selecione o interesse" />
                    </SelectTrigger>
                    <SelectContent>
                      {INTEREST_OPTIONS.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {lead.contact_name && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Label className="text-gray-900 dark:text-gray-100">Contato</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {lead.contact_name} {lead.contact_role && `- ${lead.contact_role}`}
                    </p>
                  </div>
                )}

                {lead.city && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Label className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold">
                      <MapPin className="w-4 h-4" />
                      Localização
                    </Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {lead.city}/{lead.state}
                    </p>
                    {lead.address && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{lead.address}</p>
                    )}
                  </div>
                )}

                {lead.num_employees && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Label className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <Users className="w-4 h-4" />
                      Funcionários
                    </Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {lead.num_employees} colaboradores
                    </p>
                  </div>
                )}

                {lead.notes && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Label className="text-gray-900 dark:text-gray-100">Observações</Label>
                    <Textarea
                      value={editedLead.notes !== undefined ? editedLead.notes : lead.notes}
                      onChange={(e) => handleFieldChange('notes', e.target.value)}
                      rows={3}
                      className="mt-1 bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Valores Financeiros - Destaque Verde */}
            <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
              <CardHeader className="border-b border-green-200 dark:border-green-700">
                <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                  <DollarSign className="w-5 h-5" />
                  💰 Valores Financeiros
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <Label className="text-sm text-green-800 dark:text-green-300">Valor Mensal Proposto</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editedLead.monthly_value !== undefined && editedLead.monthly_value !== null ? editedLead.monthly_value : (lead.monthly_value || "")}
                    onChange={(e) => handleFieldChange('monthly_value', e.target.value)}
                    placeholder="0.00"
                    className="mt-1 bg-white dark:bg-gray-800 border-green-300 dark:border-green-700"
                  />
                </div>

                {lead.monthly_revenue && (
                  <div>
                    <Label className="text-sm text-green-800 dark:text-green-300">Faturamento Mensal</Label>
                    <p className="text-lg font-bold text-green-700 dark:text-green-300 mt-1">
                      {formatCurrency(lead.monthly_revenue)}
                    </p>
                  </div>
                )}

                {((editedLead.monthly_value !== undefined && editedLead.monthly_value !== null && editedLead.monthly_value !== "") || 
                  (lead.estimated_value !== undefined && lead.estimated_value !== null)) && (
                  <div className="pt-3 border-t border-green-300 dark:border-green-700">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center shadow-sm">
                      <p className="text-xs text-green-700 dark:text-green-400 mb-1">💎 Valor Estimado do Negócio</p>
                      <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                        {formatCurrency(
                          editedLead.monthly_value !== undefined && editedLead.monthly_value !== null && editedLead.monthly_value !== ""
                            ? editedLead.monthly_value
                            : lead.estimated_value
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialog Marcar como Perdido */}
      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogContent className="bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">Marcar Lead PJ como Perdido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Este lead sairá do pipeline de vendas B2B. Por favor, informe o motivo da perda:
            </p>
            <Textarea
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="Ex: Cliente optou por concorrente, preço acima do orçamento, não houve interesse..."
              rows={4}
              className="bg-gray-50 dark:bg-gray-800"
            />
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowLostDialog(false);
                  setLostReason("");
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => markAsLostMutation.mutate({ reason: lostReason })}
                disabled={!lostReason.trim() || markAsLostMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
              >
                {markAsLostMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Marcando...
                  </>
                ) : (
                  'Confirmar Perda'
                )}
              </Button>
            </div>
          </CardContent>
        </DialogContent>
      </Dialog>
    </div>
  );
}