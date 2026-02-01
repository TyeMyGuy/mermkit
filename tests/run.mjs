import { testCliIntegration } from "./integration-cli.test.mjs";
import { testServeIntegration } from "./serve.test.mjs";
import { testAdapters } from "./adapters.test.mjs";
import { testWrappers } from "./wrappers.test.mjs";
import { testAsciiRender } from "./ascii.test.mjs";

async function run() {
  await testCliIntegration();
  await testServeIntegration();
  await testAdapters();
  await testWrappers();
  await testAsciiRender();
}

run().catch((error) => {
  console.error("tests: failed", error);
  process.exit(1);
});
