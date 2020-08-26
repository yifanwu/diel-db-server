import * as WebSocket from "ws";

import { StartDielDbServer, DbDriver } from "../src";

import { PostgresDbConfig } from "../src/types";
import { DefaultUrl } from "../src/util";
import { FgRed, Reset } from "../src/messages";

export async function testDBtoDB() {
  // INSTRUCTIONS: change the dbName here to an instance you have locally
  const dbName = "sensors";
  const message = {
    dbName,
    toPrint: process.env.PORT
  };
  const postgresDbConfig: PostgresDbConfig = {
    dbName,
    driver: DbDriver.Postgres,
  };
  StartDielDbServer([postgresDbConfig]);
  const client = new WebSocket(DefaultUrl);
  setTimeout(() => {
    client.send(JSON.stringify({
      id: "testDbtoDb",
      action: "relay",
      message
    }));
  }, 500);
}