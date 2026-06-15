import { Component } from "react";

export class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, details) {
    console.error("PawPin runtime error:", error, details);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="pp-root">
        <div className="pp-stage">
          <div className="pp-card" style={{ maxWidth: 380, textAlign: "center" }}>
            <h1 className="pp-h1">PawPin hit a problem</h1>
            <p className="pp-sub">Your data is safe. Reload the app to recover.</p>
            <button className="pp-btn pp-btn-amber" onClick={() => window.location.reload()}>Reload PawPin</button>
          </div>
        </div>
      </div>
    );
  }
}
