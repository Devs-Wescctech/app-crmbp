
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Search, 
  Phone, 
  User, 
  Calendar,
  MapPin,
  Mail,
  FileText,
  Loader2,
  ExternalLink,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createPageUrl } from "@/utils";

export default function LeadSearch() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("all"); // all, phone, cpf, name

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allLeads = [], isLoading } = useQuery({
    queryKey: ['allLeads'],
    queryFn: () => base44.entities.Lead.list('-created_date'),
    initialData: [],
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['salesAgents'],
    queryFn: () => base44.entities.SalesAgent.list(),
    initialData: [],
  });

  const normalizeString = (str) => {
    if (!str) return '';
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const getFilteredLeads = () => {
    // Aplicar filtro de permissão PRIMEIRO
    let leadsToFilter = allLeads;
    
    // Se não for admin, filtrar apenas próprios leads
    if (user && user.role !== 'admin') {
      const userAgent = agents.find(a => a.user_email === user.email);
      if (userAgent) {
        leadsToFilter = allLeads.filter(l => l.agent_id === userAgent.id);
      } else {
        // If user is not admin and no agent is found, they see no leads.
        // This prevents showing all leads by default if agent mapping is missing.
        leadsToFilter = []; 
      }
    }

    if (!searchQuery.trim()) {
      return leadsToFilter.slice(0, 20); // Mostrar últimos 20 se não houver busca
    }

    const query = normalizeString(searchQuery);
    const queryNumbers = searchQuery.replace(/\D/g, '');

    return leadsToFilter.filter(lead => {
      // Busca por telefone
      if (searchType === 'all' || searchType === 'phone') {
        const leadPhone = lead.phone?.replace(/\D/g, '') || '';
        if (leadPhone.includes(queryNumbers)) return true;
      }

      // Busca por CPF
      if (searchType === 'all' || searchType === 'cpf') {
        const leadCPF = lead.cpf?.replace(/\D/g, '') || '';
        if (leadCPF.includes(queryNumbers)) return true;
      }

      // Busca por nome
      if (searchType === 'all' || searchType === 'name') {
        const leadName = normalizeString(lead.name || '');
        if (leadName.includes(query)) return true;
      }

      // Busca por email
      if (searchType === 'all') {
        const leadEmail = normalizeString(lead.email || '');
        if (leadEmail.includes(query)) return true;
      }

      return false;
    });
  };

  const filteredLeads = getFilteredLeads();

  const getStageColor = (stage) => {
    const colors = {
      novo: 'bg-gray-100 text-gray-800',
      abordado: 'bg-blue-100 text-blue-800',
      qualificado: 'bg-purple-100 text-purple-800',
      proposta_enviada: 'bg-yellow-100 text-yellow-800',
      fechado_ganho: 'bg-green-100 text-green-800',
      fechado_perdido: 'bg-red-100 text-red-800',
      reengajar: 'bg-orange-100 text-orange-800',
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  const getStageLabel = (stage) => {
    const labels = {
      novo: 'Novo',
      abordado: 'Abordado',
      qualificado: 'Qualificado',
      proposta_enviada: 'Proposta Enviada',
      fechado_ganho: 'Fechado - Ganho',
      fechado_perdido: 'Fechado - Perdido',
      reengajar: 'Reengajar',
    };
    return labels[stage] || stage;
  };

  // Calcular stats apenas dos leads que o usuário pode ver
  const visibleLeads = user && user.role !== 'admin' 
    ? allLeads.filter(l => {
        const userAgent = agents.find(a => a.user_email === user.email);
        return userAgent && l.agent_id === userAgent.id;
      })
    : allLeads;

  const stats = {
    total: visibleLeads.length,
    active: visibleLeads.filter(l => !l.concluded && !l.lost).length,
    concluded: visibleLeads.filter(l => l.concluded).length,
    lost: visibleLeads.filter(l => l.lost).length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Search className="w-8 h-8 text-blue-600" />
            Busca de Leads - Pipeline Comercial
          </h1>
          <p className="text-gray-500 mt-1">
            Busca inteligente de leads do pipeline de vendas por telefone, CPF, nome ou e-mail
          </p>
        </div>

        {/* Alerta Informativo */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Info className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Pipeline Comercial:</strong> Esta busca é exclusiva para leads do processo comercial de vendas. 
            Para buscar tickets de <strong>Pré-Venda</strong> ou <strong>Pós-Venda</strong>, 
            acesse o menu "Pré e Pós Vendas" → "Tickets de Vendas".
          </AlertDescription>
        </Alert>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total de Leads</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  {user?.role !== 'admin' && (
                    <p className="text-xs text-gray-500">Seus leads</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Leads Ativos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                  <p className="text-xs text-gray-500">No pipeline</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vendas Fechadas</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.concluded}</p>
                  <p className="text-xs text-gray-500">Concluídos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Leads Perdidos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.lost}</p>
                  <p className="text-xs text-gray-500">Sem conversão</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Busca */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Buscar Lead no Pipeline Comercial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-5 gap-4">
              <div className="md:col-span-4">
                <Label>Buscar por</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Digite telefone, CPF, nome ou e-mail do lead..."
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label>Filtro</Label>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="w-full mt-1 h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos os campos</option>
                  <option value="phone">Apenas Telefone</option>
                  <option value="cpf">Apenas CPF</option>
                  <option value="name">Apenas Nome</option>
                </select>
              </div>
            </div>

            {searchQuery && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <AlertCircle className="w-4 h-4" />
                <span>
                  {filteredLeads.length} lead(s) encontrado(s) no pipeline comercial
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resultados */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLeads.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {searchQuery ? 'Nenhum lead encontrado' : 'Digite algo para buscar'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchQuery 
                      ? 'Nenhum lead no pipeline comercial corresponde à sua busca'
                      : 'Use a busca acima para encontrar leads do pipeline de vendas'
                    }
                  </p>
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg inline-block">
                    <p className="text-sm text-blue-800">
                      <strong>Dica:</strong> Se está procurando tickets de Pré-Venda ou Pós-Venda, 
                      acesse "Pré e Pós Vendas" → "Tickets de Vendas"
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredLeads.map(lead => (
                <Card 
                  key={lead.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`${createPageUrl("LeadDetail")}?id=${lead.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {lead.name || 'Sem nome'}
                              </h3>
                              <Badge className={getStageColor(lead.stage)}>
                                {getStageLabel(lead.stage)}
                              </Badge>
                              {lead.concluded && (
                                <Badge className="bg-green-100 text-green-700">
                                  ✅ Venda Fechada
                                </Badge>
                              )}
                              {lead.lost && (
                                <Badge className="bg-red-100 text-red-700">
                                  ❌ Lead Perdido
                                </Badge>
                              )}
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                              {lead.phone && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Phone className="w-4 h-4" />
                                  <span>{lead.phone}</span>
                                </div>
                              )}

                              {lead.cpf && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <User className="w-4 h-4" />
                                  <span>{lead.cpf}</span>
                                </div>
                              )}

                              {lead.email && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Mail className="w-4 h-4" />
                                  <span>{lead.email}</span>
                                </div>
                              )}

                              {lead.interest && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <FileText className="w-4 h-4" />
                                  <span>{lead.interest}</span>
                                </div>
                              )}

                              {lead.address && (
                                <div className="flex items-center gap-2 text-gray-600 md:col-span-2">
                                  <MapPin className="w-4 h-4" />
                                  <span className="truncate">{lead.address}</span>
                                </div>
                              )}

                              <div className="flex items-center gap-2 text-gray-600">
                                <Calendar className="w-4 h-4" />
                                <span>
                                  Criado em {format(new Date(lead.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                            </div>

                            {lead.notes && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600 line-clamp-2">{lead.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`${createPageUrl("LeadDetail")}?id=${lead.id}`);
                        }}
                      >
                        <ExternalLink className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {!searchQuery && filteredLeads.length === 20 && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Mostrando os 20 leads mais recentes do pipeline comercial. Use a busca para encontrar outros.
          </div>
        )}
      </div>
    </div>
  );
}
