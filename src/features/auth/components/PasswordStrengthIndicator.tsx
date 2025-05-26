import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../shared/styles/theme';
import { getPasswordStrength } from '../utils/validation';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password }) => {
  const theme = useTheme();
  const strength = getPasswordStrength(password);

  const getStrengthColor = () => {
    switch (strength) {
      case 'weak':
        return theme.colors.error;
      case 'medium':
        return theme.colors.warning;
      case 'strong':
        return theme.colors.success;
      default:
        return theme.colors.border;
    }
  };

  const getStrengthText = () => {
    if (!password) {return '';}
    switch (strength) {
      case 'weak':
        return 'Weak password';
      case 'medium':
        return 'Medium strength';
      case 'strong':
        return 'Strong password';
      default:
        return '';
    }
  };

  const getBarWidth = () => {
    if (!password) {return '0%';}
    switch (strength) {
      case 'weak':
        return '33%';
      case 'medium':
        return '66%';
      case 'strong':
        return '100%';
      default:
        return '0%';
    }
  };

  if (!password) {return null;}

  return (
    <View style={styles.container}>
      <View style={[styles.barContainer, { backgroundColor: theme.colors.border }]}>
        <View
          style={[
            styles.bar,
            {
              width: getBarWidth(),
              backgroundColor: getStrengthColor(),
            },
          ]}
        />
      </View>
      <Text style={[styles.strengthText, { color: getStrengthColor() }]}>
        {getStrengthText()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 16,
  },
  barContainer: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    marginTop: 4,
  },
});
