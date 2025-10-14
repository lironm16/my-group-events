"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

function readValueFromInput(input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
  const el = input as HTMLInputElement;
  if (el instanceof HTMLInputElement && el.type === "checkbox") {
    return el.checked ? "on" : "";
  }
  return (input as any).value ?? "";
}

function getFormValues(form: HTMLFormElement | null, names: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  if (!form) return result;
  for (const name of names) {
    const elems = Array.from(form.elements).filter((e: any) => e && e.name === name) as Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
    if (!elems.length) {
      result[name] = "";
      continue;
    }
    if (elems.length === 1) {
      result[name] = readValueFromInput(elems[0]);
    } else {
      // Multiple inputs with same name (e.g., radios). Pick checked one, else empty.
      const checked = elems.find((el: any) => (el as HTMLInputElement).checked);
      result[name] = checked ? readValueFromInput(checked) : "";
    }
  }
  return result;
}

function shallowEqual(a: Record<string, string>, b: Record<string, string>) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if ((a[k] ?? "") !== (b[k] ?? "")) return false;
  }
  return true;
}

export default function DirtySubmit({
  names,
  initial,
  className,
  pendingText = "שומר…",
  redirectTo = "/settings",
  updateSessionFields,
}: {
  names: string[];
  initial: Record<string, string>;
  className?: string;
  pendingText?: string;
  redirectTo?: string;
  updateSessionFields?: string[]; // e.g., ['name','email','image']
}) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [dirty, setDirty] = useState(false);
  const { pending } = useFormStatus();
  const router = useRouter();
  const { update } = useSession();

  const normalizedInitial = useMemo(() => {
    const norm: Record<string, string> = {};
    for (const k of names) norm[k] = String(initial[k] ?? "");
    return norm;
  }, [names, initial]);

  useEffect(() => {
    const form = btnRef.current?.closest("form") as HTMLFormElement | null;
    if (!form) return;
    const compute = () => {
      const current = getFormValues(form, names);
      setDirty(!shallowEqual(current, normalizedInitial));
    };
    compute();
    const handler = () => compute();
    form.addEventListener("input", handler);
    form.addEventListener("change", handler);
    return () => {
      form.removeEventListener("input", handler);
      form.removeEventListener("change", handler);
    };
  }, [names, normalizedInitial]);

  const [wasPending, setWasPending] = useState(false);
  useEffect(() => {
    if (pending) {
      setWasPending(true);
      return;
    }
    if (wasPending && !pending) {
      // After a successful submit (no thrown error), optionally update session fields and navigate back
      const form = btnRef.current?.closest("form") as HTMLFormElement | null;
      if (form && updateSessionFields && update) {
        const current = getFormValues(form, updateSessionFields);
        try { update(current as any); } catch {}
      }
      // Small delay to allow any cache revalidations
      setTimeout(() => {
        try { router.push(redirectTo); } catch {}
        try { router.refresh(); } catch {}
      }, 50);
      setWasPending(false);
    }
  }, [pending, wasPending, router, update, redirectTo, updateSessionFields]);

  const isDisabled = !dirty || pending;

  return (
    <button ref={btnRef} type="submit" className={className || "px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60"} disabled={isDisabled}>
      {pending ? pendingText : "שמירה"}
    </button>
  );
}
