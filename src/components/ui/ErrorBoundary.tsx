"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            backgroundColor: "var(--bg)",
            color: "var(--text)",
            textAlign: "center",
            fontFamily: "'Saira Condensed', sans-serif",
          }}
        >
          <span style={{ fontSize: 48, color: "var(--red)", fontWeight: 900 }}>
            algo deu errado
          </span>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            tenta recarregar a pagina
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              marginTop: 8,
              padding: "8px 24px",
              backgroundColor: "var(--red)",
              color: "#fff",
              border: "none",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              cursor: "pointer",
            }}
          >
            recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
