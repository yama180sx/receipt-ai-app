const appJson = require('./app.json');

const appEnv = process.env.EXPO_PUBLIC_APP_ENV === 'dev' ? 'dev' : 'stable';
const isDevEnv = appEnv === 'dev';
const displayName = isDevEnv ? 'RecAIpt (dev)' : 'RecAIpt';
const shortName = isDevEnv ? 'RecAIpt-dev' : 'RecAIpt';

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    ...appJson.expo,
    name: displayName,
    web: {
      ...appJson.expo.web,
      name: displayName,
      shortName,
      themeColor: isDevEnv ? '#b45309' : appJson.expo.web.themeColor,
    },
  },
};
