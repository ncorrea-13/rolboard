import { useEffect, useEffectEvent } from "react";
import "./Toast.css";

const DURATION_MS = { success: 2000, error: 3000 };

export function Toast({
  message,
  type = "success",
  onDone,
}: {
  message: string;
  type?: "success" | "error";
  onDone: () => void;
}) {
  const durationMs = DURATION_MS[type];
  const done = useEffectEvent(onDone);

  useEffect(() => {
    const timer = setTimeout(done, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs]);

  return (
    <div
      className={`toast${type === "error" ? " toast--error" : ""}`}
      style={{ animationDuration: `${durationMs}ms` }}
      role={type === "error" ? "alert" : "status"}
    >
      {message}
    </div>
  );
}
