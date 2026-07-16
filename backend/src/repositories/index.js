const { createLocalRepository } = require("./localJson.repository");
const { createPostgresRepository } = require("./postgres.repository");

function createRepository({ seedStorePath, storePath } = {}) {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    return createPostgresRepository({
      databaseUrl,
      seedStorePath
    });
  }

  return createLocalRepository({
    seedStorePath,
    storePath
  });
}

module.exports = {
  createRepository
};
