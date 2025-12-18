
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapPin, Camera, Loader2, X, ArrowLeft, Save, Navigation, AlertTriangle, CheckCircle, ExternalLink, CheckCircle2, XCircle, Loader2 as LoaderIcon } from "lucide-react";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { debounce } from "lodash";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const INTERESTS = [
  "Essencial",
  "Total +",
  "Bom Med",
  "Bom Auto",
  "Bom Pet",
  "Bom Pet Saude",
  "Perola",
  "Rubi",
  "Topazio",
  "Outro"
];

export default function NewLead() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    birth_date: "",
    phone: "",
    email: "",
    interest: "",
    estimated_value: "",
    monthly_value: "",
    adhesion_value: "",
    total_dependents: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    cep: "",
    city: "",
    state: "",
    notes: "",
    agent_id: "",
    lgpd_consent: false,
  });

  const [location, setLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [duplicateFound, setDuplicateFound] = useState(null);
  const [duplicateType, setDuplicateType] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [whatsappValidation, setWhatsappValidation] = useState(null); // { valid: boolean, checking: boolean, message?: string, error?: boolean }

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['salesAgents'],
    queryFn: () => base44.entities.SalesAgent.filter({ active: true }),
    initialData: [],
  });

  const { data: allLeads = [] } = useQuery({
    queryKey: ['allLeads'],
    queryFn: () => base44.entities.Lead.list(),
    initialData: [],
  });

  // Auto-select agente se for agente (não supervisor)
  useEffect(() => {
    if (user && user.role !== 'admin') {
      // Buscar o agente vinculado ao usuário
      const userAgent = agents.find(a => a.user_email === user.email);
      if (userAgent && !formData.agent_id) {
        setFormData(prev => ({ ...prev, agent_id: userAgent.id }));
      }
    }
  }, [user, agents, formData.agent_id]);

  const createLeadMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.create(data),
    onSuccess: (newLead) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['allLeads'] });
      toast.success('Lead criado com sucesso!');
      navigate(`${createPageUrl("LeadDetail")}?id=${newLead.id}`);
    },
    onError: (error) => {
      toast.error('Erro ao criar lead: ' + error.message);
    }
  });

  // Agente selecionado
  const selectedAgent = agents.find(a => a.id === formData.agent_id);

  // 🆕 Validação de WhatsApp
  const validateWhatsApp = async (phone) => {
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setWhatsappValidation(null);
      return;
    }

    setWhatsappValidation({ checking: true, valid: null });

    try {
      const response = await base44.functions.invoke('validateWhatsApp', { phone });
      setWhatsappValidation({ 
        checking: false, 
        valid: response.data.valid,
        message: response.data.message 
      });
    } catch (error) {
      console.error('Erro ao validar WhatsApp:', error);
      setWhatsappValidation({ checking: false, valid: null, error: true });
    }
  };

  const debouncedValidateWhatsApp = debounce(validateWhatsApp, 1000);

  const getLocation = () => {
    setGettingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          
          setLocation({
            latitude: lat,
            longitude: lon,
          });

          setReverseGeocoding(true);
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=pt-BR`
            );
            const data = await response.json();
            
            if (data && data.address) {
              const addr = data.address;
              
              setFormData(prev => ({
                ...prev,
                street: addr.road || addr.street || "",
                number: addr.house_number || "",
                neighborhood: addr.neighbourhood || addr.suburb || addr.quarter || "",
                city: addr.city || addr.town || addr.village || "",
                state: addr.state || "",
                cep: addr.postcode || "",
                address: data.display_name || "",
              }));
              
              toast.success('Localização e endereço capturados!');
            }
          } catch (error) {
            console.error("Erro ao buscar endereço:", error);
            toast.error('Localização capturada, mas não foi possível obter o endereço automaticamente');
          }
          
          setReverseGeocoding(false);
          setGettingLocation(false);
        },
        (error) => {
          console.error("Erro ao obter localização:", error);
          toast.error("Não foi possível obter a localização. Por favor, informe o endereço manualmente.");
          setGettingLocation(false);
        }
      );
    } else {
      toast.error("Geolocalização não disponível neste dispositivo.");
      setGettingLocation(false);
    }
  };

  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setPhotos([...photos, {
        name: file.name,
        url: result.file_url,
        size: file.size,
        type: file.type,
      }]);
      toast.success('Foto adicionada!');
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error('Erro ao fazer upload da foto');
    }
    setUploading(false);
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const formatCEP = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 8) {
      return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
    }
    return value;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, phone: formatted });
    
    // 🆕 Validar WhatsApp após digitar
    debouncedValidateWhatsApp(formatted);
  };

  const handleCPFChange = (e) => {
    const formatted = formatCPF(e.target.value);
    setFormData({ ...formData, cpf: formatted });
  };

  const handleCEPChange = (e) => {
    const formatted = formatCEP(e.target.value);
    setFormData({ ...formData, cep: formatted });
  };

  const checkForDuplicates = async (phone, cpf) => {
    if (!phone && !cpf) {
      setDuplicateFound(null);
      setDuplicateType(null);
      return null;
    }

    const activeLeads = allLeads.filter(l => !l.concluded && !l.lost);

    let duplicateByPhone = null;
    if (phone) {
      const phoneNumbers = phone.replace(/\D/g, '');
      if (phoneNumbers.length >= 10) {
        duplicateByPhone = activeLeads.find(l => {
          const leadPhone = l.phone?.replace(/\D/g, '');
          return leadPhone === phoneNumbers;
        });
      }
    }

    let duplicateByCPF = null;
    if (cpf) {
      const cpfNumbers = cpf.replace(/\D/g, '');
      if (cpfNumbers.length === 11) {
        duplicateByCPF = activeLeads.find(l => {
          const leadCPF = l.cpf?.replace(/\D/g, '');
          return leadCPF && leadCPF === cpfNumbers;
        });
      }
    }

    const duplicate = duplicateByPhone || duplicateByCPF;
    setDuplicateFound(duplicate);
    setDuplicateType(duplicateByPhone ? 'phone' : duplicateByCPF ? 'cpf' : null);
    
    return duplicate;
  };

  // Debounced real-time validation
  const debouncedCheckDuplicates = debounce((phone, cpf) => {
    setCheckingDuplicate(true);
    checkForDuplicates(phone, cpf).finally(() => {
      setCheckingDuplicate(false);
    });
  }, 800);

  useEffect(() => {
    if (formData.phone || formData.cpf) {
      debouncedCheckDuplicates(formData.phone, formData.cpf);
    } else {
      setDuplicateFound(null);
      setDuplicateType(null);
    }
  }, [formData.phone, formData.cpf]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.phone) {
      toast.error('Telefone é obrigatório!');
      return;
    }

    if (!formData.agent_id) {
      toast.error('Agente responsável é obrigatório!');
      return;
    }

    if (!formData.lgpd_consent) {
      toast.error('É necessário o consentimento LGPD!');
      return;
    }

    if (duplicateFound) {
      setShowDuplicateModal(true);
      return;
    }

    const now = new Date().toISOString();
    
    let fullAddress = '';
    if (formData.street) {
      fullAddress = formData.street;
      if (formData.number) fullAddress += `, ${formData.number}`;
      if (formData.complement) fullAddress += ` - ${formData.complement}`;
      if (formData.neighborhood) fullAddress += ` - ${formData.neighborhood}`;
      if (formData.city) fullAddress += ` - ${formData.city}`;
      if (formData.state) fullAddress += `/${formData.state}`;
      if (formData.cep) fullAddress += ` - CEP: ${formData.cep}`;
    }
    
    const leadData = {
      ...formData,
      estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
      monthly_value: formData.monthly_value ? parseFloat(formData.monthly_value) : null,
      adhesion_value: formData.adhesion_value ? parseFloat(formData.adhesion_value) : null,
      total_dependents: formData.total_dependents ? parseInt(formData.total_dependents) : null,
      address: fullAddress || formData.address,
      latitude: location?.latitude,
      longitude: location?.longitude,
      photos: photos,
      stage: "novo",
      source: "manual",
      lgpd_consent_date: now,
      stage_history: [
        {
          stage: "novo",
          previous_stage: null,
          changed_at: now,
          changed_by: user?.email || "Sistema",
        }
      ],
    };

    createLeadMutation.mutate(leadData);
  };

  const getAgentName = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || 'Desconhecido';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl("LeadsKanban"))}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Novo Lead</h1>
              <p className="text-gray-500 mt-1">Cadastre um novo lead no sistema</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Alerta de Duplicata em Tempo Real */}
            {checkingDuplicate && (
              <Alert className="border-blue-200 bg-blue-50">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Verificando se este lead já existe...
                </AlertDescription>
              </Alert>
            )}

            {duplicateFound && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <AlertDescription className="text-orange-900">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold mb-1">⚠️ Lead já cadastrado!</p>
                      <p className="text-sm">
                        <strong>{duplicateFound.name || 'Sem nome'}</strong> - {duplicateFound.phone}
                      </p>
                      <p className="text-xs text-orange-700 mt-1">
                        Stage: {duplicateFound.stage} • Criado em {new Date(duplicateFound.created_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDuplicateModal(true)}
                      className="border-orange-300 text-orange-700 hover:bg-orange-100"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Ver Detalhes
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {!duplicateFound && formData.phone && formData.phone.replace(/\D/g, '').length >= 10 && !checkingDuplicate && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  ✅ Nenhuma duplicata encontrada
                </AlertDescription>
              </Alert>
            )}

            {/* Dados Pessoais */}
            <Card>
              <CardHeader>
                <CardTitle>Dados Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome Completo</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome do lead"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>CPF</Label>
                    <Input
                      value={formData.cpf}
                      onChange={handleCPFChange}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className={`mt-1 ${duplicateFound && duplicateType === 'cpf' ? 'border-orange-400 focus:ring-orange-400' : ''}`}
                    />
                    {duplicateType === 'cpf' && (
                      <p className="text-xs text-orange-600 mt-1">⚠️ CPF já cadastrado</p>
                    )}
                  </div>

                  <div>
                    <Label>Data de Nascimento</Label>
                    <Input
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Telefone/WhatsApp *</Label>
                    <div className="relative">
                      <Input
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                        className={`mt-1 pr-10 ${
                          duplicateFound && duplicateType === 'phone' ? 'border-orange-400 focus:ring-orange-400' : 
                          whatsappValidation?.valid === true ? 'border-green-400 focus:ring-green-400' :
                          whatsappValidation?.valid === false ? 'border-red-400 focus:ring-red-400' : ''
                        }`}
                        required
                      />
                      {whatsappValidation?.checking && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <LoaderIcon className="w-4 h-4 animate-spin text-blue-500" />
                        </div>
                      )}
                      {!whatsappValidation?.checking && whatsappValidation?.valid === true && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </div>
                      )}
                      {!whatsappValidation?.checking && whatsappValidation?.valid === false && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <XCircle className="w-4 h-4 text-red-600" />
                        </div>
                      )}
                    </div>
                    {duplicateType === 'phone' && (
                      <p className="text-xs text-orange-600 mt-1">⚠️ Telefone já cadastrado</p>
                    )}
                    {whatsappValidation?.checking && (
                      <p className="text-xs text-blue-600 mt-1">🔍 Verificando WhatsApp...</p>
                    )}
                    {!whatsappValidation?.checking && whatsappValidation?.valid === true && (
                      <p className="text-xs text-green-600 mt-1">✅ WhatsApp válido - Envios disponíveis</p>
                    )}
                    {!whatsappValidation?.checking && whatsappValidation?.valid === false && (
                      <p className="text-xs text-red-600 mt-1">❌ Este número não possui WhatsApp ativo</p>
                    )}
                  </div>

                  <div>
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Interesse</Label>
                    <Select value={formData.interest} onValueChange={(val) => setFormData({ ...formData, interest: val })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione o produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {INTERESTS.map(interest => (
                          <SelectItem key={interest} value={interest}>{interest}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 🆕 VALORES FINANCEIROS */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  💰 Valores Financeiros
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Valor Mensal Estimado</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.monthly_value}
                      onChange={(e) => setFormData({ ...formData, monthly_value: e.target.value })}
                      placeholder="R$ 0,00"
                      className="mt-1 bg-white"
                    />
                    <p className="text-xs text-gray-600 mt-1">Valor que o cliente pagará mensalmente</p>
                  </div>

                  <div>
                    <Label>Valor da Adesão</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.adhesion_value}
                      onChange={(e) => setFormData({ ...formData, adhesion_value: e.target.value })}
                      placeholder="R$ 60,00"
                      className="mt-1 bg-white"
                    />
                    <p className="text-xs text-gray-600 mt-1">Taxa de adesão (se aplicável)</p>
                  </div>

                  <div>
                    <Label>Número de Dependentes</Label>
                    <Input
                      type="number"
                      value={formData.total_dependents}
                      onChange={(e) => setFormData({ ...formData, total_dependents: e.target.value })}
                      placeholder="0"
                      className="mt-1 bg-white"
                    />
                    <p className="text-xs text-gray-600 mt-1">Quantidade de dependentes (se aplicável)</p>
                  </div>

                  <div>
                    <Label>Receita Total Estimada</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.estimated_value}
                      onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                      placeholder="R$ 0,00"
                      className="mt-1 bg-white"
                    />
                    <p className="text-xs text-gray-600 mt-1">Valor total que este lead pode trazer</p>
                  </div>
                </div>

                {(formData.monthly_value || formData.adhesion_value) && (
                  <div className="pt-4 border-t border-green-200">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      {formData.monthly_value && (
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-xs text-gray-600">Mensal</p>
                          <p className="text-lg font-bold text-green-700">
                            R$ {parseFloat(formData.monthly_value).toFixed(2)}
                          </p>
                        </div>
                      )}
                      {formData.adhesion_value && (
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-xs text-gray-600">Adesão</p>
                          <p className="text-lg font-bold text-green-700">
                            R$ {parseFloat(formData.adhesion_value).toFixed(2)}
                          </p>
                        </div>
                      )}
                      {formData.estimated_value && (
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-xs text-gray-600">Total Estimado</p>
                          <p className="text-lg font-bold text-green-700">
                            R$ {parseFloat(formData.estimated_value).toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Localização */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Localização
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={getLocation}
                  disabled={gettingLocation || reverseGeocoding || location}
                  className="w-full bg-white"
                >
                  {gettingLocation ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Obtendo localização...
                    </>
                  ) : reverseGeocoding ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Buscando endereço...
                    </>
                  ) : location ? (
                    <>
                      <MapPin className="w-4 h-4 mr-2 text-green-600" />
                      Localização capturada ✓
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4 mr-2" />
                      Capturar Localização GPS
                    </>
                  )}
                </Button>

                {location && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                    <p className="text-green-700">
                      ✅ Localização capturada: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Endereço */}
            <Card>
              <CardHeader>
                <CardTitle>Endereço</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label>Rua/Logradouro</Label>
                    <Input
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      placeholder="Nome da rua"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Número</Label>
                    <Input
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      placeholder="123"
                      className="mt-1"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Complemento</Label>
                    <Input
                      value={formData.complement}
                      onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                      placeholder="Apto, bloco, etc"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>CEP</Label>
                    <Input
                      value={formData.cep}
                      onChange={handleCEPChange}
                      placeholder="00000-000"
                      maxLength={9}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Bairro</Label>
                    <Input
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      placeholder="Nome do bairro"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Cidade</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Nome da cidade"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Estado</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="SP"
                      maxLength={2}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fotos */}
            <Card>
              <CardHeader>
                <CardTitle>Fotos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {photos.map((photo, idx) => (
                      <div key={idx} className="relative">
                        <img src={photo.url} alt={`Foto ${idx + 1}`} className="w-full h-32 object-cover rounded-lg" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6"
                          onClick={() => removePhoto(idx)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="text-center">
                    <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500">
                      {uploading ? 'Fazendo upload...' : 'Adicionar foto'}
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </CardContent>
            </Card>

            {/* Observações e Agente - ATUALIZADO */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Adicionais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notas sobre o lead..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-1">
                    Agente Responsável <span className="text-red-600">*</span>
                  </Label>
                  <Select 
                    value={formData.agent_id} 
                    onValueChange={(val) => setFormData({ ...formData, agent_id: val })}
                    disabled={user?.role !== 'admin' && formData.agent_id}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione um agente" />
                    </SelectTrigger>
                    <SelectContent>
                      {user?.role === 'admin' ? (
                        agents.map(agent => (
                          <SelectItem key={agent.id} value={agent.id}>
                            <div className="flex items-center gap-2">
                              {agent.photo_url && (
                                <img src={agent.photo_url} alt={agent.name} className="w-6 h-6 rounded-full object-cover" />
                              )}
                              <span>{agent.name}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        agents
                          .filter(a => a.user_email === user?.email)
                          .map(agent => (
                            <SelectItem key={agent.id} value={agent.id}>
                              <div className="flex items-center gap-2">
                                {agent.photo_url && (
                                  <img src={agent.photo_url} alt={agent.name} className="w-6 h-6 rounded-full object-cover" />
                                )}
                                <span>{agent.name}</span>
                              </div>
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                  {user?.role !== 'admin' && formData.agent_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      Você está automaticamente atribuído a este lead
                    </p>
                  )}
                </div>

                {/* 🆕 CARD DO AGENTE SELECIONADO */}
                {selectedAgent && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold text-blue-900 mb-3">👤 Agente Selecionado:</p>
                    <div className="flex items-center gap-4">
                      {selectedAgent.photo_url ? (
                        <img 
                          src={selectedAgent.photo_url} 
                          alt={selectedAgent.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-blue-300"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-blue-200 flex items-center justify-center border-2 border-blue-300">
                          <span className="text-2xl font-bold text-blue-700">
                            {selectedAgent.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-900">{selectedAgent.name}</p>
                        <p className="text-sm text-gray-600">📞 {selectedAgent.phone}</p>
                        {selectedAgent.email && (
                          <p className="text-sm text-gray-600">📧 {selectedAgent.email}</p>
                        )}
                        {selectedAgent.region && (
                          <p className="text-xs text-gray-500 mt-1">📍 {selectedAgent.region}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* LGPD */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="lgpd"
                    checked={formData.lgpd_consent}
                    onCheckedChange={(checked) => setFormData({ ...formData, lgpd_consent: checked })}
                    className="mt-1"
                  />
                  <label htmlFor="lgpd" className="text-sm leading-tight cursor-pointer">
                    <strong className="text-blue-900">Cliente autorizou o uso de seus dados pessoais *</strong>
                    <p className="text-blue-700 mt-1">
                      Conforme Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018)
                    </p>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Botões */}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(createPageUrl("LeadsKanban"))}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!formData.phone || !formData.agent_id || !formData.lgpd_consent || createLeadMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {createLeadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Lead
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Modal de Lead Duplicado */}
      <Dialog open={showDuplicateModal} onOpenChange={setShowDuplicateModal}>
        <DialogContent className="max-w-2xl">
          <CardHeader className="bg-orange-50 dark:bg-orange-950">
            <CardTitle className="text-orange-900 dark:text-orange-100 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              ⚠️ Lead Já Existe
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <AlertDescription className="text-orange-900 dark:text-orange-100">
                <strong>Este lead já está sendo trabalhado por outro agente.</strong>
                <br />
                Por questões de segurança e organização, você pode visualizar os dados mas não pode editar.
              </AlertDescription>
            </Alert>

            {duplicateFound && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div>
                    <Label className="text-xs text-gray-500">Nome</Label>
                    <p className="font-medium">{duplicateFound.name || 'Sem nome'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Telefone</Label>
                    <p className="font-medium">{duplicateFound.phone}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">CPF</Label>
                    <p className="font-medium">{duplicateFound.cpf || 'Não informado'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Stage</Label>
                    <Badge className="bg-blue-100 text-blue-800">
                      {duplicateFound.stage}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Agente Responsável</Label>
                    <p className="font-medium text-blue-600">
                      {getAgentName(duplicateFound.agent_id)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Criado em</Label>
                    <p className="font-medium">
                      {format(new Date(duplicateFound.created_date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {duplicateFound.notes && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <Label className="text-xs text-gray-500">Observações</Label>
                    <p className="text-sm mt-1">{duplicateFound.notes}</p>
                  </div>
                )}

                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>💡 O que fazer?</strong>
                    <br />
                    • Entre em contato com <strong>{getAgentName(duplicateFound.agent_id)}</strong> para mais informações
                    <br />
                    • Se for um cliente diferente, verifique os dados antes de cadastrar
                    <br />
                    • Em caso de dúvidas, consulte seu supervisor
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowDuplicateModal(false)}
                className="flex-1"
              >
                Fechar
              </Button>
              {user?.role === 'admin' && (
                <Button
                  onClick={() => navigate(`${createPageUrl("LeadDetail")}?id=${duplicateFound.id}`)}
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver Detalhes (Admin)
                </Button>
              )}
            </div>
          </CardContent>
        </DialogContent>
      </Dialog>
    </div>
  );
}
