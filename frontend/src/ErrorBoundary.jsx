import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <>
          <div className="nav">
            <div className="nav-dot" />
            <div className="nav-title">Group Order</div>
          </div>
          <div className="page">
            <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
              <p style={{ fontSize: '14px', color: '#888', marginBottom: '12px' }}>
                Something went wrong.
              </p>
              <button
                className="primary"
                onClick={() => this.setState({ hasError: false })}
              >
                Try again
              </button>
            </div>
          </div>
        </>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary