import { describe, expect, it } from 'vitest';

const {
  applyAndroidCleartextTraffic,
} = require('./withAndroidCleartextTraffic') as typeof import('./withAndroidCleartextTraffic');

describe('withAndroidCleartextTraffic', () => {
  it('enables cleartext traffic on the Android application manifest element', () => {
    const manifest = {
      application: [{ $: { 'android:label': '@string/app_name' } }],
    };

    applyAndroidCleartextTraffic(manifest);

    expect(manifest.application[0].$).toMatchObject({
      'android:label': '@string/app_name',
      'android:usesCleartextTraffic': 'true',
    });
  });
});
