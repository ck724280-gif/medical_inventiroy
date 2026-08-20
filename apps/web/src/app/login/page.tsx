'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { loginSchema } from '@medical-inventory/validation';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { useBrandingStore } from '../../stores/branding-store';
import { Lock, Mail, AlertCircle, ArrowRight, Shield } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const loginStore = useAuthStore((s) => s.login);
  const { name: storeName } = useBrandingStore();
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
      const { accessToken, refreshToken, user } = res.data?.data || res.data;
      loginStore(accessToken, refreshToken, user);
      router.push('/');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* ── Ambient Background Glow ───────────────────────── */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[100px] pointer-events-none opacity-30 dark:opacity-20"
        style={{ background: 'rgba(56, 189, 248, 0.4)' }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full blur-[120px] pointer-events-none opacity-30 dark:opacity-20"
        style={{ background: 'rgba(14, 165, 233, 0.3)' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white font-bold text-2xl mb-4 relative shadow-lg bg-sky-600"
          >
            +
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {storeName}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-sky-600 dark:text-sky-400 font-mono font-semibold">
            Medical ERP &amp; Pharmacy POS System
          </p>
        </div>

        {/* Login Box */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="py-8 px-6 sm:px-10 rounded-2xl relative bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl">
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-5 p-3 rounded-xl text-red-600 dark:text-red-300 text-xs flex items-center gap-2"
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label className="block text-[11px] font-semibold text-cyan-700 dark:text-cyan-200/80 uppercase tracking-wider mb-1.5">
                  Email or Mobile
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-500/60">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    {...register('email')}
                    type="text"
                    placeholder="admin@medcare.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#050a0f] border border-cyan-600/20 dark:border-cyan-400/20 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm transition-all duration-200 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20" />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-400">{errors.email.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-cyan-700 dark:text-cyan-200/80 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-500/60">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    {...register('password')}
                    type="password"
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#050a0f] border border-cyan-600/20 dark:border-cyan-400/20 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm transition-all duration-200 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20" />
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-400">{errors.password.message as string}</p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white btn-cyan cursor-pointer transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <>
                      <span>Sign In to Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div
              className="mt-6 pt-5 text-center"
              style={{ borderTop: '1px solid rgba(6, 182, 212, 0.12)' }}
            >
              <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                <Shield className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Default Credentials</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <code className="text-cyan-700 dark:text-cyan-300 font-mono bg-cyan-100 dark:bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-300 dark:border-cyan-800/40">admin@medcare.com</code>
                {' / '}
                <code className="text-cyan-700 dark:text-cyan-300 font-mono bg-cyan-100 dark:bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-300 dark:border-cyan-800/40">Admin@123456</code>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
