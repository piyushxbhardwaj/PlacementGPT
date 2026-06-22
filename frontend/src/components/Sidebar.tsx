import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Files, 
  User, 
  ShieldAlert, 
  LogOut, 
  Terminal, 
  Menu, 
  X,
  Sparkles
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Chat AI', path: '/chat', icon: MessageSquare },
    { name: 'Documents', path: '/documents', icon: Files },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  if (user?.role === 'admin') {
    navItems.push({ name: 'Admin Console', path: '/admin', icon: ShieldAlert });
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-lg bg-dark-800 border border-slate-700 text-slate-200"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar Panel */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 glass-panel border-r border-slate-800/80 p-5 flex flex-col justify-between
        transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col gap-8">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 px-2 pt-2">
            <div className="p-2 rounded-xl bg-brand-600 shadow-glass-brand flex items-center justify-center text-white">
              <Terminal size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                Placement<span className="text-brand-400">GPT</span>
              </h1>
              <span className="text-xs text-slate-500 font-medium tracking-wider uppercase">Enterprise RAG</span>
            </div>
          </div>

          {/* User Brief Card */}
          {user && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-900/40 border border-slate-800/60">
              <div className="w-10 h-10 rounded-full bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 font-bold">
                {user.email.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.email}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    user.role === 'admin' 
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25' 
                      : 'bg-brand-500/15 text-brand-400 border border-brand-500/25'
                  }`}>
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium tracking-wide transition-all duration-200
                    ${active 
                      ? 'bg-brand-600/15 text-brand-400 border border-brand-500/35 font-semibold' 
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/30 border border-transparent'
                    }
                  `}
                >
                  <Icon size={18} className={active ? 'text-brand-400' : 'text-slate-400'} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-600/5 border border-brand-500/10 text-xs text-brand-400 font-medium">
            <Sparkles size={14} />
            <span>AI Grounding Active</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 hover:border-rose-500/20 border border-transparent transition-all duration-200 w-full text-left"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Backdrop for Mobile */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
        />
      )}
    </>
  );
};
export default Sidebar;
