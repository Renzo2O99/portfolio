import { type ReactNode, useEffect, useState } from "react";

type ErrorBoundaryProps = {
  fallback?: ReactNode;
  children?: ReactNode;
};

function ErrorBoundary({ fallback, children }: ErrorBoundaryProps) {
  const [error, setError] = useState<{ hasError: boolean; error: Error | null } | null>(null);

  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      setError({ hasError: true, error: event.error });
    };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);

  if (error?.hasError) {
    return <div aria-live="polite">{typeof fallback === "undefined" ? null : fallback}</div>;
  }

  return children;
}

export { ErrorBoundary };
