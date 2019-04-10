import * as express from "express";
import * as http from "http";
import * as WebSocket from "ws";
import { LogWarning, LogInfo, LogError } from "./messages";
import { DbNameType, DbCon, SocketIdType } from "./types";
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

const app = express();

// initialize a simple http server
const server = http.createServer(app);

// initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });

// const createdRelations: RelationDef[] = [];

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
      const con = dbs.forEach((dbCon, dbName) => {
        if (dbCon.cleanUpQueries) {
          RunToDb(dbCon, dbCon.cleanUpQueries);
        } else {
          LogError(`Cleanup queries not defined for ${dbName}`);
        }
      });
    } else {
      LogError(`dbs not found for ${socketId}`);
    }
    console.log("closed", socketId);
  });

  ws.on("message", (message: string) => {
    // log the received message and send it back to the client
    console.log("\nreceived: %s", message);
    let msg: DielMessage | undefined;
    try {
      msg = JSON.parse(message) as DielMessage;
    } catch (e) {
      LogError(`Message is not the expected JSON format: ${e}`);
      return;
    }
    // TODO: make sure that all the messages contains dbName for the future.
    const dbName = msg.message ? msg.message.dbName : null;
    if (!dbName) {
      LogWarning(`The message ${JSON.stringify(msg)} did not define dbName as expected.`);
      return;
    }
    const dbs = allDbs.get(socketId);
    if (!dbs) {
      LogError(`socket Dbs not defined for ${socketId}`);
      return;
    }
    switch (msg.action) {
      case "close": {
        const dbCon = dbs.get(dbName);
        if (dbCon) CloseDb(dbCon);
        break;
      }
      case "cleanup": {
        const dbCon = dbs.get(dbName);
        if (dbCon) dbCon.cleanUpQueries = msg.sql;
        // ack
        ws.send(JSON.stringify({
          id: msg.id
        }));
        break;
      }
      case "open": {
        if (dbs.has(dbName)) {
          // no op
          return;
        }
        console.log(`Opening ${dbName}`);
        const dbInfo = OpenDb(dbName);
        if (dbInfo) dbs.set(dbName, dbInfo);
        ws.send(JSON.stringify({
          id: msg.id
        }));
        break;
      }
      // need better names, but in sql.js, run is without results...
      case "run": {
          const dbCon = dbs.get(dbName);
          if (dbCon) {
            RunToDb(dbCon, msg.sql);
            ws.send(JSON.stringify({
              id: msg.id,
            }));
          } else {
          LogWarning(`${dbName} not opened`);
        }
        break;
      }
      case "exec": {
        if (msg.sql) {
          const dbCon = dbs.get(dbName);
          if (dbCon) {
            const results = QueryFromDb(dbCon, msg.sql);
            LogInfo(`Result for exec action`);
            LogInfo(JSON.stringify(results, null, 2));
            ws.send(JSON.stringify({
              id: msg.id,
              results
            }));
          } else {
            LogWarning(`Connection not found`);
          }
        } else {
          LogWarning(`Exec actions must define the query and the db name`);
        }
        break;
      }
      default: {
        LogWarning(`Action ${msg.action} not defined`);
      }
    }
  });

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