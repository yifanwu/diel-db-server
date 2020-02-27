import * as express from "express";
import * as http from "http";
import * as WebSocket from "ws";

import { DataflowPerNodeMetaData, DielRemoteAction, DielRemoteMessage, RemoteUpdateRelationMessage, RemoteIdMessage, RemoteExecuteMessage, RemoteShipRelationMessage } from "diel/src/runtime/runtimeTypes";
import { LogExecutionTrace, LogInternalError } from "diel/src/util/messages";
import { DbIdType, RelationNameType, LogicalTimestep, Relation } from "diel/src/parser/dielAstTypes";
import { convertDataToUpdateString } from "diel/src/runtime/runtimeHelper";
import { IsSetIdentical } from "diel/src/util/dielUtils";
import { LogWarning, LogInfo, LogError, TraceEvents } from "./messages";
import { DbCon, SocketIdType, SocketUrl } from "./types";
import { CloseDb, OpenDb, RunToDb, QueryFromDb } from "./helper";
interface DielMessageBase {
  id: string; // this is actually a JSOn
  action: string;
}

export class DielDbServer {
  port: number;
  dbCon: DbCon;

  // runtime information
  otherDbEngineSockets: WebSocket[];
  dbIdToSocket: Map<DbIdType, WebSocket>;
  runtimeDbId?: DbIdType;
  queueMap: Map<LogicalTimestep, {
    eventTable: RelationNameType;
    deps: Set<RelationNameType>;
    received: Set<RelationNameType>;
    receivedValues: RemoteUpdateRelationMessage[];
    relationsToShip: Map<RelationNameType, Set<DbIdType>>;
  }>;
  taskMetaData: Map<RelationNameType, DataflowPerNodeMetaData>;
  currentQueueHead: LogicalTimestep | null;
  cleanupQueries: string | undefined;

  constructor(dbCon: DbCon, port: number) {

    const app = express();
    // initialize a simple http server
    const server = http.createServer(app);
    const wss = new WebSocket.Server({ server });
    // start our server
    server.listen(port, () => {
        console.log(`Server started on port ${(server.address() as WebSocket.AddressInfo).port} :)`);
    });

    this.dbCon = dbCon;
    this.otherDbEngineSockets = [];
    this.port = port;
    this.dbIdToSocket = new Map<DbIdType, WebSocket>();
    this.queueMap = new Map();
    this.taskMetaData = new Map();
    this.currentQueueHead = null;

    const handler = this.getHandler();
    // there should really just be one connection at a time, so if this is called more than one time
    //  we will just reject it
    wss.on("connection", handler);
  }


  private async nextQueue(): Promise<void> {
    if (this.currentQueueHead) this.queueMap.delete(this.currentQueueHead);
    this.currentQueueHead = null;
    // if there is more in the queue to address, deal with them
    if (this.queueMap.size > 0) {
      this.currentQueueHead = Math.min(...this.queueMap.keys());
      // also load the next queue's results in
      const currentQueueMap = this.queueMap.get(this.currentQueueHead);
      if (!currentQueueMap) {
        LogInternalError(`CurrentQueneMap not defined`);
        return;
      }
      const promises = currentQueueMap.receivedValues.map(async updateMsg => {
        await RunToDb(this.dbCon, updateMsg.sql);
      });
      await Promise.all(promises);
      await this.evaluateQueueOnUpdateHandler();
    } else {
      // debugger;
      LogExecutionTrace(`Setting current queue head to null`);
    }
  }

  // RECURSIVE
  private async evaluateQueueOnUpdateHandler(): Promise<null> {
    if (!this.currentQueueHead) {
      // if there is no queue, skip
      if (this.queueMap.size === 0) {
        return null;
      }
      const queueKeys = this.queueMap.keys();
      // this is the first time
      this.currentQueueHead = Math.min(...queueKeys);
    }
    const currentItem = this.queueMap.get(this.currentQueueHead);
    if (!currentItem) {
      return LogInternalError(`Queue should contain current head ${this.currentQueueHead}, but it contains ${this.queueMap.keys()}!`);
    }
    LogExecutionTrace(`Attempting to process queue at ${this.currentQueueHead}`, this.queueMap);
    // coarse grained
    const currentQueueHead = this.currentQueueHead;
    if (!currentQueueHead) return LogInternalError(`Curretn quene head shoudl be defined!`);
    if (IsSetIdentical(currentItem.received, currentItem.deps)) {
      console.log(`  Success Processing queue at ${this.currentQueueHead}`, currentItem.relationsToShip);
      currentItem.relationsToShip.forEach(async (destinations, relationName) => {
        destinations.forEach(async dbId => {
          const shipMsg: RemoteShipRelationMessage = {
            action: DielRemoteAction.ShipRelation,
            requestTimestep: currentQueueHead,
            eventTableName: currentItem.eventTable,
            relationName,
            dbId
          };
          await this.shipRelation(shipMsg);
        });
      });
      this.nextQueue();
      return null;
    } else {
      console.log(`  Failure! Two sets are not the same`, currentItem.received, currentItem.deps);
      // need to keep on waiting
      return null;
    }
  }

