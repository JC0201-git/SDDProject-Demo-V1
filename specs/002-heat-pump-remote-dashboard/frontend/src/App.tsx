import React, { Suspense } from 'react';
import { AppRoutes } from './routes';
import { Spinner } from './components/atoms';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <div className="app">
        <Suspense fallback={<Spinner fullScreen size="large" />}>
          <AppRoutes />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
};

export default App;
