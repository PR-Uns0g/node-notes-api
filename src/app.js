const http = require("node:http");
const { randomUUID } = require("node:crypto");

const { logger } = require("./config/logger");
const { healthCheck } = require("./routes/health");
const { listOrCreateTask, getUpdateOrDeleteTask } = require("./routes/tasks");
const { errorHandler } = require("./http/errorHandler");
const { ApiError } = require("./http/apiError");

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

    // void here is to avoid lint warnings
    void handleRequest(req, res, pathname).catch((err) =>
      errorHandler(err, req, res),
    );
  });
}

async function handleRequest(req, res, pathname) {
  if (pathname === "/health") {
    healthCheck(req, res);
    return;
  }

  if (pathname === "/tasks") {
    await listOrCreateTask(req, res);
    return;
  }

  const taskMatch = pathname.match(/^\/tasks\/([^/]+)$/);
  if (taskMatch) {
    await getUpdateOrDeleteTask(req, res, taskMatch[1]);
    return;
  }

  throw new ApiError(404, "Not found!", {
    operation: "route_not_found",
  });
}

module.exports = { createServer };
