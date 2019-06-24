import { testPostgresSetup } from "./postgresTest";
import { testPostgresEndToEnd } from "./endToEndTest";

function main() {
  // testPostgresSetup();
  testPostgresEndToEnd();
}

main();