import React, { useEffect, useState, useRef } from 'react';
import { 
  MessageSquarePlus, 
  Trash2, 
  Send, 
  Loader2, 
  Bot, 
  User, 
  FileText, 
  Sparkles, 
  Cpu, 
  ShieldAlert,
  ArrowDown
} from 'lucide-react';
import { useChatStore } from '../store/chatStore';

export const Chat: React.FC = () => {
  const {
    sessions,
    activeSessionId,
    messages,
    citations,
    isStreaming,
    currentStreamingText,
    isLoadingMessages,
    fetchSessions,
    createSession,
    selectSession,
    deleteSession,
    sendMessage
  } = useChatStore();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Fetch detail when activeSessionId changes or gets set
  useEffect(() => {
    if (activeSessionId) {
      selectSession(activeSessionId);
    }
  }, [activeSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, currentStreamingText]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    
    let currentSession = activeSessionId;
    if (!currentSession) {
      // Auto-create a session if none selected
      currentSession = await createSession(input.slice(0, 30) + "...");
    }
    
    const query = input;
    setInput("");
    await sendMessage(query);
  };

  const handleNewChat = () => {
    createSession();
  };

  return (
    <div className="flex-1 flex overflow-hidden h-screen relative bg-dark-950">
      
      {/* Sidebar - Chat Sessions */}
      <div className="hidden md:flex flex-col w-64 border-r border-slate-800/80 bg-dark-950/45 p-4 justify-between h-full">
        <div className="space-y-4">
          <button
            onClick={handleNewChat}
            className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-sm font-bold text-white shadow-glass-brand transition-all flex items-center justify-center gap-2"
          >
            <MessageSquarePlus size={16} />
            <span>New Discussion</span>
          </button>
          
          <div className="space-y-1.5 overflow-y-auto max-h-[70vh] pr-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-2">Recents</span>
            {sessions.map((session) => {
              const active = session.id === activeSessionId;
              return (
                <div 
                  key={session.id}
                  className={`
                    group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all border
                    ${active 
                      ? 'bg-slate-800/60 text-slate-200 border-slate-700/60' 
                      : 'text-slate-400 border-transparent hover:bg-slate-800/20 hover:text-slate-200'
                    }
                  `}
                  onClick={() => selectSession(session.id)}
                >
                  <span className="truncate pr-2">{session.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 rounded transition-opacity"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Chat Screen Area */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden h-full">
        {/* Active Session Status bar */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-dark-900/10 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">
              {sessions.find(s => s.id === activeSessionId)?.title || "AI Research assistant"}
            </h3>
            <span className="text-[10px] text-slate-500 font-medium">Model: gemini-1.5-flash &bull; 100% Citation Grounded</span>
          </div>
          {isStreaming && (
            <div className="flex items-center gap-1.5 text-xs text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2.5 py-1 rounded-full font-semibold animate-pulse">
              <Cpu size={12} className="animate-spin" />
              <span>Pipeline active</span>
            </div>
          )}
        </div>

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoadingMessages ? (
            <div className="space-y-6">
              {/* Message Loading skeletons */}
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-4 max-w-3xl animate-pulse">
                  <div className="w-9 h-9 rounded-xl bg-slate-800" />
                  <div className="flex-1 space-y-2 mt-1">
                    <div className="h-3.5 bg-slate-800 rounded w-1/4" />
                    <div className="h-3 bg-slate-850 rounded w-full" />
                    <div className="h-3 bg-slate-850 rounded w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 && !isStreaming ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto gap-5">
              <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center shadow-glass-brand">
                <Bot size={28} className="stroke-[1.8]" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Ask Career Intel Questions</h4>
                <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                  Type questions regarding company patterns, skills needed, or interview summaries. The AI will query uploaded documents to formulate answers.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-md text-left text-xs font-semibold">
                <button 
                  onClick={() => setInput("What DBMS questions are frequently asked in Capgemini interviews?")}
                  className="p-3 rounded-xl border border-slate-850 bg-slate-900/20 hover:border-brand-500/30 text-slate-300 hover:text-white transition-all"
                >
                  &ldquo;Capgemini DBMS Questions&rdquo;
                </button>
                <button 
                  onClick={() => setInput("What skills are required for AI Engineer internships?")}
                  className="p-3 rounded-xl border border-slate-850 bg-slate-900/20 hover:border-brand-500/30 text-slate-300 hover:text-white transition-all"
                >
                  &ldquo;AI Internship Skills&rdquo;
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {messages.map((msg) => {
                const isAssistant = msg.sender === 'assistant';
                return (
                  <div key={msg.id} className={`flex gap-4 ${isAssistant ? '' : 'justify-end'}`}>
                    {isAssistant && (
                      <div className="w-9 h-9 rounded-xl bg-brand-600/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0">
                        <Bot size={18} />
                      </div>
                    )}
                    
                    <div className={`
                      p-4 rounded-2xl text-sm leading-relaxed max-w-[80%]
                      ${isAssistant 
                        ? 'bg-slate-900/30 border border-slate-850 text-slate-200 shadow-sm' 
                        : 'bg-brand-600 text-white shadow-glass-brand font-medium'
                      }
                    `}>
                      <span className="whitespace-pre-line font-sans">{msg.content}</span>
                      
                      {/* Render Citations under Assistant response */}
                      {isAssistant && msg.citations && msg.citations.length > 0 && (
                        <div className="mt-4 pt-3.5 border-t border-slate-850 space-y-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Grounded Citations</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {msg.citations.map((cit, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-dark-900/40 border border-slate-800 text-xs">
                                <span className="w-5 h-5 rounded bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold text-[10px] border border-brand-500/20 shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="text-slate-350 truncate flex-1 font-semibold">{cit.filename}</span>
                                <span className="text-slate-500 shrink-0 text-[10px]">P.{cit.page}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {!isAssistant && (
                      <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                        <User size={18} />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Streaming Assistant bubble */}
              {isStreaming && currentStreamingText && (
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-600/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0">
                    <Bot size={18} />
                  </div>
                  <div className="p-4 rounded-2xl text-sm leading-relaxed max-w-[80%] bg-slate-900/30 border border-slate-850 text-slate-200">
                    <span className="whitespace-pre-line font-sans">{currentStreamingText}</span>
                    
                    {/* Streaming Citations Header */}
                    {citations.length > 0 && (
                      <div className="mt-4 pt-3.5 border-t border-slate-850 space-y-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block animate-pulse">Loading Source Cards...</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {citations.map((cit, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-dark-900/40 border border-slate-800 text-xs">
                              <span className="w-5 h-5 rounded bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold text-[10px] border border-brand-500/20 shrink-0">
                                {idx + 1}
                              </span>
                              <span className="text-slate-350 truncate flex-1 font-semibold">{cit.filename}</span>
                              <span className="text-slate-500 shrink-0 text-[10px]">P.{cit.page}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input box form */}
        <div className="p-6 border-t border-slate-800/80 bg-dark-950/40">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-center shadow-lg">
            <input
              type="text"
              required
              disabled={isStreaming || isLoadingMessages}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="block w-full pl-5 pr-14 py-4 text-sm text-white glass-input rounded-2xl disabled:bg-slate-900/30 disabled:text-slate-500"
              placeholder={isStreaming ? "Synthesizing answer..." : "Ask DBMS questions, summary requests..."}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming || isLoadingMessages}
              className="absolute right-3.5 p-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:bg-slate-800 text-white disabled:text-slate-500 transition-all flex items-center justify-center"
            >
              {isStreaming ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default Chat;
