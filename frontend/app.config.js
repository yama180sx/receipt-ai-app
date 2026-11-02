/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => {
  const appEnv = ['dev', 'kagoya'].includes(process.env.EXPO_PUBLIC_APP_ENV)
    ? process.env.EXPO_PUBLIC_APP_ENV
    : 'stable';
  const isDevEnv = appEnv === 'dev';
  const isKagoyaEnv = appEnv === 'kagoya';
  const displayName = isDevEnv ? 'RecAIpt (dev)' : isKagoyaEnv ? 'RecAIpt (KAGOYA)' : 'RecAIpt';
  const shortName = isDevEnv ? 'RecAIpt-dev' : isKagoyaEnv ? 'RecAIpt-KAGOYA' : 'RecAIpt';

  return {
    ...config,
    name: displayName,
    scheme: isKagoyaEnv ? 'recaipt-kagoya' : config.scheme,
    android: {
      ...config.android,
      // KAGOYA APKとT320 dev APKを同時に端末へ置けるよう、application IDを分離する。
      package: isKagoyaEnv ? 'jp.yama180sx.recaipt.kagoya' : config.android?.package,
    },
    web: {
      ...config.web,
      name: displayName,
      shortName,
      themeColor: isDevEnv ? '#b45309' : config.web?.themeColor,
    },
  };
};
