const { AsyncLocalStorage } = require("async_hooks");
const loggerStorage = new AsyncLocalStorage();

function now() {
  return new Date().toISOString();
}

function structuredLog(level, event, fields = {}) {
  const correlationId = loggerStorage.getStore();
  const payload = { level, event, time: now(), ...fields };
  if (correlationId) {
    payload.correlationId = correlationId;
  }
  console.log(JSON.stringify(payload));
}

module.exports = {
  structuredLog,
  loggerStorage
};
