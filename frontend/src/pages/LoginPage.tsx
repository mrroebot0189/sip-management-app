import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheck, AlertCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean(),
});

type FormData = z.infer<typeof schema>;
type AuthMode = 'signin' | 'signup';

const LoginPage: React.FC = () => {
  const { login, signupAdmin, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('signin');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  if (loading) return <LoadingSpinner size="lg" className="min-h-screen" />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      if (authMode === 'signup') {
        if (data.password.length < 8) {
          setServerError('Password must be at least 8 characters.');
          return;
        }
        await signupAdmin(data.email, data.password, data.rememberMe);
      } else {
        await login(data.email, data.password, data.rememberMe);
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (authMode === 'signup'
          ? 'Could not create admin account. Please try again.'
          : 'Invalid email or password. Please try again.');
      setServerError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-4">

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-md">

        {/* Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/60 ring-4 ring-blue-500/20">
            <ShieldCheck className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Security Improvement Programme
          </h1>
          <p className="text-blue-300 text-sm mt-1.5">
            {authMode === 'signin'
              ? 'Sign in to access your workspace'
              : 'Create your account'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          <div className="px-8 pt-8 pb-6">

            {/* Server error banner */}
            {serverError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3.5 mb-5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

              {/* Email */}
              <div>
                <label htmlFor="email" className="label">
                  {authMode === 'signin' ? 'Email address' : 'Enter your email address'}
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    {...register('email')}
                    className={`input pl-9 ${
                      errors.email ? 'border-red-400 focus:ring-red-400' : ''
                    }`}
                    placeholder={
                      authMode === 'signin' ? 'you@organisation.com' : 'Enter your email address'
                    }
                  />
                </div>
                {errors.email && (
                  <p id="email-error" role="alert" className="text-red-500 text-xs mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="label">
                  {authMode === 'signin' ? 'Password' : 'Create your password'}
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    {...register('password')}
                    className={`input pl-9 pr-10 ${
                      errors.password ? 'border-red-400 focus:ring-red-400' : ''
                    }`}
                    placeholder={
                      authMode === 'signin' ? '••••••••' : 'Create your password'
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" role="alert" className="text-red-500 text-xs mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember me */}
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  type="checkbox"
                  {...register('rememberMe')}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label
                  htmlFor="rememberMe"
                  className="ml-2 text-sm text-gray-600 cursor-pointer select-none"
                >
                  Keep me signed in
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full justify-center py-2.5 text-base font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {authMode === 'signin' ? 'Signing in…' : 'Creating account…'}
                  </>
                ) : (
                  authMode === 'signin' ? 'Sign In' : 'Sign Up'
                )}
              </button>
            </form>
          </div>

          {/* Card footer */}
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
            <div className="text-xs text-gray-500 text-center space-y-2">
              <p>
                {authMode === 'signin'
                  ? 'Need a platform admin account?'
                  : 'Already have an account?'}
                <button
                  type="button"
                  className="ml-1 font-semibold text-blue-700 hover:text-blue-800 underline underline-offset-2"
                  onClick={() => {
                    setServerError('');
                    setAuthMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
                  }}
                >
                  {authMode === 'signin' ? 'Sign up here.' : 'Sign in here.'}
                </button>
              </p>
              {authMode === 'signup' ? (
                <p>Use your email address and a password to create your account.</p>
              ) : (
                <p>
                  Forgotten your password?{' '}
                  <span className="font-medium text-gray-700">Contact your system administrator.</span>
                </p>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          Security Improvement Programme &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
