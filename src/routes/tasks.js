const { readRequestBody } = require("../http/request");
const { jsonResponse, methodNotAllowedResponse } =
  require("../http/responses");
const {
  loadFile,
  addNewNoteRecord,
  deleteNoteRecord,
  updateNoteRecord,
} = require("../repositories/notesRepository");
const { logger } = require("../config/logger");

async function listOrCreateTask(req, res) {
  const allowedMethods = ["GET", "POST"];

  if (req.method === "POST") {
    let input;
    try {
      input = JSON.parse(await readRequestBody(req));
    } catch (err) {
      logger.warn("Could not parse new note data", {
        requestId: req.requestId,
        operation: "parse_request",
        error: err.message,
        stack: err.stack,
        tip: "Please provide a valid JSON for the note.",
      });
      jsonResponse(res, 400, {
        status: "ERROR",
        message: "Request body must be valid JSON.",
      });
      return;
    }

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).length === 0
    ) {
      logger.warn("Rejected note creation with invalid request body", {
        requestId: req.requestId,
        operation: "create_note",
      });
      jsonResponse(res, 400, {
        status: "ERROR",
        message: "Request body must be a non-empty JSON object.",
      });
      return;
    }

    if (typeof input.title !== "string" || !input.title.trim()) {
      logger.warn("Rejected note creation with invalid title", {
        requestId: req.requestId,
        operation: "create_note",
      });
      jsonResponse(res, 400, {
        status: "ERROR",
        message: "Title must be a non-empty string.",
      });
      return;
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
      jsonResponse(res, 201, {
        status: "success",
        message: "Created!",
      });
    } catch (err) {
      logger.error("Could not create note", {
        requestId: req.requestId,
        operation: "create_note",
        error: err.message,
        stack: err.stack,
      });
      jsonResponse(res, 500, {
        status: "ERROR",
        message: "Internal server error!",
      });
    }
    return;
  }

  if (req.method === "GET") {
    try {
      const notes = await loadFile();
      jsonResponse(res, 200, {
        status: "success",
        message:
          notes.length > 0
            ? "OK! Here is the list of notes."
            : "OK! There are no notes yet.",
        notes,
      });
    } catch (err) {
      logger.error("Could not fetch notes list", {
        requestId: req.requestId,
        operation: "fetch_notes",
        error: err.message,
        stack: err.stack,
      });
      jsonResponse(res, 500, {
        status: "ERROR",
        message: "Internal server error!",
      });
    }
    return;
  }

  methodNotAllowedResponse(req, res, allowedMethods);
}

async function getUpdateOrDeleteTask(req, res, id) {
  const allowedMethods = ["GET", "DELETE", "PATCH"];

  if (req.method === "DELETE") {
    try {
      const notes = await loadFile();
      const deletedNote = await deleteNoteRecord(notes, id);
      if (!deletedNote) {
        logger.warn(`Note with id ${id} not found!`, {
          requestId: req.requestId,
          operation: "delete_note",
        });
        jsonResponse(res, 404, {
          status: "ERROR",
          message: "Not found!",
        });
        return;
      }

      logger.info("Note deleted successfully", {
        requestId: req.requestId,
        noteId: deletedNote.id,
      });
      jsonResponse(res, 200, { status: "success", message: "OK!" });
    } catch (err) {
      logger.error(`Could not delete note with id: ${id}`, {
        requestId: req.requestId,
        operation: "delete_note",
        error: err.message,
        stack: err.stack,
      });
      jsonResponse(res, 500, {
        status: "ERROR",
        message: "Internal server error!",
      });
    }
    return;
  }

  if (req.method === "PATCH") {
    let input;
    try {
      input = JSON.parse(await readRequestBody(req));
    } catch (err) {
      logger.warn("Could not parse update data", {
        requestId: req.requestId,
        operation: "parse_request",
        error: err.message,
        stack: err.stack,
        tip: "Please provide a valid JSON for the note update.",
      });
      jsonResponse(res, 400, {
        status: "ERROR",
        message: "Request body must be valid JSON.",
      });
      return;
    }

    const editableFields = ["title", "status"];
    const fields =
      input && typeof input === "object" && !Array.isArray(input)
        ? Object.keys(input)
        : [];

    if (
      fields.length === 0 ||
      fields.some((field) => !editableFields.includes(field))
    ) {
      logger.warn("Rejected note update with invalid fields", {
        requestId: req.requestId,
        operation: "update_note",
        noteId: id,
      });
      jsonResponse(res, 400, {
        status: "ERROR",
        message:
          "PATCH body must include title and/or status; these are the only editable fields.",
      });
      return;
    }

    const updates = {};
    if (Object.hasOwn(input, "title")) {
      if (typeof input.title !== "string" || !input.title.trim()) {
        logger.warn("Rejected note update with invalid title", {
          requestId: req.requestId,
          operation: "update_note",
          noteId: id,
        });
        jsonResponse(res, 400, {
          status: "ERROR",
          message: "Title must be a non-empty string.",
        });
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
        jsonResponse(res, 400, {
          status: "ERROR",
          message: "Status must be a non-empty string.",
        });
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
        jsonResponse(res, 404, { status: "ERROR", message: "Not found!" });
        return;
      }

      logger.info("Note updated successfully", {
        requestId: req.requestId,
        noteId: updatedNote.id,
        fields: Object.keys(updates),
      });
      jsonResponse(res, 200, { status: "success", message: "OK!" });
    } catch (err) {
      logger.error(`Could not update note with id ${id}`, {
        requestId: req.requestId,
        operation: "note_update",
        error: err.message,
        stack: err.stack,
      });
      jsonResponse(res, 500, {
        status: "ERROR",
        message: "Internal server error!",
      });
    }
    return;
  }

  if (req.method === "GET") {
    try {
      const notes = await loadFile();
      const noteToDisplay = notes.find((note) => String(note.id) === id);

      if (noteToDisplay) {
        jsonResponse(res, 200, {
          status: "success",
          message: "OK! Here is the note",
          note: noteToDisplay,
        });
      } else {
        logger.warn(
          notes.length > 0
            ? `Note with id: ${id} could not be found in notes list`
            : "The notes list is empty",
          {
            requestId: req.requestId,
            operation: "search_note",
          },
        );
        jsonResponse(res, 404, {
          status: "ERROR",
          message: notes.length > 0 ? "Not Found!" : "Not found!",
        });
      }
    } catch (err) {
      logger.error("Error loading notes file", {
        requestId: req.requestId,
        operation: "search_note",
        error: err.message,
        stack: err.stack,
      });
      jsonResponse(res, 500, {
        status: "ERROR",
        message: "Internal server error!",
      });
    }
    return;
  }

  methodNotAllowedResponse(req, res, allowedMethods);
}

module.exports = { listOrCreateTask, getUpdateOrDeleteTask };
