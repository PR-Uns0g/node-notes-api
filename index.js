const http = require("node:http");
const { randomUUID } = require("node:crypto");

const { readRequestBody, methodNotAllowedResponse } = require("./utils.js");
const {
  loadFile,
  addNewNoteRecord,
  deleteNoteRecord,
  updateNoteRecord,
} = require("./fileHandler.js");
const { logger } = require("./logger.js");

const routes = {
  "/health": (req, res) => {
    if (req.method !== "GET") {
      methodNotAllowedResponse({ req, res }, "GET");
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "healthy",
        message: "OK! Server is running!",
      }),
    );
  },
  "/tasks": async (req, res) => {
    let allowedMethods = ["GET", "POST"];

    if (req.method === "POST") {
      let input;
      try {
        input = JSON.parse(await readRequestBody(req));
      } catch (err) {
        logger.warn("Could not parse new note data", {
          requestId: req.requestId,
          operation: "parse_request",
          error: err.message,
          tip: "Please provide a valid JSON for the note.",
        });
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "ERROR",
            message: "Bad request! Please provide a valid JSON body.",
          }),
        );
      }

      if (typeof input.title !== "string" || !input.title.trim()) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "ERROR",
            message: "Bad request! Please provide a note with valid title.",
          }),
        );
      }

      try {
        const notes = await loadFile();
        const note = await addNewNoteRecord(
          notes,
          input.title.trim(),
          req.requestId,
        );
        logger.info("Note created and saved successfully.", {
          requestId: req.requestId,
          noteId: note.id,
        });

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "success",
            message: "Created! Note has been saved successfully.",
            note,
          }),
        );
      } catch (err) {
        logger.error("Could not create note", {
          requestId: req.requestId,
          operation: "create_note",
          error: err.message,
          stack: err.stack,
        });
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "ERROR",
            message: "Internal server error! Could not save note :(",
          }),
        );
        return;
      }
    }

    if (req.method === "GET") {
      try {
        const notes = await loadFile();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "success",
            message:
              notes.length > 0
                ? "OK! Here is the list of notes."
                : "OK! There are no notes yet.",
            notes,
          }),
        );
      } catch (err) {
        console.error(err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "ERROR",
            message: "Internal server error! Could not fetch notes :(",
          }),
        );

        return;
      }
    }

    if (!allowedMethods.includes(req.method)) {
      methodNotAllowedResponse({ req, res }, allowedMethods);
      return;
    }
  },
  "/tasks/:id": async (req, res, id) => {
    let allowedMethods = ["GET", "DELETE", "PATCH"];

    if (req.method === "DELETE") {
      try {
        const notes = await loadFile();
        const deletedNote = await deleteNoteRecord(notes, id);

        if (!deletedNote) {
          logger.warn(`Note with id ${id} not found!`, {
            requestId: req.requestId,
            operation: "delete_note",
          });
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              status: "ERROR",
              message: "Note not found.",
            }),
          );
          return;
        }

        logger.info("Note deleted successfully", {
          requestId: req.requestId,
          noteId: deletedNote.id,
        });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "success",
            message: "Note deleted successfully.",
            note: deletedNote,
          }),
        );
      } catch (err) {
        logger.error(`Could not delete note with id: ${id}`, {
          requestId: req.requestId,
          operation: "delete_note",
          error: err.message,
          stack: err.stack,
        });
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "ERROR",
            message: "Internal server error! Could not delete note :(",
          }),
        );
      }
      return;
    }

    if (req.method === "PATCH") {
      let input;
      try {
        input = JSON.parse(await readRequestBody(req));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "ERROR",
            message: "Bad request! Please provide a valid JSON object.",
          }),
        );
        return;
      }

      const editableFields = ["title", "status"];
      const fields =
        input && typeof input === "object" && !Array.isArray(input)
          ? Object.keys(input)
          : [];
      let updates = {};

      if (
        fields.length === 0 ||
        fields.some((field) => !editableFields.includes(field))
      ) {
        logger.warn("Rejected note update with invalid fields", {
          requestId: req.requestId,
          operation: "update_note",
          noteId: id,
        });
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "ERROR",
            message: "Bad request! Provide title and/or status to update.",
          }),
        );
        return;
      }

      if (Object.hasOwn(input, "title")) {
        if (typeof input.title !== "string" || !input.title.trim()) {
          logger.warn("Rejected note update with invalid title", {
            requestId: req.requestId,
            operation: "update_note",
            noteId: id,
          });
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              status: "ERROR",
              message: "Bad request! Please provide a valid title.",
            }),
          );
          return;
        }
        updates.title = input.title.trim();
      }

      if (Object.hasOwn(input, "status")) {
        if (typeof input.status !== "string" || !input.status.trim()) {
          logger.warn("Rejected note update with invalid status", {
            requestId: req.requestId,
            operation: "update_note",
            noteId: id,
          });
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              status: "ERROR",
              message: "Bad request! Please provide a valid status.",
            }),
          );
          return;
        }
        updates.status = input.status.trim();
      }

      try {
        const notes = await loadFile();
        const updatedNote = await updateNoteRecord(notes, id, updates);

        if (!updatedNote) {
          logger.warn(`Note with id ${id} not found`, {
            requestId: req.requestId,
            operation: "update_note",
          });
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              status: "ERROR",
              message: "Note not found.",
            }),
          );
          return;
        }

        logger.info("Note updated successfully", {
          requestId: req.requestId,
          noteId: updatedNote.id,
          fields: Object.keys(updates),
        });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "success",
            message: "Note updated successfully.",
            note: updatedNote,
          }),
        );
      } catch (err) {
        logger.error(`Could not update note with id ${id}`, {
          requestId: req.requestId,
          operation: "note_update",
          error: err.message,
          stack: err.stack,
        });
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "ERROR",
            message: "Internal server error! Could not update note :(",
          }),
        );
      }
      return;
    }

    if (req.method === "GET") {
      try {
        const notes = await loadFile();

        if (notes.length > 0) {
          const noteToDisplay = notes.find((note) => String(note.id) === id);

          res.writeHead(noteToDisplay ? 200 : 404, {
            "Content-Type": "application/json",
          });
          if (noteToDisplay) {
            res.end(
              JSON.stringify({
                status: "success",
                message: "OK! Here is the note",
                note: noteToDisplay,
              }),
            );
          } else {
            logger.warn(
              `Note with id: ${id} could not be found in notes list`,
              {
                requestId: req.requestId,
                operation: "search_note",
              },
            );
            res.end(
              JSON.stringify({
                status: "ERROR",
                message: `Not Found! Note with id: ${id} could not be found in notes list`,
              }),
            );
            return;
          }
        } else {
          logger.warn("The notes list is empty", {
            requestId: req.requestId,
            operation: "search_note",
          });
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              status: "ERROR",
              message: `Not found! The notes list is empty.`,
            }),
          );
          return;
        }
      } catch (err) {
        logger.error("Error loading notes file", {
          requestId: req.requestId,
          operation: "search_note",
          error: err.message,
          stack: err.stack,
        });
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "ERROR",
            message: "Internal server error! Could not search for note :(",
          }),
        );
      }
      return;
    }

    if (!allowedMethods.includes(req.method)) {
      methodNotAllowedResponse({ req, res }, allowedMethods);
      return;
    }
  },
};

const server = http.createServer((req, res) => {
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
  const handleRoute = () => {
    const { pathname } = new URL(req.url, "http://localhost");
    const handler = routes[pathname];
    const todoMatch = pathname.match(/^\/tasks\/([^/]+)$/);

    if (handler) {
      handler(req, res);
    } else if (todoMatch) {
      routes["/tasks/:id"](req, res, todoMatch[1]);
    } else {
      logger.warn("This route could not be found/does not exist yet", {
        requestId,
        path: pathname,
        method: req.method,
      });
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ERROR",
          message: "Route not found!",
        }),
      );
    }
  };
  handleRoute();
});

server.listen(1234, () => {
  logger.info("Server listening on http://localhost:1234");
});
