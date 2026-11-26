import { KioskThemeConfig, THEME_PRESETS } from '../types/kioskTheme';

export const radiusMap = { none: '0px', sm: '8px', md: '12px', lg: '16px', full: '28px' };
export const borderWMap = { none: '0px', thin: '1px', medium: '2px', thick: '4px' };
export const fontMap = { manrope: "'Manrope', sans-serif", 'space-grotesk': "'Space Grotesk', sans-serif", poppins: "'Poppins', sans-serif" };
export function getShadowMap(borderColor: string) {
  return { none: 'none', soft: '0 2px 10px rgba(0,0,0,0.06)', 'hard-offset': `4px 4px 0px 0px ${borderColor}`, elevated: '0 10px 30px rgba(0,0,0,0.12)' };
}
const colorKeys = ['backgroundColor', 'cardBackgroundColor', 'primaryColor', 'primaryTextColor', 'textColor', 'accentColor', 'borderColor'] as const;
export function isValidTheme(theme: KioskThemeConfig) {
  return colorKeys.every(key => /^#[\da-f]{6}$/i.test(theme[key]))
    && (theme.assetPack === 'none' || theme.assetPack === 'woset-play')
    && Object.hasOwn(THEME_PRESETS, theme.presetId)
    && Object.hasOwn(radiusMap, theme.borderRadius)
    && Object.hasOwn(borderWMap, theme.borderWidth)
    && Object.hasOwn(fontMap, theme.fontFamily)
    && Object.hasOwn(getShadowMap('#000000'), theme.shadowStyle);
}
export function normalizeTheme(value: unknown): KioskThemeConfig {
  const base = THEME_PRESETS['neo-brutalism'];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...base };
  const source = value as Record<string, unknown>;
  const result = { ...base };
  for (const key of Object.keys(base) as (keyof KioskThemeConfig)[]) {
    if (typeof source[key] === typeof base[key]) (result as any)[key] = source[key];
  }
  for (const key of colorKeys) if (!/^#[\da-f]{6}$/i.test(result[key])) result[key] = base[key];
  if (!Object.hasOwn(THEME_PRESETS, result.presetId)) result.presetId = base.presetId;
  if (source.assetPack === undefined) result.assetPack = THEME_PRESETS[result.presetId].assetPack;
  if (!Object.hasOwn(radiusMap, result.borderRadius)) result.borderRadius = base.borderRadius;
  if (!Object.hasOwn(borderWMap, result.borderWidth)) result.borderWidth = base.borderWidth;
  if (!Object.hasOwn(fontMap, result.fontFamily)) result.fontFamily = base.fontFamily;
  if (!Object.hasOwn(getShadowMap('#000000'), result.shadowStyle)) result.shadowStyle = base.shadowStyle;
  if (result.assetPack !== 'none' && result.assetPack !== 'woset-play') result.assetPack = 'none';
  return result;
}
export function themeVariables(theme: KioskThemeConfig) {
  return {
    '--kiosk-bg': theme.backgroundColor, '--kiosk-card-bg': theme.cardBackgroundColor,
    '--kiosk-primary': theme.primaryColor, '--kiosk-primary-text': theme.primaryTextColor,
    '--kiosk-text': theme.textColor, '--kiosk-accent': theme.accentColor,
    '--kiosk-border': theme.borderColor, '--kiosk-radius': radiusMap[theme.borderRadius],
    '--kiosk-border-w': borderWMap[theme.borderWidth],
    '--kiosk-shadow': getShadowMap(theme.borderColor)[theme.shadowStyle],
    '--kiosk-font': fontMap[theme.fontFamily],
  };
}
