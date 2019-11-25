import { DielDbServer } from "./server";
import { SqliteDbConfig, DbConfig, DbDriver } from "./types";
import { OpenDb } from "./helper";

// we actually need to start a bunch of different servers on different sockets...
// and socket will open another connection to another socket

const PORT_START = 8000;

function StartDielServer(allDbConfigs: []) {
  const servers: DielDbServer[] = [];
  let current_port = PORT_START;
  for (let config of allDbConfigs) {
    const dbInfo = OpenDb(config);
    if (dbInfo) {
      servers.push(new DielDbServer(dbInfo, current_port));
      // FIXME: should check to see if ports are available
      current_port += 1;
    }
  }
  // once they are created, we need to let them know of each other
  for (let s of servers) {
    s.
  }

}

export {
  DbDriver,
  SqliteDbConfig,
  DbConfig,
  // StartDielDbServer,
  StartDielServer
};
