import { create } from 'zustand';

export interface ColorPreset {
  id: string;
  name: string;
  primary: string;
  hover: string;
  subtle: string;
  subtleBorder: string;
  foreground: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'ocean_blue',
    name: 'Ocean Blue (Default)',
    primary: '#0284c7',
    hover: '#0369a1',
    subtle: 'rgba(2, 132, 199, 0.12)',
    subtleBorder: 'rgba(2, 132, 199, 0.25)',
    foreground: '#ffffff',
  },
  {
    id: 'medical_blue',
    name: 'Cobalt Medical',
    primary: '#2563eb',
    hover: '#1d4ed8',
    subtle: 'rgba(37, 99, 235, 0.12)',
    subtleBorder: 'rgba(37, 99, 235, 0.25)',
    foreground: '#ffffff',
  },
  {
    id: 'emerald_green',
    name: 'Emerald Health',
    primary: '#059669',
    hover: '#047857',
    subtle: 'rgba(5, 150, 105, 0.12)',
    subtleBorder: 'rgba(5, 150, 105, 0.25)',
    foreground: '#ffffff',
  },
  {
    id: 'clinical_teal',
    name: 'Clinical Teal',
    primary: '#0d9488',
    hover: '#0f766e',
    subtle: 'rgba(13, 148, 136, 0.12)',
    subtleBorder: 'rgba(13, 148, 136, 0.25)',
    foreground: '#ffffff',
  },
  {
    id: 'royal_indigo',
    name: 'Royal Indigo',
    primary: '#4f46e5',
    hover: '#4338ca',
    subtle: 'rgba(79, 70, 229, 0.12)',
    subtleBorder: 'rgba(79, 70, 229, 0.25)',
    foreground: '#ffffff',
  },
  {
    id: 'violet_purple',
    name: 'Modern Purple',
    primary: '#7c3aed',
    hover: '#6d28d9',
    subtle: 'rgba(124, 58, 237, 0.12)',
    subtleBorder: 'rgba(124, 58, 237, 0.25)',
    foreground: '#ffffff',
  },
  {
    id: 'crimson_rose',
    name: 'Crimson Rose',
    primary: '#e11d48',
    hover: '#be123c',
    subtle: 'rgba(225, 29, 72, 0.12)',
    subtleBorder: 'rgba(225, 29, 72, 0.25)',
    foreground: '#ffffff',
  },
  {
    id: 'vibrant_orange',
    name: 'Vibrant Orange',
    primary: '#ea580c',
    hover: '#c2410c',
    subtle: 'rgba(234, 88, 12, 0.12)',
    subtleBorder: 'rgba(234, 88, 12, 0.25)',
    foreground: '#ffffff',
  },
  {
    id: 'slate_graphite',
    name: 'Slate Graphite',
    primary: '#475569',
    hover: '#334155',
    subtle: 'rgba(71, 85, 105, 0.15)',
    subtleBorder: 'rgba(71, 85, 105, 0.30)',
    foreground: '#ffffff',
  },
];

export interface FontOption {
  id: string;
  name: string;
  fontFamily: string;
  category: string;
  sampleText: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'inter',
    name: 'Inter (Default Modern)',
    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    category: 'Clean Sans',
    sampleText: 'Paracetamol 650mg — Batch #B-9021 · ₹45.00',
  },
  {
    id: 'plus_jakarta',
    name: 'Plus Jakarta Sans',
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    category: 'Modern Corporate',
    sampleText: 'Azithromycin 500mg — Rx Verified · ₹120.00',
  },
  {
    id: 'poppins',
    name: 'Poppins (Friendly & Rounded)',
    fontFamily: "'Poppins', system-ui, -apple-system, sans-serif",
    category: 'Geometric Sans',
    sampleText: 'Amoxicillin Clavulanate — In Stock · ₹185.00',
  },
  {
    id: 'outfit',
    name: 'Outfit (Sleek & Premium)',
    fontFamily: "'Outfit', system-ui, -apple-system, sans-serif",
    category: 'Display / Clean',
    sampleText: 'Cetirizine 10mg — Non-Drowsy · ₹32.50',
  },
  {
    id: 'space_grotesk',
    name: 'Space Grotesk (High Tech)',
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
    category: 'Modern Tech',
    sampleText: 'Metformin HCl 500mg — Fast POS · ₹55.00',
  },
  {
    id: 'roboto',
    name: 'Roboto (Google Standard)',
    fontFamily: "'Roboto', system-ui, -apple-system, sans-serif",
    category: 'Universal Sans',
    sampleText: 'Pantoprazole DSR — Strip 10 Tabs · ₹98.00',
  },
  {
    id: 'merriweather',
    name: 'Merriweather (Classic Editorial)',
    fontFamily: "'Merriweather', Georgia, serif",
    category: 'Classic Serif',
    sampleText: 'Pharmacy Dispensary — Licensed & Verified',
  },
  {
    id: 'jetbrains_mono',
    name: 'JetBrains Mono (Precision Code)',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    category: 'Monospace',
    sampleText: 'INV-2026-90812 | GSTIN: 20AABCU9603R1ZM',
  },
];

