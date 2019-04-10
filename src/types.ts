import * as sqlite from "better-sqlite3";

export interface DbInfo {
  driver: DbDriver;
  path: string;
}

export enum DbDriver {
  SQLite = "SQLite",
  Postgres = "Postgres",
  MySQL = "MySQL"
}

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

// export type RelationDef= {
//   socketId: SocketIdType,
//   dbName: string,
//   // FIXME
//   // relationNames should be unique across socketIds! but this might make the db blow up
//   // Need to have a longer design discussion.
//   relationName: string,
//   relationType: string
// };

// FUTURE: add types of different DBs

export type DbCon = SQLiteCon;

export type StmtType = sqlite.Statement;