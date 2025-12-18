import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle,
  Navigation,
  Filter,
  TrendingUp,
  Target,
  Activity,
  ChevronLeft,
  ChevronRight,
  Plus,
  MessageSquare,
  Mail,
  User
} from "lucide-react";
import { format, startOfWeek, endOfWeek, addDays, isSameDay, isToday, isPast, isFuture, parseISO, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import CheckInButton from "@/components/sales/CheckInButton";

const ACTIVITY_TYPES = {
  visit: { label: "Visita", icon: MapPin, color: "bg-blue-500", bgLight: "bg-blue-50 dark:bg-blue-950", textColor: "text-blue-700 dark:text-blue-300" },
  call: { label: "Ligação", icon: Phone, color: "bg-green-500", bgLight: "bg-green-50 dark:bg-green-950", textColor: "text-green-700 dark:text-green-300" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "bg-emerald-500", bgLight: "bg-emerald-50 dark:bg-emerald-950", textColor: "text-emerald-700 dark:text-emerald-300" },
  email: { label: "E-mail", icon: Mail, color: "bg-purple-500", bgLight: "bg-purple-50 dark:bg-purple-950", textColor: "text-purple-700 dark:text-purple-300" },
  task: { label: "Tarefa", icon: CheckCircle2, color: "bg-orange-500", bgLight: "bg-orange-50 dark:bg-orange-950", textColor: "text-orange-700 dark:text-orange-300" },
};

export default function SalesAgenda() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('day'); // day, week, month
  const [filterType, setFilterType] = useState('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['salesAgents'],
    queryFn: () => base44.entities.SalesAgent.list(),
    initialData: [],
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: () => base44.entities.Activity.list('-scheduled_for', 200),
    initialData: [],
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
    initialData: [],
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['visits'],
    queryFn: () => base44.entities.Visit.list('-check_in_at', 100),
    initialData: [],
  });

  // Pegar agente atual
  const currentAgent = agents.find(a => a.user_email === user?.email);

  // Filtrar atividades do agente
  const myActivities = activities.filter(act => {
    if (!currentAgent) return false;
    return act.assigned_to === user?.email || act.assigned_to === currentAgent.id;
  });

  // Filtrar por tipo
  const filteredActivities = filterType === 'all' 
    ? myActivities 
    : myActivities.filter(act => act.type === filterType);

  // Atividades de hoje
  const today = new Date();
  const todayActivities = filteredActivities.filter(act => {
    if (!act.scheduled_for) return false;
    return isSameDay(parseISO(act.scheduled_for), today);
  });

  // Atividades atrasadas
  const overdueActivities = filteredActivities.filter(act => {
    if (!act.scheduled_for || act.completed) return false;
    return isPast(parseISO(act.scheduled_for)) && !isSameDay(parseISO(act.scheduled_for), today);
  });

  // Próximas atividades (próximos 7 dias)
  const upcomingActivities = filteredActivities.filter(act => {
    if (!act.scheduled_for || act.completed) return false;
    const actDate = parseISO(act.scheduled_for);
    return isFuture(actDate) && !isSameDay(actDate, today);
  }).slice(0, 10);

  // Atividades do dia selecionado
  const selectedDateActivities = filteredActivities.filter(act => {
    if (!act.scheduled_for) return false;
    return isSameDay(parseISO(act.scheduled_for), selectedDate);
  });

  // Visitas do dia
  const todayVisits = visits.filter(v => {
    if (!v.check_in_at) return false;
    return isSameDay(parseISO(v.check_in_at), today);
  });

  // Estatísticas do dia
  const todayCompleted = todayActivities.filter(a => a.completed).length;
  const todayPending = todayActivities.filter(a => !a.completed).length;

  // Estatísticas da semana
  const weekStart = startOfWeek(today, { locale: ptBR });
  const weekEnd = endOfWeek(today, { locale: ptBR });
  const weekActivities = filteredActivities.filter(act => {
    if (!act.scheduled_for) return false;
    const actDate = parseISO(act.scheduled_for);
    return actDate >= weekStart && actDate <= weekEnd;
  });
  const weekCompleted = weekActivities.filter(a => a.completed).length;

  const getLeadName = (leadId) => {
    const lead = leads.find(l => l.id === leadId);
    return lead?.name || 'Lead sem nome';
  };

  const getActivityIcon = (type) => {
    return ACTIVITY_TYPES[type]?.icon || Activity;
  };

  const getActivityColor = (type) => {
    return ACTIVITY_TYPES[type] || ACTIVITY_TYPES.task;
  };

  // Gerar dias do calendário mensal
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
  
  const calendarDays = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  const getActivitiesForDay = (day) => {
    return filteredActivities.filter(act => {
      if (!act.scheduled_for) return false;
      return isSameDay(parseISO(act.scheduled_for), day);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Agenda de Vendas</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Organize suas visitas e follow-ups
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
              <Link to={createPageUrl("NewLead")}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Lead
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">Hoje</p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{todayActivities.length}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {todayCompleted} concluídas
                  </p>
                </div>
                <CalendarIcon className="w-10 h-10 text-blue-600 dark:text-blue-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-700 dark:text-orange-300">Atrasadas</p>
                  <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{overdueActivities.length}</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    Requer atenção
                  </p>
                </div>
                <AlertCircle className="w-10 h-10 text-orange-600 dark:text-orange-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 dark:text-green-300">Esta Semana</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">{weekActivities.length}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {weekCompleted} concluídas
                  </p>
                </div>
                <Target className="w-10 h-10 text-green-600 dark:text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 dark:text-purple-300">Visitas Hoje</p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{todayVisits.length}</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    Realizadas
                  </p>
                </div>
                <MapPin className="w-10 h-10 text-purple-600 dark:text-purple-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Timeline/Agenda */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Minha Agenda</CardTitle>
                  <Tabs value={viewMode} onValueChange={setViewMode} className="w-auto">
                    <TabsList>
                      <TabsTrigger value="day">Dia</TabsTrigger>
                      <TabsTrigger value="week">Semana</TabsTrigger>
                      <TabsTrigger value="month">Mês</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                {viewMode === 'day' && (
                  <div className="space-y-4">
                    {/* Seletor de Data */}
                    <div className="flex items-center justify-between pb-4 border-b">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <div className="text-center">
                        <h3 className="text-lg font-semibold">
                          {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {isToday(selectedDate) ? 'Hoje' : format(selectedDate, "EEEE", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isToday(selectedDate) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedDate(new Date())}
                          >
                            Hoje
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Atividades do Dia */}
                    <div className="space-y-3">
                      {selectedDateActivities.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p>Nenhuma atividade agendada para este dia</p>
                        </div>
                      ) : (
                        selectedDateActivities
                          .sort((a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for))
                          .map(activity => {
                            const actType = getActivityColor(activity.type);
                            const Icon = getActivityIcon(activity.type);
                            const lead = leads.find(l => l.id === activity.lead_id);

                            return (
                              <Card 
                                key={activity.id}
                                className={`${activity.completed ? 'opacity-60' : ''} hover:shadow-md transition-all`}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg ${actType.color}`}>
                                      <Icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <h4 className={`font-semibold ${activity.completed ? 'line-through' : ''}`}>
                                            {activity.title}
                                          </h4>
                                          {activity.description && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                              {activity.description}
                                            </p>
                                          )}
                                          {activity.lead_id && (
                                            <Link 
                                              to={`${createPageUrl("LeadDetail")}?id=${activity.lead_id}`}
                                              className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-2"
                                            >
                                              <User className="w-3 h-3" />
                                              {getLeadName(activity.lead_id)}
                                            </Link>
                                          )}
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                          <div className="flex items-center gap-1 text-sm text-gray-500">
                                            <Clock className="w-4 h-4" />
                                            {format(parseISO(activity.scheduled_for), "HH:mm")}
                                          </div>
                                          {activity.completed ? (
                                            <Badge className="bg-green-100 text-green-700">
                                              <CheckCircle2 className="w-3 h-3 mr-1" />
                                              Concluída
                                            </Badge>
                                          ) : (
                                            activity.type === 'visit' && lead && (
                                              <CheckInButton lead={lead} />
                                            )
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })
                      )}
                    </div>
                  </div>
                )}

                {viewMode === 'week' && (
                  <div className="space-y-4">
                    {/* Week View */}
                    <div className="grid grid-cols-7 gap-2">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, idx) => (
                        <div key={idx} className="text-center text-xs font-semibold text-gray-600 py-2">
                          {day}
                        </div>
                      ))}
                      {[...Array(7)].map((_, idx) => {
                        const day = addDays(weekStart, idx);
                        const dayActivities = getActivitiesForDay(day);
                        
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedDate(day);
                              setViewMode('day');
                            }}
                            className={`min-h-[100px] p-2 border rounded-lg transition-all ${
                              isToday(day) ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            <div className="text-sm font-semibold mb-2">
                              {format(day, 'd')}
                            </div>
                            <div className="space-y-1">
                              {dayActivities.slice(0, 3).map((act, i) => {
                                const actType = getActivityColor(act.type);
                                return (
                                  <div
                                    key={i}
                                    className={`text-xs px-1 py-0.5 rounded ${actType.bgLight} ${actType.textColor} truncate`}
                                  >
                                    {act.title}
                                  </div>
                                );
                              })}
                              {dayActivities.length > 3 && (
                                <div className="text-xs text-gray-500">
                                  +{dayActivities.length - 3}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {viewMode === 'month' && (
                  <div className="space-y-4">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between pb-4 border-b">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <h3 className="text-lg font-semibold">
                        {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, idx) => (
                        <div key={idx} className="text-center text-xs font-semibold text-gray-600 py-2">
                          {day}
                        </div>
                      ))}
                      {calendarDays.map((day, idx) => {
                        const dayActivities = getActivitiesForDay(day);
                        const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                        
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedDate(day);
                              setViewMode('day');
                            }}
                            className={`min-h-[80px] p-2 border rounded-lg transition-all ${
                              isToday(day) ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 ring-2 ring-blue-200' : 
                              !isCurrentMonth ? 'opacity-40' :
                              'hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            <div className={`text-sm font-semibold mb-1 ${isToday(day) ? 'text-blue-600' : ''}`}>
                              {format(day, 'd')}
                            </div>
                            {dayActivities.length > 0 && (
                              <div className="flex items-center justify-center">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-xs ml-1">{dayActivities.length}</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to={createPageUrl("SalesRoutes")}>
                  <Button variant="outline" className="w-full justify-start">
                    <Navigation className="w-4 h-4 mr-2" />
                    Ver Rota do Dia
                  </Button>
                </Link>
                <Link to={createPageUrl("LeadsKanban")}>
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Pipeline de Vendas
                  </Button>
                </Link>
                <Link to={createPageUrl("SalesTasks")}>
                  <Button variant="outline" className="w-full justify-start">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Todas as Tarefas
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Atrasadas */}
            {overdueActivities.length > 0 && (
              <Card className="border-orange-200 dark:border-orange-800">
                <CardHeader className="bg-orange-50 dark:bg-orange-950">
                  <CardTitle className="text-base text-orange-900 dark:text-orange-100 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Atrasadas ({overdueActivities.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    {overdueActivities.slice(0, 5).map(activity => {
                      const actType = getActivityColor(activity.type);
                      return (
                        <div
                          key={activity.id}
                          className={`p-2 rounded border ${actType.bgLight} ${actType.textColor} border-orange-200 dark:border-orange-800`}
                        >
                          <p className="text-sm font-semibold truncate">{activity.title}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {format(parseISO(activity.scheduled_for), "dd/MM 'às' HH:mm")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Próximas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Próximas Atividades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {upcomingActivities.slice(0, 5).map(activity => {
                    const actType = getActivityColor(activity.type);
                    return (
                      <div
                        key={activity.id}
                        className={`p-2 rounded border ${actType.bgLight}`}
                      >
                        <p className="text-sm font-semibold truncate">{activity.title}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {format(parseISO(activity.scheduled_for), "dd/MM 'às' HH:mm")}
                        </p>
                      </div>
                    );
                  })}
                  {upcomingActivities.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Nenhuma atividade futura
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}