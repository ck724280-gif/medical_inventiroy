'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@medical-inventory/validation';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { useBrandingStore } from '../../stores/branding-store';
import { useThemeStore } from '../../stores/theme-store';
import { Input, Button } from '../../components/ui';
import {
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Activity,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const loginStore = useAuthStore((s) => s.login);
  const { name: storeName, logo: storeLogo } = useBrandingStore();
  const { theme, toggleTheme, initializeTheme } = useThemeStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    initializeTheme();
    // Instant pre-warm: wake up backend container as soon as login page opens
    apiClient.get('/health').catch(() => {});
  }, [initializeTheme]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: any) => {
    setErrorMessage(null);
    setLoading(true);
    setIsWarmingUp(false);

    // Show warming up feedback if server spin-up takes longer than 1.2s
    const warmupTimer = setTimeout(() => {
      setIsWarmingUp(true);
    }, 1200);

    try {
      const res = await apiClient.post('/auth/login', data);
      clearTimeout(warmupTimer);
      const { accessToken, refreshToken, user } = res.data?.data || res.data;
      loginStore(accessToken, refreshToken, user);
      router.replace('/');
    } catch (err: any) {
      clearTimeout(warmupTimer);
      setIsWarmingUp(false);
      setErrorMessage(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-surface-page text-text-primary relative overflow-hidden font-sans transition-colors duration-200">
      {/* ── Floating Theme Toggle ────────────────── */}
      <div className="absolute top-4 right-4 z-30">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-base/90 backdrop-blur-sm text-xs font-semibold text-text-secondary shadow-sm hover:bg-surface-hover hover:text-text-primary transition cursor-pointer"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-text-secondary" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>
      </div>

      {/* ── Left Branding Panel (Desktop 40% md+) ────────────────── */}
      <div className="hidden md:flex md:w-[40%] bg-accent p-10 flex-col justify-between relative overflow-hidden text-accent-foreground select-none">
        {/* Background glow & subtle patterns */}
        <div
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-25"
          style={{ background: '#ffffff' }}
        />
        <div
          className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: 'rgba(0, 0, 0, 0.4)' }}
        />

        {/* Top brand icon */}
        <div className="relative z-10 flex items-center gap-2 text-accent-foreground/90 font-mono text-xs uppercase tracking-wider">
          <Activity className="w-4 h-4" />
          <span>Healthcare Cloud Platform</span>
        </div>

        {/* Center brand presentation */}
        <div className="relative z-10 my-auto py-12 text-center max-w-sm mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white text-accent font-bold text-3xl mb-6 shadow-xl overflow-hidden border-2 border-white/20">
            {storeLogo ? (
              <img
                src={storeLogo}
                alt={storeName || 'Logo'}
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <span>{storeName ? storeName.charAt(0).toUpperCase() : '+'}</span>
            )}
          </div>

          <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight mb-2">
            {storeName || 'Pharmacy & Healthcare'}
          </h1>
          <p className="text-accent-foreground/90 font-mono text-sm font-semibold tracking-wide">
            Medical ERP &amp; POS
          </p>

          <p className="mt-4 text-xs text-accent-foreground/80 leading-relaxed max-w-xs mx-auto">
            FEFO-enforced batch dispensing, GST compliance, multi-tender POS billing, and real-time inventory management.
          </p>
        </div>

        {/* Bottom security pill */}
        <div className="relative z-10 flex items-center justify-center gap-2 text-xs text-accent-foreground/80 font-medium">
          <ShieldCheck className="w-4 h-4 text-accent-foreground" />
          <span>256-Bit Encrypted Pharmacy Workspace</span>
        </div>
      </div>

      {/* ── Right Login Form Panel (Desktop 60%, Mobile Full Width) ── */}
      <div className="w-full md:w-[60%] flex flex-col justify-center items-center px-4 py-12 sm:px-8 lg:px-16 relative z-10 min-h-screen md:min-h-0 bg-surface-page">
        {/* Mobile Header (<md) */}
        <div className="md:hidden text-center mb-8 max-w-xs">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent text-accent-foreground font-bold text-2xl mb-3 shadow-md overflow-hidden">
            {storeLogo ? (
              <img
                src={storeLogo}
                alt={storeName || 'Logo'}
                className="w-full h-full object-contain p-1.5 bg-surface-base"
              />
            ) : (
              <span>{storeName ? storeName.charAt(0).toUpperCase() : '+'}</span>
            )}
          </div>
          <h2 className="text-xl font-bold text-text-primary tracking-tight">
            {storeName || 'Pharmacy & Healthcare'}
          </h2>
          <p className="text-xs text-accent font-mono font-semibold mt-0.5">
            Medical ERP &amp; POS
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-md bg-surface-base border border-border rounded-2xl shadow-card p-6 sm:p-8 animate-fade-in">
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
              Sign In
            </h2>
            <p className="text-xs sm:text-sm text-text-muted mt-1">
              Enter your credentials to access your store counter
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Input
                label="Email or Mobile"
                type="text"
                placeholder="admin@medcare.com"
                disabled={loading}
                leftIcon={<Mail className="w-4 h-4" />}
                error={errors.email?.message as string}
                {...register('email')}
              />
            </div>

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                disabled={loading}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="text-text-muted hover:text-text-primary focus:outline-none transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
                error={errors.password?.message as string}
                {...register('password')}
              />
            </div>

            {/* Inline Error Message Banner */}
            {errorMessage && (
              <div className="p-3 rounded-xl text-status-error text-xs flex items-center gap-2 bg-status-error-bg border border-status-error-border animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-status-error" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Cloud Server Warming Up Notice */}
            {loading && isWarmingUp && !errorMessage && (
              <div className="p-3 rounded-xl text-accent text-xs flex items-center gap-2 bg-accent/10 border border-accent/20 animate-pulse">
                <Activity className="w-4 h-4 shrink-0 text-accent animate-spin" />
                <span>Connecting to cloud server... Waking up secure workspace (takes a few seconds on first visit).</span>
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                disabled={loading}
                className="w-full font-semibold shadow-sm"
                rightIcon={!loading ? <ArrowRight className="w-4 h-4" /> : undefined}
              >
                Sign In to Workspace
              </Button>
            </div>
          </form>
        </div>

        {/* Footer Subtext */}
        <p className="text-center text-xs text-text-muted mt-6">
          Authorized personnel only. Protected by medical role-based access control.
        </p>
      </div>
    </div>
  );
}
