import { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '24px',
          }}
        >
          <Result
            status="error"
            title="系統發生錯誤"
            subTitle="抱歉，系統遇到了一些問題。請嘗試重新載入頁面。"
            extra={
              <Button type="primary" onClick={this.handleReset}>
                返回首頁
              </Button>
            }
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
