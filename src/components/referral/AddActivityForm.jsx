import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, MessageSquare, Mail, MapPin, FileText, Clock, Plus } from "lucide-react";
import { toast } from "sonner";

const ACTIVITY_TYPES = [
  { value: "call", label: "Ligação", icon: Phone },
  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { value: "email", label: "E-mail", icon: Mail },
  { value: "visit", label: "Visita", icon: MapPin },
  { value: "note", label: "Nota", icon: FileText },
  { value: "task", label: "Tarefa", icon: Clock },
];

export default function AddActivityForm({ referralId, onActivityAdded, currentUserEmail }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: "note",
    title: "",
    description: "",
    scheduled_for: "",
    priority: "media",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title && !formData.description) {
      toast.error('Preencha o título ou descrição');
      return;
    }

    onActivityAdded({
      ...formData,
      referral_id: referralId,
      assigned_to: currentUserEmail,
    });

    // Reset form
    setFormData({
      type: "note",
      title: "",
      description: "",
      scheduled_for: "",
      priority: "media",
    });
    setShowForm(false);
  };

  if (!showForm) {
    return (
      <Button
        onClick={() => setShowForm(true)}
        variant="outline"
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        Adicionar Interação
      </Button>
    );
  }

  const selectedType = ACTIVITY_TYPES.find(t => t.value === formData.type);
  const Icon = selectedType?.icon || FileText;

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader>
        <CardTitle className="text-purple-800 flex items-center gap-2">
          <Icon className="w-5 h-5" />
          Nova Interação
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Tipo de Interação</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
              <SelectTrigger className="mt-1 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map(type => {
                  const TypeIcon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <TypeIcon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Título</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Ex: Primeiro contato por WhatsApp"
              className="mt-1 bg-white"
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Descreva a interação..."
              rows={3}
              className="mt-1 bg-white"
            />
          </div>

          {formData.type === 'task' && (
            <>
              <div>
                <Label>Agendar para</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_for}
                  onChange={(e) => setFormData({...formData, scheduled_for: e.target.value})}
                  className="mt-1 bg-white"
                />
              </div>

              <div>
                <Label>Prioridade</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                  <SelectTrigger className="mt-1 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">
              Salvar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}