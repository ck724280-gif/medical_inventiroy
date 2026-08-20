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
    <div className="min-h-screen bg-obsidian-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden text-slate-100">
      {/* ── Ambient Glowing Aurora Orbs ───────────────────────── */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[100px] pointer-events-none animate-aurora"
        style={{ background: 'rgba(6, 182, 212, 0.18)' }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full blur-[120px] pointer-events-none animate-aurora"
        style={{ background: 'rgba(8, 145, 178, 0.15)', animationDelay: '-4s' }}
      />
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-[120px] pointer-events-none"
        style={{ background: 'rgba(15, 32, 64, 0.3)' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white font-bold text-2xl mb-4 relative animate-pulse-ring"
            style={{
              background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
              boxShadow: '0 0 24px rgba(6, 182, 212, 0.45)',
            }}
          >
            +
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight glow-text-cyan">
            {storeName}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-cyan-300/70 font-mono">
            Medical Inventory &amp; Pharmacy POS System
          </p>
        </div>

        {/* Login Glassmorphism Box */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div
            className="py-8 px-6 sm:px-10 rounded-2xl relative"
            style={{
              background: 'rgba(10, 22, 40, 0.70)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(6, 182, 212, 0.18)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 20px rgba(6, 182, 212, 0.1)',
            }}
          >
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-5 p-3 rounded-xl text-red-300 text-xs flex items-center gap-2"
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
                <label className="block text-[11px] font-semibold text-cyan-200/80 uppercase tracking-wider mb-1.5">
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-slate-100 placeholder-slate-500 text-sm transition-all duration-200 focus:outline-none"
                    style={{
                      background: 'rgba(5, 10, 15, 0.75)',
                      border: '1px solid rgba(6, 182, 212, 0.20)',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#06b6d4';
                      e.target.style.boxShadow = '0 0 12px rgba(6, 182, 212, 0.3)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(6, 182, 212, 0.20)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-400">{errors.email.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-cyan-200/80 uppercase tracking-wider mb-1.5">
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-slate-100 placeholder-slate-500 text-sm transition-all duration-200 focus:outline-none"
                    style={{
                      background: 'rgba(5, 10, 15, 0.75)',
                      border: '1px solid rgba(6, 182, 212, 0.20)',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#06b6d4';
                      e.target.style.boxShadow = '0 0 12px rgba(6, 182, 212, 0.3)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(6, 182, 212, 0.20)';
                      e.target.style.boxShadow = 'none';
                    }}
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
              <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>Default Credentials</span>
              </div>
              <p className="text-xs text-slate-400">
                <code className="text-cyan-300 font-mono bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">admin@medcare.com</code>
                {' / '}
                <code className="text-cyan-300 font-mono bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">Admin@123456</code>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
