// @ts-nocheck
import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

/**
 * LandingPage Component
 * 
 * Animated landing page with:
 * - Gradient background with animations
 * - Glassmorphism design
 * - Login and registration forms
 * - Smooth transitions with Framer Motion
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

export function LandingPage() {
  const [showLogin, setShowLogin] = useState(true);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 animate-gradient">
      {/* Animated Background Circles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl animate-float" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute -bottom-40 left-1/3 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl animate-float" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left Side - Hero Content */}
            <div className="text-white space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="text-6xl">🚑</div>
                  <div className="text-6xl">🚓</div>
                </div>
                <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                  Smart Emergency
                  <br />
                  Route Optimizer
                </h1>
                <p className="text-xl md:text-2xl text-blue-100">
                  Coordinating emergency response through intelligent routing
                </p>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">⚡</div>
                  <div>
                    <h3 className="font-semibold text-lg">Real-Time Optimization</h3>
                    <p className="text-blue-100">
                      Dynamic route calculation with live traffic data
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">🗺️</div>
                  <div>
                    <h3 className="font-semibold text-lg">Interactive Maps</h3>
                    <p className="text-blue-100">
                      Visual route guidance with congestion indicators
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">📡</div>
                  <div>
                    <h3 className="font-semibold text-lg">Instant Communication</h3>
                    <p className="text-blue-100">
                      Real-time alerts between ambulances and police
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Auth Forms */}
            <div className="w-full">
              {/* Glassmorphism Card */}
              <div className="bg-white bg-opacity-20 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white border-opacity-30">
                {/* Tab Switcher */}
                <div className="flex space-x-2 mb-6 bg-white bg-opacity-20 rounded-lg p-1">
                  <button
                    onClick={() => setShowLogin(true)}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                      showLogin
                        ? 'bg-white text-purple-600 shadow-lg'
                        : 'text-white hover:bg-white hover:bg-opacity-10'
                    }`}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setShowLogin(false)}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                      !showLogin
                        ? 'bg-white text-purple-600 shadow-lg'
                        : 'text-white hover:bg-white hover:bg-opacity-10'
                    }`}
                  >
                    Register
                  </button>
                </div>

                {/* Forms */}
                <div className="transition-all duration-300">
                  {showLogin ? <LoginForm /> : <RegisterForm />}
                </div>
              </div>

              {/* Footer Note */}
              <p className="text-center text-white text-sm mt-4 opacity-80">
                Secure authentication • Real-time coordination • Life-saving technology
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(-20px) translateX(20px);
          }
        }

        @keyframes float-delayed {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(20px) translateX(-20px);
          }
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 15s ease infinite;
        }

        .animate-float {
          animation: float 20s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 25s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
