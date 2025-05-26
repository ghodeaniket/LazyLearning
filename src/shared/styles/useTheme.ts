import { theme } from './theme';

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  textDisabled: string;
  error: string;
  warning: string;
  success: string;
  border: string;
  disabled: string;
}

export const useTheme = () => {
  // Simplified color interface for easier use
  const colors: ThemeColors = {
    primary: theme.colors.primary.main,
    secondary: theme.colors.secondary.main,
    background: theme.colors.background.default,
    surface: theme.colors.background.paper,
    text: theme.colors.text.primary,
    textSecondary: theme.colors.text.secondary,
    textDisabled: theme.colors.text.disabled,
    error: theme.colors.error.main,
    warning: theme.colors.warning.main,
    success: theme.colors.success.main,
    border: theme.colors.border.main,
    disabled: theme.colors.border.light,
  };

  return {
    ...theme,
    colors,
  };
};

export default useTheme;
