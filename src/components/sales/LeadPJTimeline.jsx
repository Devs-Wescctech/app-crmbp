import React from "react";
import { 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  MessageSquare, 
  CheckCircle, 
  TrendingUp,
  User,
  Clock,
  AlertCircle,
  Building2,
  Presentation,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const getActivityIcon = (type) => {
  const icons = {
    call: Phone,
    email: Mail,
    meeting: Calendar,
    presentation: Presentation,
    note: FileText,
    stage_change: TrendingUp,
    task: CheckCircle,
  };
  return icons[type] || MessageSquare;
};

const getActivityColor = (type) => {
  const colors = {
    call: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950",
    email: "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-950",
    meeting: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-950",
    presentation: "text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-950",
    note: "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800",
    stage_change: "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-950",
    task: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-950",
  };
  return colors[type] || "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800";
};

const getActivityLabel = (type) => {
  const labels = {
    call: "Ligação",
    email: "E-mail",
    meeting: "Reunião",
    presentation: "Apresentação",
    note: "Nota",
    stage_change: "Mudança de Etapa",
    task: "Tarefa",
  };
  return labels[type] || type;
};

export default function LeadPJTimeline({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
        <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
        <p className="font-medium">Nenhuma atividade registrada</p>
        <p className="text-sm mt-1">As atividades aparecerão aqui</p>
      </div>
    );
  }

  const sortedActivities = [...activities].sort((a, b) => 
    new Date(b.created_date) - new Date(a.created_date)
  );

  return (
    <div className="space-y-4">
      {sortedActivities.map((activity, index) => {
        const Icon = getActivityIcon(activity.type);
        const colorClass = getActivityColor(activity.type);
        const isCompleted = activity.completed;

        return (
          <div key={activity.id} className="flex gap-4 relative">
            {/* Timeline line */}
            {index < sortedActivities.length - 1 && (
              <div className="absolute left-5 top-12 w-0.5 h-full bg-gray-200 dark:bg-gray-700 -z-10"></div>
            )}

            {/* Icon */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
              <Icon className="w-5 h-5" />
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {getActivityLabel(activity.type)}
                      </span>
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Concluída
                        </span>
                      )}
                    </div>
                    {activity.title && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {activity.title}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(activity.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>

                {activity.description && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {activity.description}
                  </p>
                )}

                {activity.scheduled_for && !isCompleted && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950 px-3 py-2 rounded">
                    <AlertCircle className="w-4 h-4" />
                    <span>
                      Agendado para {format(new Date(activity.scheduled_for), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                )}

                {activity.assigned_to && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <User className="w-3 h-3" />
                    <span>Responsável: {activity.assigned_to}</span>
                  </div>
                )}

                {activity.metadata && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                    {activity.metadata.from && activity.metadata.to && (
                      <span>De "{activity.metadata.from}" para "{activity.metadata.to}"</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}