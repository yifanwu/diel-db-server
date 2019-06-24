import * as sqlite from "better-sqlite3";
import { Client } from "pg";

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


export type PostgresStmt = (values: string|number[]) => void;

type DbConBase = {
  driver: DbDriver;
  cleanUpQueries?: string;
};

export interface SQLiteCon extends DbConBase {
  db: sqlite.Database;
  statements: Map<string, sqlite.Statement>;
}

export interface PostgresCon extends DbConBase {
  db: Client;
  statements: Map<string, PostgresStmt>;
}

// FUTURE: add types of different DBs

export type DbCon = SQLiteCon | PostgresCon;

export type StmtType = sqlite.Statement;