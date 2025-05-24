module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './src',
          '@features': './src/features',
          '@shared': './src/shared',
          '@navigation': './src/navigation',
          '@services': './src/services',
          '@store': './src/store',
          '@types': './src/types',
          '@utils': './src/utils',
          '@constants': './src/shared/constants',
          '@assets': './src/shared/assets',
        },
      },
    ],
  ],
};
