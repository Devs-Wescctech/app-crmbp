import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MapPin, MessageSquare, FileText, CheckCircle, Clock, Users } from "lucide-react";
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

export default function LeadTimeline({ activities = [], visits = [] }) {
  // Combinar atividades e visitas em uma única timeline
  const timelineItems = [
    ...activities.map(a => ({ ...a, itemType: 'activity' })),
    ...visits.map(v => ({ 
      ...v, 
      itemType: 'visit',
      type: 'visit',
      title: 'Check-in realizado',
      description: v.notes,
      created_date: v.check_in_at 
    }))
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  if (timelineItems.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Nenhuma atividade registrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {timelineItems.map((item, idx) => {
        const Icon = getActivityIcon(item.type);
        const colorClass = getActivityColor(item.type);
        
        return (
          <div key={idx} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`p-2 rounded-full ${colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              {idx < timelineItems.length - 1 && (
                <div className="w-px h-full bg-gray-200 mt-2"></div>
              )}
            </div>
            
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <Badge variant="outline" className="text-xs mb-1">
                    {getActivityLabel(item.type)}
                  </Badge>
                  <h4 className="font-medium text-gray-900">
                    {item.title || item.description}
                  </h4>
                </div>
                <span className="text-xs text-gray-500">
                  {format(new Date(item.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
              </div>
              
              {item.description && item.title && (
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              )}
              
              {item.itemType === 'visit' && item.check_out_at && (
                <div className="mt-2 text-xs text-gray-500">
                  <p>Duração: {item.duration_minutes} minutos</p>
                  {item.outcome && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      Resultado: {item.outcome}
                    </Badge>
                  )}
                </div>
              )}
              
              {item.completed !== undefined && (
                <Badge className={item.completed ? "bg-green-100 text-green-700 mt-2" : "bg-yellow-100 text-yellow-700 mt-2"}>
                  {item.completed ? "Concluída" : "Pendente"}
                </Badge>
              )}
              
              {item.metadata && (
                <div className="mt-2 text-xs text-gray-500">
                  {item.metadata.stage_from && item.metadata.stage_to && (
                    <p>
                      De: <strong>{item.metadata.stage_from}</strong> → Para: <strong>{item.metadata.stage_to}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}