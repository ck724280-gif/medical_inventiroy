import { create } from 'zustand';
import { apiClient } from '../lib/api-client';

interface BusinessBrandingState {
  name: string;
  logo: string | null;
  favicon: string | null;
  phone: string;
  altPhone: string | null;
  email: string | null;
  website: string | null;
  address: string;
  city: string | null;
  state: string | null;
  pinZip: string | null;
  gstNumber: string | null;
  pharmacyLicense: string | null;
  currencySymbol: string;
  primaryColor: string;
  secondaryColor: string;
  updatedAt?: string | null;
  isLoaded: boolean;

  fetchBranding: () => Promise<void>;
  setBranding: (data: Partial<BusinessBrandingState>) => void;
  updateLogoImmediately: (newLogoUrl: string) => void;
}

export const useBrandingStore = create<BusinessBrandingState>((set, get) => ({
  name: 'MedCare Pharmacy',
  logo: null,
  favicon: null,
  phone: '+91 98765 43210',
  altPhone: null,
  email: null,
  website: null,
  address: 'Commercial Complex, Main Road',
  city: null,
  state: null,
  pinZip: null,
  gstNumber: null,
  pharmacyLicense: null,
  currencySymbol: '₹',
  primaryColor: '#0284c7',
  secondaryColor: '#0f172a',
  updatedAt: null,
  isLoaded: false,

  setBranding: (data) => {
    set((state) => {
      const next = { ...state, ...data };
      if (typeof document !== 'undefined') {
        if (data.name) {
          document.title = `${data.name} — Pharmacy ERP & POS`;
        }
        if (data.primaryColor) {
          document.documentElement.style.setProperty('--color-primary', data.primaryColor);
        }
        if (data.secondaryColor) {
          document.documentElement.style.setProperty('--color-secondary', data.secondaryColor);
        }
      }
      return next;
    });
  },

  updateLogoImmediately: (newLogoUrl: string) => {
    set((state) => ({
      ...state,
      logo: newLogoUrl,
      updatedAt: new Date().toISOString(),
    }));
  },

  fetchBranding: async () => {
    try {
      const res = await apiClient.get('/settings/public');
      const data = res.data?.data || res.data || {};

      let logoUrl = data.logo || null;
      if (logoUrl && !logoUrl.startsWith('data:') && !logoUrl.includes('?v=')) {
        const v = data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now();
        logoUrl = `${logoUrl}${logoUrl.includes('?') ? '&' : '?'}v=${v}`;
      }

      set({
        name: data.name || 'MedCare Pharmacy',
        logo: logoUrl,
        favicon: data.favicon || null,
        phone: data.phone || '',
        altPhone: data.altPhone || null,
        email: data.email || null,
        website: data.website || null,
        address: data.address || '',
        city: data.city || null,
        state: data.state || null,
        pinZip: data.pinZip || null,
        gstNumber: data.gstNumber || null,
        pharmacyLicense: data.pharmacyLicense || null,
        currencySymbol: data.currencySymbol || '₹',
        primaryColor: data.primaryColor || '#0284c7',
        secondaryColor: data.secondaryColor || '#0f172a',
        updatedAt: data.updatedAt || null,
        isLoaded: true,
      });

      // Dynamically apply CSS root variables for themes and document title
      if (typeof document !== 'undefined') {
        if (data.name) {
          document.title = `${data.name} — Pharmacy ERP & POS`;
        }
        document.documentElement.style.setProperty('--color-primary', data.primaryColor || '#0284c7');
        document.documentElement.style.setProperty('--color-secondary', data.secondaryColor || '#0f172a');
      }
    } catch (e) {
      set({ isLoaded: true });
    }
  },
}));
