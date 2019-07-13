import * as WebSocket from "ws";

import { StartDielDbServer, DbDriver } from "../src";

import { PostgresDbConfig } from "../src/types";
import { DefaultUrl } from "../src/util";
import { FgRed, Reset } from "../src/messages";

function clientLog(m: string) {
  console.log(`${FgRed}[client] %s${Reset}`, m);
}

/**
 * we are going to first create the server instance, and mock some connections
 * follow the INSTRUCTIONS comments to run locally
 *
 * @richard: Currently, the `exec` command hangs
 */
export async function testPostgresEndToEnd() {
  // INSTRUCTIONS: change the dbName here to an instance you have locally
  const dbName = "postgresTest";
  const message = {
    dbName
  };
  const postgresDbConfig: PostgresDbConfig = {
    dbName, // yifan's local test, hacky
    driver: DbDriver.Postgres
  };
  StartDielDbServer([postgresDbConfig]);
  const client = new WebSocket(DefaultUrl);
  setTimeout(() => {
    client.send(JSON.stringify({
      id: "testOpen",
      action: "open",
      message
    }));
    client.send(JSON.stringify({
      id: "testSetUp",
      action: "exec",
      sql: `drop table if exists testTable;
            create table testTable (user_id integer);
            insert into testTable values (1), (2), (3);`,
      message
    }));
    // I think this is synchronous?
    client.send(JSON.stringify({
      id: "testExec",
      action: "exec",
      sql: "select * from testTable limit 5",
      message
    }));
  }, 500);
  client.on("message", (message: string) => {
    clientLog(`message\n---------\n${JSON.stringify(message)}\n--------\n`);
    const parsedMessage = JSON.parse(message);
    if (parsedMessage.id === "testExec") {
      // @richard the values should be 1,2,3
    }
  });
}