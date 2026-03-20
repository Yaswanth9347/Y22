import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LayoutDashboard, ListTodo, LogOut, LogIn, BarChart2, Moon, Sun } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

export function Navbar() {
  const { user, login, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    // Wait for animation to finish
    setTimeout(async () => {
      await logout();
      setIsLoggingOut(false);
    }, 2500);
  };

  const navLinks = [
    { name: 'Board', path: '/', icon: LayoutDashboard },
    { name: 'Backlog', path: '/backlog', icon: ListTodo },
    { name: 'Reports', path: '/reports', icon: BarChart2 },
  ];

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 sticky top-0 z-10 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xl">
            <LayoutDashboard className="w-6 h-6" />
            <span>Y22</span>
          </div>
          
          {user && (
            <div className="flex gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={clsx(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300" 
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {link.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline-block">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Login with Google
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isLoggingOut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-900"
          >
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ x: -200 }}
                animate={{ x: 0 }}
                transition={{ 
                  duration: 2, 
                  ease: "easeOut" 
                }}
                className="text-8xl mb-4"
              >
                🏃
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-2xl font-bold text-gray-900 dark:text-white"
              >
                Logging out...
              </motion.h2>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
