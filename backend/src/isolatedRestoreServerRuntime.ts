import { createApp } from './app';
import logger from './utils/logger';

const app = createApp();
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';
const nodeEnv = process.env.NODE_ENV || 'production';

app.listen(Number(port), host, () => {
  logger.info(`Isolated restore API server running on [${nodeEnv}] mode`);
});
