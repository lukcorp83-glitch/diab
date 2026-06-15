import React, { ErrorInfo, ReactNode } from "react";
import i18n from "../i18n";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: ""
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-rose-50 text-rose-500 min-h-screen text-xs font-mono flex flex-col items-center justify-center">
          <h1 className="font-bold text-lg mb-4">{i18n.t('auto.aplikacja_napotkala_blad', { defaultValue: i18n.t('auto.aplikacja_napotkala_blad', { defaultValue: "Aplikacja napotkała błąd" }) })}</h1>
          <p>{this.state.errorMessage}</p>
          <button 
             onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
             className="mt-4 px-4 py-2 bg-rose-500 text-white rounded-lg"
          >
             {i18n.t('auto.odswiez', { defaultValue: i18n.t('auto.odswiez', { defaultValue: "Odśwież" }) })}</button>
        </div>
      );
    }

    return this.props.children;
  }
}
