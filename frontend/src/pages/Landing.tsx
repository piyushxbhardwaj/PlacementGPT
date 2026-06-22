import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Terminal, 
  Sparkles, 
  Zap, 
  Search, 
  FileCheck2, 
  LineChart 
} from 'lucide-react';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: "Query Rewriting & Expansion",
      description: "Uses LLM context to expand and rewrite conversational chat history into standalone semantic search parameters.",
      icon: Terminal,
    },
    {
      title: "Dense & Sparse Hybrid Retrieval",
      description: "Combines dense pgvector embeddings with PostgreSQL sparse full-text search indexes via Reciprocal Rank Fusion (RRF).",
      icon: Search,
    },
    {
      title: "Cross-Encoder Reranking",
      description: "Utilizes local SentenceTransformer Cross-Encoders to compute semantic scores, filtering out irrelevant snippets.",
      icon: Zap,
    },
    {
      title: "Strict Source Citation Grounding",
      description: "Matches synthesized tokens directly to source pages, documents, and paragraphs with hover-to-highlight citations.",
      icon: FileCheck2,
    },
    {
      title: "Real-time SSE Streaming",
      description: "Delivers sub-100ms response tokens with Server-Sent Events (SSE) and fast caching using deterministic user-state hashes.",
      icon: Sparkles,
    },
    {
      title: "Enterprise Observability",
      description: "Hooks Prometheus metrics, structured JSON logging, and token cost tracking tools directly into the pipeline.",
      icon: LineChart,
    },
  ];

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 overflow-x-hidden relative flex flex-col justify-between">
      
      {/* Background Glowing Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-600/10 blur-[120px] pointer-events-none glow-bg" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-500/10 blur-[120px] pointer-events-none glow-bg" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-brand-600 shadow-glass-brand text-white flex items-center justify-center">
            <Terminal size={22} className="stroke-[2.5]" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Placement<span className="text-brand-400">GPT</span>
          </span>
        </div>
        <button 
          onClick={() => navigate('/login')}
          className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white transition-all text-sm font-semibold text-slate-200"
        >
          Sign In
        </button>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-7xl mx-auto px-6 py-12 text-center z-10 relative">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-600/10 border border-brand-500/20 text-xs font-semibold text-brand-400 mb-6 uppercase tracking-wider">
          <Sparkles size={12} />
          <span>Production-Ready RAG Platform</span>
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1]">
          Career Intelligence Grounded in <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-indigo-300">Verified Sources</span>
        </h1>
        
        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          Upload resumes, placement manuals, interview logs, and JDs. Query your custom knowledge base with advanced hybrid retrieval, reranking, and citation grounding.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => navigate('/login')}
            className="px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-base font-bold text-white shadow-glass-brand transition-all flex items-center justify-center gap-2 group"
          >
            <span>Get Started Free</span>
            <Zap size={16} className="text-brand-200 group-hover:scale-110 transition-transform" />
          </button>
          <a 
            href="#features"
            className="px-8 py-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:text-white transition-all text-base font-bold text-slate-300 flex items-center justify-center"
          >
            Explore Technical Specs
          </a>
        </div>

        {/* Feature Grid */}
        <section id="features" className="w-full mt-24 pt-12 border-t border-slate-900">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white text-center mb-4">
            Under the Hood: Enterprise-Grade Stack
          </h2>
          <p className="text-sm sm:text-base text-slate-500 text-center max-w-lg mx-auto mb-12">
            PlacementGPT goes beyond generic chat wrappers to deliver accurate source grounding, low latencies, and high retrieval recall.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div 
                  key={idx}
                  className="glass-panel glass-card-hover border border-slate-850 p-6 rounded-2xl flex flex-col gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-600/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white mb-2">{feat.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{feat.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 py-6 mt-12 text-center text-xs text-slate-600 z-10 relative">
        <p>&copy; {new Date().getFullYear()} PlacementGPT. Built for Career Preparation and Interview Grounding.</p>
      </footer>
    </div>
  );
};
export default Landing;
