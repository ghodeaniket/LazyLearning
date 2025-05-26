import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../styles/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  testID,
}) => {
  const theme = useTheme();

  const getBackgroundColor = () => {
    if (disabled) {return theme.colors.disabled;}

    switch (variant) {
      case 'primary':
        return theme.colors.primary;
      case 'secondary':
        return theme.colors.secondary;
      case 'text':
        return 'transparent';
      default:
        return theme.colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled && variant !== 'text') {return theme.colors.textDisabled;}

    switch (variant) {
      case 'primary':
        return 'white';
      case 'secondary':
        return theme.colors.primary;
      case 'text':
        return disabled ? theme.colors.textDisabled : theme.colors.primary;
      default:
        return 'white';
    }
  };

  const getHeight = () => {
    switch (size) {
      case 'small':
        return 36;
      case 'medium':
        return 48;
      case 'large':
        return 56;
      default:
        return 48;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'medium':
        return 16;
      case 'large':
        return 18;
      default:
        return 16;
    }
  };

  const buttonStyle = [
    styles.button,
    {
      backgroundColor: getBackgroundColor(),
      height: getHeight(),
      borderWidth: variant === 'secondary' ? 1 : 0,
      borderColor: theme.colors.primary,
    },
    style,
  ];

  const textStyles = [
    styles.text,
    {
      color: getTextColor(),
      fontSize: getFontSize(),
    },
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      accessibilityLabel={loading ? 'Loading' : title}
    >
      {loading ? (
        <ActivityIndicator
          color={getTextColor()}
          size={size === 'small' ? 'small' : 'small'}
          testID={`${testID}-loading`}
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  text: {
    fontWeight: '600',
  },
});
