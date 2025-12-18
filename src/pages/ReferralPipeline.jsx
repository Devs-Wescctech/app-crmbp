import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, Gift, Phone, DollarSign, User, Target, TrendingUp, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useToast } from "@/components/ui/use-toast";

const STAGES = [
  { id: "novo", label: "Novo", color: "from-purple-500 to-purple-600", lightBg: "bg-purple-50", count: 0 },
  { id: "validacao", label: "Validação", color: "from-blue-500 to-blue-600", lightBg: "bg-blue-50", count: 0 },
  { id: "contato_iniciado", label: "Contato Iniciado", color: "from-yellow-500 to-yellow-600", lightBg: "bg-yellow-50", count: 0 },
  { id: "qualificado", label: "Qualificado", color: "from-indigo-500 to-indigo-600", lightBg: "bg-indigo-50", count: 0 },
  { id: "proposta_enviada", label: "Proposta Enviada", color: "from-orange-500 to-orange-600", lightBg: "bg-orange-50", count: 0 },
  { id: "fechado_ganho", label: "Fechado - Ganho", color: "from-green-500 to-green-600", lightBg: "bg-green-50", count: 0 },
  { id: "fechado_perdido", label: "Perdido", color: "from-red-500 to-red-600", lightBg: "bg-red-50", count: 0 },
];

