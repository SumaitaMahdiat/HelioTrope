import React, { useState, useRef, useEffect } from "react";
import { API_ORIGIN } from "../api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const FashionAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message to AI API
  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setInput("");

    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`${API_ORIGIN}/api/ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          context: { city: "Dhaka", season: "summer" },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "AI request failed");
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.assistant || data.error || "No response",
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error connecting to AI assistant. Try again.";
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: message,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Send on Enter key (Shift+Enter for newline)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 to-pink-50 p-6">
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
        🤖 AI Fashion Assistant
      </h1>
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 h-[70vh] flex flex-col">
        {/* Message list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              Ask me anything about fashion! e.g. "What to wear for Eid dinner?"
              or "Style my black jeans."
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-linear-to-r from-purple-500 to-pink-500 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-md px-4 py-2 bg-gray-100 text-gray-800 rounded-2xl">
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {/* Input area */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your fashion question..."
              className="flex-1 p-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={1}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all font-medium"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FashionAssistant;
