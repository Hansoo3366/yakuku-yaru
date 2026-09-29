import { createApp } from './app.js';
import { env } from './config/env.js';
import { runMigrations } from './config/migrations.js';
import { startKboScheduleSyncJob } from './jobs/kbo-schedule-sync.job.js';
import { installCrashAlerts } from './lib/error-alert.js';

installCrashAlerts('api');

await runMigrations();

const app = createApp();
const server = app.listen(env.apiPort, () => {
  console.log(`Yakuku Yaru API listening on port ${env.apiPort}`);
  startKboScheduleSyncJob();
});

server.headersTimeout = 15_000;
server.requestTimeout = 120_000;
server.keepAliveTimeout = 5_000;
server.maxRequestsPerSocket = 1_000;
