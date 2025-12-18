import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Zap, Edit, Trash2, Play, Pause, Building2 } from "lucide-react";
import { toast } from "sonner";

const STAGES_PJ = [
  { value: 'novo', label: 'Novo' },
  { value: 'qualificacao', label: 'Qualificação' },
  { value: 'apresentacao', label: 'Apresentação' },
  { value: 'proposta_enviada', label: 'Proposta Enviada' },
  { value: 'negociacao', label: 'Negociação' },
  { value: 'fechado_ganho', label: 'Fechado - Ganho' },
  { value: 'fechado_perdido', label: 'Fechado - Perdido' },
];

const TRIGGER_TYPES = [
  { value: 'stage_duration', label: 'Tempo em uma etapa' },
  { value: 'no_activity', label: 'Sem atividade' },
  { value: 'no_proposal_response', label: 'Sem resposta de proposta' },
  { value: 'no_contact', label: 'Sem contato' },
];

const ACTION_TYPES = [
  { value: 'change_stage', label: 'Mudar etapa' },
  { value: 'create_task', label: 'Criar tarefa' },
  { value: 'send_notification', label: 'Enviar notificação' },
  { value: 'assign_agent', label: 'Atribuir agente' },
  { value: 'send_email', label: 'Enviar e-mail' },
];

