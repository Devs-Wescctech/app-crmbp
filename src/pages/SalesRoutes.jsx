import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Navigation, 
  Clock, 
  TrendingDown, 
  Route,
  Phone,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Play,
  Filter,
  Calendar
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

// Fix ícone Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Calcular distância entre dois pontos (Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Algoritmo de otimização de rota (Nearest Neighbor)
function optimizeRoute(leads, startLat, startLon) {
  if (leads.length === 0) return { optimizedLeads: [], totalDistance: 0, totalTime: 0 };
  
  const unvisited = [...leads];
  const route = [];
  let currentLat = startLat;
  let currentLon = startLon;
  let totalDistance = 0;
  
  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;
    
    unvisited.forEach((lead, index) => {
      const distance = calculateDistance(currentLat, currentLon, lead.latitude, lead.longitude);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = index;
      }
    });
    
    const nearest = unvisited.splice(nearestIndex, 1)[0];
    route.push({
      ...nearest,
      distanceFromPrevious: minDistance,
      timeFromPrevious: Math.round((minDistance / 40) * 60), // 40km/h média urbana
    });
    
    totalDistance += minDistance;
    currentLat = nearest.latitude;
    currentLon = nearest.longitude;
  }
  
  const totalTime = Math.round((totalDistance / 40) * 60);
  
  return { optimizedLeads: route, totalDistance, totalTime };
}

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

