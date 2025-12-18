import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Loader2, Calendar, DollarSign, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function CollectionReports() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState('all');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: tickets = [] } = useQuery({
    queryKey: ['collectionTickets'],
    queryFn: async () => {
      const allTickets = await base44.entities.Ticket.list('-created_date', 1000);
      return allTickets.filter(t => t.ticket_type === 'collection');
    },
    initialData: [],
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list(),
    initialData: [],
  });

  const filteredTickets = tickets.filter(ticket => {
    const ticketDate = new Date(ticket.created_date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const inDateRange = ticketDate >= start && ticketDate <= end;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'resolved' && (ticket.status === 'resolved' || ticket.status === 'closed')) ||
      (statusFilter === 'active' && ticket.status !== 'resolved' && ticket.status !== 'closed');

    return inDateRange && matchesStatus;
  });

  const totalDebt = filteredTickets.reduce((sum, ticket) => {
    if (ticket.status === 'resolved' || ticket.status === 'closed') return sum;
    const desc = JSON.parse(ticket.description || '{}');
    return sum + (desc.debt_value || 0);
  }, 0);

  const recoveredAmount = filteredTickets.reduce((sum, ticket) => {
    if (ticket.status !== 'resolved' && ticket.status !== 'closed') return sum;
    const desc = JSON.parse(ticket.description || '{}');
    const agreement = desc.agreement;
    return sum + (agreement?.amount || 0);
  }, 0);

  const totalContacts = filteredTickets.reduce((sum, ticket) => {
    const desc = JSON.parse(ticket.description || '{}');
    return sum + (desc.contact_attempts?.length || 0);
  }, 0);

  const resolvedCount = filteredTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
  const activeCount = filteredTickets.length - resolvedCount;
  const recoveryRate = filteredTickets.length > 0 ? ((resolvedCount / filteredTickets.length) * 100).toFixed(1) : 0;

  const handleExportExcel = async () => {
    setIsGenerating(true);
    try {
      const data = filteredTickets.map(ticket => {
        const desc = JSON.parse(ticket.description || '{}');
        const agreement = desc.agreement;
        
        return {
          'Ticket ID': ticket.id.slice(0, 8),
          'Data Criação': format(new Date(ticket.created_date), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          'Cliente': ticket.subject.split(' - ')[1] || '',
          'Dias em Atraso': desc.days_overdue || 0,
          'Valor em Débito': `R$ ${(desc.debt_value || 0).toFixed(2)}`,
          'Plano': desc.plan || '-',
          'Prioridade': ticket.priority,
          'Status': ticket.status === 'resolved' || ticket.status === 'closed' ? 'Resolvido' : 'Em Cobrança',
          'Tentativas de Contato': desc.contact_attempts?.length || 0,
          'Acordo': agreement ? agreement.type : '-',
          'Valor Acordado': agreement ? `R$ ${agreement.amount.toFixed(2)}` : '-',
          'Data Resolução': ticket.resolved_at ? format(new Date(ticket.resolved_at), 'dd/MM/yyyy', { locale: ptBR }) : '-'
        };
      });

      // Converter para CSV
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-cobranca-${format(new Date(), 'dd-MM-yyyy')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Relatório Excel exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao gerar relatório');
    }
    setIsGenerating(false);
  };

  const handleExportPDF = async () => {
    setIsGenerating(true);
    try {
      toast.info('Gerando PDF...');
      
      // Criar HTML para o PDF
      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #dc2626; text-align: center; }
              .header { text-align: center; margin-bottom: 30px; }
              .stats { display: flex; justify-content: space-around; margin-bottom: 30px; }
              .stat-card { text-align: center; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
              .stat-value { font-size: 24px; font-weight: bold; color: #dc2626; }
              .stat-label { font-size: 12px; color: #666; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #dc2626; color: white; padding: 10px; text-align: left; font-size: 12px; }
              td { padding: 8px; border-bottom: 1px solid #ddd; font-size: 11px; }
              tr:hover { background-color: #f5f5f5; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>📊 Relatório de Cobrança</h1>
              <p>Período: ${format(new Date(startDate), 'dd/MM/yyyy')} até ${format(new Date(endDate), 'dd/MM/yyyy')}</p>
            </div>
            
            <div class="stats">
              <div class="stat-card">
                <div class="stat-value">R$ ${totalDebt.toFixed(2)}</div>
                <div class="stat-label">Total em Débito</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">R$ ${recoveredAmount.toFixed(2)}</div>
                <div class="stat-label">Valor Recuperado</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${resolvedCount}</div>
                <div class="stat-label">Acordos Feitos</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${recoveryRate}%</div>
                <div class="stat-label">Taxa de Recuperação</div>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Cliente</th>
                  <th>Dias Atraso</th>
                  <th>Débito</th>
                  <th>Status</th>
                  <th>Tentativas</th>
                  <th>Acordo</th>
                </tr>
              </thead>
              <tbody>
                ${filteredTickets.map(ticket => {
                  const desc = JSON.parse(ticket.description || '{}');
                  const agreement = desc.agreement;
                  const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';
                  
                  return `
                    <tr>
                      <td>#${ticket.id.slice(0, 8)}</td>
                      <td>${ticket.subject.split(' - ')[1] || ''}</td>
                      <td>${desc.days_overdue || 0} dias</td>
                      <td>R$ ${(desc.debt_value || 0).toFixed(2)}</td>
                      <td>${isResolved ? 'Resolvido' : 'Em Cobrança'}</td>
                      <td>${desc.contact_attempts?.length || 0}</td>
                      <td>${agreement ? agreement.type : '-'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
            
            <div class="footer">
              <p>Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} - Wescctech CRM</p>
            </div>
          </body>
        </html>
      `;

      // Criar blob e download
      const blob = new Blob([html], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-cobranca-${format(new Date(), 'dd-MM-yyyy')}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Relatório HTML exportado! Abra no navegador e imprima como PDF');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao gerar relatório');
    }
    setIsGenerating(false);
  };

  const setQuickPeriod = (period) => {
    const now = new Date();
    switch(period) {
      case 'today':
        setStartDate(format(now, 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case 'this_month':
        setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        break;
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Relatórios de Cobrança</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Exporte dados de cobrança em Excel ou PDF</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Filtros */}
          <Card className="lg:col-span-1 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <CardHeader className="border-b border-gray-200 dark:border-gray-800">
              <CardTitle className="text-gray-900 dark:text-gray-100">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label className="text-gray-900 dark:text-gray-100">Período Rápido</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={() => setQuickPeriod('today')}>
                    Hoje
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setQuickPeriod('this_month')}>
                    Este Mês
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setQuickPeriod('last_month')}>
                    Mês Passado
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-gray-900 dark:text-gray-100">Data Início</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 bg-white dark:bg-gray-800"
                />
              </div>

              <div>
                <Label className="text-gray-900 dark:text-gray-100">Data Fim</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 bg-white dark:bg-gray-800"
                />
              </div>

              <div>
                <Label className="text-gray-900 dark:text-gray-100">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="mt-1 bg-white dark:bg-gray-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Em Cobrança</SelectItem>
                    <SelectItem value="resolved">Resolvidos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t space-y-2">
                <Button
                  onClick={handleExportExcel}
                  disabled={isGenerating || filteredTickets.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4 mr-2" />
                  )}
                  Exportar Excel (CSV)
                </Button>

                <Button
                  onClick={handleExportPDF}
                  disabled={isGenerating || filteredTickets.length === 0}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4 mr-2" />
                  )}
                  Exportar PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resumo */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total em Débito</p>
                      <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                        R$ {totalDebt.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                    <div className="p-3 bg-red-600 rounded-xl">
                      <DollarSign className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Valor Recuperado</p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                        R$ {recoveredAmount.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                    <div className="p-3 bg-green-600 rounded-xl">
                      <TrendingUp className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Taxa de Recuperação</p>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                        {recoveryRate}%
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {resolvedCount} de {filteredTickets.length} tickets
                      </p>
                    </div>
                    <div className="p-3 bg-blue-600 rounded-xl">
                      <TrendingUp className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total de Tentativas</p>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                        {totalContacts}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Média: {filteredTickets.length > 0 ? (totalContacts / filteredTickets.length).toFixed(1) : 0} por ticket
                      </p>
                    </div>
                    <div className="p-3 bg-purple-600 rounded-xl">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Resumo do Período */}
            <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <CardHeader className="border-b border-gray-200 dark:border-gray-800">
                <CardTitle className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Resumo do Período
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Tickets Criados</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{filteredTickets.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Em Cobrança</p>
                    <Badge className="bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 text-lg px-3 py-1">
                      {activeCount}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Resolvidos</p>
                    <Badge className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 text-lg px-3 py-1">
                      {resolvedCount}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}