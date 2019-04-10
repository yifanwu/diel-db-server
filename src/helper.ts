import * as sqlite from "better-sqlite3";

import { DbCon, DbDriver, DbInfo, DbNameType, StmtType } from "./types";
import { dbFileLookup } from "./store";
import { LogError, LogWarning } from "./messages";

export function CloseDb(dbCon: DbCon) {
  switch (dbCon.driver) {
    case DbDriver.SQLite:
      dbCon.db.close();
      break;
    default:
      LogError(`Db type [${dbCon.driver}] is not supported.`);
  }
}

export function OpenDb(dbName: DbNameType): DbCon | null {
  const dbInfo = dbFileLookup.get(dbName);
  if (!dbInfo) {
    LogError(`Db ${dbName} not defined`);
    return null;
  }
  switch (dbInfo.driver) {
    case DbDriver.SQLite:
      const db = new sqlite(dbInfo.path);
      return {
        db,
        driver: DbDriver.SQLite,
        statements: new Map(),
      };
    default:
      LogError(`Db type [${dbInfo.driver}] is not supported.`);
      return null;
  }
}

export function RunToDb(dbCon: DbCon, sql: string) {
  switch (dbCon.driver) {
    case DbDriver.SQLite:
      try {
        return dbCon.db.exec(sql);
      } catch (e) {
        LogWarning(`Error executing to database! ${e}\nThe query was ${sql}`);
        return;
      }
    default:
      LogError(`Db type [${dbCon.driver}] is not supported.`);
      return null;
  }
}

function invokeStmt(driver: DbDriver, stmt: StmtType) {
  switch (driver) {
    case DbDriver.SQLite:
      try {
        return stmt.all();
      } catch (e) {
          LogWarning(`Error executing to database! ${e}`);
          return null;
      }
    default:
      LogError(`Db type [${driver}] is not supported.`);
      return null;
  }
}

function prepareStmt(dbCon: DbCon, sql: string) {
  switch (dbCon.driver) {
    case DbDriver.SQLite:
      try {
        const stmt = dbCon.db.prepare(sql);
        dbCon.statements.set(sql, stmt);
        return stmt;
      } catch (e) {
          LogWarning(`Error prepare to database! ${e}\nThe query was ${sql}`);
          return;
      }
    default:
      LogError(`Db type [${dbCon.driver}] is not supported.`);
      return;
  }
}

// assume that this is fixed
// so make prepared statements
// FIXME: maybe create shorter hashses
// and prepared statements are not parametrized
export function QueryFromDb(dbCon: DbCon, sql: string): any[] | null {
  // see if the sql query is already defined
  let stmt = dbCon.statements.get(sql);
  if (!stmt) {
    stmt = prepareStmt(dbCon, sql);
  }
  if (stmt) {
    return invokeStmt(dbCon.driver, stmt);
  } else {
    LogError(`Statement for ${sql} cannot be defined`);
    return null;
  }
}