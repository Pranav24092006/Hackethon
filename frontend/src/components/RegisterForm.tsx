// @ts-nocheck
import { useState } from 'react';

/**
 * RegisterForm Component
 * 
 * Registration form with:
 * - Username, password, and role selection
 * - Form validation
 * - Error display
 * - Automatic login after registration
 * 
 * Requirements: 1.1, 1.3
 */

export function RegisterForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'ambulance' | 'police'>('ambulance');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!username || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, role }),
      });

      const data = await response.json();

      if (response.ok) {
        // Auto-login after registration
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        });

        const loginData = await loginResponse.json();

        if (loginResponse.ok) {
          // Store token and user info
          localStorage.setItem('token', loginData.token);
          localStorage.setItem('username', loginData.user.username);
          localStorage.setItem('role', loginData.user.role);

          // Redirect based on role
          if (loginData.user.role === 'ambulance') {
            window.location.href = '/ambulance';
          } else if (loginData.user.role === 'police') {
            window.location.href = '/police';
          }
        }
      } else {
        if (response.status === 409) {
          setError('Username already exists. Please choose another.');
        } else {
          setError(data.error || 'Registration failed. Please try again.');
        }
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Registration error:', err);
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
        <label htmlFor="register-username" className="block text-white font-semibold mb-2">
          Username
        </label>
        <input
          id="register-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white bg-opacity-90 border border-white border-opacity-30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 text-gray-800 placeholder-gray-500"
          placeholder="Choose a username (min 3 characters)"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="register-password" className="block text-white font-semibold mb-2">
          Password
        </label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white bg-opacity-90 border border-white border-opacity-30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 text-gray-800 placeholder-gray-500"
          placeholder="Choose a password (min 8 characters)"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="register-confirm-password" className="block text-white font-semibold mb-2">
          Confirm Password
        </label>
        <input
          id="register-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-white bg-opacity-90 border border-white border-opacity-30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 text-gray-800 placeholder-gray-500"
          placeholder="Confirm your password"
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-white font-semibold mb-2">Role</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole('ambulance')}
            disabled={isLoading}
            className={`py-3 px-4 rounded-lg font-semibold transition-all ${
              role === 'ambulance'
                ? 'bg-white text-purple-600 shadow-lg'
                : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
            }`}
          >
            🚑 Ambulance
          </button>
          <button
            type="button"
            onClick={() => setRole('police')}
            disabled={isLoading}
            className={`py-3 px-4 rounded-lg font-semibold transition-all ${
              role === 'police'
                ? 'bg-white text-purple-600 shadow-lg'
                : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
            }`}
          >
            🚓 Police
          </button>
        </div>
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
            Creating account...
          </span>
        ) : (
          'Create Account'
        )}
      </button>
    </form>
  );
}
