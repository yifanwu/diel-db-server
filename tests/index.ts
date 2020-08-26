import { testPostgresSetup } from "./postgresTest";
import { testPostgresEndToEnd } from "./endToEndTest";
import { testDBtoDB } from "./testDBtoDB";

function main() {
  // testPostgresEndToEnd();
  testDBtoDB();
}

main();