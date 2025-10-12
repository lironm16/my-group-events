"use client";
import { useFormStatus } from "react-dom";

export default function FormSubmit({ children, pendingText, className }: { children: React.ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className || "px-3 py-2 border rounded"} disabled={pending}>
      {pending ? (pendingText || "מבצע…") : children}
    </button>
  );
}
