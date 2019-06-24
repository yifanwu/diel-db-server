// just have postgres open a temporary one?
import { Client, ClientConfig } from "pg";

// 'SELECT $1::text as message', ["Hello world!"]
export async function testPostgresSetup() {
  const client = new Client();
  // this is the same as when you connect in terminal as `psql`
  //   which usually takes your users
  //   note that you can also specify
  // const clientConfig: ClientConfig = {
  //   user: "",
  //   database: "",
  //   port: ,
  //   host:
  // };
  await client.connect();
  async function setupTest() {

    const setupQuery = `
    create table t1 (a integer, b integer);
    insert into t1 values (1, 10), (2, 20);
    `;
    const _ = await client.query(setupQuery);
    const query = `select a from t1;`;
    const res = await client.query(query);
    console.log(JSON.stringify(res.rows));
    console.log(res.rows[0]["a"]);
    const takeDownQuery = `drop table t1;`;
    const _2 = await client.query(takeDownQuery);
  }
  const logQuery = `select * from log limit 5`;
  const res2 = await client.query(logQuery);
  console.log(JSON.stringify(res2.rows));
  await client.end();
}
