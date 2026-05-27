import React, { Component, ReactNode } from "react";
interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class LocalErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    try {
      localStorage.setItem("lastAppError", JSON.stringify({ message: error.message, stack: error.stack, time: new Date().toISOString() }));
    } catch (e) {}
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="absolute inset-0 z-[9999] p-8 text-white font-bold bg-rose-600 flex flex-col items-center justify-center overflow-auto">
          <h2 className="text-3xl mb-4">CRASH!</h2>
          <p className="text-sm border border-white/50 p-4 bg-black/20 rounded-xl max-w-full break-words">
            {this.state.error?.message}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-white text-rose-600 rounded-full font-black uppercase"
          >
            Odśwież
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