export default function SalesRoutes() {
  const [userLocation, setUserLocation] = useState(null);
  const [optimizedRoute, setOptimizedRoute] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showOnlyScheduled, setShowOnlyScheduled] = useState(true);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
    initialData: [],
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', selectedDate],
    queryFn: () => base44.entities.Activity.filter({
      type: 'visit',
      scheduled_for: { $regex: selectedDate }
    }),
    initialData: [],
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['visits', selectedDate],
    queryFn: () => base44.entities.Visit.filter({
      check_in_at: { $regex: selectedDate }
    }),
    initialData: [],
  });

  // Pegar localização do usuário
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("Erro ao obter localização:", error);
          setUserLocation([-23.5505, -46.6333]); // Fallback São Paulo
        }
      );
    } else {
      setUserLocation([-23.5505, -46.6333]);
    }
  }, []);

  // Filtrar leads para rota
  const leadsForRoute = leads.filter(lead => {
    if (!lead.latitude || !lead.longitude) return false;
    
    if (showOnlyScheduled) {
      // Apenas leads com visita agendada para hoje
      const hasScheduledVisit = activities.some(act => 
        act.lead_id === lead.id && 
        act.type === 'visit' &&
        act.scheduled_for?.includes(selectedDate)
      );
      return hasScheduledVisit;
    }
    
    // Leads em estágios ativos
    return ['novo', 'abordado', 'qualificado', 'proposta_enviada'].includes(lead.stage);
  });

  // Otimizar rota automaticamente quando mudar os leads ou localização
  useEffect(() => {
    if (userLocation && leadsForRoute.length > 0) {
      const result = optimizeRoute(leadsForRoute, userLocation[0], userLocation[1]);
      setOptimizedRoute(result);
    }
  }, [leadsForRoute.length, userLocation]);

  const handleStartNavigation = () => {
    if (!optimizedRoute || optimizedRoute.optimizedLeads.length === 0) {
      toast.error('Nenhuma rota para iniciar');
      return;
    }

    // Criar waypoints para Google Maps
    const waypoints = optimizedRoute.optimizedLeads
      .map(lead => `${lead.latitude},${lead.longitude}`)
      .join('|');
    
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLocation[0]},${userLocation[1]}&destination=${optimizedRoute.optimizedLeads[optimizedRoute.optimizedLeads.length - 1].latitude},${optimizedRoute.optimizedLeads[optimizedRoute.optimizedLeads.length - 1].longitude}&waypoints=${waypoints}&travelmode=driving`;
    
    window.open(mapsUrl, '_blank');
    toast.success('Rota aberta no Google Maps!');
  };

  const getLeadIcon = (index) => {
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
    const color = colors[index % colors.length];
    
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${index + 1}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  const routeCoordinates = optimizedRoute 
    ? [userLocation, ...optimizedRoute.optimizedLeads.map(l => [l.latitude, l.longitude])]
    : [];

  // Leads próximos não visitados
  const nearbyUnvisitedLeads = userLocation ? leads.filter(lead => {
    if (!lead.latitude || !lead.longitude) return false;
    if (leadsForRoute.some(l => l.id === lead.id)) return false;
    
    const distance = calculateDistance(userLocation[0], userLocation[1], lead.latitude, lead.longitude);
    return distance <= 2; // Dentro de 2km
  }).slice(0, 5) : [];

  if (!userLocation) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Obtendo sua localização...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Route className="w-6 h-6 text-blue-600" />
                Rota Inteligente
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {optimizedRoute ? `${optimizedRoute.optimizedLeads.length} visitas • ${optimizedRoute.totalDistance.toFixed(1)} km • ${optimizedRoute.totalTime} min` : 'Carregando...'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              
              <Button
                variant={showOnlyScheduled ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyScheduled(!showOnlyScheduled)}
              >
                <Filter className="w-4 h-4 mr-2" />
                {showOnlyScheduled ? 'Agendadas' : 'Todos'}
              </Button>
              
              <Button
                onClick={handleStartNavigation}
                disabled={!optimizedRoute || optimizedRoute.optimizedLeads.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Iniciar Navegação
              </Button>
            </div>
          </div>

          {/* Stats */}
          {optimizedRoute && (
            <div className="grid grid-cols-4 gap-3">
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-600">Visitas</p>
                      <p className="text-lg font-bold text-blue-900">{optimizedRoute.optimizedLeads.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Route className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-xs text-gray-600">Distância</p>
                      <p className="text-lg font-bold text-green-900">{optimizedRoute.totalDistance.toFixed(1)} km</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="text-xs text-gray-600">Tempo</p>
                      <p className="text-lg font-bold text-orange-900">{optimizedRoute.totalTime} min</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-gray-600">Economia</p>
                      <p className="text-lg font-bold text-purple-900">~{Math.round(optimizedRoute.totalTime * 0.3)} min</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Lista de Visitas */}
        <div className="w-96 bg-white border-r overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Sequência Otimizada</h3>
            {nearbyUnvisitedLeads.length > 0 && (
              <Badge className="bg-orange-100 text-orange-700">
                +{nearbyUnvisitedLeads.length} próximos
              </Badge>
            )}
          </div>

          {optimizedRoute?.optimizedLeads.map((lead, index) => {
            const hasVisited = visits.some(v => v.lead_id === lead.id);
            
            return (
              <Card key={lead.id} className={`hover:shadow-md transition-shadow ${hasVisited ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {lead.name || "Lead sem nome"}
                        </h4>
                        {hasVisited && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2 truncate">
                        {lead.address || `${lead.city || ''}, ${lead.state || ''}`}
                      </p>
                      
                      {index > 0 && (
                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                          <span className="flex items-center gap-1">
                            <Route className="w-3 h-3" />
                            {lead.distanceFromPrevious?.toFixed(1)} km
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {lead.timeFromPrevious} min
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${lead.latitude},${lead.longitude}`, '_blank')}
                          className="text-xs"
                        >
                          <Navigation className="w-3 h-3 mr-1" />
                          Ir
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`https://wa.me/55${lead.phone.replace(/\D/g, '')}`, '_blank')}
                          className="text-xs"
                        >
                          <MessageSquare className="w-3 h-3 mr-1" />
                          WhatsApp
                        </Button>
                        
                        <Link to={`${createPageUrl("LeadDetail")}?id=${lead.id}`}>
                          <Button size="sm" variant="ghost" className="text-xs">
                            Ver
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {optimizedRoute?.optimizedLeads.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Nenhuma visita agendada para hoje</p>
              <p className="text-xs mt-1">Desative o filtro para ver todos os leads</p>
            </div>
          )}

          {/* Leads Próximos Sugeridos */}
          {nearbyUnvisitedLeads.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                Leads Próximos
              </h3>
              
              <div className="space-y-2">
                {nearbyUnvisitedLeads.map(lead => {
                  const distance = calculateDistance(userLocation[0], userLocation[1], lead.latitude, lead.longitude);
                  
                  return (
                    <Card key={lead.id} className="border-orange-200 bg-orange-50">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm text-gray-900">{lead.name}</p>
                            <p className="text-xs text-gray-600">{distance.toFixed(1)} km de você</p>
                          </div>
                          <Link to={`${createPageUrl("LeadDetail")}?id=${lead.id}`}>
                            <Button size="sm" variant="outline" className="text-xs">
                              Ver
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Mapa */}
        <div className="flex-1 relative">
          <MapContainer
            center={userLocation}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <MapController center={userLocation} zoom={13} />
            
            {/* Localização do usuário */}
            <Marker position={userLocation} icon={L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            })}>
              <Popup>
                <div className="text-center">
                  <Navigation className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                  <p className="font-semibold">Você está aqui</p>
                </div>
              </Popup>
            </Marker>
            
            {/* Marcadores dos leads */}
            {optimizedRoute?.optimizedLeads.map((lead, index) => (
              <Marker
                key={lead.id}
                position={[lead.latitude, lead.longitude]}
                icon={getLeadIcon(index)}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-blue-600">#{index + 1}</span>
                      <h3 className="font-semibold text-gray-900">{lead.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{lead.phone}</p>
                    {lead.address && (
                      <p className="text-xs text-gray-500 mb-3">{lead.address}</p>
                    )}
                    <Link to={`${createPageUrl("LeadDetail")}?id=${lead.id}`}>
                      <Button size="sm" className="w-full">
                        Ver Detalhes
                      </Button>
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
            
            {/* Linha da rota */}
            {routeCoordinates.length > 1 && (
              <Polyline
                positions={routeCoordinates}
                color="#3b82f6"
                weight={3}
                opacity={0.7}
                dashArray="10, 10"
              />
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}