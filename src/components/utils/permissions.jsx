// Helper de permissões por tipo de agente

export const AGENT_PERMISSIONS = {
  admin: {
    modules: ['support', 'presales', 'sales', 'referral', 'collection', 'config'],
    canViewAllTickets: true,
    canViewAllLeads: true,
    canAccessReports: true,
    canManageAgents: true,
    canManageSettings: true,
  },
  supervisor: {
    modules: ['support', 'presales', 'sales', 'collection'],
    canViewAllTickets: false,
    canViewTeamTickets: true,
    canViewAllLeads: false,
    canViewTeamLeads: true,
    canAccessReports: true,
    canManageAgents: false,
    canManageSettings: false,
  },
  support: {
    modules: ['support'],
    canViewAllTickets: false,
    canViewTeamTickets: false,
    canViewAllLeads: false,
    canViewTeamLeads: false,
    canAccessReports: false,
    canManageAgents: false,
    canManageSettings: false,
  },
  sales: {
    modules: ['sales'],
    canViewAllTickets: false,
    canViewTeamTickets: false,
    canViewAllLeads: false,
    canViewTeamLeads: false,
    canAccessReports: false,
    canManageAgents: false,
    canManageSettings: false,
  },
  collection: {
    modules: ['collection'],
    canViewAllTickets: false,
    canViewTeamTickets: false,
    canViewAllLeads: false,
    canViewTeamLeads: false,
    canAccessReports: false,
    canManageAgents: false,
    canManageSettings: false,
  },
  pre_sales: {
    modules: ['presales'],
    canViewAllTickets: false,
    canViewTeamTickets: false,
    canViewAllLeads: false,
    canViewTeamLeads: false,
    canAccessReports: false,
    canManageAgents: false,
    canManageSettings: false,
  },
  post_sales: {
    modules: ['presales'],
    canViewAllTickets: false,
    canViewTeamTickets: false,
    canViewAllLeads: false,
    canViewTeamLeads: false,
    canAccessReports: false,
    canManageAgents: false,
    canManageSettings: false,
  },
};

export function canAccessModule(agent, moduleId) {
  if (!agent || !agent.agent_type) return false;
  
  const basePermissions = AGENT_PERMISSIONS[agent.agent_type] || AGENT_PERMISSIONS.support;
  
  if (agent.agent_type === 'admin') return true;
  
  return basePermissions.modules.includes(moduleId);
}

export function canViewAll(agent, resourceType = 'tickets') {
  if (!agent || !agent.agent_type) return false;
  
  if (agent.agent_type === 'admin') return true;
  
  const basePermissions = AGENT_PERMISSIONS[agent.agent_type];
  
  if (agent.permissions) {
    if (resourceType === 'tickets' && agent.permissions.can_view_all_tickets) return true;
    if (resourceType === 'leads' && agent.permissions.can_view_all_leads) return true;
  }
  
  if (resourceType === 'tickets') return basePermissions.canViewAllTickets;
  if (resourceType === 'leads') return basePermissions.canViewAllLeads;
  
  return false;
}

export function canViewTeam(agent, resourceType = 'tickets') {
  if (!agent || !agent.agent_type) return false;
  
  if (agent.agent_type === 'admin') return true;
  
  const basePermissions = AGENT_PERMISSIONS[agent.agent_type];
  
  if (agent.permissions) {
    if (resourceType === 'tickets' && agent.permissions.can_view_team_tickets) return true;
    if (resourceType === 'leads' && agent.permissions.can_view_team_leads) return true;
  }
  
  if (resourceType === 'tickets') return basePermissions.canViewTeamTickets;
  if (resourceType === 'leads') return basePermissions.canViewTeamLeads;
  
  return false;
}

export function canAccessReports(agent) {
  if (!agent || !agent.agent_type) return false;
  
  if (agent.agent_type === 'admin') return true;
  
  if (agent.permissions?.can_access_reports) return true;
  
  const basePermissions = AGENT_PERMISSIONS[agent.agent_type];
  return basePermissions.canAccessReports;
}

export function canManageAgents(agent) {
  if (!agent || !agent.agent_type) return false;
  
  if (agent.agent_type === 'admin') return true;
  
  if (agent.permissions?.can_manage_agents) return true;
  
  return false;
}

export function canManageSettings(agent) {
  if (!agent || !agent.agent_type) return false;
  
  if (agent.agent_type === 'admin') return true;
  
  if (agent.permissions?.can_manage_settings) return true;
  
  return false;
}

export function filterMenuItems(agent, menuItems) {
  if (!agent || !agent.agent_type) return [];
  
  if (agent.agent_type === 'admin') return menuItems;
  
  return menuItems.filter(item => {
    if (!canAccessModule(agent, item.id)) return false;
    
    if (item.items) {
      item.items = item.items.filter(subItem => {
        if (subItem.title === 'Dashboard' || subItem.title === 'Relatórios') {
          return canAccessReports(agent);
        }
        
        if (subItem.title === 'Agentes') {
          return canManageAgents(agent);
        }
        
        if (item.id === 'config') {
          return canManageSettings(agent);
        }
        
        return true;
      });
    }
    
    return true;
  });
}