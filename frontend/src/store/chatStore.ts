import { create } from 'zustand';
import api from '../services/api';

export interface Citation {
  document_id: string;
  filename: string;
  page: number;
  chunk_id: string;
  snippet: string;
  confidence: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  created_at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: ChatMessage[];
  citations: Citation[];
  isStreaming: boolean;
  currentStreamingText: string;
  isLoadingMessages: boolean;

  fetchSessions: () => Promise<void>;
  createSession: (title?: string) => Promise<string>;
  selectSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  sendMessage: (query: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  citations: [],
  isStreaming: false,
  currentStreamingText: "",
  isLoadingMessages: false,

  fetchSessions: async () => {
    try {
      const sessions = await api.chat.listSessions();
      set({ sessions });
    } catch (err) {
      console.error("Failed to fetch chat sessions:", err);
    }
  },

  createSession: async (title?: string) => {
    try {
      const newSession = await api.chat.createSession(title);
      set((state) => ({
        sessions: [newSession, ...state.sessions],
        activeSessionId: newSession.id,
        messages: [],
        citations: []
      }));
      return newSession.id;
    } catch (err) {
      console.error("Failed to create session:", err);
      throw err;
    }
  },

  selectSession: async (sessionId: string) => {
    set({ activeSessionId: sessionId, isLoadingMessages: true, messages: [], citations: [] });
    try {
      const sessionDetail = await api.chat.getSession(sessionId);
      set({ messages: sessionDetail.messages, isLoadingMessages: false });
    } catch (err) {
      console.error("Failed to select session:", err);
      set({ isLoadingMessages: false });
    }
  },

  deleteSession: async (sessionId: string) => {
    try {
      await api.chat.deleteSession(sessionId);
      set((state) => {
        const remaining = state.sessions.filter(s => s.id !== sessionId);
        const nextActive = state.activeSessionId === sessionId
          ? (remaining.length > 0 ? remaining[0].id : null)
          : state.activeSessionId;
        
        return {
          sessions: remaining,
          activeSessionId: nextActive
        };
      });

      const { activeSessionId } = get();
      if (activeSessionId) {
        await get().selectSession(activeSessionId);
      } else {
        set({ messages: [], citations: [] });
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  },

  sendMessage: async (query: string) => {
    const { activeSessionId, messages } = get();
    if (!activeSessionId) return;

    // 1. Instantly append user message to local state for snappy UX
    const userMessageId = Math.random().toString();
    const userMsg: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      content: query,
      created_at: new Date().toISOString(),
    };

    set({
      messages: [...messages, userMsg],
      isStreaming: true,
      currentStreamingText: "",
      citations: [],
    });

    const token = localStorage.getItem("placementgpt_token");
    const streamUrl = api.chat.getMessageStreamUrl(activeSessionId);

    try {
      const response = await fetch(streamUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ content: query }),
      });

      if (!response.ok) {
        throw new Error("Failed to initialize message stream");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Stream reader not available");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        // Keep the last partial line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;
          
          const rawData = line.slice(6).trim();
          if (rawData === "[DONE]") {
            continue;
          }

          try {
            const data = JSON.parse(rawData);
            
            if (data.type === "citations") {
              set({ citations: data.citations });
            } else if (data.type === "token") {
              set((state) => ({
                currentStreamingText: state.currentStreamingText + data.content
              }));
            } else if (data.type === "error") {
              set((state) => ({
                currentStreamingText: state.currentStreamingText + `\n\n[Error: ${data.content}]`
              }));
            }
          } catch (e) {
            // JSON parsing error (likely incomplete chunk, ignore)
          }
        }
      }

      // Stream finished successfully: Append streaming message to database state
      const assistantMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: 'assistant',
        content: get().currentStreamingText,
        citations: get().citations,
        created_at: new Date().toISOString()
      };

      set((state) => ({
        messages: [...state.messages, assistantMsg],
        isStreaming: false,
        currentStreamingText: "",
      }));

      // Eagerly refresh sessions (title might have auto-updated based on prompt context)
      await get().fetchSessions();

    } catch (error: any) {
      console.error("Error in streaming message:", error);
      
      const assistantErrorMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: 'assistant',
        content: `Error: Could not retrieve response. ${error.message || ""}`,
        created_at: new Date().toISOString()
      };

      set((state) => ({
        messages: [...state.messages, assistantErrorMsg],
        isStreaming: false,
        currentStreamingText: "",
      }));
    }
  }
}));
