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
import { 
  DollarSign, 
  Gift, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter,
  Download,
  Eye,
  Activity,
  TrendingUp,
  Users,
  Target
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ReferralCommissions() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentData, setPaymentData] = useState({
    payment_method: 'pix',
    notes: '',
  });

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['referrals'],
    queryFn: () => base44.entities.Referral.list('-created_date'),
    initialData: [],
  });

  const updateCommissionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Referral.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      toast.success('✅ Comissão atualizada com sucesso!');
      setShowPaymentDialog(false);
      setSelectedCommission(null);
      setPaymentData({ payment_method: 'pix', notes: '' });
    },
  });

  // Filtrar referrals com comissão
  const commissionsData = referrals
    .filter(r => r.commission_value && r.commission_value > 0)
    .map(r => ({
      ...r,
      referrer_display: r.referrer_name || 'Sem nome',
    }));

  const filteredCommissions = statusFilter === 'all' 
    ? commissionsData
    : commissionsData.filter(c => c.commission_status === statusFilter);

  // Métricas
  const totalCommissions = commissionsData.reduce((sum, c) => sum + (c.commission_value || 0), 0);
  const pendingCommissions = commissionsData.filter(c => c.commission_status === 'pendente');
  const approvedCommissions = commissionsData.filter(c => c.commission_status === 'aprovada');
  const paidCommissions = commissionsData.filter(c => c.commission_status === 'paga');

  const totalPending = pendingCommissions.reduce((sum, c) => sum + c.commission_value, 0);
  const totalApproved = approvedCommissions.reduce((sum, c) => sum + c.commission_value, 0);
  const totalPaid = paidCommissions.reduce((sum, c) => sum + c.commission_value, 0);

  const handleApproveCommission = (commission) => {
    updateCommissionMutation.mutate({
      id: commission.id,
      data: {
        commission_status: 'aprovada',
      }
    });
  };

  const handleOpenPaymentDialog = (commission) => {
    setSelectedCommission(commission);
    setShowPaymentDialog(true);
  };

  const handlePayCommission = () => {
    if (!paymentData.payment_method) {
      toast.error('Selecione a forma de pagamento');
      return;
    }

    updateCommissionMutation.mutate({
      id: selectedCommission.id,
      data: {
        commission_status: 'paga',
        commission_paid_at: new Date().toISOString(),
        commission_payment_method: paymentData.payment_method,
        commission_notes: paymentData.notes,
      }
    });
  };

  const handleCancelCommission = (commission) => {
    if (confirm('Tem certeza que deseja cancelar esta comissão?')) {
      updateCommissionMutation.mutate({
        id: commission.id,
        data: {
          commission_status: 'cancelada',
        }
      });
    }
  };

  const exportToCSV = () => {
    const csv = [
      ['Código', 'Indicador', 'Indicado', 'Valor Venda', 'Comissão', 'Status', 'Data Conversão'],
      ...filteredCommissions.map(c => [
        c.referral_code,
        c.referrer_name,
        c.referred_name,
        `R$ ${(c.estimated_value || 0).toFixed(2)}`,
        `R$ ${c.commission_value.toFixed(2)}`,
        c.commission_status,
        c.converted_at ? format(new Date(c.converted_at), 'dd/MM/yyyy') : '-'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comissoes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

    toast.success('📥 Relatório exportado!');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paga':
        return <Badge className="bg-green-100 text-green-800">✅ Paga</Badge>;
      case 'aprovada':
        return <Badge className="bg-blue-100 text-blue-800">👍 Aprovada</Badge>;
      case 'cancelada':
        return <Badge className="bg-red-100 text-red-800">❌ Cancelada</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">⏳ Pendente</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-8 h-8 text-purple-600" />
              Gestão de Comissões
            </h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Gerencie pagamentos de comissões de indicações
            </p>
          </div>
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Dashboard Mini */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-medium">Total em Comissões</p>
                  <p className="text-2xl font-bold text-gray-700">R$ {totalCommissions.toFixed(0)}</p>
                </div>
                <Gift className="w-8 h-8 text-gray-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-600 font-medium">Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-700">R$ {totalPending.toFixed(0)}</p>
                  <p className="text-xs text-yellow-600">{pendingCommissions.length} indicações</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Aprovadas</p>
                  <p className="text-2xl font-bold text-blue-700">R$ {totalApproved.toFixed(0)}</p>
                  <p className="text-xs text-blue-600">{approvedCommissions.length} indicações</p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Pagas</p>
                  <p className="text-2xl font-bold text-green-700">R$ {totalPaid.toFixed(0)}</p>
                  <p className="text-xs text-green-600">{paidCommissions.length} indicações</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Status da Comissão</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="pendente">Pendentes</SelectItem>
                    <SelectItem value="aprovada">Aprovadas</SelectItem>
                    <SelectItem value="paga">Pagas</SelectItem>
                    <SelectItem value="cancelada">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Comissões */}
        <Card>
          <CardHeader>
            <CardTitle>
              Comissões ({filteredCommissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300 animate-pulse" />
                <p>Carregando...</p>
              </div>
            ) : filteredCommissions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Gift className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Nenhuma comissão encontrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCommissions.map(commission => (
                  <div
                    key={commission.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-all bg-white"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900">
                            {commission.referrer_display}
                          </h4>
                          {getStatusBadge(commission.commission_status)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-gray-500">Código</p>
                            <p className="font-medium">{commission.referral_code}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Indicado</p>
                            <p className="font-medium">{commission.referred_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Valor da Venda</p>
                            <p className="font-medium text-green-600">
                              R$ {(commission.estimated_value || 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Comissão (10%)</p>
                            <p className="text-lg font-bold text-purple-600">
                              R$ {commission.commission_value.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {commission.converted_at && (
                          <p className="text-xs text-gray-500 mt-2">
                            Convertido em: {format(new Date(commission.converted_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        )}

                        {commission.commission_paid_at && (
                          <p className="text-xs text-green-600 mt-2">
                            Pago em: {format(new Date(commission.commission_paid_at), "dd/MM/yyyy", { locale: ptBR })}
                            {commission.commission_payment_method && ` • ${commission.commission_payment_method}`}
                          </p>
                        )}

                        {commission.commission_notes && (
                          <p className="text-xs text-gray-600 mt-2 italic">
                            {commission.commission_notes}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Link to={`${createPageUrl("ReferralDetail")}?id=${commission.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-3 h-3 mr-1" />
                            Ver
                          </Button>
                        </Link>

                        {commission.commission_status === 'pendente' && (
                          <Button
                            size="sm"
                            onClick={() => handleApproveCommission(commission)}
                            disabled={updateCommissionMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Aprovar
                          </Button>
                        )}

                        {commission.commission_status === 'aprovada' && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenPaymentDialog(commission)}
                            disabled={updateCommissionMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <DollarSign className="w-3 h-3 mr-1" />
                            Pagar
                          </Button>
                        )}

                        {(commission.commission_status === 'pendente' || commission.commission_status === 'aprovada') && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancelCommission(commission)}
                            disabled={updateCommissionMutation.isPending}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog Registrar Pagamento */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento de Comissão</DialogTitle>
          </DialogHeader>
          {selectedCommission && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-gray-600">Indicador</p>
                <p className="font-semibold text-gray-900">{selectedCommission.referrer_name}</p>
                <p className="text-2xl font-bold text-purple-600 mt-2">
                  R$ {selectedCommission.commission_value.toFixed(2)}
                </p>
              </div>

              <div>
                <Label>Forma de Pagamento *</Label>
                <Select
                  value={paymentData.payment_method}
                  onValueChange={(value) => setPaymentData({ ...paymentData, payment_method: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                    <SelectItem value="desconto_mensalidade">Desconto na Mensalidade</SelectItem>
                    <SelectItem value="credito_conta">Crédito na Conta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  placeholder="Informações adicionais sobre o pagamento..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handlePayCommission}
              disabled={!paymentData.payment_method || updateCommissionMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}