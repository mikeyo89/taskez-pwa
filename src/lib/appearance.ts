export type AccentKey = 'sky' | 'amber' | 'violet' | 'emerald' | 'rose' | 'slate';

export type AccentPreset = {
  id: AccentKey;
  label: string;
  swatch: string;
};

export const ACCENT_STORAGE_KEY = 'taskez.accent';
export const DEFAULT_ACCENT: AccentKey = 'sky';

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: 'sky', label: 'Sky', swatch: '#0ea5e9' },
  { id: 'amber', label: 'Amber', swatch: '#f59e0b' },
  { id: 'violet', label: 'Violet', swatch: '#8b5cf6' },
  { id: 'emerald', label: 'Emerald', swatch: '#10b981' },
  { id: 'rose', label: 'Rose', swatch: '#f43f5e' },
  { id: 'slate', label: 'Slate', swatch: '#64748b' }
];

export function applyAccent(accent: AccentKey) {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.setAttribute('data-accent', accent);
}
