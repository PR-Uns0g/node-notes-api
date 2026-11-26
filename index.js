const { createServer } = require("./src/app");
const { logger } = require("./src/config/logger");

const port = Number(process.env.PORT) || 1234;
const server = createServer();

server.listen(port, () => {
  logger.info(`Server listening on http://localhost:${port}`);
});

module.exports = { server };
