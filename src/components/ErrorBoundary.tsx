import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-gray-900 p-4 transition-colors">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Something went wrong</h2>
            <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded text-red-800 dark:text-red-300 text-sm overflow-auto max-h-64">
              <pre>{this.state.error?.message}</pre>
            </div>
            <button
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:hover:bg-red-500 transition-colors"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
