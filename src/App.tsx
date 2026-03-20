import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { Board } from './pages/Board';
import { Backlog } from './pages/Backlog';
import { Reports } from './pages/Reports';

function LoginPrompt() {
  const { login } = useAuth();
  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Y22</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">A simple personal project management tool. Please log in to manage your tasks.</p>
        <button
          onClick={login}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPrompt />;
  }

  return (
    <Routes>
      <Route path="/" element={<Board />} />
      <Route path="/backlog" element={<Backlog />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors">
              <Navbar />
              <AppRoutes />
            </div>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
