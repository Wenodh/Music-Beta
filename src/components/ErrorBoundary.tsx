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
        console.error('Uncaught error:', error, errorInfo);

        // Handle dynamic import failures (MIME type or network errors)
        if (error.message.includes('Failed to fetch dynamically imported module') ||
            error.message.includes('module script')) {
            window.location.reload();
        }
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
                    <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
                    <p className="text-red-500 font-mono text-sm mb-4 bg-gray-100 dark:bg-gray-800 p-4 rounded-xl max-w-lg overflow-auto">
                        {this.state.error?.message}
                    </p>
                    <p className="text-gray-500 mb-6">We encountered an error while loading this page.</p>
                    <button
                        onClick={() => {
                            this.setState({ hasError: false, error: null });
                            window.location.reload();
                        }}
                        className="px-6 py-2 bg-primary text-white rounded-full font-bold"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
