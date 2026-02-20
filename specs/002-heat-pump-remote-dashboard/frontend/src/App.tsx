import React, { Suspense, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from './routes';
import { Spinner } from './components/atoms';
import ErrorBoundary from './components/ErrorBoundary';
import { initWebSocket, cleanupWebSocket } from './services/websocket/client';
import { useAuthStore } from './store/authStore';
import './App.css';

// 建立 React Query 客戶端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000, // 30 seconds
    },
  },
});

const App: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    // T063: 初始化 WebSocket（僅在已登入時）
    let wsClient: any = null;
    
    if (isAuthenticated) {
      wsClient = initWebSocket(queryClient);
    }

    // 清理函式：元件卸載時斷開 WebSocket
    return () => {
      if (wsClient) {
        cleanupWebSocket();
      }
    };
  }, [isAuthenticated]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <div className="app">
          <Suspense fallback={<Spinner fullScreen size="large" />}>
            <AppRoutes />
          </Suspense>
        </div>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
