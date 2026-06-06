import { useState, useEffect, useCallback } from "react";
import "./Toast.css";

interface ToastMessage { id: number; text: string; type: "success" | "error" }

let addToast: ((msg: ToastMessage) => void) | null = null;

export function showToast(text: string, type: "success" | "error" = "success") {
  addToast?.({ id: Date.now(), text, type });
}

export default function Toast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const handleAdd = useCallback((msg: ToastMessage) => {
    setMessages((prev) => [...prev, msg]);
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    }, 3000);
  }, []);

  useEffect(() => { addToast = handleAdd; }, [handleAdd]);

  if (messages.length === 0) return null;

  return (
    <div className="toast-container">
      {messages.map((m) => (
        <div key={m.id} className={`toast toast-${m.type}`}>{m.text}</div>
      ))}
    </div>
  );
}
