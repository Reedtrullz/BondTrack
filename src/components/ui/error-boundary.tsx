'use client';

import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/20">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Something went wrong
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
              We encountered an unexpected error. Please try refreshing the page to continue.
            </p>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="mt-4 max-w-2xl overflow-auto rounded-lg bg-zinc-100 p-4 text-left text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              <code>{this.state.error.message}</code>
              {this.state.error.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-medium">Stack trace</summary>
                  <code className="mt-1 block whitespace-pre-wrap">
                    {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                  </code>
                </details>
              )}
            </pre>
          )}

          <Button onClick={this.handleReload} variant="default" size="default">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to trigger error boundary reset from child components
 */
export function useErrorBoundary() {
  const resetError = () => window.location.reload();
  return { resetError };
}
