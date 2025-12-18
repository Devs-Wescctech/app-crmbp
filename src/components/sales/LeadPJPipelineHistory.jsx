import React from "react";
import { Check, Clock, TrendingUp, XCircle, AlertCircle, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STAGES_PJ = [
  { id: 'novo', label: 'Novo', color: 'bg-blue-500', icon: Clock },
  { id: 'qualificacao', label: 'Qualificação', color: 'bg-purple-500', icon: Check },
  { id: 'apresentacao', label: 'Apresentação', color: 'bg-indigo-500', icon: Check },
  { id: 'proposta_enviada', label: 'Proposta Enviada', color: 'bg-yellow-500', icon: Check },
  { id: 'negociacao', label: 'Negociação', color: 'bg-orange-500', icon: Check },
  { id: 'fechado_ganho', label: 'Fechado', color: 'bg-green-500', icon: Check },
  { id: 'fechado_perdido', label: 'Perdido', color: 'bg-red-500', icon: XCircle },
];

const formatDuration = (start, end) => {
  if (!start) return null;
  
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const diffMs = endDate - startDate;
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export default function LeadPJPipelineHistory({ lead, onStageChange }) {
  const stageHistory = lead.stage_history || [];
  const currentStage = lead.stage;

  // Criar mapa de quando cada stage foi visitado
  const stageVisits = {};
  stageHistory.forEach((entry) => {
    if (entry.to && !stageVisits[entry.to]) {
      stageVisits[entry.to] = {
        enteredAt: entry.changed_at,
        exitedAt: null,
      };
    }
    if (entry.from && stageVisits[entry.from] && !stageVisits[entry.from].exitedAt) {
      stageVisits[entry.from].exitedAt = entry.changed_at;
    }
  });

  // Stage atual ainda está ativo
  if (currentStage && stageVisits[currentStage]) {
    stageVisits[currentStage].exitedAt = null;
  }

  const handleStageClick = (stageId) => {
    if (onStageChange && currentStage !== stageId) {
      const stage = STAGES_PJ.find(s => s.id === stageId);
      if (confirm(`Deseja mover este lead para "${stage.label}"?`)) {
        onStageChange(stageId);
      }
    }
  };

  return (
    <div className="relative">
      {/* LAYOUT HORIZONTAL INTERATIVO */}
      <div className="flex items-start gap-2 overflow-x-auto pb-4 pt-2 px-2">
        {STAGES_PJ.map((stage, index) => {
          const visit = stageVisits[stage.id];
          const isCompleted = !!visit;
          const isCurrent = currentStage === stage.id;
          const isPending = !isCompleted && !isCurrent;
          const Icon = stage.icon;
          const isClickable = onStageChange && !isCurrent;

          // Calcular duração
          const duration = visit ? formatDuration(visit.enteredAt, visit.exitedAt) : null;

          return (
            <React.Fragment key={stage.id}>
              {/* Stage Card - CLICÁVEL */}
              <div 
                className={`flex-shrink-0 w-40 transition-all ${
                  isCurrent 
                    ? 'ring-4 ring-indigo-500 ring-offset-2 scale-105 my-1' 
                    : 'my-1'
                } ${
                  isClickable 
                    ? 'cursor-pointer hover:scale-105 hover:shadow-xl' 
                    : ''
                }`}
                onClick={() => isClickable && handleStageClick(stage.id)}
              >
                <div className={`rounded-lg border-2 p-3 transition-all ${
                  isCompleted 
                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950' 
                    : isCurrent
                    ? 'border-indigo-500 dark:border-indigo-500 bg-indigo-100 dark:bg-indigo-900 shadow-lg'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950'
                }`}>
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isCompleted 
                        ? 'bg-green-500 shadow-md' 
                        : isCurrent 
                        ? 'bg-indigo-500 shadow-lg animate-pulse' 
                        : 'bg-gray-300 dark:bg-gray-700'
                    }`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${
                        isCompleted 
                          ? 'text-green-900 dark:text-green-100' 
                          : isCurrent 
                          ? 'text-indigo-900 dark:text-indigo-100' 
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {stage.label}
                      </p>
                    </div>
                  </div>

                  {/* Detalhes */}
                  {visit && (
                    <div className="space-y-1 text-xs">
                      {/* Data de entrada */}
                      <div className={`${
                        isCurrent 
                          ? 'text-indigo-700 dark:text-indigo-300' 
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        <p className="font-medium">Entrada:</p>
                        <p className="truncate">
                          {format(new Date(visit.enteredAt), "dd/MM HH:mm", { locale: ptBR })}
                        </p>
                      </div>

                      {/* Duração */}
                      {duration && (
                        <div className={`${
                          isCurrent 
                            ? 'text-indigo-700 dark:text-indigo-300' 
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          <p className="font-medium">Duração:</p>
                          <p className="font-bold">{duration}</p>
                        </div>
                      )}

                      {/* Data de saída */}
                      {visit.exitedAt && (
                        <div className="text-gray-600 dark:text-gray-400">
                          <p className="font-medium">Saída:</p>
                          <p className="truncate">
                            {format(new Date(visit.exitedAt), "dd/MM HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      )}

                      {/* Status atual */}
                      {isCurrent && (
                        <div className="mt-2 pt-2 border-t border-indigo-300 dark:border-indigo-700">
                          <p className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1 animate-pulse">
                            <Clock className="w-3 h-3" />
                            ETAPA ATUAL
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pendente */}
                  {isPending && (
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      <p>Clique para mover</p>
                    </div>
                  )}

                  {/* Hover hint */}
                  {isCompleted && !isCurrent && isClickable && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Clique para retornar
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Seta conectora */}
              {index < STAGES_PJ.length - 1 && (
                <div className="flex items-center justify-center flex-shrink-0 pt-8">
                  <ChevronRight className={`w-6 h-6 ${
                    isCompleted ? 'text-green-500' : 'text-gray-300 dark:text-gray-700'
                  }`} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Dica de Uso */}
      {onStageChange && (
        <div className="mt-2 mb-4 p-2 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <p className="text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            💡 <strong>Dica:</strong> Clique em qualquer etapa para mover o lead
          </p>
        </div>
      )}

      {/* Informações Adicionais */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {/* Tempo total no pipeline */}
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">⏱️ Tempo no Pipeline</p>
            <p className="font-bold text-gray-900 dark:text-gray-100">
              {formatDuration(lead.created_date, lead.concluded_at || lead.lost_at)}
            </p>
          </div>

          {/* Status Final */}
          {(lead.concluded || lead.lost) && (
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">📊 Status</p>
              <p className={`font-bold ${
                lead.concluded 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {lead.concluded ? '✅ Venda Concluída' : '❌ Lead Perdido'}
              </p>
              {(lead.concluded_at || lead.lost_at) && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {format(new Date(lead.concluded_at || lead.lost_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
            </div>
          )}

          {/* Valor do negócio */}
          {lead.estimated_value && (
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">💰 Valor</p>
              <p className="font-bold text-green-600 dark:text-green-400">
                R$ {parseFloat(lead.estimated_value).toFixed(2)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lead Perdido - Motivo */}
      {lead.lost && lead.lost_reason && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900 dark:text-red-300">Motivo da Perda:</p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">{lead.lost_reason}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}