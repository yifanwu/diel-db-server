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
 */
export async function testPostgresEndToEnd() {
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
    // I think this is synchronous?
    client.send(JSON.stringify({
      id: "testExec",
      action: "exec",
      sql: "select * from small_log limit 5",
      message
    }));
  }, 100);
  client.on("message", (message: string) => {
    clientLog(`message\n---------\n${JSON.stringify(message)}\n--------\n`);
  });
}