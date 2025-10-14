"use client";
import { useFormStatus } from "react-dom";

export default function FormSubmit({ children, pendingText, className, disabled }: { children: React.ReactNode; pendingText?: string; className?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = Boolean(disabled) || pending;
  return (
    <button type="submit" className={className || "px-3 py-2 border rounded"} disabled={isDisabled}>
      {pending ? (pendingText || "שומר…") : children}
    </button>
  );
}
