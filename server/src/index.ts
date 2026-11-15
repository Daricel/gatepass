import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { openDb } from "./db.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const db = openDb(config.databasePath);
const app = createApp({ db, clientDir: path.resolve(here, "../../client/dist") });

app.listen(config.port, () => {
  console.log(`Gatepass API listening on http://localhost:${config.port}`);
});
