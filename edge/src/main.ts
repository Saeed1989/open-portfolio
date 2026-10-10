import { buildApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig(process.env);
const app = await buildApp(config);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => void app.close());
}

/* Every interface: edge is the deployment's public ingress (SRS §2.1). */
await app.listen({ port: config.port, host: '0.0.0.0' });
