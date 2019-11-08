import { resolve } from "path";
import { StartDielDbServer, DbDriver } from "../src";
import { PostgresDbConfig, SqliteDbConfig } from "../src/types";

const dbName = "sensors";
const userName = "diel";

function runWithPostgres() {
  console.log("\x1b[43m", `Connecting to Postgres Local. dbName: ${dbName} user: davidkim`, "\x1b[0m");
  const postgresDbConfig: PostgresDbConfig = {
    dbName, // yifan's local test, hacky
    driver: DbDriver.Postgres,
    user: "davidkim",
    host: "localhost",
    port: 5432,
  };
  StartDielDbServer([postgresDbConfig]);
}

function runWithPostgresRDS() {
  console.log("\x1b[43m", `Connecting to Postgres RDS. dbName: ${dbName} user: ${userName}`, "\x1b[0m");
  const password:string = process.argv[2];
  const postgresDbConfig: PostgresDbConfig = {
    dbName, // yifan's local test, hacky
    driver: DbDriver.Postgres,
    user: userName,
    host: "database-1.cop41batycrj.us-west-1.rds.amazonaws.com",
    port: 5432,
    password
  };
  StartDielDbServer([postgresDbConfig]);
}

function runWithSqlite() {
  console.log("\x1b[43m", `Connecting to Sqlite. dbName: ${dbName}`, "\x1b[0m");
  const path = resolve("tests/data/sensors_10000.sqlite");
  const config: SqliteDbConfig = {
    dbName,
    driver: DbDriver.SQLite,
    path
  };
  StartDielDbServer([config]);
  console.log(`We are starting a server with data found in ${path}.`);
}

// runWithPostgresRDS();
runWithPostgres();
// runWithSqlite();