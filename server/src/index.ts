import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { clientsRouter } from "./routes/clients.js";
import { webhookRouter } from "./routes/webhook.js";
import { metaRouter } from "./routes/meta.js";
import { reportsRouter } from "./routes/reports.js";
import { signatureRouter } from "./routes/signature.js";

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "2mb" }));

// simple request log
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use("/api", metaRouter);
app.use("/api", reportsRouter);
app.use("/api", signatureRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/webhooks", webhookRouter);

app.use((_req, res) => res.status(404).json({ error: "route not found" }));

app.listen(config.port, () => {
  console.log(
    `\n🛡️  Mislaka API server on http://localhost:${config.port}` +
      `\n    mode: ${config.mislaka.mode}` +
      `\n    webhook: ${config.publicBaseUrl}/api/webhooks/mislaka\n`,
  );
});
