import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    errorMessage: string;
    componentStack: string;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        errorMessage: '',
        componentStack: ''
    };

    public static getDerivedStateFromError(error: Error): Partial<State> {
        return {
            hasError: true,
            errorMessage: error?.message || String(error)
        };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({
            errorMessage: error?.stack || error?.message || String(error),
            componentStack: errorInfo.componentStack || ''
        });

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
                    <p className="text-gray-500 mb-4">Startup diagnostic details (share this with support):</p>
                    <pre className="w-full max-w-3xl max-h-[45vh] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-gray-100 p-4 text-left text-xs text-gray-900 select-text">
                        {this.state.errorMessage || 'No error message was provided.'}
                        {this.state.componentStack ? `\n\nReact component stack:\n${this.state.componentStack}` : ''}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-6 py-2 bg-primary text-white rounded-full font-bold"
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
