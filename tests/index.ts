import { testPostgresSetup } from "./postgresTest";
import { testPostgresEndToEnd } from "./endToEndTest";

function main() {
  testPostgresEndToEnd();
  // testPostgresConnection();
}

main();