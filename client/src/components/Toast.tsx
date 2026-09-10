import "./Toast.css";

export function Toast({
  message,
  type = "success",
  durationMs = 2000,
}: {
  message: string;
  type?: "success" | "error";
  durationMs?: number;
}) {
  return (
    <div
      className={`toast${type === "error" ? " toast--error" : ""}`}
      style={{ animationDuration: `${durationMs}ms` }}
    >
      {message}
    </div>
  );
}
