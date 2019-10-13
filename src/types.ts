import * as sqlite from "better-sqlite3";
import { Client } from "pg";

// ------------- API Types ----------------


interface DbConfigBase {
  // this is internal to diel, not the actual db name
  // hm then it should just remember by client??
  dbName: string;
  driver: DbDriver;
}

export interface SqliteDbConfig extends DbConfigBase {
  path: string;
}

export interface PostgresDbConfig extends DbConfigBase {
  // todo: might need to add extra, for now just using default
  database?: string;
  user?: string;
  port?: number;
  host?: string;
  password?: string;
}

// TODO: add others
export type DbConfig = SqliteDbConfig | PostgresDbConfig;

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