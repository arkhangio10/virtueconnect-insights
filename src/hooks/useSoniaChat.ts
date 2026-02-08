import { useCallback, useRef, useState } from "react";

const SONIA_API_BASE =
  (import.meta.env.VITE_SONIA_API_URL as string | undefined)?.trim() ||
  (import.meta.env.DEV ? "http://localhost:3001" : "");

export interface SoniaMessage {
  role: "user" | "assistant";
  content: string;
  attachments?: { name: string; type: string }[];
  timestamp?: string;
}

export interface PatientLocation {
  lat: number;
  lng: number;
}

export interface UseSoniaChatReturn {
  messages: SoniaMessage[];
  conversationId: string | null;
  loading: boolean;
  error: string | null;
  patientLocation: PatientLocation | null;
  startConversation: () => Promise<void>;
  sendMessage: (text: string, files?: File[], facilityContext?: string) => Promise<void>;
  setPatientLocation: (loc: PatientLocation | null) => Promise<void>;
}

export function useSoniaChat(): UseSoniaChatReturn {
  const [messages, setMessages] = useState<SoniaMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientLocation, setPatientLocationState] = useState<PatientLocation | null>(null);
  const initRef = useRef(false);

  const startConversation = useCallback(async () => {
    if (initRef.current) return;
    initRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SONIA_API_BASE}/api/sonia/start`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Start failed: ${res.status}`);
      const data = await res.json();
      setConversationId(data.conversationId);
      setMessages([data.message]);
    } catch (err: any) {
      setError(err.message);
      // Fallback greeting if API is down
      setMessages([
        {
          role: "assistant",
          content:
            "Hello! I'm Sonia, your clinical assistant. It seems the backend server isn't running. Please start it with:\n\n`npx tsx server/sonia-api.ts`\n\nMeanwhile, I can still show facility data from the local pipeline.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  const setPatientLocation = useCallback(
    async (loc: PatientLocation | null) => {
      setPatientLocationState(loc);

      // If clearing, just add a brief message
      if (!loc) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Patient location has been cleared. You can set a new location using the GPS button, clicking the map, or dragging the pin.",
            timestamp: new Date().toISOString(),
          },
        ]);
        return;
      }

      if (!conversationId) {
        setMessages((prev) => [
          ...prev,
          {
            role: "user",
            content: `Patient located at: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`,
            timestamp: new Date().toISOString(),
          },
          {
            role: "assistant",
            content: `I've marked the patient's location. Now, what does the patient need? Describe symptoms, use the quick action buttons, or upload medical records.`,
            timestamp: new Date().toISOString(),
          },
        ]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`${SONIA_API_BASE}/api/sonia/location`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, lat: loc.lat, lng: loc.lng }),
        });
        if (!res.ok) throw new Error(`Location failed: ${res.status}`);
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: "user",
            content: `Patient located at: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`,
            timestamp: new Date().toISOString(),
          },
          data.message,
        ]);
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          {
            role: "user",
            content: `Patient located at: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`,
            timestamp: new Date().toISOString(),
          },
          {
            role: "assistant",
            content: `I've noted the location. What does the patient need?`,
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [conversationId]
  );

  const sendMessage = useCallback(
    async (text: string, files?: File[], facilityContext?: string) => {
      if (!text.trim() && (!files || files.length === 0)) return;

      const userMsg: SoniaMessage = {
        role: "user",
        content:
          text || (files && files.length > 0 ? `Uploaded ${files.length} file(s)` : ""),
        attachments: files?.map((f) => ({ name: f.name, type: f.type })),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setError(null);

      if (!conversationId) {
        // Fallback: no backend
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "The backend server isn't connected. Please start it to enable Gemini-powered responses.",
            timestamp: new Date().toISOString(),
          },
        ]);
        setLoading(false);
        return;
      }

      try {
        // Build the text sent to backend — append facility context if provided
        const textForBackend = facilityContext
          ? `${text}\n\n${facilityContext}`
          : text;

        const formData = new FormData();
        formData.append("conversationId", conversationId);
        formData.append("text", textForBackend);
        if (files) {
          files.forEach((file) => formData.append("files", file));
        }

        const res = await fetch(`${SONIA_API_BASE}/api/sonia/chat`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Chat failed: ${res.status}`);
        }
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
      } catch (err: any) {
        setError(err.message);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Sorry, I encountered an error: ${err.message}. Please try again.`,
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [conversationId]
  );

  return {
    messages,
    conversationId,
    loading,
    error,
    patientLocation,
    startConversation,
    sendMessage,
    setPatientLocation,
  };
}
