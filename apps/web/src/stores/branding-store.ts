import { create } from 'zustand';
import { apiClient } from '../lib/api-client';

interface BusinessBrandingState {
  name: string;
  logo: string | null;
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
  isLoaded: boolean;

  fetchBranding: () => Promise<void>;
  setBranding: (data: Partial<BusinessBrandingState>) => void;
}

export const useBrandingStore = create<BusinessBrandingState>((set) => ({
  name: 'MedCare Pharmacy',
  logo: null,
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
  isLoaded: false,

  setBranding: (data) => set((state) => ({ ...state, ...data })),

  fetchBranding: async () => {
    try {
      const res = await apiClient.get('/settings/public');
      const data = res.data?.data || res.data || {};

      set({
        name: data.name || 'MedCare Pharmacy',
        logo: data.logo || null,
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
        isLoaded: true,
      });

      // Dynamically apply CSS root variables for themes
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--color-primary', data.primaryColor || '#0284c7');
        document.documentElement.style.setProperty('--color-secondary', data.secondaryColor || '#0f172a');
      }
    } catch (e) {
      set({ isLoaded: true });
    }
  },
}));
