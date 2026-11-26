const http = require("node:http");
const { randomUUID } = require("node:crypto");

const { logger } = require("./config/logger");
const { jsonResponse } = require("./http/responses");
const { health } = require("./routes/health");
const { listOrCreateTask, getUpdateOrDeleteTask } =
  require("./routes/tasks");

function createServer() {
  return http.createServer((req, res) => {
    const startedAt = Date.now();
    const requestId = randomUUID();
    req.requestId = requestId;
    const pathname = new URL(req.url, "http://localhost").pathname;

    res.on("finish", () => {
      logger.info("HTTP request completed", {
        requestId,
        method: req.method,
        path: pathname,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });

    if (pathname === "/health") {
      health(req, res);
      return;
    }

    if (pathname === "/tasks") {
      listOrCreateTask(req, res);
      return;
    }

    const taskMatch = pathname.match(/^\/tasks\/([^/]+)$/);
    if (taskMatch) {
      getUpdateOrDeleteTask(req, res, taskMatch[1]);
      return;
    }

    logger.warn("This route could not be found/does not exist yet", {
      requestId,
      path: pathname,
      method: req.method,
    });
    jsonResponse(res, 404, {
      status: "ERROR",
      message: "Not found!",
    });
  });
}

module.exports = { createServer };
