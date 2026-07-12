function now() {
  return new Date().toISOString();
}

function structuredLog(level, event, fields = {}) {
  console.log(JSON.stringify({ level, event, time: now(), ...fields }));
}

module.exports = {
  structuredLog
};