export type FontDensity = 'compact' | 'normal' | 'relaxed' | 'large';
export type RadiusPreset = 'sharp' | 'modern' | 'rounded' | 'extra_rounded';
export type DarkBackgroundMode = 'slate_deep' | 'pure_oled' | 'midnight_navy' | 'zinc_modern';

export interface CustomThemeConfig {
  fontId: string;
  customFontName?: string;
  fontSizeScale: FontDensity;
  radiusStyle: RadiusPreset;
  colorPresetId: string;
  customPrimaryColor: string;
  customHoverColor: string;
  isCustomColorActive: boolean;
  darkBackgroundMode: DarkBackgroundMode;
}

const DEFAULT_CONFIG: CustomThemeConfig = {
  fontId: 'inter',
  customFontName: '',
  fontSizeScale: 'normal',
  radiusStyle: 'modern',
  colorPresetId: 'ocean_blue',
  customPrimaryColor: '#0284c7',
  customHoverColor: '#0369a1',
  isCustomColorActive: false,
  darkBackgroundMode: 'slate_deep',
};

interface CustomThemeStore extends CustomThemeConfig {
  setFontId: (fontId: string) => void;
  setCustomFontName: (name: string) => void;
  setFontSizeScale: (scale: FontDensity) => void;
  setRadiusStyle: (radius: RadiusPreset) => void;
  setColorPresetId: (id: string) => void;
  setCustomPrimaryColor: (hex: string) => void;
  setDarkBackgroundMode: (mode: DarkBackgroundMode) => void;
  resetToDefaults: () => void;
  applyThemeToDom: () => void;
  initialize: () => void;
}

