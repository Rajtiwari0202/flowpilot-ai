const http = require("http");
const { PORT, validateEnvironment } = require("./src/config/env");
const { structuredLog } = require("./src/utils/logger");
const { handleRequest, repository } = require("./src/app");

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
