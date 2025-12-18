
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, UserCheck, UserX, Activity, Upload, Loader2, MessageSquare, Copy, Check, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Agents() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [selectedAgentForWhatsApp, setSelectedAgentForWhatsApp] = useState(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [generatedTokenData, setGeneratedTokenData] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    photo_url: "",
    user_email: "",
    agent_type: "support",
    team_id: "",
    work_unit: "",
    queue_ids: [],
    level: "pleno",
    online: false,
    active: true,
    permissions: {
      can_view_all_tickets: false,
      can_view_team_tickets: false,
      can_view_all_leads: false,
      can_view_team_leads: false,
      can_access_reports: false,
      can_manage_agents: false,
      can_manage_settings: false,
    }
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list(),
    initialData: [],
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
    initialData: [],
  });

  const { data: queues = [] } = useQuery({
    queryKey: ['queues'],
    queryFn: () => base44.entities.Queue.list(),
    initialData: [],
  });

  const createAgentMutation = useMutation({
    mutationFn: (data) => base44.entities.Agent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success('Agente criado com sucesso!');
    },
  });

  const updateAgentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Agent.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success('Agente atualizado com sucesso!');
    },
  });

  const handleGenerateWhatsAppToken = async (agent) => {
    setSelectedAgentForWhatsApp(agent);
    setWhatsappDialogOpen(true);
    setGeneratingToken(true);
    setGeneratedTokenData(null);

    try {
      const response = await base44.functions.invoke('generateWhatsAppToken', {
        agent_id: agent.id,
        validity_days: 90
      });

      if (response.data.success) {
        setGeneratedTokenData(response.data);
        await queryClient.invalidateQueries({ queryKey: ['agents'] });
        toast.success('Token WhatsApp gerado com sucesso!');
      } else {
        toast.error(response.data.error || 'Erro ao gerar token');
      }
    } catch (error) {
      console.error('Erro ao gerar token:', error);
      toast.error('Erro ao gerar token: ' + error.message);
    }
    setGeneratingToken(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(true);
    toast.success('Link copiado para a área de transferência!');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      cpf: "",
      photo_url: "",
      user_email: "",
      agent_type: "support",
      team_id: "",
      work_unit: "",
      queue_ids: [],
      level: "pleno",
      online: false,
      active: true,
      permissions: {
        can_view_all_tickets: false,
        can_view_team_tickets: false,
        can_view_all_leads: false,
        can_view_team_leads: false,
        can_access_reports: false,
        can_manage_agents: false,
        can_manage_settings: false,
      }
    });
    setEditingAgent(null);
  };

  const handleEdit = (agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name || "",
      cpf: agent.cpf || "",
      photo_url: agent.photo_url || "",
      user_email: agent.user_email || "",
      agent_type: agent.agent_type || "support",
      team_id: agent.team_id || "",
      work_unit: agent.work_unit || "",
      queue_ids: agent.queue_ids || [],
      level: agent.level || "pleno",
      online: agent.online || false,
      active: agent.active !== undefined ? agent.active : true,
      permissions: agent.permissions || {
        can_view_all_tickets: false,
        can_view_team_tickets: false,
        can_view_all_leads: false,
        can_view_team_leads: false,
        can_access_reports: false,
        can_manage_agents: false,
        can_manage_settings: false,
      }
    });
    setIsDialogOpen(true);
  };

  const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const handleCpfChange = (e) => {
    const formatted = formatCPF(e.target.value);
    setFormData({...formData, cpf: formatted});
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({...formData, photo_url: result.file_url});
      toast.success('Foto carregada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da foto');
    }
    setUploadingPhoto(false);
  };

  const toggleQueue = (queueId) => {
    const currentQueues = formData.queue_ids || [];
    if (currentQueues.includes(queueId)) {
      setFormData({
        ...formData,
        queue_ids: currentQueues.filter(id => id !== queueId)
      });
    } else {
      setFormData({
        ...formData,
        queue_ids: [...currentQueues, queueId]
      });
    }
  };

  const handleSubmit = () => {
    if (editingAgent) {
      updateAgentMutation.mutate({
        id: editingAgent.id,
        data: formData
      });
    } else {
      createAgentMutation.mutate(formData);
    }
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || '-';
  };

  const getQueueNames = (queueIds) => {
    if (!queueIds || queueIds.length === 0) return '-';
    return queueIds.map(qid => {
      const queue = queues.find(q => q.id === qid);
      return queue?.name || qid;
    }).join(', ');
  };

  const getAgentTypeBadge = (type) => {
    const types = {
      support: { label: "Atendimento", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
      sales: { label: "Vendas", color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
      collection: { label: "Cobrança", color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
      pre_sales: { label: "Pré-Vendas", color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
      post_sales: { label: "Pós-Vendas", color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
      supervisor: { label: "Supervisor", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" },
      admin: { label: "Admin", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
    };
    return types[type] || types.support;
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Agentes</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Gerencie os agentes de atendimento
          </p>
        </div>
        <Button 
          onClick={() => setIsDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Agente
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map(agent => {
          const typeBadge = getAgentTypeBadge(agent.agent_type);
          const hasWhatsAppToken = !!agent.whatsapp_access_token;
          const tokenExpired = agent.whatsapp_token_expires_at && new Date(agent.whatsapp_token_expires_at) < new Date();
          
          return (
            <Card key={agent.id} className={`border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-lg transition-all ${!agent.active ? 'opacity-60' : ''}`}>
              <CardHeader className="border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {agent.photo_url ? (
                        <img 
                          src={agent.photo_url} 
                          alt={agent.name}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-100 dark:ring-blue-900"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center ring-2 ring-blue-100 dark:ring-blue-900">
                          <span className="text-white font-semibold text-lg">
                            {agent.name?.charAt(0)?.toUpperCase() || 'A'}
                          </span>
                        </div>
                      )}
                      {agent.online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full ring-2 ring-white dark:ring-gray-900"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg text-gray-900 dark:text-gray-100">{agent.name}</CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{agent.user_email}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(agent)}
                    className="hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Tipo:</span>
                    <Badge className={typeBadge.color}>{typeBadge.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">CPF:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{agent.cpf || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Time:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{getTeamName(agent.team_id)}</span>
                  </div>
                  {agent.work_unit && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Unidade:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{agent.work_unit}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Nível:</span>
                    <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800">{agent.level}</Badge>
                  </div>
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Filas:</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{getQueueNames(agent.queue_ids)}</p>
                  </div>
                  
                  {/* WhatsApp Token Status */}
                  {hasWhatsAppToken && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-xs">
                        <MessageSquare className="w-3 h-3 text-green-600 dark:text-green-400" />
                        <span className={tokenExpired ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                          Token WhatsApp {tokenExpired ? 'Expirado' : 'Ativo'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Expira: {formatDate(agent.whatsapp_token_expires_at)}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    <Button
                      onClick={() => handleGenerateWhatsAppToken(agent)}
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                      size="sm"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {hasWhatsAppToken ? 'Renovar Link WhatsApp' : 'Gerar Link WhatsApp'}
                    </Button>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {agent.online ? (
                      <Badge className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300">
                        <UserCheck className="w-3 h-3 mr-1" />
                        Online
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                        <UserX className="w-3 h-3 mr-1" />
                        Offline
                      </Badge>
                    )}
                    {!agent.active && (
                      <Badge variant="outline" className="bg-gray-100 dark:bg-gray-800">
                        Inativo
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog WhatsApp Token */}
      <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
              Link de Acesso WhatsApp
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {generatingToken ? (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 animate-spin text-green-600 dark:text-green-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Gerando token de acesso...</p>
              </div>
            ) : generatedTokenData ? (
              <>
                <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <MessageSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-800 dark:text-green-300">
                    <strong>Link gerado com sucesso!</strong>
                    <p className="text-sm mt-1">
                      Configure este link no seu plugin de WhatsApp para permitir que <strong>{selectedAgentForWhatsApp?.name}</strong> acesse o CRM.
                    </p>
                  </AlertDescription>
                </Alert>

                <div>
                  <Label className="text-gray-900 dark:text-gray-100 mb-2 block">URL do Quick Action:</Label>
                  <div className="flex gap-2">
                    <Input
                      value={generatedTokenData.quick_action_url}
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800 font-mono text-sm"
                    />
                    <Button
                      onClick={() => copyToClipboard(generatedTokenData.quick_action_url)}
                      variant="outline"
                      size="icon"
                    >
                      {copiedUrl ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      onClick={() => window.open(generatedTokenData.quick_action_url, '_blank')}
                      variant="outline"
                      size="icon"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    ⚠️ Não compartilhe este link publicamente. Ele dá acesso ao sistema.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <Label className="text-sm text-gray-600 dark:text-gray-400">Validade:</Label>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {generatedTokenData.validity_days} dias
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600 dark:text-gray-400">Expira em:</Label>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {formatDate(generatedTokenData.expires_at)}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    📱 Como usar no plugin WhatsApp:
                  </h4>
                  <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                    <li>Copie a URL acima</li>
                    <li>Configure no seu plugin de WhatsApp</li>
                    <li>O agente poderá criar Leads, Tickets e Cobranças direto do WhatsApp</li>
                    <li>O token expira automaticamente em 90 dias</li>
                  </ol>
                </div>
              </>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">Ocorreu um erro ao gerar o token.</p>
            )}
          </div>

          <DialogFooter>
            <Button 
              onClick={() => {
                setWhatsappDialogOpen(false);
                setGeneratedTokenData(null);
                setCopiedUrl(false);
              }}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Criar/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl bg-white dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              {editingAgent ? 'Editar Agente' : 'Novo Agente'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Upload de Foto */}
            <div className="flex flex-col items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Label className="text-gray-900 dark:text-gray-100">Foto do Agente</Label>
              {formData.photo_url ? (
                <img 
                  src={formData.photo_url} 
                  alt="Foto do agente"
                  className="w-24 h-24 rounded-full object-cover border-4 border-blue-200 dark:border-blue-800"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center border-4 border-blue-200 dark:border-blue-800">
                  <span className="text-4xl font-bold text-blue-700 dark:text-blue-300">
                    {formData.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  id="photo-upload"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('photo-upload').click()}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Fazer Upload
                    </>
                  )}
                </Button>
                {formData.photo_url && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({...formData, photo_url: ""})}
                  >
                    Remover
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-gray-900 dark:text-gray-100">Nome Completo *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Nome completo do agente"
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>

              <div>
                <Label className="text-gray-900 dark:text-gray-100">CPF *</Label>
                <Input
                  value={formData.cpf}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>

              <div>
                <Label className="text-gray-900 dark:text-gray-100">Email *</Label>
                <Input
                  type="email"
                  value={formData.user_email}
                  onChange={(e) => setFormData({...formData, user_email: e.target.value})}
                  placeholder="email@exemplo.com"
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>

              <div>
                <Label className="text-gray-900 dark:text-gray-100">Tipo de Agente *</Label>
                <Select 
                  value={formData.agent_type} 
                  onValueChange={(val) => setFormData({...formData, agent_type: val})}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="support">Atendimento</SelectItem>
                    <SelectItem value="sales">Vendas</SelectItem>
                    <SelectItem value="collection">Cobrança</SelectItem>
                    <SelectItem value="pre_sales">Pré-Vendas</SelectItem>
                    <SelectItem value="post_sales">Pós-Vendas</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Define quais módulos o agente pode acessar
                </p>
              </div>

              <div>
                <Label className="text-gray-900 dark:text-gray-100">Time *</Label>
                <Select 
                  value={formData.team_id} 
                  onValueChange={(val) => setFormData({...formData, team_id: val})}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectValue placeholder="Selecione o time" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-900 dark:text-gray-100">Unidade de Atendimento</Label>
                <Input
                  value={formData.work_unit}
                  onChange={(e) => setFormData({...formData, work_unit: e.target.value})}
                  placeholder="Ex: Recepção Americana, Central SP..."
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>

              <div>
                <Label className="text-gray-900 dark:text-gray-100">Nível</Label>
                <Select 
                  value={formData.level} 
                  onValueChange={(val) => setFormData({...formData, level: val})}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="junior">Júnior</SelectItem>
                    <SelectItem value="pleno">Pleno</SelectItem>
                    <SelectItem value="senior">Sênior</SelectItem>
                    <SelectItem value="specialist">Especialista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filas */}
            <div>
              <Label className="mb-3 block text-gray-900 dark:text-gray-100">Filas de Atendimento *</Label>
              <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800 max-h-48 overflow-y-auto">
                {queues.map(queue => (
                  <div key={queue.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={queue.id}
                      checked={(formData.queue_ids || []).includes(queue.id)}
                      onCheckedChange={() => toggleQueue(queue.id)}
                    />
                    <label
                      htmlFor={queue.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-gray-900 dark:text-gray-100"
                    >
                      {queue.name}
                    </label>
                  </div>
                ))}
                {queues.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma fila disponível</p>
                )}
              </div>
            </div>

            {/* Permissões Especiais */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <Label className="text-gray-900 dark:text-gray-100 mb-3 block">Permissões Especiais</Label>
              <div className="space-y-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                {formData.agent_type === 'support' && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-gray-700 dark:text-gray-300">Ver todos os tickets</Label>
                      <Switch
                        checked={formData.permissions.can_view_all_tickets}
                        onCheckedChange={(val) => setFormData({
                          ...formData, 
                          permissions: {...formData.permissions, can_view_all_tickets: val}
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-gray-700 dark:text-gray-300">Ver tickets da equipe</Label>
                      <Switch
                        checked={formData.permissions.can_view_team_tickets}
                        onCheckedChange={(val) => setFormData({
                          ...formData, 
                          permissions: {...formData.permissions, can_view_team_tickets: val}
                        })}
                      />
                    </div>
                  </>
                )}

                {formData.agent_type === 'sales' && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-gray-700 dark:text-gray-300">Ver todos os leads</Label>
                      <Switch
                        checked={formData.permissions.can_view_all_leads}
                        onCheckedChange={(val) => setFormData({
                          ...formData, 
                          permissions: {...formData.permissions, can_view_all_leads: val}
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-gray-700 dark:text-gray-300">Ver leads da equipe</Label>
                      <Switch
                        checked={formData.permissions.can_view_team_leads}
                        onCheckedChange={(val) => setFormData({
                          ...formData, 
                          permissions: {...formData.permissions, can_view_team_leads: val}
                        })}
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between">
                  <Label className="text-sm text-gray-700 dark:text-gray-300">Acessar relatórios</Label>
                  <Switch
                    checked={formData.permissions.can_access_reports}
                    onCheckedChange={(val) => setFormData({
                      ...formData, 
                      permissions: {...formData.permissions, can_access_reports: val}
                    })}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Label className="text-gray-900 dark:text-gray-100">Online</Label>
              <Switch
                checked={formData.online}
                onCheckedChange={(val) => setFormData({...formData, online: val})}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Label className="text-gray-900 dark:text-gray-100">Ativo</Label>
              <Switch
                checked={formData.active}
                onCheckedChange={(val) => setFormData({...formData, active: val})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.name || !formData.cpf || !formData.user_email || !formData.team_id || !formData.agent_type || (formData.queue_ids || []).length === 0}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              {editingAgent ? 'Salvar' : 'Criar Agente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
