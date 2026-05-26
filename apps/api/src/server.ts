import { createApp } from './app.js';
import { env } from './config/env.js';
import { runMigrations } from './config/migrations.js';
import { startKboScheduleSyncJob } from './jobs/kbo-schedule-sync.job.js';

await runMigrations();

const app = createApp();
app.listen(env.apiPort, () => {
  console.log(`Yakuku Yaru API listening on port ${env.apiPort}`);
  startKboScheduleSyncJob();
});
