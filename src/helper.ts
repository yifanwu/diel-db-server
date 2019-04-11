import * as sqlite from "better-sqlite3";

import { DbCon, DbDriver, DbConfig, DbNameType, StmtType } from "./types";
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

export function OpenDb(config: DbConfig): DbCon | null {
  switch (config.driver) {
    case DbDriver.SQLite:
      try {
        const db = new sqlite(config.path);
        return {
          db,
          driver: DbDriver.SQLite,
          statements: new Map(),
        };
      } catch (e) {
        LogError(`${e} while trying to open ${config.path}.`);
        return null;
      }
    default:
      LogError(`Db type [${config.driver}] is not supported.`);
      return null;
  }
}

export function RunToDb(dbCon: DbCon, sql: string): sqlite.Database | null {
  switch (dbCon.driver) {
    case DbDriver.SQLite:
      try {
        return dbCon.db.exec(sql);
      } catch (e) {
        LogWarning(`Error executing to database! ${e}\nThe query was ${sql}`);
        return null;
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