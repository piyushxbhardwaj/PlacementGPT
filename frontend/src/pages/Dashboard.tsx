import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Files, 
  MessageSquare, 
  User, 
  ArrowUpRight, 
  Sparkles,
  FileUp, 
  ShieldAlert,
  Loader2,
  BookmarkCheck
} from 'lucide-react';
import api from '../services/api';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    totalDocs: 0,
    activeChats: 0,
    indexedDocs: 0,
    failedDocs: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [docs, chats] = await Promise.all([
          api.documents.list(),
          api.chat.listSessions()
        ]);
        
        setStats({
          totalDocs: docs.length,
          activeChats: chats.length,
          indexedDocs: docs.filter((d: any) => d.status === 'indexed').length,
          failedDocs: docs.filter((d: any) => d.status === 'failed').length
        });
      } catch (err) {
        console.error("Failed to load dashboard metrics:", err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const cards = [
    { 
      name: 'Total Documents', 
      value: stats.totalDocs, 
      desc: `${stats.indexedDocs} successfully indexed`, 
      icon: Files,
      color: 'text-brand-400 bg-brand-500/10 border-brand-500/20'
    },
    { 
      name: 'Active Chat Discussions', 
      value: stats.activeChats, 
      desc: 'Grounding sessions', 
      icon: MessageSquare,
      color: 'text-brand-400 bg-brand-500/10 border-brand-500/20'
    },
    { 
      name: 'Failed Document Indexing', 
      value: stats.failedDocs, 
      desc: 'Check logs or format compatibility', 
      icon: ShieldAlert,
      color: stats.failedDocs > 0 
        ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' 
        : 'text-slate-500 bg-slate-800/20 border-slate-700/20'
    }
  ];

  return (
    <div className="flex-1 max-w-6xl mx-auto px-6 py-8 space-y-8 overflow-y-auto h-screen">
      
      {/* Welcome banner */}
      <div className="glass-panel-brand rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between border border-brand-500/25 relative overflow-hidden shadow-glass-brand">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] rounded-full bg-brand-500/5 blur-[50px] pointer-events-none" />
        <div className="space-y-2 text-center sm:text-left z-10">
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center justify-center sm:justify-start gap-2">
            <span>Welcome to PlacementGPT</span>
            <Sparkles size={20} className="text-brand-400" />
          </h2>
          <p className="text-sm text-slate-400 max-w-xl">
            Query Capgemini interview papers, Security experience logs, and AI resume profiles. Upload documents to index them in Postgres Vector DB.
          </p>
        </div>
        <button
          onClick={() => navigate('/chat')}
          className="mt-6 sm:mt-0 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-sm font-bold text-white transition-all shadow-glass-brand flex items-center gap-2 group shrink-0"
        >
          <span>Open Chat Assistant</span>
          <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-brand-500" />
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div 
                  key={idx}
                  className="glass-panel border border-slate-800 p-6 rounded-2xl flex items-center gap-5"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${card.color}`}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">{card.name}</span>
                    <span className="text-2xl font-extrabold text-white mt-1 block">{card.value}</span>
                    <span className="text-xs text-slate-400 mt-1 block">{card.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions & Recent Queries */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Quick Actions Panel */}
            <div className="glass-panel border border-slate-800 p-6 rounded-2xl space-y-4">
              <h3 className="text-base font-bold text-white">Workspace Actions</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                  onClick={() => navigate('/documents')}
                  className="p-4 rounded-xl border border-slate-850 bg-dark-900/20 hover:border-brand-500/30 cursor-pointer transition-all flex flex-col gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-brand-600/10 text-brand-400 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-all">
                    <FileUp size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Upload Documents</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Parse PDFs, DOCX, or text files.</p>
                  </div>
                </div>

                <div 
                  onClick={() => navigate('/profile')}
                  className="p-4 rounded-xl border border-slate-850 bg-dark-900/20 hover:border-brand-500/30 cursor-pointer transition-all flex flex-col gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-brand-600/10 text-brand-400 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-all">
                    <User size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">View Profile</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Manage token and account details.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* System Readiness Guidelines */}
            <div className="glass-panel border border-slate-800 p-6 rounded-2xl space-y-4">
              <h3 className="text-base font-bold text-white">Placement Intelligence Check</h3>
              
              <div className="space-y-3 text-xs sm:text-sm text-slate-400">
                <div className="flex items-center gap-2.5">
                  <BookmarkCheck size={16} className="text-brand-400" />
                  <span>Use precise terms in documents like <strong>Capgemini, BDO, Cyber Security</strong> to facilitate high-relevance matches.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <BookmarkCheck size={16} className="text-brand-400" />
                  <span>Response grounding will flag statements missing support from context.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <BookmarkCheck size={16} className="text-brand-400" />
                  <span>Access the <strong>Admin Console</strong> to view latency breakdown metrics.</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
export default Dashboard;
