import React, { useState } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../styles/theme';

interface CustomTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
}

export const TextInput: React.FC<CustomTextInputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  isPassword,
  ...props
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    props.onFocus?.({} as any);
  };

  const handleBlur = () => {
    setIsFocused(false);
    props.onBlur?.({} as any);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const inputStyle = [
    styles.input,
    {
      borderColor: error ? theme.colors.error : isFocused ? theme.colors.primary : theme.colors.border,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      paddingLeft: leftIcon ? 45 : 15,
      paddingRight: rightIcon || isPassword ? 45 : 15,
    },
  ];

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          {label}
        </Text>
      )}

      <View style={styles.inputContainer}>
        {leftIcon && (
          <Icon
            name={leftIcon}
            size={20}
            color={isFocused ? theme.colors.primary : theme.colors.textSecondary}
            style={styles.leftIcon}
          />
        )}

        <RNTextInput
          {...props}
          style={inputStyle}
          placeholderTextColor={theme.colors.textSecondary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={isPassword && !showPassword}
          testID={props.testID}
          accessibilityLabel={props.accessibilityLabel || label}
        />

        {isPassword && (
          <TouchableOpacity
            onPress={togglePasswordVisibility}
            style={styles.rightIcon}
            testID={`${props.testID}-toggle`}
            accessible={true}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
          >
            <Icon
              name={showPassword ? 'visibility-off' : 'visibility'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}

        {rightIcon && !isPassword && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            disabled={!onRightIconPress}
          >
            <Icon
              name={rightIcon}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text style={[styles.error, { color: theme.colors.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  leftIcon: {
    position: 'absolute',
    left: 15,
    top: 15,
    zIndex: 1,
  },
  rightIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
    zIndex: 1,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});
