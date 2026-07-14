import { logger } from "../lib/logger";
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logger.error('Uncaught error:', error, errorInfo);

        // Handle dynamic import failures (MIME type or network errors)
        if (error.message.includes('Failed to fetch dynamically imported module') ||
            error.message.includes('module script')) {
            window.location.reload();
        }
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-gray-50 dark:bg-gray-950 transition-colors duration-500">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
                        <span className="text-4xl text-red-500">⚠️</span>
                    </div>
                    <h1 className="text-3xl font-black mb-4">Application Error</h1>

                    <div className="bg-white dark:bg-gray-900 border border-red-100 dark:border-red-900/30 p-6 rounded-2xl mb-8 max-w-2xl w-full shadow-xl">
                        <p className="text-red-600 dark:text-red-400 font-bold mb-2">Error Details:</p>
                        <code className="block text-left text-xs font-mono break-words opacity-70 mb-4 overflow-x-auto whitespace-pre-wrap max-h-40">
                            {this.state.error?.message}
                            {"\n\n"}
                            {this.state.error?.stack}
                        </code>

                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={() => {
                                    this.setState({ hasError: false, error: null });
                                    window.location.reload();
                                }}
                                className="px-6 py-2.5 bg-primary hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20"
                            >
                                Reload Application
                            </button>
                            <button
                                onClick={() => window.history.back()}
                                className="px-6 py-2.5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 font-bold rounded-xl transition-all text-gray-700 dark:text-gray-200"
                            >
                                Go Back
                            </button>
                        </div>
                    </div>

                    <p className="text-gray-500 text-sm">
                        If this persists, please contact support with the error details.
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