export default function ReferralPipeline() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: referrals = [], isLoading, refetch } = useQuery({
    queryKey: ['referrals'],
    queryFn: async () => {
      const allReferrals = await base44.entities.Referral.list('-created_date');
      return allReferrals.filter(r => r.status === 'ativo');
    },
    initialData: [],
  });

  const updateReferralMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const currentReferral = referrals.find(r => r.id === id);
      
      if (data.stage && currentReferral && data.stage !== currentReferral.stage) {
        const currentUser = await base44.auth.me();
        const stageHistory = currentReferral.stage_history || [];
        
        stageHistory.push({
          stage: data.stage,
          previous_stage: currentReferral.stage,
          changed_at: new Date().toISOString(),
          changed_by: currentUser.email || 'Sistema',
        });
        
        data.stage_history = stageHistory;
        
        if (data.stage === 'fechado_ganho') {
          data.status = 'convertido';
          data.converted_at = new Date().toISOString();
          data.commission_status = 'aprovada';
        }
      }
      
      return base44.entities.Referral.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
  });

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const newStage = destination.droppableId;
    updateReferralMutation.mutate({
      id: draggableId,
      data: { stage: newStage }
    });
  };

  const getRefferalsByStage = (stage) => {
    return referrals.filter(r => r.stage === stage);
  };

  // Métricas
  const totalReferrals = referrals.length;
  const totalValue = referrals.reduce((sum, r) => sum + (r.estimated_value || 0), 0);
  const totalCommissions = referrals.reduce((sum, r) => sum + (r.commission_value || 0), 0);
  const convertedReferrals = referrals.filter(r => r.stage === 'fechado_ganho').length;
  const conversionRate = totalReferrals > 0 ? ((convertedReferrals / totalReferrals) * 100).toFixed(1) : 0;

  const stagesWithStats = STAGES.map(stage => {
    const stageReferrals = getRefferalsByStage(stage.id);
    const stageValue = stageReferrals.reduce((sum, r) => sum + (r.estimated_value || 0), 0);
    
    return {
      ...stage,
      count: stageReferrals.length,
      value: stageValue,
    };
  });

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-purple-50 to-white">
      {/* Header Fixo */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Gift className="w-8 h-8 text-purple-600" />
              Pipeline de Indicações
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Gerencie as indicações de clientes
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("ReferralCreate"))}
              className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nova Indicação
            </Button>
          </div>
        </div>

        {/* Dashboard Mini */}
        <div className="grid grid-cols-5 gap-4">
          <Card className="border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-medium">Total</p>
                  <p className="text-2xl font-bold text-gray-700">{totalReferrals}</p>
                </div>
                <Users className="w-8 h-8 text-gray-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-600 font-medium">Conversão</p>
                  <p className="text-2xl font-bold text-purple-700">{conversionRate}%</p>
                </div>
                <Target className="w-8 h-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Valor Total</p>
                  <p className="text-2xl font-bold text-green-700">R$ {totalValue.toFixed(0)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Comissões</p>
                  <p className="text-2xl font-bold text-blue-700">R$ {totalCommissions.toFixed(0)}</p>
                </div>
                <Gift className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-indigo-600 font-medium">Convertidos</p>
                  <p className="text-2xl font-bold text-indigo-700">{convertedReferrals}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-indigo-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full min-w-max">
            {stagesWithStats.map(stage => {
              const stageReferrals = getRefferalsByStage(stage.id);
              
              return (
                <div key={stage.id} className="w-80 flex-shrink-0 flex flex-col h-full">
                  <Card className="flex flex-col h-full shadow-sm">
                    <div className={`bg-gradient-to-r ${stage.color} text-white p-4 rounded-t-lg shadow-md flex-shrink-0`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">{stage.label}</h3>
                        <Badge variant="secondary" className="bg-white/20 text-white backdrop-blur-sm">
                          {stage.count}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs text-white/90">
                        <div className="flex items-center justify-between">
                          <span>💰 Valor:</span>
                          <span className="font-semibold">R$ {stage.value.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Droppable droppableId={stage.id}>
                      {(provided, snapshot) => (
                        <CardContent
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 overflow-y-auto p-3 space-y-3 transition-colors ${
                            snapshot.isDraggingOver ? stage.lightBg : 'bg-gray-50'
                          }`}
                        >
                          {stageReferrals.map((referral, index) => (
                            <Draggable key={referral.id} draggableId={referral.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{
                                    ...provided.draggableProps.style,
                                  }}
                                  className={`transition-all ${snapshot.isDragging ? 'rotate-2 scale-105' : ''}`}
                                >
                                  <Card className={`hover:shadow-xl transition-all cursor-pointer border-l-4 border-l-purple-500 bg-white group relative ${
                                    snapshot.isDragging ? 'shadow-2xl ring-2 ring-purple-500' : ''
                                  }`}>
                                    <CardContent className="p-4">
                                      <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1">
                                            <Link to={`${createPageUrl("ReferralDetail")}?id=${referral.id}`}>
                                              <h4 className="font-semibold text-gray-900 hover:text-purple-600 line-clamp-2">
                                                {referral.referred_name}
                                              </h4>
                                            </Link>
                                            <p className="text-xs text-gray-500 mt-1">
                                              Indicado por: {referral.referrer_name}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="space-y-1">
                                          <p className="text-sm text-gray-600 flex items-center gap-1">
                                            <Phone className="w-3 h-3" />
                                            {referral.referred_phone}
                                          </p>
                                          
                                          {referral.estimated_value && (
                                            <p className="text-sm font-semibold text-green-600 flex items-center gap-1">
                                              <DollarSign className="w-3 h-3" />
                                              R$ {referral.estimated_value.toFixed(2)}
                                            </p>
                                          )}

                                          {referral.commission_value && (
                                            <p className="text-xs text-purple-600 flex items-center gap-1">
                                              <Gift className="w-3 h-3" />
                                              Comissão: R$ {referral.commission_value.toFixed(2)}
                                            </p>
                                          )}
                                        </div>

                                        <div className="flex flex-wrap gap-1">
                                          {referral.interest && (
                                            <Badge variant="outline" className="text-xs bg-blue-50">
                                              {referral.interest}
                                            </Badge>
                                          )}
                                          {referral.commission_status === 'aprovada' && (
                                            <Badge className="text-xs bg-green-100 text-green-800">
                                              💰 Comissão Aprovada
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          
                          {stageReferrals.length === 0 && !snapshot.isDraggingOver && (
                            <div className="text-center py-12 text-gray-400 text-sm">
                              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-200 flex items-center justify-center">
                                <Gift className="w-8 h-8" />
                              </div>
                              <p>Nenhuma indicação</p>
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Droppable>
                  </Card>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}