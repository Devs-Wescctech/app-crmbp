
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  Phone,
  Mail,
  User,
  MapPin,
  Gift,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  Loader2,
  Save,
  TrendingUp,
  UserCheck,
  FileText
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ReferralTimeline from "../components/referral/ReferralTimeline";
import AddActivityForm from "../components/referral/AddActivityForm";

const STAGES = [
  { value: "novo", label: "Novo", color: "bg-purple-100 text-purple-800" },
  { value: "validacao", label: "Validação", color: "bg-blue-100 text-blue-800" },
  { value: "contato_iniciado", label: "Contato Iniciado", color: "bg-yellow-100 text-yellow-800" },
  { value: "qualificado", label: "Qualificado", color: "bg-indigo-100 text-indigo-800" },
  { value: "proposta_enviada", label: "Proposta Enviada", color: "bg-orange-100 text-orange-800" },
  { value: "fechado_ganho", label: "Fechado - Ganho", color: "bg-green-100 text-green-800" },
  { value: "fechado_perdido", label: "Perdido", color: "bg-red-100 text-red-800" },
];

export default function ReferralDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const referralId = urlParams.get('id');

  const [editedData, setEditedData] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [lostReason, setLostReason] = useState("");

  const { data: referral, isLoading } = useQuery({
    queryKey: ['referral', referralId],
    queryFn: async () => {
      const referrals = await base44.entities.Referral.filter({ id: referralId });
      return referrals[0];
    },
    enabled: !!referralId,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['salesAgents'],
    queryFn: () => base44.entities.SalesAgent.list(),
    initialData: [],
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['referralActivities', referralId],
    queryFn: () => base44.entities.ReferralActivity.filter({ referral_id: referralId }),
    initialData: [],
    enabled: !!referralId,
  });

  const updateReferralMutation = useMutation({
    mutationFn: async (data) => {
      // Se mudou de stage, adicionar ao histórico
      if (data.stage && referral.stage !== data.stage) {
        const stageHistory = referral.stage_history || [];
        stageHistory.push({
          stage: data.stage,
          previous_stage: referral.stage,
          changed_at: new Date().toISOString(),
          changed_by: user?.email || 'Sistema',
        });
        data.stage_history = stageHistory;

        // Se fechou ganho, marcar como convertido
        if (data.stage === 'fechado_ganho') {
          data.status = 'convertido';
          data.converted_at = new Date().toISOString();
          data.commission_status = 'aprovada';
        }

        // Se perdeu, marcar como perdido
        if (data.stage === 'fechado_perdido') {
          data.status = 'perdido';
        }
      }

      return base44.entities.Referral.update(referralId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral', referralId] });
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      toast.success('✅ Indicação atualizada com sucesso!');
      setHasChanges(false);
      setEditedData({});
    },
  });

  const createActivityMutation = useMutation({
    mutationFn: (data) => base44.entities.ReferralActivity.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referralActivities', referralId] });
      toast.success('✅ Interação registrada com sucesso!');
    },
  });

  const handleActivityAdded = (activityData) => {
    createActivityMutation.mutate(activityData);
  };

  const handleFieldChange = (field, value) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    const dataToSave = { ...editedData };

    // Calcular estimated_value se mudou valores financeiros
    if (editedData.monthly_value !== undefined || editedData.adhesion_value !== undefined) {
      const monthly = parseFloat(editedData.monthly_value ?? referral.monthly_value ?? 0);
      const adhesion = parseFloat(editedData.adhesion_value ?? referral.adhesion_value ?? 0);
      dataToSave.estimated_value = monthly + adhesion;

      // Comissão fixa baseada no nível (NÃO recalcular, manter o valor original)
      // A comissão foi definida na criação baseada no nível do indicador naquele momento
    }

    updateReferralMutation.mutate(dataToSave);
  };

  const handleMarkAsLost = () => {
    if (!lostReason.trim()) {
      toast.error('Digite o motivo da perda');
      return;
    }

    updateReferralMutation.mutate({
      stage: 'fechado_perdido',
      status: 'perdido',
      lost_reason: lostReason,
    });

    setShowLostDialog(false);
    setLostReason("");
  };

  if (isLoading || !referral) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando indicação...</p>
        </div>
      </div>
    );
  }

  const currentStage = STAGES.find(s => s.value === (editedData.stage ?? referral.stage));
  const agent = agents.find(a => a.id === referral.agent_id);
  const isConverted = referral.status === 'convertido' || referral.stage === 'fechado_ganho';
  const isLost = referral.status === 'perdido' || referral.stage === 'fechado_perdido';

  // Determinar o badge do nível
  const levelBadge = referral.referrer_level === 2 ? (
    <Badge className="bg-amber-100 text-amber-800">⭐ Nível 2</Badge>
  ) : (
    <Badge className="bg-blue-100 text-blue-800">Nível 1</Badge>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl("ReferralPipeline"))}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Gift className="w-8 h-8 text-purple-600" />
                {referral.referred_name}
              </h1>
              <p className="text-gray-500 mt-1">
                Código: {referral.referral_code}
              </p>
            </div>
          </div>

          {hasChanges && (
            <Button
              onClick={handleSave}
              disabled={updateReferralMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateReferralMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Alterações
            </Button>
          )}
        </div>

        {/* Status Badges */}
        <div className="flex gap-2 mb-6">
          <Badge className={currentStage?.color}>
            {currentStage?.label}
          </Badge>
          {referral.commission_status === 'aprovada' && (
            <Badge className="bg-green-100 text-green-800">
              💰 Comissão Aprovada
            </Badge>
          )}
          {referral.commission_status === 'paga' && (
            <Badge className="bg-blue-100 text-blue-800">
              ✅ Comissão Paga
            </Badge>
          )}
          {isConverted && (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              Convertido
            </Badge>
          )}
          {isLost && (
            <Badge className="bg-red-100 text-red-800">
              <XCircle className="w-3 h-3 mr-1" />
              Perdido
            </Badge>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* INDICADOR */}
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <UserCheck className="w-5 h-5" />
                  Cliente Indicador
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-purple-700">Nome</Label>
                    <p className="font-semibold text-purple-900">{referral.referrer_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-purple-700">CPF</Label>
                    <p className="font-semibold text-purple-900">{referral.referrer_cpf}</p>
                  </div>
                  {referral.referrer_phone && (
                    <div>
                      <Label className="text-xs text-purple-700">Telefone</Label>
                      <p className="font-semibold text-purple-900">{referral.referrer_phone}</p>
                    </div>
                  )}
                  {referral.referrer_contract_id && (
                    <div>
                      <Label className="text-xs text-purple-700">Contrato</Label>
                      <p className="font-semibold text-purple-900">{referral.referrer_contract_id}</p>
                    </div>
                  )}
                </div>

                {/* Status do Indicador */}
                <div className="mt-4 pt-4 border-t border-purple-300">
                  <Label className="text-xs text-purple-700">Status de Indicador</Label>
                  <div className="flex items-center gap-2 mt-2">
                    {levelBadge}
                    <span className="text-sm text-gray-600">
                      {referral.referrer_total_conversions || 0} indicação{referral.referrer_total_conversions !== 1 ? 'ões' : ''} convertida{referral.referrer_total_conversions !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {referral.referrer_level === 2
                      ? "Cliente premium com 2 ou mais indicações convertidas"
                      : "Cliente precisava de mais 1 indicação para Nível 2 quando criou esta"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* DADOS DO INDICADO */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Dados do Indicado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome Completo</Label>
                    <Input
                      value={editedData.referred_name ?? referral.referred_name}
                      onChange={(e) => handleFieldChange('referred_name', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>CPF</Label>
                    <Input
                      value={editedData.referred_cpf ?? referral.referred_cpf ?? ""}
                      onChange={(e) => handleFieldChange('referred_cpf', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={editedData.referred_phone ?? referral.referred_phone}
                        onChange={(e) => handleFieldChange('referred_phone', e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(`https://wa.me/55${referral.referred_phone.replace(/\D/g, '')}`, '_blank')}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      value={editedData.referred_email ?? referral.referred_email ?? ""}
                      onChange={(e) => handleFieldChange('referred_email', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Endereço</Label>
                    <Input
                      value={editedData.referred_address ?? referral.referred_address ?? ""}
                      onChange={(e) => handleFieldChange('referred_address', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Data de Nascimento</Label>
                    <Input
                      type="date"
                      value={editedData.referred_birth_date ?? referral.referred_birth_date ?? ""}
                      onChange={(e) => handleFieldChange('referred_birth_date', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Relação</Label>
                    <Input
                      value={editedData.relationship ?? referral.relationship ?? ""}
                      onChange={(e) => handleFieldChange('relationship', e.target.value)}
                      placeholder="Ex: Amigo, Familiar"
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* VALORES */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Valores Financeiros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Valor Mensal</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editedData.monthly_value ?? referral.monthly_value ?? ""}
                      onChange={(e) => handleFieldChange('monthly_value', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Adesão</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editedData.adhesion_value ?? referral.adhesion_value ?? ""}
                      onChange={(e) => handleFieldChange('adhesion_value', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Dependentes</Label>
                    <Input
                      type="number"
                      value={editedData.total_dependents ?? referral.total_dependents ?? ""}
                      onChange={(e) => handleFieldChange('total_dependents', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                {referral.estimated_value > 0 && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">Valor Total Estimado</p>
                        <p className="text-2xl font-bold text-green-700">
                          R$ {referral.estimated_value.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Comissão (Fixo)</p>
                        <p className="text-2xl font-bold text-purple-700">
                          R$ {(referral.commission_value || 0).toFixed(2)}
                        </p>
                        {levelBadge}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* OBSERVAÇÕES */}
            {referral.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Observações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={editedData.notes ?? referral.notes}
                    onChange={(e) => handleFieldChange('notes', e.target.value)}
                    rows={4}
                  />
                </CardContent>
              </Card>
            )}

            {/* INTERAÇÕES E ATIVIDADES */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Interações com o Indicado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <AddActivityForm
                  referralId={referralId}
                  onActivityAdded={handleActivityAdded}
                  currentUserEmail={user?.email}
                />

                <div className="pt-4 border-t">
                  <ReferralTimeline activities={activities} />
                </div>
              </CardContent>
            </Card>

            {/* HISTÓRICO DE ETAPAS */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Histórico de Etapas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(referral.stage_history || []).reverse().map((history, index) => {
                    const stage = STAGES.find(s => s.value === history.stage);
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`w-3 h-3 rounded-full ${stage?.color.split(' ')[0]}`}></div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{stage?.label}</p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(history.changed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            {history.changed_by && ` • ${history.changed_by}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna Lateral */}
          <div className="space-y-6">
            {/* AÇÕES */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Alterar Etapa</Label>
                  <Select
                    value={editedData.stage ?? referral.stage}
                    onValueChange={(value) => handleFieldChange('stage', value)}
                  >
                    <SelectTrigger className="mt-1">
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

                {!isLost && !isConverted && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setShowLostDialog(true)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Marcar como Perdido
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(`https://wa.me/55${referral.referred_phone.replace(/\D/g, '')}`, '_blank')}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </CardContent>
            </Card>

            {/* INFORMAÇÕES */}
            <Card>
              <CardHeader>
                <CardTitle>Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <Label className="text-xs text-gray-500">Criado em</Label>
                  <p className="font-semibold">
                    {format(new Date(referral.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>

                {agent && (
                  <div>
                    <Label className="text-xs text-gray-500">Agente Responsável</Label>
                    <p className="font-semibold">{agent.name}</p>
                    {agent.team && (
                      <p className="text-xs text-gray-500">{agent.team}</p>
                    )}
                  </div>
                )}

                {referral.interest && (
                  <div>
                    <Label className="text-xs text-gray-500">Interesse</Label>
                    <p className="font-semibold">{referral.interest}</p>
                  </div>
                )}

                {referral.converted_at && (
                  <div>
                    <Label className="text-xs text-gray-500">Convertido em</Label>
                    <p className="font-semibold text-green-600">
                      {format(new Date(referral.converted_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-gray-500">Total de Interações</Label>
                  <p className="font-semibold text-blue-600">{activities.length}</p>
                </div>
              </CardContent>
            </Card>

            {/* COMISSÃO */}
            {referral.commission_value > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-800">💰 Comissão</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-blue-700">Valor</Label>
                    <p className="text-2xl font-bold text-blue-900">
                      R$ {referral.commission_value.toFixed(2)}
                    </p>
                    <div className="mt-2">
                      {levelBadge}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-blue-700">Status</Label>
                    <Badge className={
                      referral.commission_status === 'paga' ? 'bg-green-100 text-green-800' :
                        referral.commission_status === 'aprovada' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                    }>
                      {referral.commission_status === 'paga' ? '✅ Paga' :
                        referral.commission_status === 'aprovada' ? '👍 Aprovada' :
                          '⏳ Pendente'}
                    </Badge>
                  </div>
                  {referral.commission_paid_at && (
                    <div>
                      <Label className="text-xs text-blue-700">Data do Pagamento</Label>
                      <p className="text-sm font-semibold text-blue-900">
                        {format(new Date(referral.commission_paid_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                  <div className="pt-3 border-t border-blue-200">
                    <p className="text-xs text-gray-600">
                      Comissão definida no momento da criação baseada no nível do indicador ({referral.referrer_level === 2 ? 'Nível 2' : 'Nível 1'})
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Dialog Marcar como Perdido */}
      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar Indicação como Perdida</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Motivo da Perda *</Label>
              <Textarea
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="Descreva o motivo..."
                rows={4}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLostDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleMarkAsLost}
              disabled={!lostReason.trim() || updateReferralMutation.isPending}
            >
              {updateReferralMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Confirmar Perda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
