// @ts-nocheck
import { useState } from 'react';

/**
 * LoginForm Component
 * 
 * Login form with:
 * - Username and password inputs
 * - Form validation
 * - Error display
 * - JWT token management
 * 
 * Requirements: 1.1, 1.2
 */

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token and user info
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.user.username);
        localStorage.setItem('role', data.user.role);

        // Redirect based on role
        if (data.user.role === 'ambulance') {
          window.location.href = '/ambulance';
        } else if (data.user.role === 'police') {
          window.location.href = '/police';
        }
      } else {
        setError(data.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-500 bg-opacity-20 border border-red-500 text-white px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="login-username" className="block text-white font-semibold mb-2">
          Username
        </label>
        <input
          id="login-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white bg-opacity-90 border border-white border-opacity-30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 text-gray-800 placeholder-gray-500"
          placeholder="Enter your username"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="login-password" className="block text-white font-semibold mb-2">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white bg-opacity-90 border border-white border-opacity-30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 text-gray-800 placeholder-gray-500"
          placeholder="Enter your password"
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-white text-purple-600 font-bold py-3 px-6 rounded-lg hover:bg-opacity-90 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-purple-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Logging in...
          </span>
        ) : (
          'Login'
        )}
      </button>

      <div className="text-center text-white text-sm opacity-80">
        <p>Demo Accounts:</p>
        <p className="mt-1">Ambulance: ambulance1 / password123</p>
        <p>Police: police1 / password123</p>
      </div>
    </form>
  );
}
