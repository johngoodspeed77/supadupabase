import { createPool } from '@supadupabase/db';
import { loadConfig } from './config.js';
import { sendWeeklyReminders } from './push.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const pool = createPool(config.databaseUrl);
  try {
    const result = await sendWeeklyReminders(pool, config);
    console.log(`Weekly reminders: sent=${result.sent} failed=${result.failed}`);
    if (result.failed > 0) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
