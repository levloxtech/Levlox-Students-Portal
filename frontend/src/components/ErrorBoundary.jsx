import React from 'react';

/**
 * Catches render-time errors so an exception in one page shows a recoverable
 * message instead of unmounting the whole app to a white screen.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
    if (this.props.onReset) this.props.onReset();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return typeof this.props.fallback === 'function'
        ? this.props.fallback(error, this.handleReset)
        : this.props.fallback;
    }

    return (
      <div
        role="alert"
        style={{
          minHeight: 320,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '48px 24px',
          textAlign: 'center',
        }}
      >
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary, #121118)' }}>
          Something went wrong while loading this section.
        </h3>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary, #6B7280)', maxWidth: 460, lineHeight: 1.5 }}>
          {error?.message || 'An unexpected error occurred.'}
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              padding: '9px 18px',
              borderRadius: 10,
              border: 'none',
              background: '#6C3CF0',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '9px 18px',
              borderRadius: 10,
              border: '1.5px solid rgba(0,0,0,0.12)',
              background: 'transparent',
              color: 'var(--text-primary, #121118)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