export default function LeadPJAutomations() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    active: true,
    trigger_type: "stage_duration",
    condition: {
      stage: "",
      duration_days: "",
      duration_hours: "",
    },
    action: {
      type: "create_task",
      new_stage: "",
      task_title: "",
      task_description: "",
      notification_message: "",
      agent_id: "",
      email_subject: "",
      email_body: "",
    }
  });

  const { data: automations = [] } = useQuery({
    queryKey: ['leadPJAutomations'],
    queryFn: () => base44.entities.LeadPJAutomation.list(),
    initialData: [],
  });

  const { data: salesAgents = [] } = useQuery({
    queryKey: ['salesAgents'],
    queryFn: () => base44.entities.SalesAgent.list(),
    initialData: [],
  });

  const createAutomationMutation = useMutation({
    mutationFn: (data) => base44.entities.LeadPJAutomation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadPJAutomations'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success('Automação criada com sucesso!');
    },
  });

  const updateAutomationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LeadPJAutomation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadPJAutomations'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success('Automação atualizada com sucesso!');
    },
  });

  const deleteAutomationMutation = useMutation({
    mutationFn: (id) => base44.entities.LeadPJAutomation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadPJAutomations'] });
      toast.success('Automação excluída!');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }) => base44.entities.LeadPJAutomation.update(id, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadPJAutomations'] });
      toast.success('Status atualizado!');
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      active: true,
      trigger_type: "stage_duration",
      condition: {
        stage: "",
        duration_days: "",
        duration_hours: "",
      },
      action: {
        type: "create_task",
        new_stage: "",
        task_title: "",
        task_description: "",
        notification_message: "",
        agent_id: "",
        email_subject: "",
        email_body: "",
      }
    });
    setEditingAutomation(null);
  };

  const handleEdit = (automation) => {
    setEditingAutomation(automation);
    setFormData({
      name: automation.name || "",
      description: automation.description || "",
      active: automation.active !== false,
      trigger_type: automation.trigger_type || "stage_duration",
      condition: automation.condition || {
        stage: "",
        duration_days: "",
        duration_hours: "",
      },
      action: automation.action || {
        type: "create_task",
        new_stage: "",
        task_title: "",
        task_description: "",
        notification_message: "",
        agent_id: "",
        email_subject: "",
        email_body: "",
      }
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.trigger_type) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const dataToSave = {
      ...formData,
      condition: {
        ...formData.condition,
        duration_days: formData.condition.duration_days ? parseInt(formData.condition.duration_days) : null,
        duration_hours: formData.condition.duration_hours ? parseInt(formData.condition.duration_hours) : null,
      }
    };

    if (editingAutomation) {
      updateAutomationMutation.mutate({
        id: editingAutomation.id,
        data: dataToSave
      });
    } else {
      createAutomationMutation.mutate(dataToSave);
    }
  };

  const getTriggerLabel = (type) => {
    return TRIGGER_TYPES.find(t => t.value === type)?.label || type;
  };

  const getActionLabel = (type) => {
    return ACTION_TYPES.find(a => a.value === type)?.label || type;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <Zap className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              Automações de Vendas PJ
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Configure ações automáticas para o pipeline B2B
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova Automação
          </Button>
        </div>

        {/* Automations List */}
        <div className="grid gap-4">
          {automations.length === 0 ? (
            <Card className="bg-white dark:bg-gray-900">
              <CardContent className="p-12 text-center">
                <Zap className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
                  Nenhuma automação criada
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                  Crie automações para otimizar seu processo de vendas B2B
                </p>
                <Button onClick={() => setIsDialogOpen(true)} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar primeira automação
                </Button>
              </CardContent>
            </Card>
          ) : (
            automations.map(automation => (
              <Card key={automation.id} className={`bg-white dark:bg-gray-900 ${automation.active ? 'border-indigo-200 dark:border-indigo-800' : 'opacity-60'}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {automation.name}
                        </h3>
                        <Badge className={automation.active ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}>
                          {automation.active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      
                      {automation.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          {automation.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">GATILHO</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {getTriggerLabel(automation.trigger_type)}
                          </p>
                          {automation.condition?.stage && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              Etapa: {STAGES_PJ.find(s => s.value === automation.condition.stage)?.label}
                            </p>
                          )}
                          {automation.condition?.duration_days && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {automation.condition.duration_days} dias
                            </p>
                          )}
                        </div>

                        <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                          <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">AÇÃO</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {getActionLabel(automation.action?.type)}
                          </p>
                          {automation.action?.task_title && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                              {automation.action.task_title}
                            </p>
                          )}
                          {automation.action?.new_stage && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              Para: {STAGES_PJ.find(s => s.value === automation.action.new_stage)?.label}
                            </p>
                          )}
                        </div>
                      </div>

                      {automation.execution_count > 0 && (
                        <div className="mt-4 text-xs text-gray-500 dark:text-gray-500">
                          Executada {automation.execution_count} {automation.execution_count === 1 ? 'vez' : 'vezes'}
                          {automation.last_execution && (
                            <span> • Última execução: {new Date(automation.last_execution).toLocaleString('pt-BR')}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={automation.active}
                        onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: automation.id, active: checked })}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(automation)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Deseja excluir esta automação?')) {
                            deleteAutomationMutation.mutate(automation.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              {editingAutomation ? 'Editar Automação' : 'Nova Automação'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Nome da Automação *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Alertar leads sem contato há 7 dias"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Descreva o que esta automação faz..."
                rows={2}
                className="mt-1"
              />
            </div>

            {/* Trigger */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Gatilho</h3>
              <div className="space-y-3">
                <div>
                  <Label>Tipo de Gatilho *</Label>
                  <Select 
                    value={formData.trigger_type} 
                    onValueChange={(val) => setFormData({...formData, trigger_type: val})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_TYPES.map(trigger => (
                        <SelectItem key={trigger.value} value={trigger.value}>{trigger.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Etapa</Label>
                  <Select 
                    value={formData.condition.stage} 
                    onValueChange={(val) => setFormData({...formData, condition: {...formData.condition, stage: val}})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione uma etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES_PJ.map(stage => (
                        <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Duração (dias)</Label>
                    <Input
                      type="number"
                      value={formData.condition.duration_days}
                      onChange={(e) => setFormData({...formData, condition: {...formData.condition, duration_days: e.target.value}})}
                      placeholder="0"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Duração (horas)</Label>
                    <Input
                      type="number"
                      value={formData.condition.duration_hours}
                      onChange={(e) => setFormData({...formData, condition: {...formData.condition, duration_hours: e.target.value}})}
                      placeholder="0"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Ação</h3>
              <div className="space-y-3">
                <div>
                  <Label>Tipo de Ação *</Label>
                  <Select 
                    value={formData.action.type} 
                    onValueChange={(val) => setFormData({...formData, action: {...formData.action, type: val}})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map(action => (
                        <SelectItem key={action.value} value={action.value}>{action.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.action.type === 'change_stage' && (
                  <div>
                    <Label>Nova Etapa</Label>
                    <Select 
                      value={formData.action.new_stage} 
                      onValueChange={(val) => setFormData({...formData, action: {...formData.action, new_stage: val}})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES_PJ.map(stage => (
                          <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>
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
                        onChange={(e) => setFormData({...formData, action: {...formData.action, task_title: e.target.value}})}
                        placeholder="Ex: Entrar em contato com a empresa"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Descrição da Tarefa</Label>
                      <Textarea
                        value={formData.action.task_description}
                        onChange={(e) => setFormData({...formData, action: {...formData.action, task_description: e.target.value}})}
                        placeholder="Detalhes da tarefa..."
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                  </>
                )}

                {formData.action.type === 'send_notification' && (
                  <div>
                    <Label>Mensagem da Notificação</Label>
                    <Textarea
                      value={formData.action.notification_message}
                      onChange={(e) => setFormData({...formData, action: {...formData.action, notification_message: e.target.value}})}
                      placeholder="Mensagem a ser enviada..."
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                )}

                {formData.action.type === 'send_email' && (
                  <>
                    <div>
                      <Label>Assunto do E-mail</Label>
                      <Input
                        value={formData.action.email_subject}
                        onChange={(e) => setFormData({...formData, action: {...formData.action, email_subject: e.target.value}})}
                        placeholder="Assunto..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Corpo do E-mail</Label>
                      <Textarea
                        value={formData.action.email_body}
                        onChange={(e) => setFormData({...formData, action: {...formData.action, email_body: e.target.value}})}
                        placeholder="Conteúdo do e-mail..."
                        rows={3}
                        className="mt-1"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.name || !formData.trigger_type}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {editingAutomation ? 'Salvar' : 'Criar Automação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}