import * as sqlite from "better-sqlite3";


// ------------- API Types ----------------


interface DbConfigBase {
  dbName: string;
  driver: DbDriver;
}

export interface SqliteDbConfig extends DbConfigBase {
  path: string;
}

// TODO: add others
export type DbConfig = SqliteDbConfig;

export enum DbDriver {
  SQLite = "SQLite",
  Postgres = "Postgres",
  MySQL = "MySQL"
}

// ------------ Internal Types -------------

export type DbNameType = string;
export type SocketIdType = number;

type DbConBase = {
  driver: DbDriver;
};

export interface SQLiteCon extends DbConBase {
  db: sqlite.Database;
  statements: Map<string, sqlite.Statement>;
  cleanUpQueries?: string;
}

// FUTURE: add types of different DBs

export type DbCon = SQLiteCon;

export type StmtType = sqlite.Statement;