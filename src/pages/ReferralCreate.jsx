
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, UserPlus, Loader2, CheckCircle, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge"; // Added Badge import

const INTERESTS = [
  "Essencial",
  "Total Mais",
  "Bom Med",
  "Bom Auto",
  "Bom Pet",
  "Bom Pet Saúde",
  "Pérola",
  "Rubi",
  "Topázio"
];

// Função para formatar CPF
const formatCPF = (value) => {
  const cleanValue = value.replace(/\D/g, '');
  if (cleanValue.length <= 11) {
    return cleanValue
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return value;
};

export default function ReferralCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Estado da busca do indicador
  const [referrerCPF, setReferrerCPF] = useState("");
  const [searchingReferrer, setSearchingReferrer] = useState(false);
  const [referrerData, setReferrerData] = useState(null);
  const [referrerLevel, setReferrerLevel] = useState(1);
  const [referrerConversions, setReferrerConversions] = useState(0);
  
  // Dados do indicado
  const [formData, setFormData] = useState({
    referred_name: "",
    referred_cpf: "",
    referred_phone: "",
    referred_email: "",
    referred_address: "",
    referred_birth_date: "",
    relationship: "",
    interest: "",
    monthly_value: "",
    adhesion_value: "",
    total_dependents: "",
    notes: "",
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

  const createReferralMutation = useMutation({
    mutationFn: (data) => base44.entities.Referral.create(data),
    onSuccess: (newReferral) => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      toast.success('✅ Indicação cadastrada com sucesso!');
      navigate(`${createPageUrl("ReferralDetail")}?id=${newReferral.id}`);
    },
    onError: (error) => {
      toast.error('Erro ao criar indicação: ' + error.message);
    }
  });

  const handleSearchReferrer = async () => {
    if (!referrerCPF || referrerCPF.replace(/\D/g, '').length < 11) {
      toast.error('Digite um CPF válido');
      return;
    }

    setSearchingReferrer(true);
    setReferrerData(null);
    
    try {
      console.log('🔍 Buscando cliente indicador no ERP...');
      
      const cpfClean = referrerCPF.replace(/\D/g, '');
      
      const response = await base44.functions.invoke('getCustomerFromERP', {
        cpf: cpfClean,
      });

      console.log('📥 Resposta da função:', response.data);

      if (!response.data.success) {
        if (response.data.noContract) {
          toast.error("⚠️ CPF sem contrato ativo", {
            description: "Este cliente não possui contrato ativo no ERP",
            duration: 5000,
          });
          setSearchingReferrer(false);
          return;
        }
        
        if (response.data.notFound) {
          toast.error("CPF não encontrado no ERP");
        } else {
          toast.error(response.data.error || "Erro ao buscar dados no ERP");
        }
        setSearchingReferrer(false);
        return;
      }

      const erpData = response.data.data;
      console.log('✅ Dados recebidos:', erpData);

      // Estruturar dados do indicador
      const indicadorData = {
        nome: erpData.contact.name,
        cpf: erpData.contact.document,
        telefone: erpData.contact.phones?.[0] || '',
        email: erpData.contact.emails?.[0] || '',
        contrato: erpData.contracts?.[0]?.numero_contrato_erp || '',
        erp_raw: erpData
      };

      // Buscar histórico de indicações do indicador
      const previousReferrals = await base44.entities.Referral.filter({
        referrer_cpf: cpfClean,
        status: 'convertido'
      });

      const totalConversions = previousReferrals.length;
      const level = totalConversions >= 2 ? 2 : 1;

      setReferrerConversions(totalConversions);
      setReferrerLevel(level);
      setReferrerData(indicadorData);
      
      const commissionValueForToast = level === 2 ? 150 : 100;
      toast.success(`✅ Cliente encontrado: ${indicadorData.nome}`, {
        description: `Nível ${level} - Comissão: R$ ${commissionValueForToast},00 (${totalConversions} indicação${totalConversions !== 1 ? 'ões' : ''} convertida${totalConversions !== 1 ? 's' : ''})`,
        duration: 5000,
      });

    } catch (error) {
      console.error('❌ Erro ao buscar cliente:', error);
      
      if (error.response?.status === 404 || error.message?.includes('404')) {
        if (error.response?.data?.noContract) {
          toast.error("⚠️ CPF sem contrato ativo", {
            description: "Este cliente não possui contrato ativo no ERP",
            duration: 5000,
          });
        } else {
          toast.error("CPF não encontrado no ERP");
        }
      } else {
        toast.error("Erro ao buscar cliente: " + (error.message || 'Erro desconhecido'));
      }
    }
    
    setSearchingReferrer(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!referrerData) {
      toast.error('Busque o cliente indicador primeiro!');
      return;
    }

    if (!formData.referred_name || !formData.referred_phone) {
      toast.error('Preencha nome e telefone do indicado!');
      return;
    }

    // Calcular valor estimado
    const monthlyValue = parseFloat(formData.monthly_value || 0);
    const adhesionValue = parseFloat(formData.adhesion_value || 0);
    const estimatedValue = monthlyValue + adhesionValue;

    // Comissão fixa baseada no nível do indicador
    const commissionValue = referrerLevel === 2 ? 150 : 100;

    // Gerar código único
    const referralCode = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Encontrar agente do usuário atual
    const userAgent = agents.find(a => a.user_email === user?.email);

    const referralData = {
      referral_code: referralCode,
      referrer_cpf: referrerCPF.replace(/\D/g, ''),
      referrer_name: referrerData.nome,
      referrer_phone: referrerData.telefone,
      referrer_email: referrerData.email,
      referrer_contract_id: referrerData.contrato,
      referrer_erp_data: referrerData.erp_raw,
      referrer_level: referrerLevel,
      referrer_total_conversions: referrerConversions,
      ...formData,
      referred_cpf: formData.referred_cpf ? formData.referred_cpf.replace(/\D/g, '') : '',
      referred_phone: formData.referred_phone.replace(/\D/g, ''),
      total_dependents: formData.total_dependents ? parseInt(formData.total_dependents) : null,
      monthly_value: monthlyValue > 0 ? monthlyValue : null,
      adhesion_value: adhesionValue > 0 ? adhesionValue : null,
      estimated_value: estimatedValue > 0 ? estimatedValue : null,
      commission_value: commissionValue,
      agent_id: userAgent?.id,
      stage: "novo",
      status: "ativo",
      stage_history: [
        {
          stage: "novo",
          previous_stage: null,
          changed_at: new Date().toISOString(),
          changed_by: user?.email || "Sistema",
        }
      ],
    };

    createReferralMutation.mutate(referralData);
  };

  // Calcular comissão para exibição
  const commissionValue = referrerLevel === 2 ? 150 : 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-6">
      <div className="max-w-5xl mx-auto">
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
                Nova Indicação
              </h1>
              <p className="text-gray-500 mt-1">Cadastre uma nova indicação de cliente</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. BUSCAR CLIENTE INDICADOR */}
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <Search className="w-5 h-5" />
                  1. Buscar Cliente Indicador
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-purple-900">CPF do Cliente (Quem está indicando)</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={referrerCPF}
                      onChange={(e) => setReferrerCPF(formatCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      className="bg-white"
                      maxLength={14}
                    />
                    <Button
                      onClick={handleSearchReferrer}
                      disabled={searchingReferrer || referrerCPF.replace(/\D/g, '').length < 11}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {searchingReferrer ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-purple-700 mt-1">
                    Digite o CPF do cliente para buscar no ERP Bom Pastor
                  </p>
                </div>

                {searchingReferrer && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <p className="text-sm text-blue-800">Buscando dados no ERP...</p>
                    </div>
                  </div>
                )}

                {referrerData && (
                  <div className="p-4 bg-white rounded-lg border-2 border-purple-300">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-900">Cliente Encontrado!</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><strong>Nome:</strong> {referrerData.nome}</p>
                      <p><strong>CPF:</strong> {referrerData.cpf}</p>
                      <p><strong>Telefone:</strong> {referrerData.telefone}</p>
                      {referrerData.email && <p><strong>Email:</strong> {referrerData.email}</p>}
                      {referrerData.contrato && (
                        <p><strong>Contrato:</strong> {referrerData.contrato}</p>
                      )}
                      <div className="mt-3 pt-3 border-t border-purple-200">
                        <p className="text-xs text-purple-700 mb-2">Status de Indicador:</p>
                        <div className="flex items-center gap-2">
                          <Badge className={referrerLevel === 2 ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}>
                            {referrerLevel === 2 ? "⭐ Nível 2" : "Nível 1"}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {referrerConversions} indicação{referrerConversions !== 1 ? 'ões' : ''} convertida{referrerConversions !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {referrerLevel === 2 
                            ? "Cliente já possui 2 ou mais indicações convertidas. Comissão por venda: R$ 150,00" 
                            : referrerConversions === 1
                            ? "Próxima indicação convertida eleva para Nível 2 (R$ 150,00)"
                            : "Primeira indicação. Comissão por venda: R$ 100,00"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. DADOS DO INDICADO */}
            {referrerData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    2. Dados do Indicado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label>Nome Completo *</Label>
                        <Input
                          value={formData.referred_name}
                          onChange={(e) => setFormData({...formData, referred_name: e.target.value})}
                          required
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>CPF</Label>
                        <Input
                          value={formData.referred_cpf}
                          onChange={(e) => setFormData({...formData, referred_cpf: e.target.value})}
                          placeholder="000.000.000-00"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Telefone/WhatsApp *</Label>
                        <Input
                          value={formData.referred_phone}
                          onChange={(e) => setFormData({...formData, referred_phone: e.target.value})}
                          placeholder="(00) 00000-0000"
                          required
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={formData.referred_email}
                          onChange={(e) => setFormData({...formData, referred_email: e.target.value})}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Data de Nascimento</Label>
                        <Input
                          type="date"
                          value={formData.referred_birth_date}
                          onChange={(e) => setFormData({...formData, referred_birth_date: e.target.value})}
                          className="mt-1"
                        />
                      </div>

                      <div className="col-span-2">
                        <Label>Endereço Completo</Label>
                        <Input
                          value={formData.referred_address}
                          onChange={(e) => setFormData({...formData, referred_address: e.target.value})}
                          placeholder="Rua, número, bairro, cidade"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Relação com Indicador</Label>
                        <Input
                          value={formData.relationship}
                          onChange={(e) => setFormData({...formData, relationship: e.target.value})}
                          placeholder="Ex: Amigo, Familiar, Vizinho"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Interesse</Label>
                        <Select value={formData.interest} onValueChange={(value) => setFormData({...formData, interest: value})}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecione o plano" />
                          </SelectTrigger>
                          <SelectContent>
                            {INTERESTS.map(interest => (
                              <SelectItem key={interest} value={interest}>
                                {interest}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Valores */}
                    <div className="grid grid-cols-3 gap-4 p-4 bg-green-50 rounded-lg border border-green-200 mt-4">
                      <div>
                        <Label className="text-green-800">Valor Mensal</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.monthly_value}
                          onChange={(e) => setFormData({...formData, monthly_value: e.target.value})}
                          placeholder="0.00"
                          className="mt-1 bg-white"
                        />
                      </div>

                      <div>
                        <Label className="text-green-800">Adesão</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.adhesion_value}
                          onChange={(e) => setFormData({...formData, adhesion_value: e.target.value})}
                          placeholder="0.00"
                          className="mt-1 bg-white"
                        />
                      </div>

                      <div>
                        <Label className="text-green-800">Dependentes</Label>
                        <Input
                          type="number"
                          value={formData.total_dependents}
                          onChange={(e) => setFormData({...formData, total_dependents: e.target.value})}
                          placeholder="0"
                          className="mt-1 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Observações</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        rows={3}
                        placeholder="Informações adicionais sobre a indicação..."
                        className="mt-1"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={createReferralMutation.isPending}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white text-lg py-6"
                    >
                      {createReferralMutation.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Cadastrando...
                        </>
                      ) : (
                        <>
                          <Gift className="w-5 h-5 mr-2" />
                          Cadastrar Indicação
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AGENTE RESPONSÁVEL */}
            <Card className="border-indigo-200 bg-indigo-50">
              <CardHeader>
                <CardTitle className="text-indigo-800 text-lg">👤 Agente Responsável</CardTitle>
              </CardHeader>
              <CardContent>
                {agents.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-indigo-900">
                      <strong>
                        {agents.find(a => a.user_email === user?.email)?.name || "Você"}
                      </strong>
                    </p>
                    <p className="text-xs text-gray-600">
                      Você será o responsável por esta indicação
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-indigo-900">
                    Você será o responsável
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-800 text-lg">💰 Comissão</CardTitle>
              </CardHeader>
              <CardContent>
                {referrerData ? (
                  <>
                    <div className="p-4 bg-white rounded-lg border-2 border-blue-300 mb-3">
                      <p className="text-xs text-gray-600 mb-1">Comissão para esta Indicação:</p>
                      <p className="text-3xl font-bold text-blue-700">
                        R$ {commissionValue.toFixed(2)}
                      </p>
                      <Badge className={referrerLevel === 2 ? "bg-amber-100 text-amber-800 mt-2" : "bg-blue-100 text-blue-800 mt-2"}>
                        {referrerLevel === 2 ? "⭐ Nível 2" : "Nível 1"}
                      </Badge>
                    </div>
                    <p className="text-xs text-blue-900">
                      {referrerLevel === 2 
                        ? "Cliente premium com 2+ indicações convertidas." 
                        : "Após 2 indicações fechadas, a comissão sobe para R$ 150,00."}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-blue-900">
                    Busque o cliente indicador para ver o valor da comissão baseado no nível dele.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="text-purple-800 text-lg">ℹ️ Como Funciona</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-purple-900 space-y-2">
                <p>✅ <strong>1.</strong> Busque o cliente indicador pelo CPF</p>
                <p>✅ <strong>2.</strong> Preencha os dados do indicado</p>
                <p>✅ <strong>3.</strong> A indicação entra no pipeline</p>
                <p>✅ <strong>4.</strong> Quando fechar, comissão é gerada</p>
                <div className="mt-3 pt-3 border-t border-purple-300">
                  <p className="font-semibold mb-2">💎 Sistema de Níveis:</p>
                  <p className="text-xs">• <strong>Nível 1:</strong> R$ 100,00 por venda convertida</p>
                  <p className="text-xs">• <strong>Nível 2:</strong> R$ 150,00 por venda convertida (após 2 indicações fechadas)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
