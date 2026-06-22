import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, Lock, Mail, Loader2, UserPlus, LogIn } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, setUser } = useAuthStore();
  
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = () => {
    if (!email || !password) {
      setError("Please fill out all fields.");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }
    if (isRegister && password !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isRegister) {
        // Register flow
        await api.auth.register(email, password);
        // Login immediately after register
        const tokenData = await api.auth.login(email, password);
        login(tokenData.access_token);
        const profile = await api.auth.getMe();
        setUser(profile);
        navigate('/dashboard');
      } else {
        // Login flow
        const tokenData = await api.auth.login(email, password);
        login(tokenData.access_token);
        const profile = await api.auth.getMe();
        setUser(profile);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-[20%] left-[50%] -translate-x-[50%] -translate-y-[50%] w-[450px] h-[450px] rounded-full bg-brand-600/10 blur-[100px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 relative">
        <div className="flex justify-center">
          <div 
            onClick={() => navigate('/')} 
            className="p-3 rounded-2xl bg-brand-600 shadow-glass-brand text-white flex items-center justify-center cursor-pointer"
          >
            <Terminal size={28} className="stroke-[2.5]" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
          {isRegister ? 'Create student account' : 'Sign in to PlacementGPT'}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Or{' '}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="font-semibold text-brand-400 hover:text-brand-350 transition-colors"
          >
            {isRegister ? 'log in to existing account' : 'register a new account'}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 relative px-4 sm:px-0">
        <div className="glass-panel border border-slate-800/80 py-8 px-4 shadow-glass rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400 animate-shake">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Email address
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail size={16} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 text-sm text-white glass-input rounded-xl"
                  placeholder="name@university.edu"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <div className="mt-2 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock size={16} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 text-sm text-white glass-input rounded-xl"
                  placeholder="Min. 6 characters"
                />
              </div>
            </div>

            {/* Confirm Password Field for Register */}
            {isRegister && (
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="mt-2 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 text-sm text-white glass-input rounded-xl"
                    placeholder="Repeat password"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:bg-brand-700 text-sm font-bold text-white shadow-glass-brand transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isRegister ? (
                  <>
                    <UserPlus size={16} />
                    <span>Create Account</span>
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
export default Login;
