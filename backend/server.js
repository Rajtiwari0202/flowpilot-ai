const http = require("http");
const { PORT, validateEnvironment } = require("./src/config/env");
const { structuredLog } = require("./src/utils/logger");
const { handleRequest, repository } = require("./src/app");
const queueService = require("./src/services/queue.service");

const server = http.createServer((req, res) => {
  handleRequest(req, res);
});

validateEnvironment();

server.listen(PORT, () => {
  structuredLog("info", "server.started", { port: PORT, repository: repository.mode });
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. The FlowPilot API may already be running.`);
    process.exit(1);
  }
  throw error;
});

// Graceful server shutdown exit handlers
let shuttingDown = false;
async function gracefulServerShutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  structuredLog("info", "server.shutting_down", { message: "Stopping HTTP server and cleaning connections..." });
  
  server.close(async () => {
    try {
      await queueService.close();
    } catch (err) {
      structuredLog("error", "queue.service.close.error", { error: err.message });
    }
    try {
      if (repository && typeof repository.close === "function") {
        await repository.close();
      }
    } catch (err) {
      structuredLog("error", "repository.close.error", { error: err.message });
    }
    structuredLog("info", "server.graceful_shutdown.completed");
    process.exit(0);
  });

  setTimeout(() => {
    structuredLog("warn", "server.force_shutdown", { message: "Forcing server process exit." });
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGINT", gracefulServerShutdown);
process.on("SIGTERM", gracefulServerShutdown);
