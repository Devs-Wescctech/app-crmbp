
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert"; // New import for Alert components
import { 
  Plus, 
  Zap, 
  Trash2, 
  Edit, 
  Clock, 
  ArrowRight,
  Play,
  Pause,
  RefreshCw,
  MessageSquare // New import for MessageSquare icon
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STAGES = [
  { value: "novo", label: "Novo" },
  { value: "abordado", label: "Abordado" },
  { value: "qualificado", label: "Qualificado" },
  { value: "proposta_enviada", label: "Proposta Enviada" },
  { value: "reengajar", label: "Reengajar" },
];

const TRIGGER_TYPES = [
  { value: "stage_duration", label: "Tempo no Stage" },
  { value: "no_activity", label: "Sem Atividade" },
  { value: "no_proposal_response", label: "Proposta Sem Resposta" },
  { value: "no_contact", label: "Sem Contato" },
];

const ACTION_TYPES = [
  { value: "change_stage", label: "Mudar Stage" },
  { value: "create_task", label: "Criar Tarefa" },
  { value: "send_notification", label: "Enviar Notificação" },
  { value: "send_whatsapp_message", label: "Enviar WhatsApp para Lead" }, // New action type
];

export default function LeadAutomations() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    active: true,
    trigger_type: "stage_duration",
    condition: {
      stage: "novo",
      duration_days: 7,
      duration_hours: 0,
    },
    action: {
      type: "change_stage",
      new_stage: "reengajar",
      task_title: "",
      task_description: "",
      notification_message: "",
      whatsapp_message: "", // New field for WhatsApp message
    }
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['leadAutomations'],
    queryFn: () => base44.entities.LeadAutomation.list('-created_date'),
    initialData: [],
  });

  const createRuleMutation = useMutation({
    mutationFn: (data) => base44.entities.LeadAutomation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadAutomations'] });
      toast.success('Regra criada com sucesso!');
      setShowDialog(false);
      resetForm();
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LeadAutomation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadAutomations'] });
      toast.success('Regra atualizada!');
      setShowDialog(false);
      resetForm();
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => base44.entities.LeadAutomation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadAutomations'] });
      toast.success('Regra excluída!');
    },
  });

  const executeAutomationsMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('checkLeadAutomations', {});
      return result.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Automações executadas! ${data.leads_affected} leads afetados`);
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['leadAutomations'] });
      } else {
        toast.error('Erro ao executar automações');
      }
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      active: true,
      trigger_type: "stage_duration",
      condition: {
        stage: "novo",
        duration_days: 7,
        duration_hours: 0,
      },
      action: {
        type: "change_stage",
        new_stage: "reengajar",
        task_title: "",
        task_description: "",
        notification_message: "",
        whatsapp_message: "", // Reset new field
      }
    });
    setEditingRule(null);
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    // Ensure all action fields are present, even if undefined in the rule object
    // This prevents uncontrolled component warnings for new fields on old rules
    const actionData = {
      type: rule.action.type,
      new_stage: rule.action.new_stage || "reengajar",
      task_title: rule.action.task_title || "",
      task_description: rule.action.task_description || "",
      notification_message: rule.action.notification_message || "",
      whatsapp_message: rule.action.whatsapp_message || "", // Initialize new field
    };

    setFormData({
      name: rule.name,
      description: rule.description || "",
      active: rule.active,
      trigger_type: rule.trigger_type,
      condition: rule.condition,
      action: actionData,
    });
    setShowDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Nome da regra é obrigatório!');
      return;
    }

    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, data: formData });
    } else {
      createRuleMutation.mutate(formData);
    }
  };

  const handleToggleActive = (rule) => {
    updateRuleMutation.mutate({
      id: rule.id,
      data: { ...rule, active: !rule.active }
    });
  };

  const getTriggerLabel = (type) => {
    return TRIGGER_TYPES.find(t => t.value === type)?.label || type;
  };

  const getActionLabel = (type) => {
    return ACTION_TYPES.find(a => a.value === type)?.label || type;
  };

  const getStageLabel = (stage) => {
    return STAGES.find(s => s.value === stage)?.label || stage;
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-8 h-8 text-yellow-600" />
            Automações de Leads
          </h1>
          <p className="text-gray-500 mt-1">
            Configure regras automáticas para otimizar seu processo de vendas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => executeAutomationsMutation.mutate()}
            disabled={executeAutomationsMutation.isPending}
          >
            {executeAutomationsMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Executando...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Executar Agora
              </>
            )}
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowDialog(true);
            }}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Regra
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Regras Ativas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {rules.filter(r => r.active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-100 rounded-lg">
                <Pause className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Regras Inativas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {rules.filter(r => !r.active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total de Regras</p>
                <p className="text-2xl font-bold text-gray-900">{rules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Regras */}
      <div className="space-y-4">
        {rules.map(rule => (
          <Card key={rule.id} className={rule.active ? 'border-green-200' : 'border-gray-200'}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-gray-900">{rule.name}</h3>
                    {rule.active ? (
                      <Badge className="bg-green-100 text-green-700">Ativa</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700">Inativa</Badge>
                    )}
                  </div>
                  
                  {rule.description && (
                    <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">
                        {getTriggerLabel(rule.trigger_type)}:
                      </span>
                      <span className="font-medium">
                        {getStageLabel(rule.condition.stage)} por {rule.condition.duration_days} dias
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">
                        {getActionLabel(rule.action.type)}:
                      </span>
                      <span className="font-medium">
                        {rule.action.type === 'change_stage' && getStageLabel(rule.action.new_stage)}
                        {rule.action.type === 'create_task' && rule.action.task_title}
                        {rule.action.type === 'send_notification' && 'Notificar agente'}
                        {rule.action.type === 'send_whatsapp_message' && 'Enviar mensagem para o lead'} {/* Display for new action type */}
                      </span>
                    </div>
                  </div>

                  {rule.last_execution && (
                    <div className="mt-2 text-xs text-gray-500">
                      Última execução: {format(new Date(rule.last_execution), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      {' • '}
                      Executada {rule.execution_count || 0} vezes
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.active}
                    onCheckedChange={() => handleToggleActive(rule)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(rule)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm('Deseja excluir esta regra?')) {
                        deleteRuleMutation.mutate(rule.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {rules.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Zap className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhuma regra criada
              </h3>
              <p className="text-gray-600 mb-4">
                Crie sua primeira regra de automação para otimizar o processo de vendas
              </p>
              <Button onClick={() => setShowDialog(true)} className="bg-yellow-600 hover:bg-yellow-700">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Regra
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de Criação/Edição */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Editar Regra' : 'Nova Regra de Automação'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome e Descrição */}
            <div className="space-y-4">
              <div>
                <Label>Nome da Regra *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Mover leads novos sem contato para reengajar"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o objetivo desta regra..."
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Gatilho */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg">🎯 Quando (Gatilho)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Tipo de Gatilho</Label>
                  <Select 
                    value={formData.trigger_type} 
                    onValueChange={(val) => setFormData({ ...formData, trigger_type: val })}
                  >
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Stage Atual</Label>
                  <Select 
                    value={formData.condition.stage} 
                    onValueChange={(val) => setFormData({ 
                      ...formData, 
                      condition: { ...formData.condition, stage: val }
                    })}
                  >
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map(stage => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Dias</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.condition.duration_days}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        condition: { ...formData.condition, duration_days: parseInt(e.target.value) }
                      })}
                      className="mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <Label>Horas</Label>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={formData.condition.duration_hours || 0}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        condition: { ...formData.condition, duration_hours: parseInt(e.target.value) }
                      })}
                      className="mt-1 bg-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ação */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-lg">⚡ Então (Ação)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Tipo de Ação</Label>
                  <Select 
                    value={formData.action.type} 
                    onValueChange={(val) => setFormData({ 
                      ...formData, 
                      action: { ...formData.action, type: val }
                    })}
                  >
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map(action => (
                        <SelectItem key={action.value} value={action.value}>
                          {action.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.action.type === 'change_stage' && (
                  <div>
                    <Label>Novo Stage</Label>
                    <Select 
                      value={formData.action.new_stage} 
                      onValueChange={(val) => setFormData({ 
                        ...formData, 
                        action: { ...formData.action, new_stage: val }
                      })}
                    >
                      <SelectTrigger className="mt-1 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map(stage => (
                          <SelectItem key={stage.value} value={stage.value}>
                            {stage.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.action.type === 'create_task' && (
                  <>
                    <div>
                      <Label>Título da Tarefa</Label>
                      <Input
                        value={formData.action.task_title}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          action: { ...formData.action, task_title: e.target.value }
                        })}
                        placeholder="Ex: Ligar para o lead"
                        className="mt-1 bg-white"
                      />
                    </div>
                    <div>
                      <Label>Descrição da Tarefa</Label>
                      <Textarea
                        value={formData.action.task_description}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          action: { ...formData.action, task_description: e.target.value }
                        })}
                        placeholder="Detalhes da tarefa..."
                        rows={2}
                        className="mt-1 bg-white"
                      />
                    </div>
                  </>
                )}

                {formData.action.type === 'send_notification' && (
                  <div>
                    <Label>Mensagem da Notificação</Label>
                    <Textarea
                      value={formData.action.notification_message}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        action: { ...formData.action, notification_message: e.target.value }
                      })}
                      placeholder="Ex: Lead sem contato há 7 dias, faça um follow-up"
                      rows={2}
                      className="mt-1 bg-white"
                    />
                  </div>
                )}

                {formData.action.type === 'send_whatsapp_message' && (
                  <>
                    <Alert className="bg-blue-50 border-blue-200">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                      <AlertDescription className="text-blue-800 text-sm">
                        <strong>💡 Variáveis disponíveis:</strong>
                        <br />
                        • <code className="bg-blue-100 px-1 rounded">{'{{lead_name}}'}</code> - Nome do lead
                        <br />
                        • <code className="bg-blue-100 px-1 rounded">{'{{agent_name}}'}</code> - Nome do vendedor
                        <br />
                        • <code className="bg-blue-100 px-1 rounded">{'{{agent_phone}}'}</code> - Telefone do vendedor
                      </AlertDescription>
                    </Alert>
                    
                    <div>
                      <Label>Mensagem do WhatsApp</Label>
                      <Textarea
                        value={formData.action.whatsapp_message || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          action: { ...formData.action, whatsapp_message: e.target.value }
                        })}
                        placeholder={`Olá {{lead_name}}! 👋

Sou {{agent_name}}, vendedor da Wescctech.

Tenho uma oferta ESPECIAL para você! 🎁

Entre em contato comigo pelo WhatsApp:
📱 {{agent_phone}}

Vamos conversar sobre os melhores planos para você e sua família! 😊`}
                        rows={8}
                        className="mt-1 bg-white font-mono text-xs"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Use as variáveis acima para personalizar a mensagem
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-green-300">
                      <p className="text-sm font-semibold text-green-800 mb-2">📱 Exemplo de mensagem:</p>
                      <div className="text-xs text-gray-700 whitespace-pre-line bg-green-50 p-3 rounded">
                        {formData.action.whatsapp_message || 'Configure a mensagem acima...'}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Botões */}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
              >
                {editingRule ? 'Salvar Alterações' : 'Criar Regra'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
