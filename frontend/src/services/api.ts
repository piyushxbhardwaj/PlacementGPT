const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const getHeaders = (isMultipart = false) => {
  const headers: Record<string, string> = {};
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  const token = localStorage.getItem("placementgpt_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    let errorDetail = "An unexpected error occurred.";
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      // Fallback
    }
    throw new Error(errorDetail);
  }
  return response.json();
};

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ email, password }),
      });
      return handleResponse(res);
    },

    register: async (email: string, password: string) => {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ email, password }),
      });
      return handleResponse(res);
    },

    getMe: async () => {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    promote: async (userId: string) => {
      const res = await fetch(`${API_URL}/api/auth/promote/${userId}`, {
        method: "POST",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  documents: {
    list: async () => {
      const res = await fetch(`${API_URL}/api/documents`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    upload: async (file: File, isPublic: boolean) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("is_public", String(isPublic));

      const res = await fetch(`${API_URL}/api/documents/upload`, {
        method: "POST",
        headers: getHeaders(true), // isMultipart = true
        body: formData,
      });
      return handleResponse(res);
    },

    delete: async (documentId: string) => {
      const res = await fetch(`${API_URL}/api/documents/${documentId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  chat: {
    listSessions: async () => {
      const res = await fetch(`${API_URL}/api/chat/session`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    createSession: async (title?: string) => {
      const res = await fetch(`${API_URL}/api/chat/session`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ title }),
      });
      return handleResponse(res);
    },

    getSession: async (sessionId: string) => {
      const res = await fetch(`${API_URL}/api/chat/session/${sessionId}`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    deleteSession: async (sessionId: string) => {
      const res = await fetch(`${API_URL}/api/chat/session/${sessionId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    getMessageStreamUrl: (sessionId: string) => {
      return `${API_URL}/api/chat/session/${sessionId}/message`;
    },
  },

  admin: {
    getStats: async () => {
      const res = await fetch(`${API_URL}/api/admin/stats`, {
        method: "GET",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },
};
export default api;
