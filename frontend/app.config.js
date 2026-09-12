/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => {
  const appEnv = process.env.EXPO_PUBLIC_APP_ENV === 'dev' ? 'dev' : 'stable';
  const isDevEnv = appEnv === 'dev';
  const displayName = isDevEnv ? 'RecAIpt (dev)' : 'RecAIpt';
  const shortName = isDevEnv ? 'RecAIpt-dev' : 'RecAIpt';

  return {
    ...config,
    name: displayName,
    web: {
      ...config.web,
      name: displayName,
      shortName,
      themeColor: isDevEnv ? '#b45309' : config.web?.themeColor,
    },
  };
};
