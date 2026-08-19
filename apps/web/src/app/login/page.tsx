'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@medical-inventory/validation';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { useBrandingStore } from '../../stores/branding-store';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const loginStore = useAuthStore((s) => s.login);
  const { name: storeName, primaryColor } = useBrandingStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@medcare.com',
      password: '',
    },
  });

  const onSubmit = async (data: any) => {
    setErrorMessage(null);
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', data);
      const { accessToken, refreshToken, user } = res.data;
      loginStore(accessToken, refreshToken, user);
      router.push('/');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-900/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-600 shadow-xl shadow-sky-600/30 text-white font-bold text-2xl mb-4">
            +
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            {storeName}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Medical Inventory & Pharmacy POS System
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-slate-900 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-800 backdrop-blur-xl">
            {errorMessage && (
              <div className="mb-5 p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email or Mobile
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    {...register('email')}
                    type="text"
                    placeholder="admin@medcare.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-400">{errors.email.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    {...register('password')}
                    type="password"
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-400">{errors.password.message as string}</p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 shadow-lg shadow-sky-600/30 transition disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : 'Sign In to Workspace'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-800 text-center">
              <p className="text-xs text-slate-500">
                Default Credentials: <code className="text-sky-400 font-mono">admin@medcare.com</code> / <code className="text-sky-400 font-mono">Admin@123456</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
