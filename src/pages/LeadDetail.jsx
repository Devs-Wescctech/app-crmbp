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
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
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
  Edit,
  Loader2,
  Image as ImageIcon,
  Download,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  DollarSign,
  ListTodo,
  Activity,
  FileSignature,
  Bell,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

import LeadTimeline from "@/components/sales/LeadTimeline";
import LeadPipelineHistory from "@/components/sales/LeadPipelineHistory";
import AISummaryButton from "@/components/ai/AISummaryButton";

const STAGES = [
  { value: "novo", label: "Novo", color: "bg-gray-500", badge: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100" },
  { value: "abordado", label: "Abordado", color: "bg-blue-500", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" },
  { value: "qualificado", label: "Qualificado", color: "bg-purple-500", badge: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100" },
  { value: "proposta_enviada", label: "Proposta Enviada", color: "bg-yellow-500", badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100" },
  { value: "fechado_ganho", label: "Fechado - Ganho", color: "bg-green-500", badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
  { value: "fechado_perdido", label: "Fechado - Perdido", color: "bg-red-500", badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" },
];

const INTEREST_OPTIONS = [
  "Plano Funeral Básico",
  "Plano Funeral Premium",
  "Plano Familiar",
  "Bom Med - Telemedicina",
  "Bom Auto",
  "Bom Pet",
  "Múltiplos Planos",
  "Outro",
];

const SOURCE_OPTIONS = [
  "Porta a Porta",
  "Indicação",
  "Facebook Ads",
  "Google Ads",
  "Instagram",
  "WhatsApp",
  "Evento",
  "Telemarketing",
  "Site",
  "Panfletagem",
  "Outro",
];

export default function LeadDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const leadId = urlParams.get('id');
  
  const [editedLead, setEditedLead] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newTask, setNewTask] = useState({ title: "", scheduled_for: "" });
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingAutentique, setSendingAutentique] = useState(false);
  const [checkingAutentique, setCheckingAutentique] = useState(false);
  const [proposalUrl, setProposalUrl] = useState("");
  const [uploadingContract, setUploadingContract] = useState(false);
  const [sendingContractAutentique, setSendingContractAutentique] = useState(false);
  const [sendingContractLink, setSendingContractLink] = useState(false);
  const [sendingAcceptLink, setSendingAcceptLink] = useState(false);
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [lostReason, setLostReason] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => base44.entities.Lead.filter({ id: leadId }).then(res => res[0]),
    enabled: !!leadId,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['salesAgents'],
    queryFn: () => base44.entities.SalesAgent.list(),
    initialData: [],
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', leadId],
    queryFn: () => base44.entities.Activity.filter({ lead_id: leadId }),
    enabled: !!leadId,
    initialData: [],
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['proposalTemplates'],
    queryFn: () => base44.entities.ProposalTemplate.list(),
    initialData: [],
  });

  // 🆕 Contar tarefas pendentes
  const pendingTasks = activities.filter(a => a.type === 'task' && !a.completed);
  const hasPendingTasks = pendingTasks.length > 0;

  const updateLeadMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.update(leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead atualizado com sucesso!');
      setHasChanges(false);
    },
  });

  const createActivityMutation = useMutation({
    mutationFn: (data) => base44.entities.Activity.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', leadId] });
      setNewNote("");
      setNewTask({ title: "", scheduled_for: "" });
      toast.success('Atividade criada!');
    },
  });

  const concludeSaleMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();
      return base44.entities.Lead.update(leadId, {
        concluded: true,
        concluded_at: new Date().toISOString(),
        concluded_by: currentUser.email,
        stage: 'fechado_ganho',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      
      createActivityMutation.mutate({
        lead_id: leadId,
        type: 'note',
        title: '✅ Venda Concluída',
        description: 'Lead marcado como CONCLUÍDO - Venda finalizada com sucesso!',
        assigned_to: lead.agent_id || 'Sistema',
      });
      
      toast.success('🎉 Venda concluída com sucesso!');
      
      setTimeout(() => {
        navigate(createPageUrl("LeadsKanban"));
      }, 2000);
    },
  });

  const markAsLostMutation = useMutation({
    mutationFn: async ({ reason }) => {
      const currentUser = await base44.auth.me();
      return base44.entities.Lead.update(leadId, {
        lost: true,
        lost_at: new Date().toISOString(),
        lost_by: currentUser.email,
        lost_reason: reason,
        stage: 'fechado_perdido',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      
      createActivityMutation.mutate({
        lead_id: leadId,
        type: 'note',
        title: '❌ Lead Perdido',
        description: `Lead marcado como PERDIDO\nMotivo: ${lostReason}`,
        assigned_to: lead.agent_id || 'Sistema',
      });
      
      toast.success('Lead marcado como perdido');
      setShowLostDialog(false);
      setLostReason("");
      
      setTimeout(() => {
        navigate(createPageUrl("LeadsKanban"));
      }, 2000);
    },
  });

  // HANDLER PARA MUDANÇA DE STAGE VIA CLIQUE NO HISTÓRICO
  const handleStageChange = async (newStage) => {
    const currentLeadData = queryClient.getQueryData(['lead', leadId]); // Get latest lead data
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

      // Criar atividade de mudança de stage
      await createActivityMutation.mutateAsync({
        lead_id: leadId,
        type: 'stage_change',
        title: `Etapa alterada`,
        description: `Lead movido de "${STAGES.find(s => s.value === currentLeadData.stage)?.label}" para "${STAGES.find(s => s.value === newStage)?.label}"`,
        assigned_to: currentLeadData.agent_id,
        metadata: {
          from: currentLeadData.stage,
          to: newStage,
        }
      });

      toast.success(`✅ Lead movido para "${STAGES.find(s => s.value === newStage)?.label}"!`);
    } catch (error) {
      toast.error('Erro ao alterar stage');
    }
  };

  const handleFieldChange = (field, value) => {
    let processedValue = value;
    if (typeof value === 'string' && (field === 'monthly_value' || field === 'adhesion_value')) {
      processedValue = value.trim() === '' ? null : parseFloat(value);
    } else if (typeof value === 'string' && field === 'total_dependents') {
      processedValue = value.trim() === '' ? null : parseInt(value, 10);
    }

    setEditedLead({ ...editedLead, [field]: processedValue });
    setHasChanges(true);
  };

  const handleSaveChanges = () => {
    const dataToSave = { ...editedLead };
    
    const monthlyValue = editedLead.monthly_value !== undefined && editedLead.monthly_value !== null && editedLead.monthly_value !== ""
      ? parseFloat(editedLead.monthly_value)
      : (lead.monthly_value ? parseFloat(lead.monthly_value) : 0);
    
    const adhesionValue = editedLead.adhesion_value !== undefined && editedLead.adhesion_value !== null && editedLead.adhesion_value !== ""
      ? parseFloat(editedLead.adhesion_value)
      : (lead.adhesion_value ? parseFloat(lead.adhesion_value) : 0);
    
    if (monthlyValue > 0 || adhesionValue > 0 || editedLead.monthly_value !== undefined || editedLead.adhesion_value !== undefined) {
      dataToSave.estimated_value = monthlyValue + adhesionValue;
    }
    
    updateLeadMutation.mutate(dataToSave);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    createActivityMutation.mutate({
      lead_id: leadId,
      type: 'note',
      title: 'Nota adicionada',
      description: newNote,
      assigned_to: lead.agent_id,
    });
  };

  const handleAddTask = () => {
    if (!newTask.title.trim()) return;
    createActivityMutation.mutate({
      lead_id: leadId,
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
        queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
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
          lead_id: leadId,
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
          lead_id: leadId,
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

  const handleContractUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingContract(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      
      await base44.entities.Lead.update(leadId, {
        contract_url: result.file_url,
        contract_uploaded_at: new Date().toISOString(),
      });

      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      toast.success('Contrato anexado com sucesso!');
    } catch (error) {
      toast.error('Erro ao fazer upload do contrato');
    }
    setUploadingContract(false);
  };

  const handleSendContractAutentique = async (method) => {
    if (!lead.contract_url) {
      toast.error('Anexe o contrato primeiro!');
      return;
    }

    if (method === 'email') {
      setSendingContractAutentique(true);
    } else {
      setSendingContractLink(true);
    }

    try {
      const response = await base44.functions.invoke('autentiqueCreateDocument', {
        lead_id: leadId,
        contract_url: lead.contract_url,
        send_method: method,
      });

      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
        if (method === 'email') {
          toast.success('Contrato enviado para assinatura via e-mail!');
        } else {
          toast.success('Link de assinatura gerado!');
        }
      } else {
        toast.error(response.data.error || 'Erro ao enviar para Autentique');
      }
    } catch (error) {
      toast.error('Erro ao processar documento');
    }

    setSendingContractAutentique(false);
    setSendingContractLink(false);
  };

  const handleCheckAutentiqueStatus = async () => {
    if (!lead.signature_autentique_id) {
      toast.error('Nenhum documento em assinatura!');
      return;
    }

    setCheckingAutentique(true);
    try {
      const response = await base44.functions.invoke('autentiqueCheckStatus', {
        lead_id: leadId,
      });

      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
        if (response.data.status === 'signed') {
          toast.success('✅ Contrato assinado!');
        } else {
          toast.info('Aguardando assinatura...');
        }
      } else {
        toast.error('Erro ao verificar status');
      }
    } catch (error) {
      toast.error('Erro ao verificar status');
    }
    setCheckingAutentique(false);
  };

  if (isLoading || !lead) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
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
                {lead.phone && (
                  <p className="text-sm text-orange-900 dark:text-orange-300 mt-2">
                    <strong>Telefone:</strong> {lead.phone}
                  </p>
                )}
              </div>
              <Button onClick={() => navigate(createPageUrl("LeadsKanban"))}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Pipeline
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
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Venda Concluída! 🎉</h2>
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
            <Button onClick={() => navigate(createPageUrl("LeadsKanban"))}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Pipeline
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStage = STAGES.find(s => s.value === (editedLead.stage !== undefined ? editedLead.stage : lead.stage));

  const getLeadTemperature = () => {
    const lastContactDate = (editedLead.last_contact_date !== undefined ? editedLead.last_contact_date : lead.last_contact_date);
    const referenceDate = lastContactDate 
      ? new Date(lastContactDate) 
      : new Date(lead.created_date);
    const daysSinceContact = Math.floor((new Date() - referenceDate) / (1000 * 60 * 60 * 24));
    
    if (daysSinceContact <= 2) return { label: '🔥 Quente', color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-950', days: daysSinceContact };
    if (daysSinceContact <= 5) return { label: '🟡 Morno', color: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-950', days: daysSinceContact };
    return { label: '❄️ Frio', color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950', days: daysSinceContact };
  };

  const temperature = getLeadTemperature();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl("LeadsKanban"))}
              className="hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {lead.name || "Lead sem nome"}
                </h1>
                {/* 🆕 SINO DE TAREFAS PENDENTES */}
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
                <p className="text-gray-500 dark:text-gray-400">ID: {lead.id.slice(0, 8)}</p>
                <AISummaryButton entityType="lead" entityId={lead.id} />
                <Badge className={`${currentStage?.badge} text-sm font-semibold`}>
                  {currentStage?.label}
                </Badge>
                <Badge className={`${temperature.color} text-xs`}>
                  {temperature.label} ({temperature.days}d)
                </Badge>
                {/* 🆕 BADGE DE TAREFAS PENDENTES */}
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
            {(lead.stage === 'fechado_ganho' || lead.stage === 'proposta_enviada') && !lead.concluded && (
              <Button
                onClick={() => {
                  if (confirm('🎉 Confirma a conclusão desta venda?\n\nEste lead sairá do pipeline de vendas.')) {
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

        {/* 🆕 ALERTA DE TAREFAS PENDENTES */}
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

        {/* HISTÓRICO DO PIPELINE - HORIZONTAL INTERATIVO */}
        <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
          <CardHeader className="border-b border-blue-200 dark:border-blue-800">
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <TrendingUp className="w-5 h-5" />
              Histórico do Pipeline - Clique para Mover
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <LeadPipelineHistory lead={lead} onStageChange={handleStageChange} />
          </CardContent>
        </Card>

        {/* Layout em Grid: Esquerda (Tabs) | Direita (Info) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUNA ESQUERDA: TABS (2/3) */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="activities" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-1">
                <TabsTrigger value="activities" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
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
                <TabsTrigger value="contract" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
                  <FileSignature className="w-4 h-4 mr-2" />
                  Contrato
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
                      placeholder="Escreva uma nota sobre este lead..."
                      rows={3}
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                    <Button
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || createActivityMutation.isPending}
                      className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Nota
                    </Button>

                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Timeline de Atividades</h3>
                      <div className="max-h-[500px] overflow-y-auto">
                        <LeadTimeline activities={activities} />
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
                        placeholder="Ex: Ligar para o cliente..."
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
                      Proposta Comercial
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

              <TabsContent value="contract" className="mt-6">
                <Card className="bg-white dark:bg-gray-900">
                  <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <FileSignature className="w-5 h-5" />
                      Contrato e Assinatura Digital
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {!lead.contract_url ? (
                      <div>
                        <Label className="text-gray-900 dark:text-gray-100">Anexar Contrato (PDF)</Label>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleContractUpload}
                          disabled={uploadingContract}
                          className="mt-1 block w-full"
                        />
                        {uploadingContract && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Fazendo upload...</p>}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-300">📄 Contrato anexado</p>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => window.open(lead.contract_url, '_blank')}
                            className="p-0 h-auto text-blue-700 dark:text-blue-400"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Baixar contrato
                          </Button>
                        </div>

                        {!lead.signature_autentique_id ? (
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Enviar para assinatura via Autentique:</p>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleSendContractAutentique('email')}
                                disabled={sendingContractAutentique || !lead.email}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                              >
                                {sendingContractAutentique ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Mail className="w-4 h-4 mr-2" />
                                )}
                                Enviar E-mail
                              </Button>
                              <Button
                                onClick={() => handleSendContractAutentique('link')}
                                disabled={sendingContractLink}
                                variant="outline"
                                className="flex-1"
                              >
                                {sendingContractLink ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                )}
                                Gerar Link
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {lead.signature_status === 'pending' ? (
                              <>
                                <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-300">⏳ Aguardando assinatura</p>
                                  {lead.signature_link && (
                                    <Button
                                      variant="link"
                                      size="sm"
                                      onClick={() => window.open(lead.signature_link, '_blank')}
                                      className="p-0 h-auto text-yellow-700 dark:text-yellow-400"
                                    >
                                      <ExternalLink className="w-4 h-4 mr-1" />
                                      Abrir link de assinatura
                                    </Button>
                                  )}
                                </div>
                                <Button
                                  onClick={handleCheckAutentiqueStatus}
                                  disabled={checkingAutentique}
                                  variant="outline"
                                  className="w-full"
                                >
                                  {checkingAutentique ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                  )}
                                  Verificar Status
                                </Button>
                              </>
                            ) : (
                              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                                <p className="text-sm font-medium text-green-900 dark:text-green-300">✅ Contrato assinado!</p>
                                {lead.signed_at && (
                                  <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                                    Assinado em {format(new Date(lead.signed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </p>
                                )}
                              </div>
                            )}
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
              <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                <CardHeader className="border-b border-blue-200 dark:border-blue-700">
                  <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                    <User className="w-5 h-5" />
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
                            className="w-16 h-16 rounded-full object-cover border-4 border-white dark:border-blue-800 shadow-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-blue-600 dark:bg-blue-700 flex items-center justify-center border-4 border-white dark:border-blue-800 shadow-lg">
                            <span className="text-2xl font-bold text-white">
                              {agent.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-bold text-lg text-blue-900 dark:text-blue-100">{agent.name}</p>
                          <div className="space-y-1 mt-2">
                            <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {agent.phone}
                            </p>
                            {agent.email && (
                              <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-1 truncate">
                                <Mail className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{agent.email}</span>
                              </p>
                            )}
                            {agent.team && (
                              <Badge className="mt-2 bg-white dark:bg-blue-800 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-600">
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

            {/* Informações do Lead */}
            <Card className="bg-white dark:bg-gray-900">
              <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <User className="w-5 h-5" />
                  Informações do Lead
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div>
                  <Label className="text-gray-900 dark:text-gray-100">Nome</Label>
                  <Input
                    value={editedLead.name !== undefined ? editedLead.name : (lead.name || "")}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="mt-1 bg-gray-50 dark:bg-gray-800"
                  />
                </div>

                <div>
                  <Label className="text-gray-900 dark:text-gray-100">Telefone</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={lead.phone || ""}
                      readOnly
                      className="flex-1 bg-gray-100 dark:bg-gray-800"
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

                <div>
                  <Label className="text-gray-900 dark:text-gray-100">Fonte do Lead</Label>
                  <Select 
                    value={editedLead.source !== undefined ? editedLead.source : (lead.source || "")} 
                    onValueChange={(val) => handleFieldChange('source', val)}
                  >
                    <SelectTrigger className="mt-1 bg-gray-50 dark:bg-gray-800">
                      <SelectValue placeholder="Selecione a fonte" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-900 dark:text-gray-100">Última Data de Contato</Label>
                  <Input
                    type="datetime-local"
                    value={editedLead.last_contact_date !== undefined 
                      ? (editedLead.last_contact_date ? new Date(editedLead.last_contact_date).toISOString().slice(0, 16) : "")
                      : (lead.last_contact_date ? new Date(lead.last_contact_date).toISOString().slice(0, 16) : "")}
                    onChange={(e) => {
                      const value = e.target.value ? new Date(e.target.value).toISOString() : null;
                      handleFieldChange('last_contact_date', value);
                    }}
                    className="mt-1 bg-gray-50 dark:bg-gray-800"
                  />
                </div>

                {lead.address && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Label className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold">
                      <MapPin className="w-4 h-4" />
                      Endereço
                    </Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{lead.address}</p>
                    {lead.latitude && lead.longitude && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => window.open(`https://www.google.com/maps?q=${lead.latitude},${lead.longitude}`, '_blank')}
                        className="p-0 h-auto mt-1"
                      >
                        Ver no mapa
                      </Button>
                    )}
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
                  <Label className="text-sm text-green-800 dark:text-green-300">Valor Mensal</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editedLead.monthly_value !== undefined && editedLead.monthly_value !== null ? editedLead.monthly_value : (lead.monthly_value || "")}
                    onChange={(e) => handleFieldChange('monthly_value', e.target.value)}
                    placeholder="0.00"
                    className="mt-1 bg-white dark:bg-gray-800 border-green-300 dark:border-green-700"
                  />
                </div>
                <div>
                  <Label className="text-sm text-green-800 dark:text-green-300">Valor da Adesão</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editedLead.adhesion_value !== undefined && editedLead.adhesion_value !== null ? editedLead.adhesion_value : (lead.adhesion_value || "")}
                    onChange={(e) => handleFieldChange('adhesion_value', e.target.value)}
                    placeholder="0.00"
                    className="mt-1 bg-white dark:bg-gray-800 border-green-300 dark:border-green-700"
                  />
                </div>
                <div>
                  <Label className="text-sm text-green-800 dark:text-green-300">Dependentes</Label>
                  <Input
                    type="number"
                    value={editedLead.total_dependents !== undefined && editedLead.total_dependents !== null ? editedLead.total_dependents : (lead.total_dependents || "")}
                    onChange={(e) => handleFieldChange('total_dependents', e.target.value)}
                    placeholder="0"
                    className="mt-1 bg-white dark:bg-gray-800 border-green-300 dark:border-green-700"
                  />
                </div>

                {((editedLead.monthly_value !== undefined && editedLead.monthly_value !== null && editedLead.monthly_value !== "") || 
                  (lead.monthly_value !== undefined && lead.monthly_value !== null) || 
                  (editedLead.adhesion_value !== undefined && editedLead.adhesion_value !== null && editedLead.adhesion_value !== "") ||
                  (lead.adhesion_value !== undefined && lead.adhesion_value !== null)) && (
                  <div className="pt-3 border-t border-green-300 dark:border-green-700">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center shadow-sm">
                      <p className="text-xs text-green-700 dark:text-green-400 mb-1">💎 Valor Estimado Total</p>
                      <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                        R$ {(
                          parseFloat(editedLead.monthly_value !== undefined && editedLead.monthly_value !== null && editedLead.monthly_value !== "" ? editedLead.monthly_value : (lead.monthly_value || 0)) +
                          parseFloat(editedLead.adhesion_value !== undefined && editedLead.adhesion_value !== null && editedLead.adhesion_value !== "" ? editedLead.adhesion_value : (lead.adhesion_value || 0))
                        ).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fotos */}
            {lead.photos && lead.photos.length > 0 && (
              <Card className="bg-white dark:bg-gray-900">
                <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <ImageIcon className="w-5 h-5" />
                    Fotos
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-2">
                    {lead.photos.map((photo, idx) => (
                      <img
                        key={idx}
                        src={photo.url}
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(photo.url, '_blank')}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Dialog Marcar como Perdido */}
      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogContent className="bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">Marcar Lead como Perdido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Este lead sairá do pipeline de vendas. Por favor, informe o motivo da perda:
            </p>
            <Textarea
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="Ex: Cliente desistiu, preço muito alto, optou por concorrente..."
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