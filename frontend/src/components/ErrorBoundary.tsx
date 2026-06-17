import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-base)', padding: '40px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 20, color: 'var(--accent)' }}>♪</div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif", fontSize: 26,
            fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12,
          }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.65 }}>
            An unexpected error occurred. Refresh the page to continue.
          </p>
          <button
            className="btn-primary"
            onClick={() => { this.setState({ hasError: false }); window.location.href = '/' }}
          >
            Go home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
