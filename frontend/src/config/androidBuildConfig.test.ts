import baseConfig from '../../app.json';
import { describe, expect, it } from 'vitest';

const appConfig = require('../../app.config.js') as (args: { config: typeof baseConfig.expo }) => typeof baseConfig.expo;
const easConfig = require('../../eas.json') as {
  build: {
    development: {
      developmentClient: boolean;
      distribution: string;
      environment?: string;
      android: { buildType: string };
    };
    'kagoya-development': {
      developmentClient: boolean;
      distribution: string;
      environment?: string;
      android: { buildType: string };
    };
  };
};

describe('Android development build configuration', () => {
  it('keeps the private-VPN HTTP API available to Android builds', () => {
    const config = appConfig({ config: baseConfig.expo });

    expect(config.android).toMatchObject({
      package: 'jp.yama180sx.recaipt',
      versionCode: 1,
    });
  });

  it('explicitly applies the development client native configuration', () => {
    const config = appConfig({ config: baseConfig.expo });

    expect(config.plugins).toEqual(
      expect.arrayContaining(['expo-dev-client', './plugins/withAndroidCleartextTraffic']),
    );
  });

  it('uses the dedicated EAS development environment for development APKs', () => {
    expect(easConfig.build.development).toMatchObject({
      developmentClient: true,
      distribution: 'internal',
      environment: 'development',
      android: { buildType: 'apk' },
    });
  });

  it('keeps the KAGOYA development APK separate from the T320 dev APK', () => {
    const previous = process.env.EXPO_PUBLIC_APP_ENV;
    process.env.EXPO_PUBLIC_APP_ENV = 'kagoya';
    const config = appConfig({ config: baseConfig.expo });
    if (previous === undefined) delete process.env.EXPO_PUBLIC_APP_ENV;
    else process.env.EXPO_PUBLIC_APP_ENV = previous;

    expect(config).toMatchObject({
      name: 'RecAIpt (KAGOYA)',
      scheme: 'recaipt-kagoya',
      android: { package: 'jp.yama180sx.recaipt.kagoya' },
    });
    expect(easConfig.build['kagoya-development']).toMatchObject({
      developmentClient: true,
      distribution: 'internal',
      environment: 'kagoya',
      android: { buildType: 'apk' },
    });
  });
});
