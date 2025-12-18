import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MapPin, MessageSquare, FileText, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const getActivityIcon = (type) => {
  const iconMap = {
    call: Phone,
    whatsapp: MessageSquare,
    email: Mail,
    visit: MapPin,
    note: FileText,
    stage_change: CheckCircle,
    task: Clock,
  };
  return iconMap[type] || FileText;
};

const getActivityColor = (type) => {
  const colorMap = {
    call: "text-blue-600 bg-blue-100",
    whatsapp: "text-green-600 bg-green-100",
    email: "text-purple-600 bg-purple-100",
    visit: "text-orange-600 bg-orange-100",
    note: "text-gray-600 bg-gray-100",
    stage_change: "text-indigo-600 bg-indigo-100",
    task: "text-yellow-600 bg-yellow-100",
  };
  return colorMap[type] || "text-gray-600 bg-gray-100";
};

const getActivityLabel = (type) => {
  const labelMap = {
    call: "Ligação",
    whatsapp: "WhatsApp",
    email: "E-mail",
    visit: "Visita",
    note: "Nota",
    stage_change: "Mudança de Etapa",
    task: "Tarefa",
  };
  return labelMap[type] || type;
};

export default function ReferralTimeline({ activities = [] }) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Nenhuma atividade registrada</p>
      </div>
    );
  }

  const sortedActivities = [...activities].sort((a, b) => 
    new Date(b.created_date) - new Date(a.created_date)
  );

  return (
    <div className="space-y-4">
      {sortedActivities.map((activity, idx) => {
        const Icon = getActivityIcon(activity.type);
        const colorClass = getActivityColor(activity.type);
        
        return (
          <div key={activity.id || idx} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`p-2 rounded-full ${colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              {idx < sortedActivities.length - 1 && (
                <div className="w-px h-full bg-gray-200 mt-2"></div>
              )}
            </div>
            
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <Badge variant="outline" className="text-xs mb-1">
                    {getActivityLabel(activity.type)}
                  </Badge>
                  <h4 className="font-medium text-gray-900">
                    {activity.title || activity.description}
                  </h4>
                </div>
                <span className="text-xs text-gray-500">
                  {format(new Date(activity.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
              </div>
              
              {activity.description && activity.title && (
                <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
              )}
              
              {activity.completed !== undefined && (
                <Badge className={activity.completed ? "bg-green-100 text-green-700 mt-2" : "bg-yellow-100 text-yellow-700 mt-2"}>
                  {activity.completed ? "Concluída" : "Pendente"}
                </Badge>
              )}
              
              {activity.metadata?.stage_from && activity.metadata?.stage_to && (
                <div className="mt-2 text-xs text-gray-500">
                  <p>
                    De: <strong>{activity.metadata.stage_from}</strong> → Para: <strong>{activity.metadata.stage_to}</strong>
                  </p>
                </div>
              )}
              
              {activity.assigned_to && (
                <p className="text-xs text-gray-500 mt-1">
                  Responsável: {activity.assigned_to}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}