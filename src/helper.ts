import * as sqlite from "better-sqlite3";
import { Client, QueryConfig, QueryArrayConfig, QueryArrayResult } from "pg";

import { DbCon, DbDriver, DbConfig, DbNameType, StmtType, SQLiteCon, PostgresCon } from "./types";
import { LogError, LogWarning } from "./messages";
import { randString, GetHashCode } from "./util";
import { SqliteDbConfig } from ".";

export function CloseDb(dbCon: DbCon) {
  switch (dbCon.driver) {
    case DbDriver.SQLite: {
      const con = dbCon as SQLiteCon;
      con.db.close();
      break;
    }
    case DbDriver.Postgres: {
      const con = dbCon as PostgresCon;
      con.db.end();
      break;
    }
    default:
      LogError(`Db type [${dbCon.driver}] is not supported.`);
  }
}

export function OpenDb(config: DbConfig): DbCon | null {
  switch (config.driver) {
    case DbDriver.SQLite: {
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
    }
    case DbDriver.Postgres: {
      try {
        const db = new Client();
        return {
          db,
          driver: DbDriver.Postgres,
          statements: new Map(),
        };
      } catch (e) {
        LogError(`${e} while trying to open ${config.path}.`);
        return null;
      }
    }
    default:
      LogError(`Db type [${config.driver}] is not supported.`);
      return null;
  }
}

/**
 * RunToDb does not yield results
 *   it's async in case the caller need to know when the results are completed.
 *   it returns true if the statements are executed successfully.
 * @param dbCon
 * @param sql
 */
export async function RunToDb(dbCon: DbCon, sql: string): Promise<boolean> {
  switch (dbCon.driver) {
    case DbDriver.SQLite:
      try {
        const con = dbCon as SQLiteCon;
        con.db.exec(sql);
        return true;
      } catch (e) {
        LogWarning(`Error executing to database! ${e}\nThe query was ${sql}`);
        return false;
      }
    case DbDriver.Postgres:
      try {
        const con = dbCon as PostgresCon;
        con.db.query(sql);
        return true;
      } catch (e) {
        LogWarning(`Error executing to database! ${e}\nThe query was ${sql}`);
        return false;
      }
    default:
      LogError(`Db type [${dbCon.driver}] is not supported.`);
      return false;
  }
}

// assume that this is fixed
// so make prepared statements
// FIXME: maybe create shorter hashses
// and prepared statements are not parametrized
export async function QueryFromDb(dbCon: DbCon, sql: string): Promise<any[] | null> {
  switch (dbCon.driver) {
    case DbDriver.SQLite: {
      const con = dbCon as SQLiteCon;
      // see if the sql query is already defined
      let stmt = con.statements.get(sql);
      if (!stmt) {
        try {
          stmt = con.db.prepare(sql);
          con.statements.set(sql, stmt);
        } catch (e) {
          LogWarning(`Error prepare to database! ${e}\nThe query was ${sql}`);
        }
      }
      if (stmt) {
        try {
          return stmt.all();
        } catch (e) {
          return LogWarning(`Error executing to Sqlite database! ${e}`);
        }
      } else {
        return LogError(`Statement for ${sql} cannot be defined`);
      }
    }
    case DbDriver.Postgres:
      const con = dbCon as PostgresCon;
      // need to create a name and store it in the map
      const sqlHash = GetHashCode(sql).toString();
      const queryConfig: QueryArrayConfig = {
        rowMode: "array",
        name: sqlHash,
        text: sql,
      };
      try {
        const r = await con.db.query(queryConfig);
        return packPostgresQueryArrayResultToObject(r);
      } catch (e) {
        return LogWarning(`Error executing to Postgres database! ${e}`);
      }
      // doesn't matter if it's created or not actually
      // the insertions should not be prepared
      break;
    default:
      return LogError(`Driver ${dbCon.driver} not handled`);
  }
}

// pack array into objects...
// very inefficient to pack and unpack --- look into arrow or protobug
function packPostgresQueryArrayResultToObject(qr: QueryArrayResult): any[] {
  const objRows = qr.rows.map(r => {
    const obj: any = {};
    r.map((c, i) => {
      obj[qr.fields[i].name] = c;
    });
    return obj;
  });
  return objRows;
}