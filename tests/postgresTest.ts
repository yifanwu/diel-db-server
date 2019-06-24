// just have postgres open a temporary one?
import { Client } from "pg";

// 'SELECT $1::text as message', ["Hello world!"]
export async function testPostgresSetup() {
  const client = new Client();
  await client.connect();
  const setupQuery = `
  create table t1 (a integer, b integer);
  insert into t1 values (1, 10), (2, 20);
  `;
  const _ = await client.query(setupQuery);
  const query = `select a from t1;`;
  const res = await client.query(query);
  console.log(JSON.stringify(res.rows));
  const takeDownQuery = `drop table t1;`;
  const _2 = await client.query(takeDownQuery);
  await client.end();
}