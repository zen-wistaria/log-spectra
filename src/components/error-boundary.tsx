"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="bg-destructive/5 dark:bg-destructive/10 border-destructive flex flex-1 flex-col items-center space-y-3 rounded-md border p-4 text-center"
          role="alert"
        >
          <div className="relative mb-6 h-[calc(100vh-400px)] w-64">
            <div className="relative mb-6 h-full w-64">
              <div className="flex h-full w-full items-center justify-center">
                <div className="relative">
                  <div className="bg-destructive/10 dark:bg-destructive/20 h-40 w-40 rounded-full">
                    <div className="flex h-full w-full items-center justify-center">
                      <TriangleAlert className="text-destructive size-20" />
                    </div>
                  </div>

                  <div className="bg-destructive/5 dark:bg-destructive/10 absolute -top-2 -right-2 -bottom-2 -left-2 rounded-full blur-md" />
                </div>
              </div>
            </div>
          </div>
          <h2 className="mb-2 text-xl font-bold">Oops! Something went wrong</h2>
          <p className="text-destructive mb-4 max-w-md font-mono text-sm">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <Button
            variant="destructive"
            onClick={this.resetError}
            aria-label="Try again"
            size="sm"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