  async updateRelation(updateMsg: RemoteUpdateRelationMessage) {
    // push this on to the message queue
    const requestTimestep = updateMsg.requestTimestep;
    if (this.queueMap.has(requestTimestep)) {
      const requestTimestepQueue = this.queueMap.get(requestTimestep);
      if (!requestTimestepQueue) {
        return LogInternalError(``);
      }
      requestTimestepQueue.received.add(updateMsg.updateRelationName);
    } else {
      // const rToShip = this.physicalExeuctionRef.getRelationsToShipForDb(this.id, msg.requestTimestep);
      const rToShip = this.taskMetaData.get(updateMsg.eventTableName);
      if (!rToShip) {
        return LogInternalError(``);
      }
      this.queueMap.set(requestTimestep, {
        eventTable: updateMsg.eventTableName,
        receivedValues: [],
        received: new Set([updateMsg.updateRelationName]),
        relationsToShip: rToShip.relationsToShip,
        deps: rToShip.deps
      });
      LogExecutionTrace(`Setting queue with new request timestep ${requestTimestep}`);
    }
    // then process
    // the following is brittle, but if we don't set it, the queue just keeps going
    if (!this.currentQueueHead) this.currentQueueHead = requestTimestep;
    if (requestTimestep === this.currentQueueHead) {
      LogExecutionTrace(`Executing immediately as received, with request timestep: ${requestTimestep}`);
      await RunToDb(this.dbCon, updateMsg.sql);
    } else {
      LogExecutionTrace(`CANNOT execute immediately, pushing request timestep: ${requestTimestep} to queue`);
      // otherwise push on the queue
      const requestTimestepQueue = this.queueMap.get(updateMsg.requestTimestep);
      if (!requestTimestepQueue) {
        return LogInternalError(`requestTimestepQuee null`);
      }
      requestTimestepQueue.receivedValues.push(updateMsg);
      return null;
    }
  }

  async shipRelation(shipMsg: RemoteShipRelationMessage) {
    const dbId = shipMsg.dbId;
    // find the connection to dbId
    const socket = this.dbIdToSocket.get(dbId);
    if (socket) {
      // TODO: maybe can improve this by having some prepared statement abstraction??
      const query = `SELECT * FROM ${shipMsg.relationName}`;
      const results = await QueryFromDb(this.dbCon, query);
      const sql = convertDataToUpdateString(results, shipMsg.relationName);
      const msg: RemoteUpdateRelationMessage = {
        action: DielRemoteAction.UpdateRelation,
        sql,
        // the rest we pass on
        updateRelationName: shipMsg.relationName,
        eventTableName: shipMsg.eventTableName,
        requestTimestep: shipMsg.requestTimestep,
      }
      socket.send(msg);
    }
  }

  getMessageHandler(ws: WebSocket) {
    return async (message: string) => {
      // the first message should be an id number
      try {
        const msg = JSON.parse(message) as DielRemoteMessage;
        switch (msg.action) {
          case DielRemoteAction.DefineDbId: {
            const idMsg = msg as RemoteIdMessage;
            this.runtimeDbId = idMsg.dbId;
            break;
          }
          case DielRemoteAction.Close: {
            this.closeSocket();
            break;
          }
          case DielRemoteAction.SetCleanUpQueries: {
            const cleanupMsg = msg as RemoteExecuteMessage;
            this.cleanupQueries = cleanupMsg.sql
          }
          case DielRemoteAction.DefineRelations: {
            const defineMsg = msg as RemoteExecuteMessage;
            RunToDb(this.dbCon, defineMsg.sql);
          }
          case DielRemoteAction.UpdateRelation: {
            // if (!this.physicalExeuctionRef) return LogInternalError(`should have reference to phsyical execution by now`);
            const updateMsg = msg as RemoteUpdateRelationMessage;
            this.updateRelation(updateMsg)
          }
          case DielRemoteAction.ShipRelation: {
            const shipMsg = msg as RemoteShipRelationMessage;
            this.shipRelation(shipMsg);
          }
          case DielRemoteAction.SetExecutionMetaData: {
            const metaMsg = msg as Remotemeta;

            this.taskMetaData = 
          }
          default: {
            LogError("Not all cases handled");
          }
        }
      } catch (e) {
        return LogError(`Message is not the expected JSON format: ${e}`);
      }
    };
  }

  getHandler() {
    return (ws: WebSocket) => {
      if (this.runtimeDbId != undefined) {
        LogError("we can only support one connection at a time");
        ws.close();
      }
      // now we can set it up
      ws.on("message", this.getMessageHandler(ws));
      ws.on("close", this.closeSocket);
    }
  }

  closeSocket() {
    console.log("begin clean up");
    if (this.dbCon.cleanUpQueries) {
      RunToDb(this.dbCon, this.dbCon.cleanUpQueries);
    } else {
      LogError(`Cleanup queries not defined`);
    }
    console.log("connection closed");
    // reset dbId
    this.runtimeDbId = undefined;
    CloseDb(this.dbCon);
  }

  // create connections to others, called immediately after setup
  addDbCons(otherSockets: SocketUrl[]) {
    for (let url in otherSockets) {
      const ws = new WebSocket(url);
      this.otherDbEngineSockets.push(ws);
    }
  }

  // some helper methods
  getPort() {
    return this.port
  }
}