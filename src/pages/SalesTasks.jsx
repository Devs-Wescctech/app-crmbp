import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, CheckCircle2, Clock, AlertCircle, Plus, Activity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SalesTasks() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data: activities = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: () => base44.entities.Activity.list('-scheduled_for'),
    initialData: [],
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
    initialData: [],
  });

  const updateActivityMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Activity.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });

  const tasks = activities.filter(a => a.type === 'task');
  
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const overdueTasks = pendingTasks.filter(t => {
    if (!t.scheduled_for) return false;
    return new Date(t.scheduled_for) < new Date();
  });
  const todayTasks = pendingTasks.filter(t => {
    if (!t.scheduled_for) return false;
    const today = new Date();
    const taskDate = new Date(t.scheduled_for);
    return taskDate.toDateString() === today.toDateString();
  });

  const handleToggleComplete = (taskId, currentStatus) => {
    updateActivityMutation.mutate({
      id: taskId,
      data: {
        completed: !currentStatus,
        completed_at: !currentStatus ? new Date().toISOString() : null
      }
    });
  };

  const getLeadName = (leadId) => {
    const lead = leads.find(l => l.id === leadId);
    return lead?.name || 'Lead sem nome';
  };

  const filteredTasks = filter === 'all' ? tasks :
                        filter === 'pending' ? pendingTasks :
                        filter === 'completed' ? completedTasks :
                        filter === 'overdue' ? overdueTasks :
                        todayTasks;

  const priorityColors = {
    alta: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300",
    media: "bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300",
    baixa: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Tarefas & Follow-ups</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Gerencie suas atividades de vendas
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className={`border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-lg transition-all cursor-pointer ${filter === 'all' ? 'ring-2 ring-blue-500 dark:ring-blue-600' : ''}`}
          onClick={() => setFilter('all')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Todas</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{tasks.length}</p>
              </div>
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <Calendar className="w-8 h-8 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-lg transition-all cursor-pointer ${filter === 'pending' ? 'ring-2 ring-blue-500 dark:ring-blue-600' : ''}`}
          onClick={() => setFilter('pending')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pendentes</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{pendingTasks.length}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-950 rounded-xl">
                <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-lg transition-all cursor-pointer ${filter === 'overdue' ? 'ring-2 ring-red-500 dark:ring-red-600' : ''}`}
          onClick={() => setFilter('overdue')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Atrasadas</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">{overdueTasks.length}</p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-950 rounded-xl">
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-lg transition-all cursor-pointer ${filter === 'completed' ? 'ring-2 ring-green-500 dark:ring-green-600' : ''}`}
          onClick={() => setFilter('completed')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Concluídas</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{completedTasks.length}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-950 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <CardHeader className="border-b border-gray-200 dark:border-gray-800">
          <CardTitle className="text-gray-900 dark:text-gray-100">
            {filter === 'all' && 'Todas as Tarefas'}
            {filter === 'pending' && 'Tarefas Pendentes'}
            {filter === 'completed' && 'Tarefas Concluídas'}
            {filter === 'overdue' && 'Tarefas Atrasadas'}
            {filter === 'today' && 'Tarefas de Hoje'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {filteredTasks.map(task => {
              const isOverdue = task.scheduled_for && new Date(task.scheduled_for) < new Date() && !task.completed;
              
              return (
                <div 
                  key={task.id}
                  className={`p-4 border rounded-lg hover:shadow-md transition-all bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${
                    task.completed ? 'opacity-60' : ''
                  } ${isOverdue ? 'border-l-4 border-l-red-500 dark:border-l-red-600' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => handleToggleComplete(task.id, task.completed)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className={`font-semibold text-gray-900 dark:text-gray-100 ${task.completed ? 'line-through' : ''}`}>
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{task.description}</p>
                          )}
                          {task.lead_id && (
                            <Link 
                              to={`${createPageUrl("LeadDetail")}?id=${task.lead_id}`}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
                            >
                              Lead: {getLeadName(task.lead_id)}
                            </Link>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {task.priority && (
                            <Badge className={priorityColors[task.priority]}>
                              {task.priority}
                            </Badge>
                          )}
                          {task.scheduled_for && (
                            <div className={`text-sm flex items-center gap-1 ${
                              isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              <Calendar className="w-4 h-4" />
                              {format(new Date(task.scheduled_for), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredTasks.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p>Nenhuma tarefa encontrada</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}