import fs from "fs";
import pg from "../lib/db/node_modules/pg/lib/index.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("no DATABASE_URL");
  process.exit(1);
}

const sql = fs.readFileSync("scripts/phase-a-money-customers.sql", "utf8");
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(sql);
  console.log("migration OK");
  const r = await client.query(
    `select column_name from information_schema.columns
     where table_name='orders' and column_name like '%cents'
     order by 1`,
  );
  console.log(
    "orders cents:",
    r.rows.map((x) => x.column_name).join(", "),
  );
  const c = await client.query(
    `select column_name from information_schema.columns
     where table_name='customers'
       and column_name in ('order_count','total_spent_cents','marketing_consent_email')
     order by 1`,
  );
  console.log(
    "customers:",
    c.rows.map((x) => x.column_name).join(", "),
  );
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await client.end();
}
