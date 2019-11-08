import * as express from "express";
import * as http from "http";
import * as WebSocket from "ws";
import { LogWarning, LogInfo, LogError, TraceEvents } from "./messages";
import { DbNameType, DbCon, SocketIdType, DbConfig, DbDriver } from "./types";
import { CloseDb, OpenDb, RunToDb, QueryFromDb } from "./helper";

interface DielMessage {
  id: string;
  action: string;
  sql: string;
  sqlAnnotation?: {
    relationName?: string;
    relationType?: string; // view or table
  };
  message?: {
    dbName: string;
  };
}

export function StartDielDbServer(configs: DbConfig[]) {
  const app = express();
  // initialize a simple http server
  const server = http.createServer(app);
  // initialize the WebSocket server instance
  const wss = new WebSocket.Server({ server });
  let socketIdCounter = 0;
  let allDbs = new Map<SocketIdType, Map<DbNameType, DbCon>>();

  wss.on("connection", (ws: WebSocket) => {
    socketIdCounter += 1;
    const socketId = socketIdCounter;
    allDbs.set(socketId, new Map());
    /**
     * Messages should just be
     * (1) one time SQL queries that asks for a response
     * (2) define a view as a parepared statement
     * (3) insertion, and the relevant views that also need to be retrieved
     *     note that this is slightly different from how the workers implement it now)
     *
     * we will be using JSON here...
     */
    ws.on("close", (_: WebSocket) => {
      // clean up
      // FIXME: assume only one clients connects at a time...
      console.log("begin clean up", socketId);
      const dbs = allDbs.get(socketId);
      // const relationsToClose = createdRelations.filter(r => r.socketId === socketId);
      if (dbs) {
        dbs.forEach((dbCon, dbName) => {
          if (dbCon.cleanUpQueries) {
            console.log("?????????what is this");
            RunToDb(dbCon, dbCon.cleanUpQueries);
            console.log("!!!!!!!!!!!!what is this");
          } else {
            LogError(`Cleanup queries not defined for ${dbName}`);
          }
        });
      } else {
        LogError(`dbs not found for ${socketId}`);
      }
      console.log("closed", socketId);
    });

    async function handleMessage (message: string): Promise<null> {
      // log the received message and send it back to the client
      console.log("\nreceived: %s", message);
      let msg: DielMessage | undefined;
      try {
        msg = JSON.parse(message) as DielMessage;
      } catch (e) {
        return LogError(`Message is not the expected JSON format: ${e}`);
      }
      // TODO: make sure that all the messages contains dbName for the future.
      const dbName = msg.message ? msg.message.dbName : null;
      if (!dbName) {
        return LogWarning(`The message ${JSON.stringify(msg)} did not define dbName as expected.`);
      }
      const dbs = allDbs.get(socketId);
      if (!dbs) {
        return LogError(`socket Dbs not defined for ${socketId}`);
      }
      switch (msg.action) {
        case "close": {
          const dbCon = dbs.get(dbName);
          if (dbCon) {
            if (dbCon.cleanUpQueries) {
              switch(dbCon.driver) {
                case DbDriver.Postgres: {
                  const queries = dbCon.cleanUpQueries.split(";");
                  for (let q of queries) {
                    const results = await QueryFromDb(dbCon, q + ";");
                    TraceEvents(`Result for exec action\n-------------\n${JSON.stringify(results, null, 2)}\n----------------`);
                  }
                  break;
                }
                case DbDriver.SQLite: {
                  TraceEvents(`Clean up \n${dbCon.cleanUpQueries}`);
                  RunToDb(dbCon, dbCon.cleanUpQueries);
                  break;
                }
                default: {
                  RunToDb(dbCon, dbCon.cleanUpQueries);
                }
              }
            }
            CloseDb(dbCon);
          };
          return null;
        }
        case "cleanup": {
          const dbCon = dbs.get(dbName);
          if (dbCon) dbCon.cleanUpQueries = msg.sql;
          // ack
          ws.send(JSON.stringify({
            id: msg.id
          }));
          return null;
        }
        case "open": {
          if (dbs.has(dbName)) {
            // no op
            return null;
          }
          TraceEvents(`Opening ${dbName}`);
          const dbConfig = configs.find(c => c.dbName === dbName);
          if (dbConfig) {
            const dbInfo = OpenDb(dbConfig);
            if (dbInfo) dbs.set(dbName, dbInfo);
            ws.send(JSON.stringify({
              id: msg.id
            }));
          } else {
            return LogError(`Db ${dbName} not defined`);
          }
          break;
        }
        // need better names, but in sql.js, run is without results...
        case "run": {
            const dbCon = dbs.get(dbName);
            if (dbCon) {
              const execStart = new Date();

              RunToDb(dbCon, msg.sql);

              const execEnd = new Date();

              const execTime = execEnd.getTime() - execStart.getTime();

              ws.send(JSON.stringify({
                id: msg.id,
                execTime: execTime
              }));
              return null;
            } else {
            return LogWarning(`${dbName} not opened`);
          }
        }
        case "exec": {
          if (msg.sql) {
            const dbCon = dbs.get(dbName);
            if (dbCon) {

              const execStart = new Date();

              const results = await QueryFromDb(dbCon, msg.sql); // I assume this is where it executes?

              const execEnd = new Date();

              const execTime = execEnd.getTime() - execStart.getTime();

              console.log("EXEC TIME FROM DB SEVER IS " + execTime);

              TraceEvents(`Result for exec action\n-------------\n${JSON.stringify(results, null, 2)}\n----------------`);
              ws.send(JSON.stringify({
                id: msg.id,
                results,
                execTime: execTime
              }));
              return null;
            } else {
              return LogWarning(`Connection not found`);
            }
          } else {
            return LogWarning(`Exec actions must define the query and the db name`);
          }
        }
        default: {
          return LogWarning(`Action ${msg.action} not defined`);
        }
      }
      return null;
    }
    /**
     * run is overloaded with creates, inserts
     * exec is reading, we assume that reading is static
     * TODO
     * - each exec is assumed to have a prepared statement
     */
    ws.on("message", handleMessage);

    // FIXME: should prob use prepared statements instead...
    // https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#class-statement
    // then get all
    // const stmt = db.prepare('SELECT * FROM cats WHERE name = ?');
    // const cats = stmt.all('Joey');
    // send immediatly a feedback to the incoming connection
    // ws.send("Hi there, I am a WebSocket server");
  });

  // start our server
  server.listen(process.env.PORT || 8999, () => {
      console.log(`Server started on port ${(server.address() as WebSocket.AddressInfo).port} :)`);
  });
}