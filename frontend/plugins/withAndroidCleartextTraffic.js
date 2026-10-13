const { withAndroidManifest } = require('@expo/config-plugins');

function applyAndroidCleartextTraffic(manifest) {
  const application = manifest.application?.[0];

  if (!application) {
    throw new Error('AndroidManifest.xml に application 要素がありません。');
  }

  application.$ ??= {};
  application.$['android:usesCleartextTraffic'] = 'true';

  return manifest;
}

function withAndroidCleartextTraffic(config) {
  return withAndroidManifest(config, (config) => {
    applyAndroidCleartextTraffic(config.modResults.manifest);
    return config;
  });
}

module.exports = withAndroidCleartextTraffic;
module.exports.applyAndroidCleartextTraffic = applyAndroidCleartextTraffic;
