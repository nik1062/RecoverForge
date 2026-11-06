import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NavItem = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
       ${isActive ? 'bg-surface-lighter text-white border border-border-dark' : 'text-text-muted hover:bg-surface-dark hover:text-white'}`
    }
  >
    <span className="material-symbols-outlined text-[20px]">{icon}</span>
    {label}
  </NavLink>
);

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-[#0A0A0F] border-r border-border-dark h-screen sticky top-0">
      <div className="flex flex-col h-full p-4 justify-between">
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2 px-2 pt-2">
            <span className="material-symbols-outlined text-primary text-2xl">autorenew</span>
            <span className="text-xl font-bold text-white font-display">RecoverForge</span>
            <span className="ml-auto text-[10px] bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded-full font-bold">AI</span>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1">
            <NavItem to="/dashboard" icon="dashboard" label="Recovery Dashboard" />
            <NavItem to="/demo-store" icon="shopping_cart" label="Demo Checkout" />
            <NavItem to="/billing" icon="credit_card" label="Billing & Plan" />
            <NavItem to="/settings" icon="settings" label="Agent Settings" />
            {user?.isAdmin && (
              <NavItem to="/admin" icon="admin_panel_settings" label="Admin Panel" />
            )}
          </nav>
        </div>

        {/* User Profile */}
        <div className="flex flex-col gap-4">
          <div className="bg-surface-dark border border-border-dark rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${user?.agentActive !== false ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></span>
              <span className="text-xs text-text-muted font-medium">Agent Status</span>
            </div>
            <span className={`text-xs font-semibold ${user?.agentActive !== false ? 'text-green-400' : 'text-red-400'}`}>
              {user?.agentActive !== false ? 'ACTIVE' : 'STOPPED'}
            </span>
          </div>

          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {user?.businessName?.[0] || user?.name?.[0]?.toUpperCase() || 'M'}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-white text-sm font-medium truncate">{user?.businessName || user?.name}</span>
              <span className="text-text-muted text-xs truncate">{user?.email}</span>
            </div>
            <button onClick={handleLogout} title="Logout" className="text-text-muted hover:text-red-400 transition-colors">
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
