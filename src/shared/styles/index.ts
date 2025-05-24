export * from './theme';

import {StyleSheet} from 'react-native';
import {theme} from './theme';

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  screenPadding: {
    padding: theme.spacing.md,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  flexGrow: {
    flexGrow: 1,
  },
  textCenter: {
    textAlign: 'center',
  },
  shadow: theme.shadows.md,
});
