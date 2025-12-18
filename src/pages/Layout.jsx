
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  Inbox,
  ClipboardList,
  MessageSquare,
  Plus,
  FileType,
  UserCog,
  BookOpen,
  TrendingUp,
  MapPin,
  CheckSquare,
  UserCheck,
  FileText,
  Search,
  Bell,
  Moon,
  Sun,
  Settings,
  ShoppingCart,
  FileBarChart,
  CalendarIcon,
  LogOut,
  User,
  Navigation,
  Zap,
  ChevronDown,
  ChevronRight,
  Headphones,
  DollarSign,
  Gift,
  Building2,
  Activity, // Added for Quality Monitor
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeProvider, useTheme } from "@/components/ui/theme-provider";
import CommandPalette from "@/components/ui/command-palette";
import { Toaster } from "@/components/ui/toaster";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import NotificationBell from "@/components/ui/notification-bell";
import { filterMenuItems } from "@/components/utils/permissions"; // Updated import path

// Páginas públicas que não exigem autenticação
const PUBLIC_PAGES = [
  'PortalHome',
  'portal-home',
  'PortalLogin',
  'PortalValidateToken',
  'PortalTickets',
  'PortalTicketView',
  'PortalCreateTicket',
  'PortalContract',
  'PortalBoletos',
  'PortalUpdateData',
  'PortalOffers',
  'PortalReferralCreate',
  'PortalReferralList',
  'PublicSignature',
  'PublicProposal',
  'NPSSurvey', // ✅ Case correto
  'npssurvey', // ✅ Lowercase
];

// Rotas públicas (verificação adicional por URL) - case insensitive
const isPublicRoute = (pathname) => {
  const publicPaths = [
    '/portalhome',
    '/portal-home',
    '/portallogin',
    '/portal-login',
    '/portalvalidatetoken',
    '/portal-validate-token',
    '/portaltickets',
    '/portal-tickets',
    '/portalticketview',
    '/portal-ticket-view',
    '/portalcreateticket',
    '/portal-create-ticket',
    '/portalcontract',
    '/portal-contract',
    '/portalboletos',
    '/portal-boletos',
    '/portalupdatedata',
    '/portal-update-data',
    '/portaloffers',
    '/portal-offers',
    '/portalreferralcreate',
    '/portal-referral-create',
    '/portalreferrallist',
    '/portal-referral-list',
    '/assinatura',
    '/publicsignature',
    '/proposta-publica',
    '/publicproposal',
    '/nps',
    '/npssurvey', // ✅ Adicionar rota NPS
    '/NPSSurvey', // ✅ Case correto também
  ];

  const lowerPath = pathname.toLowerCase();
  return publicPaths.some(path => lowerPath.includes(path));
};