function hexToRgba(hex: string, alpha: number): string {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  if (cleanHex.length !== 6) return `rgba(2, 132, 199, ${alpha})`;
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function ensureGoogleFontsLink() {
  if (typeof document === 'undefined') return;
  const linkId = 'medcare-custom-google-fonts';
  if (!document.getElementById(linkId)) {
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&family=Merriweather:wght@400;700&family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Roboto:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }
}

export const useCustomThemeStore = create<CustomThemeStore>((set, get) => ({
  ...DEFAULT_CONFIG,

  initialize: () => {
    if (typeof window === 'undefined') return;
    ensureGoogleFontsLink();

    try {
      const stored = localStorage.getItem('medcare_custom_ui_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        set((state) => ({ ...state, ...parsed }));
      }
    } catch (e) {
      console.warn('Could not load custom theme from localStorage:', e);
    }

    get().applyThemeToDom();
  },

  setFontId: (fontId) => {
    set({ fontId });
    get().applyThemeToDom();
  },

  setCustomFontName: (customFontName) => {
    set({ customFontName, fontId: 'custom' });
    get().applyThemeToDom();
  },

  setFontSizeScale: (fontSizeScale) => {
    set({ fontSizeScale });
    get().applyThemeToDom();
  },

  setRadiusStyle: (radiusStyle) => {
    set({ radiusStyle });
    get().applyThemeToDom();
  },

  setColorPresetId: (colorPresetId) => {
    set({ colorPresetId, isCustomColorActive: false });
    get().applyThemeToDom();
  },

  setCustomPrimaryColor: (customPrimaryColor) => {
    const hoverColor = customPrimaryColor;
    set({
      customPrimaryColor,
      customHoverColor: hoverColor,
      isCustomColorActive: true,
      colorPresetId: 'custom',
    });
    get().applyThemeToDom();
  },

  setDarkBackgroundMode: (darkBackgroundMode) => {
    set({ darkBackgroundMode });
    get().applyThemeToDom();
  },

  resetToDefaults: () => {
    set({ ...DEFAULT_CONFIG });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('medcare_custom_ui_config');
    }
    get().applyThemeToDom();
  },

  applyThemeToDom: () => {
    if (typeof document === 'undefined') return;
    const state = get();
    const root = document.documentElement;

    // 1. Apply Font Family
    let activeFontFamily = "'Inter', system-ui, -apple-system, sans-serif";
    if (state.fontId === 'custom' && state.customFontName?.trim()) {
      activeFontFamily = `'${state.customFontName.trim()}', system-ui, -apple-system, sans-serif`;
    } else {
      const matched = FONT_OPTIONS.find((f) => f.id === state.fontId);
      if (matched) activeFontFamily = matched.fontFamily;
    }

    root.style.setProperty('--app-font-family', activeFontFamily);
    root.style.setProperty('--font-inter', activeFontFamily);

    // 2. Apply Font Density Scaling
    const densityMap: Record<FontDensity, { size: string; scale: string }> = {
      compact: { size: '13px', scale: '0.94' },
      normal: { size: '14px', scale: '1.0' },
      relaxed: { size: '15px', scale: '1.07' },
      large: { size: '16px', scale: '1.14' },
    };
    const density = densityMap[state.fontSizeScale] || densityMap.normal;
    root.style.setProperty('--app-font-size', density.size);
    root.style.setProperty('--app-font-scale', density.scale);

    // 3. Apply Border Radius Style
    const radiusMap: Record<RadiusPreset, { sm: string; md: string; lg: string; xl: string }> = {
      sharp: { sm: '2px', md: '4px', lg: '6px', xl: '8px' },
      modern: { sm: '0.375rem', md: '0.5rem', lg: '0.75rem', xl: '1rem' },
      rounded: { sm: '0.5rem', md: '0.75rem', lg: '1rem', xl: '1.5rem' },
      extra_rounded: { sm: '0.75rem', md: '1rem', lg: '1.5rem', xl: '2rem' },
    };
    const rad = radiusMap[state.radiusStyle] || radiusMap.modern;
    root.style.setProperty('--radius-sm', rad.sm);
    root.style.setProperty('--radius-md', rad.md);
    root.style.setProperty('--radius-lg', rad.lg);
    root.style.setProperty('--radius-xl', rad.xl);

    // 4. Apply Accent Colors
    let primary = '#0284c7';
    let hover = '#0369a1';
    let subtle = 'rgba(2, 132, 199, 0.12)';
    let subtleBorder = 'rgba(2, 132, 199, 0.25)';
    let foreground = '#ffffff';

    if (state.isCustomColorActive && state.customPrimaryColor) {
      primary = state.customPrimaryColor;
      hover = state.customHoverColor || state.customPrimaryColor;
      subtle = hexToRgba(primary, 0.12);
      subtleBorder = hexToRgba(primary, 0.25);
    } else {
      const preset = COLOR_PRESETS.find((p) => p.id === state.colorPresetId) || COLOR_PRESETS[0];
      primary = preset.primary;
      hover = preset.hover;
      subtle = preset.subtle;
      subtleBorder = preset.subtleBorder;
      foreground = preset.foreground;
    }

    root.style.setProperty('--accent-primary', primary);
    root.style.setProperty('--accent-hover', hover);
    root.style.setProperty('--accent-active', hover);
    root.style.setProperty('--accent-subtle', subtle);
    root.style.setProperty('--accent-subtle-border', subtleBorder);
    root.style.setProperty('--accent-foreground', foreground);
    root.style.setProperty('--color-primary', primary);
    root.style.setProperty('--color-primary-hover', hover);

    // 5. Apply Dark Background Tones if in dark theme
    const darkModes: Record<DarkBackgroundMode, { page: string; base: string; raised: string; border: string }> = {
      slate_deep: { page: '#0d1117', base: '#161b22', raised: '#1c2128', border: '#30363d' },
      pure_oled: { page: '#000000', base: '#09090b', raised: '#121215', border: '#27272a' },
      midnight_navy: { page: '#0b1120', base: '#0f172a', raised: '#1e293b', border: '#334155' },
      zinc_modern: { page: '#121214', base: '#18181b', raised: '#27272a', border: '#3f3f46' },
    };

    const bgTone = darkModes[state.darkBackgroundMode] || darkModes.slate_deep;
    root.style.setProperty('--dark-page-override', bgTone.page);
    root.style.setProperty('--dark-base-override', bgTone.base);
    root.style.setProperty('--dark-raised-override', bgTone.raised);

    // 6. Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'medcare_custom_ui_config',
          JSON.stringify({
            fontId: state.fontId,
            customFontName: state.customFontName,
            fontSizeScale: state.fontSizeScale,
            radiusStyle: state.radiusStyle,
            colorPresetId: state.colorPresetId,
            customPrimaryColor: state.customPrimaryColor,
            customHoverColor: state.customHoverColor,
            isCustomColorActive: state.isCustomColorActive,
            darkBackgroundMode: state.darkBackgroundMode,
          })
        );
      } catch (e) {}
    }
  },
}));
