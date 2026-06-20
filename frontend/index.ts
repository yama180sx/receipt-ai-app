import { registerRootComponent } from 'expo';

const useRouterPoc = process.env.EXPO_PUBLIC_EXPO_ROUTER_POC === 'true';

if (useRouterPoc) {
  // PoC 時のみ Expo Router エントリ（本番移行 #404 まで既存 App.tsx をデフォルト維持）
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('expo-router/entry');
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const App = require('./App').default;
  registerRootComponent(App);
}
