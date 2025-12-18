import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, FileText, DollarSign, Activity } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function ProposalTemplates() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    product_name: "",
    description: "",
    features: [],
    price: 0,
    payment_methods: "",
    payment_due_day: 10,
    validity_days: 7,
    terms: [],
    active: true,
    color_primary: "#0066cc",
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['proposalTemplates'],
    queryFn: () => base44.entities.ProposalTemplate.list(),
    initialData: [],
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.ProposalTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposalTemplates'] });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProposalTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposalTemplates'] });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      product_name: "",
      description: "",
      features: [],
      price: 0,
      payment_methods: "",
      payment_due_day: 10,
      validity_days: 7,
      terms: [],
      active: true,
      color_primary: "#0066cc",
    });
    setEditingTemplate(null);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name || "",
      product_name: template.product_name || "",
      description: template.description || "",
      features: template.features || [],
      price: template.price || 0,
      payment_methods: template.payment_methods || "",
      payment_due_day: template.payment_due_day || 10,
      validity_days: template.validity_days || 7,
      terms: template.terms || [],
      active: template.active !== undefined ? template.active : true,
      color_primary: template.color_primary || "#0066cc",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({
        id: editingTemplate.id,
        data: formData
      });
    } else {
      createTemplateMutation.mutate(formData);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Templates de Proposta</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Gerencie modelos de propostas comerciais
          </p>
        </div>
        <Button 
          onClick={() => setIsDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Template
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => (
          <Card key={template.id} className={`border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-lg transition-all ${!template.active ? 'opacity-60' : ''}`}>
            <CardHeader className="border-b border-gray-200 dark:border-gray-800" style={{ backgroundColor: `${template.color_primary}15` }}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg text-gray-900 dark:text-gray-100">{template.name}</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{template.product_name}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(template)}
                  className="hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {template.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{template.description}</p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Valor Mensal:</span>
                  <div className="flex items-center gap-1 text-lg font-bold text-green-600 dark:text-green-400">
                    <DollarSign className="w-5 h-5" />
                    {template.price.toFixed(2)}
                  </div>
                </div>

                {template.payment_methods && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <strong>Pagamento:</strong> {template.payment_methods}
                  </div>
                )}

                {template.features && template.features.length > 0 && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Benefícios:</p>
                    <div className="space-y-1">
                      {template.features.slice(0, 3).map((feature, idx) => (
                        <div key={idx} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-1">
                          <span className="text-green-600 dark:text-green-400">✓</span>
                          <span>{feature}</span>
                        </div>
                      ))}
                      {template.features.length > 3 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          +{template.features.length - 3} mais
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="outline" className="text-xs bg-gray-50 dark:bg-gray-800">
                    Validade: {template.validity_days} dias
                  </Badge>
                  {!template.active && (
                    <Badge variant="outline" className="text-xs bg-gray-100 dark:bg-gray-800">
                      Inativo
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              {editingTemplate ? 'Editar Template' : 'Novo Template de Proposta'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-gray-900 dark:text-gray-100">Nome do Template *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Plano Bronze"
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>

              <div>
                <Label className="text-gray-900 dark:text-gray-100">Nome do Produto *</Label>
                <Input
                  value={formData.product_name}
                  onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                  placeholder="Plano Funeral Bronze"
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>

              <div>
                <Label className="text-gray-900 dark:text-gray-100">Valor Mensal (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                  placeholder="99.90"
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-gray-900 dark:text-gray-100">Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Descrição do produto/serviço"
                  rows={2}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>

              <div>
                <Label className="text-gray-900 dark:text-gray-100">Formas de Pagamento</Label>
                <Input
                  value={formData.payment_methods}
                  onChange={(e) => setFormData({...formData, payment_methods: e.target.value})}
                  placeholder="Ex: Boleto, Cartão, PIX"
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>

              <div>
                <Label className="text-gray-900 dark:text-gray-100">Dia de Vencimento</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.payment_due_day}
                  onChange={(e) => setFormData({...formData, payment_due_day: parseInt(e.target.value) || 10})}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>

              <div>
                <Label className="text-gray-900 dark:text-gray-100">Validade (dias)</Label>
                <Input
                  type="number"
                  value={formData.validity_days}
                  onChange={(e) => setFormData({...formData, validity_days: parseInt(e.target.value) || 7})}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>

              <div>
                <Label className="text-gray-900 dark:text-gray-100">Cor Primária</Label>
                <Input
                  type="color"
                  value={formData.color_primary}
                  onChange={(e) => setFormData({...formData, color_primary: e.target.value})}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-10"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Label className="text-gray-900 dark:text-gray-100">Template Ativo</Label>
              <Switch
                checked={formData.active}
                onCheckedChange={(val) => setFormData({...formData, active: val})}
              />
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                💡 Configure benefícios e termos editando diretamente no Dashboard → Dados
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.name || !formData.product_name || !formData.price}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              {editingTemplate ? 'Salvar' : 'Criar Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}