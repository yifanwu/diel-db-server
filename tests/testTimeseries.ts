import { resolve } from "path";
import { StartDielDbServer, DbDriver } from "../src";

import { PostgresDbConfig, SqliteDbConfig } from "../src/types";
import { password } from "./rdsPassword";

const dbName = "postgres";
// const dbName = "davidkim";

function runWithPostgres() {

  const postgresDbConfig: PostgresDbConfig = {
    dbName, // yifan's local test, hacky
    driver: DbDriver.Postgres,
    user: "Lucie",
    host: "localhost",
    port: 5432,
  };
  StartDielDbServer([postgresDbConfig]);
}

function runWithPostgresRDS() {
  const postgresDbConfig: PostgresDbConfig = {
    dbName, // yifan's local test, hacky
    driver: DbDriver.Postgres,
    user: "Lucie",
    host: "database-1.cop41batycrj.us-west-1.rds.amazonaws.com",
    port: 5432,
    password,
  };
  StartDielDbServer([postgresDbConfig]);
}

function runWithSqlite() {
  const path = resolve("tests/data/sensors_10000.sqlite");
  const config: SqliteDbConfig = {
    dbName,
    driver: DbDriver.SQLite,
    path
  };
  StartDielDbServer([config]);
  console.log(`We are starting a server with data found in ${path}.`);
}
runWithPostgresRDS();
// runWithPostgres();
// runWithSqlite();