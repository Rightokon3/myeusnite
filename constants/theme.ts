// constants/theme.ts
// Single source of truth for the MyEusnite design system.
// Every color / size in the spec lives here so screens never hardcode values.

export const COLORS = {
  primaryRed: '#E30613',
  darkRed: '#C00000',
  white: '#FFFFFF',
  background: '#F5F5F5',
  border: '#E5E5E5',
  textDark: '#1F1F1F',
  textLight: '#666666',
  success: '#28A745',
  goldBadge: '#F4B400',
} as const;

export const FONT_WEIGHT = {
  bold: '700' as const,
  semiBold: '600' as const,
  medium: '500' as const,
  regular: '400' as const,
};

export const FONT_SIZE = {
  header: 24,
  sectionTitle: 18,
  cardTitle: 16,
  body: 14,
  caption: 12,
};

// 8pt spacing system
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
};

export const RADIUS = {
  sm: 8,
  md: 16,
  lg: 20,
  pill: 999,
};

export const SHADOW = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  header: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
};

// Breakpoint used everywhere to switch mobile <-> desktop layout
export const DESKTOP_BREAKPOINT = 768;

// Desktop column widths from spec
export const LEFT_SIDEBAR_WIDTH = 280;
export const RIGHT_SIDEBAR_WIDTH = 320;