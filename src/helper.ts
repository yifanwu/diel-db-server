import * as sqlite from "better-sqlite3";
import { Client, ClientConfig, QueryConfig, QueryArrayConfig, QueryArrayResult, ConnectionConfig } from "pg";

import { DbCon, PostgresDbConfig, DbConfig, DbNameType, StmtType, SQLiteCon, PostgresCon, DbDriver } from "./types";
import { LogError, LogWarning, TraceEvents } from "./messages";
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

export function OpenDb(configOriginal: DbConfig): DbCon | null {
  switch (configOriginal.driver) {
    case DbDriver.SQLite: {
      const config = configOriginal as SqliteDbConfig;
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
        // define postgres config configuration
        const postgresDbConfig = configOriginal as PostgresDbConfig;
        const connectionConfig: ConnectionConfig = {
          database: configOriginal.dbName,
          user: postgresDbConfig.user,
          host: postgresDbConfig.host,
          port: postgresDbConfig.port,
        };
        const db = new Client(connectionConfig);
        db.connect();
        return {
          db,
          driver: DbDriver.Postgres,
          statements: new Map(),
        };
      } catch (e) {
        LogError(`${e} while trying to open Postgres with config ${JSON.stringify(configOriginal)}.`);
        return null;
      }
    }
    default:
      LogError(`Db type [${configOriginal.driver}] is not supported.`);
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
  TraceEvents(`queryfromdb invoked to get ${sql}\n`);
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
    case DbDriver.Postgres: {
      const con = dbCon as PostgresCon;
      // need to create a name and store it in the map
      // TODO: this will speed things up...
      // const sqlHash = GetHashCode(sql).toString();
      // const queryConfig: QueryArrayConfig = {
      //   rowMode: "array",
      //   name: sqlHash,
      //   text: sql,
      // };
      try {
        TraceEvents(`querying ${sql} now`);
        const r = await con.db.query(sql);
        TraceEvents(`Got raw results, ${JSON.stringify(r)}`);
        return r.rows;
        // return packPostgresQueryArrayResultToObject(r);
      } catch (e) {
        return LogWarning(`Error executing to Postgres database! ${e}`);
      }
      break;
    }
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