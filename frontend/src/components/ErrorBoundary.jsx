"""
Frontend error boundary component for React.
Catches unhandled errors and displays user-friendly messages.
"""

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import '../assets/styles/error-boundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error);
      console.error('Error info:', errorInfo);
    }

    // Log to error tracking service (Sentry, etc.)
    this.logErrorToService(error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  logErrorToService = (error, errorInfo) => {
    // TODO: Integrate with Sentry or similar error tracking
    // Example:
    // Sentry.captureException(error, {
    //   contexts: {
    //     react: {
    //       componentStack: errorInfo.componentStack,
    //     },
    //   },
    // });
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">
              <AlertTriangle size={48} />
            </div>
            <h1>Oops! Something went wrong</h1>
            <p>We're sorry, but something unexpected happened. Our team has been notified.</p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="error-boundary-details">
                <summary>Error details (development only)</summary>
                <pre className="error-boundary-stack">
                  {this.state.error && this.state.error.toString()}
                </pre>
                <pre className="error-boundary-stack">
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="error-boundary-actions">
              <button onClick={this.handleReset} className="btn btn-primary">
                Try Again
              </button>
              <a href="/" className="btn btn-secondary">
                Go Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