const menuModules = [
  {
    id: "support",
    title: "Atendimento",
    icon: Headphones,
    color: "text-blue-600 dark:text-blue-400",
    items: [
      { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
      { title: "Criar Ticket", url: createPageUrl("CreateTicket"), icon: Plus, highlight: true },
      { title: "Atendimento Rápido", url: createPageUrl("QuickServiceRegister"), icon: Zap, highlight: true },
      { title: "Board de Filas", url: createPageUrl("QueueBoard"), icon: Inbox },
      { title: "Controle de Tickets", url: createPageUrl("TicketControl"), icon: ClipboardList },
      { title: "Atendimentos Rápidos", url: createPageUrl("QuickServiceList"), icon: FileBarChart },
      { title: "Monitoria de Qualidade", url: createPageUrl("QualityMonitor"), icon: Activity },
      { title: "Relatórios", url: createPageUrl("TicketReports"), icon: FileBarChart },
      { title: "Dashboard NPS", url: createPageUrl("NPSDashboard"), icon: TrendingUp },
      { title: "Meus Tickets", url: createPageUrl("MyTickets"), icon: CheckSquare },
      { title: "Base de Conhecimento", url: createPageUrl("KnowledgeBase"), icon: BookOpen },
    ]
    },
  {
    id: "presales",
    title: "Pré e Pós Vendas",
    icon: ShoppingCart,
    color: "text-purple-600 dark:text-purple-400",
    items: [
      { title: "Board de Vendas", url: createPageUrl("SalesQueueBoard"), icon: Inbox },
      { title: "Criar Ticket", url: createPageUrl("CreateSalesTicket"), icon: Plus, highlight: true },
      { title: "Tickets de Vendas", url: createPageUrl("SalesTickets"), icon: ShoppingCart },
    ]
  },
  {
    id: "sales",
    title: "Vendas PF", // Changed title from "Vendas" to "Vendas PF"
    icon: TrendingUp,
    color: "text-green-600 dark:text-green-400",
    items: [
      { title: "Dashboard", url: createPageUrl("SalesDashboard"), icon: LayoutDashboard },
      { title: "Dashboard Vendedores", url: createPageUrl("SalesAgentsDashboard"), icon: UserCheck },
      { title: "Novo Lead", url: createPageUrl("NewLead"), icon: Plus, highlight: true },
      { title: "Pipeline", url: createPageUrl("LeadsKanban"), icon: TrendingUp },
      { title: "Agenda", url: createPageUrl("SalesAgenda"), icon: CalendarIcon },
      { title: "Busca de Leads", url: createPageUrl("LeadSearch"), icon: Search },
      { title: "Mapa de Leads", url: createPageUrl("LeadsMap"), icon: MapPin },
      { title: "Rota Inteligente", url: createPageUrl("SalesRoutes"), icon: Navigation },
      { title: "Relatórios", url: createPageUrl("SalesReports"), icon: FileBarChart },
      { title: "Automações", url: createPageUrl("LeadAutomations"), icon: Zap },
      { title: "Tarefas", url: createPageUrl("SalesTasks"), icon: CheckSquare },
      { title: "Agentes", url: createPageUrl("SalesAgents"), icon: UserCheck },
      { title: "Templates", url: createPageUrl("ProposalTemplates"), icon: FileText },
    ]
  },
  {
    id: "sales_pj",
    title: "Vendas PJ",
    icon: Building2,
    color: "text-indigo-600 dark:text-indigo-400",
    items: [
      { title: "Novo Lead PJ", url: createPageUrl("NewLeadPJ"), icon: Plus, highlight: true },
      { title: "Pipeline B2B", url: createPageUrl("LeadsPJKanban"), icon: TrendingUp },
      { title: "Agenda", url: createPageUrl("SalesAgenda"), icon: CalendarIcon },
      { title: "Busca de Leads", url: createPageUrl("LeadPJSearch"), icon: Search },
      { title: "Relatórios", url: createPageUrl("SalesPJReports"), icon: FileBarChart },
      { title: "Automações", url: createPageUrl("LeadPJAutomations"), icon: Zap },
      { title: "Tarefas", url: createPageUrl("SalesTasks"), icon: CheckSquare },
      { title: "Agentes", url: createPageUrl("SalesAgents"), icon: UserCheck },
      { title: "Templates", url: createPageUrl("ProposalTemplates"), icon: FileText },
    ]
  },
  {
    id: "referral",
    title: "Indicações",
    icon: Gift,
    color: "text-purple-600 dark:text-purple-400",
    items: [
      { title: "Nova Indicação", url: createPageUrl("ReferralCreate"), icon: Plus, highlight: true },
      { title: "Pipeline", url: createPageUrl("ReferralPipeline"), icon: TrendingUp },
      { title: "Comissões", url: createPageUrl("ReferralCommissions"), icon: DollarSign },
    ]
  },
  {
    id: "collection",
    title: "Cobrança",
    icon: DollarSign,
    color: "text-red-600 dark:text-red-400",
    items: [
      { title: "Dashboard", url: createPageUrl("CollectionDashboard"), icon: LayoutDashboard },
      { title: "Board", url: createPageUrl("CollectionBoard"), icon: Inbox },
      { title: "Agenda", url: createPageUrl("CollectionAgenda"), icon: CalendarIcon },
      { title: "Criar Cobrança", url: createPageUrl("CreateCollectionTicket"), icon: Plus, highlight: true },
      { title: "Relatórios", url: createPageUrl("CollectionReports"), icon: FileBarChart },
    ]
  },
  {
    id: "config",
    title: "Configurações",
    icon: Settings,
    color: "text-gray-600 dark:text-gray-400",
    items: [
      { title: "Agentes", url: createPageUrl("Agents"), icon: UserCog },
      { title: "Tipos de Ticket", url: createPageUrl("TicketTypes"), icon: FileType },
      { title: "Templates", url: createPageUrl("Templates"), icon: FileText },
      { title: "Distribuição de Tickets", url: createPageUrl("DistributionRules"), icon: Zap },
      { title: "Agentes de IA", url: createPageUrl("AIAgents"), icon: User },
    ]
  }
];

function LayoutContent({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [commandOpen, setCommandOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState(["support"]);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Verificar se é uma página pública (por nome OU por rota)
  const isPublicPage = PUBLIC_PAGES.some(page =>
    currentPageName?.toLowerCase() === page.toLowerCase()
  ) || isPublicRoute(location.pathname);

  // 🆕 LOGS DETALHADOS PARA DEBUG
  console.log('🔍 Layout Debug DETALHADO:', {
    currentPageName,
    'currentPageName (lowercase)': currentPageName?.toLowerCase(),
    pathname: location.pathname,
    'pathname (lowercase)': location.pathname.toLowerCase(),
    isPublicPage,
    'Match by name?': PUBLIC_PAGES.some(page => currentPageName?.toLowerCase() === page.toLowerCase()),
    'Match by route?': isPublicRoute(location.pathname),
  });

  const { data: user, isLoading: isLoadingUser, error: userError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        console.log('🔍 Buscando dados do usuário...');
        const userData = await base44.auth.me();
        console.log('✅ Usuário encontrado:', userData?.email);
        return userData;
      } catch (error) {
        console.error('❌ Erro ao buscar usuário:', error);
        if (!isPublicPage && (error.response?.status === 401 || error.message?.includes('401'))) {
          console.log('🔐 Não autenticado em página privada, redirecionando para login...');
          setIsRedirecting(true);
          setTimeout(() => {
            base44.auth.redirectToLogin(window.location.pathname);
          }, 500);
        }
        throw error;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !isPublicPage,
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: () => base44.entities.SystemSettings.list(),
    initialData: [],
    enabled: !isPublicPage,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list(),
    initialData: [],
    enabled: !isPublicPage,
  });

  // 🆕 Buscar agente atual
  const currentAgent = agents.find(a => a.user_email === user?.email);

  const handleLogout = () => {
    console.log('🚪 Fazendo logout...');
    base44.auth.logout();
  };

  const logoUrl = settings.find(s => s.setting_key === 'company_logo')?.setting_value;
  const companyName = settings.find(s => s.setting_key === 'company_name')?.setting_value || 'Wescctech CRM';
  const primaryColor = settings.find(s => s.setting_key === 'primary_color')?.setting_value || '#0066cc';

  const toggleModule = (moduleId) => {
    setExpandedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  // Auto-expandir módulo da página atual
  useEffect(() => {
    if (!isPublicPage) {
      const currentModule = menuModules.find(module =>
        module.items.some(item => item.url === location.pathname)
      );
      if (currentModule && !expandedModules.includes(currentModule.id)) {
        setExpandedModules(prev => [...prev, currentModule.id]);
      }
    }
  }, [location.pathname, isPublicPage, expandedModules]);

  // 🔧 CORRIGIDO: Admin sempre vê tudo, independente do registro Agent
  const filteredMenuModules = user?.role === 'admin'
    ? menuModules
    : currentAgent
      ? filterMenuItems(currentAgent, menuModules)
      : [];

  // Se for página pública, renderiza direto sem layout e sem buscar settings
  if (isPublicPage) {
    console.log('✅ Renderizando página pública sem autenticação');
    return (
      <>
        <style>{`
          :root {
            --wescc-primary: #0066cc;
            --wescc-secondary: #00a3ff;
            --wescc-accent: #ff6b35;
            --wescc-success: #00c853;
            --wescc-warning: #ffa726;
            --wescc-danger: #f44336;
            --wescc-dark: #1a1a2e;
            --wescc-light: #f5f7fa;
          }

          .dark {
            --background: 224 71% 4%;
            --foreground: 213 31% 91%;
            --card: 224 71% 4%;
            --card-foreground: 213 31% 91%;
            --primary: 210 40% 98%;
            --primary-foreground: 222.2 47.4% 11.2%;
          }
        `}</style>
        {children}
        <Toaster />
      </>
    );
  }

  // Se estiver carregando OU redirecionando, mostrar loading
  if (isLoadingUser || isRedirecting) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {isRedirecting ? 'Redirecionando para login...' : 'Carregando...'}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {isRedirecting ? 'Você será redirecionado em instantes' : 'Verificando autenticação'}
          </p>
        </div>
      </div>
    );
  }

  // Se houver erro e não estiver autenticado
  if (userError || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
        <div className="text-center max-w-md p-8 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Autenticação Necessária
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Redirecionando para a página de login...
          </p>
          <Button
            onClick={() => {
              setIsRedirecting(true);
              base44.auth.redirectToLogin(window.location.pathname);
            }}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            Ir para Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        :root {
          --wescc-primary: ${primaryColor};
          --wescc-secondary: #00a3ff;
          --wescc-accent: #ff6b35;
          --wescc-success: #00c853;
          --wescc-warning: #ffa726;
          --wescc-danger: #f44336;
          --wescc-dark: #1a1a2e;
          --wescc-light: #f5f7fa;
        }

        .dark {
          --background: 224 71% 4%;
          --foreground: 213 31% 91%;
          --card: 224 71% 4%;
          --card-foreground: 213 31% 91%;
          --primary: 210 40% 98%;
          --primary-foreground: 222.2 47.4% 11.2%;
        }

        /* 🆕 SCROLL CUSTOMIZADO PARA SIDEBAR */
        .sidebar-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .dark .sidebar-scroll::-webkit-scrollbar-thumb {
          background: #475569;
        }

        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .dark .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>

      <div className="min-h-screen flex w-full bg-gray-50 dark:bg-gray-950">
        {/* Sidebar com altura fixa e scroll interno */}
        <Sidebar className="border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
          {/* Header - Fixo no topo */}
          <SidebarHeader className="border-b border-gray-200 dark:border-gray-800 p-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg truncate">{companyName}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Sistema Integrado</p>
              </div>
            </div>
          </SidebarHeader>

          {/* Content - Com scroll */}
          <SidebarContent className="flex-1 overflow-y-auto sidebar-scroll p-2">
            {filteredMenuModules.map(module => (
              <Collapsible
                key={module.id}
                open={expandedModules.includes(module.id)}
                onOpenChange={() => toggleModule(module.id)}
                className="mb-2"
              >
                <CollapsibleTrigger className="w-full">
                  <div className={`flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                    expandedModules.includes(module.id) ? 'bg-gray-50 dark:bg-gray-800' : ''
                  }`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <module.icon className={`w-5 h-5 ${module.color} flex-shrink-0`} />
                      <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                        {module.title}
                      </span>
                    </div>
                    {expandedModules.includes(module.id) ? (
                      <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    )}
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <SidebarMenu className="mt-1 ml-2">
                    {module.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 rounded-lg mb-1 ${
                            location.pathname === item.url
                              ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium border-l-2 border-blue-600'
                              : 'text-gray-600 dark:text-gray-400'
                          } ${item.highlight ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600 hover:text-white font-medium' : ''}`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-3 py-2 min-w-0">
                            <item.icon className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm truncate">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </CollapsibleContent>
              </Collapsible>
            ))}

            {/* Sistema (só admin) */}
            {user.role === 'admin' && (
              <SidebarGroup className="mt-4">
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 rounded-lg ${
                        location.pathname === createPageUrl("Settings")
                          ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <Link to={createPageUrl("Settings")} className="flex items-center gap-3 px-3 py-2">
                        <Settings className="w-4 h-4" />
                        <span className="text-sm">Sistema</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            )}
          </SidebarContent>

          {/* Footer - Fixo no rodapé */}
          <SidebarFooter className="border-t border-gray-200 dark:border-gray-800 p-4 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-2 transition-colors">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-sm">
                      {user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                      {user?.full_name || user?.email || 'Usuário'}
                    </p>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Online</p>
                    </div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.full_name || 'Usuário'}</p>
                    <p className="text-xs leading-none text-gray-500 dark:text-gray-400 truncate">
                      {user?.email}
                    </p>
                    {user?.role === 'admin' && (
                      <Badge className="mt-1 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 w-fit">
                        Administrador
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                {user?.role === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate(createPageUrl("Settings"))}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Configurações</span>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-3 sticky top-0 z-10 flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <SidebarTrigger className="lg:hidden hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors flex-shrink-0" />

                {/* Global Search */}
                <button
                  onClick={() => setCommandOpen(true)}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm text-gray-600 dark:text-gray-400 min-w-0 max-w-sm"
                >
                  <Search className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Buscar...</span>
                  <kbd className="ml-auto px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs flex-shrink-0">⌘K</kbd>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Notifications */}
                <NotificationBell />

                {/* Theme Toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  className="hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {theme === "light" ? (
                    <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </Button>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
            {children}
          </div>
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

      {/* Toaster */}
      <Toaster />
    </>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <ThemeProvider defaultTheme="light" storageKey="wescc-theme">
      <SidebarProvider>
        <LayoutContent currentPageName={currentPageName}>{children}</LayoutContent>
      </SidebarProvider>
    </ThemeProvider>
  );
}
