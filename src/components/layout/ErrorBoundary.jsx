import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Surfaces in Vercel function/runtime logs and browser devtools instead of
    // failing completely silently, which made past bug reports hard to debug.
    console.error("thatpart crashed:", error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        padding: 24, background: "#fafaf8", fontFamily: "'Inter','Segoe UI',sans-serif",
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🩷</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#1a1a1a" }}>
          Something went wrong
        </div>
        <div style={{ fontSize: 14, color: "#666", marginBottom: 20, maxWidth: 320, lineHeight: 1.5 }}>
          Sorry about that — this page hit an unexpected error. Reloading usually fixes it.
        </div>
        <button onClick={this.handleReload} style={{
          background: "#f472b6", border: "none", borderRadius: 10,
          padding: "12px 24px", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer",
        }}>
          Reload
        </button>
      </div>
    );
  }
}
