/** Terminate backends holding the Prisma migrate advisory lock: npm run db:unlock */
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!);
const rows = await sql`
  SELECT pid, state, now() - query_start AS age, pg_terminate_backend(pid) AS killed
  FROM pg_stat_activity
  WHERE pid <> pg_backend_pid() AND datname = current_database()
    AND (pid IN (SELECT pid FROM pg_locks WHERE locktype = 'advisory') OR state = 'idle in transaction')`;
console.log(rows.length ? rows : "no lock holders");
