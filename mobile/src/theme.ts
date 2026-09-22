import { Platform } from 'react-native';

export const colors = {
  ink: '#101512',
  inkSoft: '#24352E',
  muted: '#718078',
  paper: '#F8FAF3',
  white: '#FFFFFF',
  lime: '#B8F43B',
  limeDark: '#7EB900',
  teal: '#22C8B6',
  tealSoft: '#DFF8F1',
  line: '#E3E9DF',
  lavender: '#EEE9FF',
};

export const spacing = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32, xxl: 44 };
export const radius = { sm: 12, md: 18, lg: 26, pill: 999 };

export const shadow = Platform.select({
  ios: { shadowColor: '#10251E', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.1, shadowRadius: 22 },
  android: { elevation: 6 },
  default: {},
});
