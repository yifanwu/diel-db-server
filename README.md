# DIEL DB Server

A thin wrapper layer that connects to different provided databases.

Please refer to [this example repo](https://github.com/yifanwu/diel-db-server-examples) if you want to see how this repo is used --- currently, that example uses the Pitchfork dataset.

## How to use

This repo is used in conjunction with DIEL. 

## Supported DBs

We currently support SQLite (better-sqlite3) add Postgres. We will also add support for an AWS DB.

To use your SQLite file, simply pass the following configuration when you start, as an example

```TypeScript
import { resolve } from "path";
import { StartDielDbServer } from "diel-db-server";
import { DbDriver } from "diel-db-server/build/src/types";

console.log("data path", resolve("sample-data/pitchfork.sqlite"));

const configs = [{
  dbName: "pitchfork",
  path: resolve("server/sample-data/pitchfork.sqlite"),
  driver: DbDriver.SQLite
}];

StartDielDbServer(configs);
```

And in your UI application, you want to follow the following basic steps. Note that the `dbName` is used to specify which db the application is interested in, since the server could in theory contain multiple databases.

```TypeScript

// the function to call when DIEL is finished setting up --- here, we are using Reat
const loadPage = () => {
  ReactDOM.render(
    <PageContainer/>,
    document.getElementById("wrapper")
  );
};

// the default websocket location is 8999
const dbConfigs: DbSetupConfig[] = [
  {
    dbType: DbType.Socket,
    connection: "ws://localhost:8999",
    message: {dbName: "pitchfork"}
  }
];

// slightly weird location I suppose
const dielPrefix = "./assets/diel/";

const dielFiles = [
   `${dielPrefix}pitchfork-remote.diel`
];

const mainDbPath: string = null;

export const diel = new DielRuntime({
  isStrict: true,
  showLog: true,
  setupCb: loadPage,
  dielFiles,
  mainDbPath,
  dbConfigs,
});

```

## Architecture (Dev)

This starts the servers that DIEL needs to talk to.

Messages should just be one of the following:

- one time SQL queries that asks for a response
- define a view as a prepared statement
- insertion, and the relevant views that also need to be retrieved
- getting a broadcasted message about what the id for the socket is.
