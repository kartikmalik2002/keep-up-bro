import { useAppTheme } from '@/context/theme';

export function useColorScheme() {
  const { theme } = useAppTheme();
  return theme;
}
