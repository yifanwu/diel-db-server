import { DbDriver, DbInfo } from "./types";

export const dbFileLookup = new Map<string, DbInfo>([
  ["pitchfork", {
    path: "./sample-data/pitchfork.sqlite",
    driver: DbDriver.SQLite
  }],
  ["fires", {
    path: "./sample-data/fires.sqlite",
    driver:  DbDriver.SQLite
  }],
  // ["tweet", "./sample-data/charlottesville.sqlite"]
]);
