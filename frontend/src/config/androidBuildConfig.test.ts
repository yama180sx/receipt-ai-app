import baseConfig from '../../app.json';
import { describe, expect, it } from 'vitest';

const appConfig = require('../../app.config.js') as (args: { config: typeof baseConfig.expo }) => typeof baseConfig.expo;

describe('Android development build configuration', () => {
  it('keeps the private-VPN HTTP API available to Android builds', () => {
    const config = appConfig({ config: baseConfig.expo });

    expect(config.android).toMatchObject({
      package: 'jp.yama180sx.recaipt',
      versionCode: 1,
      usesCleartextTraffic: true,
    });
  });
});
