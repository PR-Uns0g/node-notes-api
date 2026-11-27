const { readRequestBody } = require("../http/request");
const { jsonResponse } = require("../http/responses");
const {
  loadFile,
  addNewNoteRecord,
  deleteNoteRecord,
  updateNoteRecord,
} = require("../repositories/notesRepository");
const { logger } = require("../config/logger");
const { ApiError } = require("../http/apiError");

async function parseRequestBody(req, operation) {
  const body = await readRequestBody(req);

  try {
    return JSON.parse(body);
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.", {
      operation,
    });
  }
}

function methodNotAllowed(allowedMethods) {
  throw new ApiError(405, "Method not allowed!", {
    headers: { Allow: allowedMethods.join(", ") },
    operation: "method_not_allowed",
  });
}

async function listOrCreateTask(req, res) {
  const allowedMethods = ["GET", "POST"];

  if (req.method === "POST") {
    const input = await parseRequestBody(req, "parse_request");

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).length === 0
    ) {
      throw new ApiError(
        400,
        "Request body must be a non-empty JSON object.",
        { operation: "create_note" },
      );
    }

    if (typeof input.title !== "string" || !input.title.trim()) {
      throw new ApiError(400, "Title must be a non-empty string.", {
        operation: "create_note",
      });
    }

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
    return;
  }

  if (req.method === "GET") {
    const notes = await loadFile();
    jsonResponse(res, 200, {
      status: "success",
      message:
        notes.length > 0
          ? "OK! Here is the list of notes."
          : "OK! There are no notes yet.",
      notes,
    });
    return;
  }

  methodNotAllowed(allowedMethods);
}

async function getUpdateOrDeleteTask(req, res, id) {
  const allowedMethods = ["GET", "DELETE", "PATCH"];

  if (req.method === "DELETE") {
    const notes = await loadFile();
    const deletedNote = await deleteNoteRecord(notes, id);
    if (!deletedNote) {
      throw new ApiError(404, `Note with id: ${id} was not found to be deleted`, {
        operation: "delete_note",
      });
    }

    logger.info("Note deleted successfully", {
      requestId: req.requestId,
      noteId: deletedNote.id,
    });
    jsonResponse(res, 200, { status: "success", message: "OK!" });
    return;
  }

  if (req.method === "PATCH") {
    const input = await parseRequestBody(req, "parse_request");
    const editableFields = ["title", "status"];
    const fields =
      input && typeof input === "object" && !Array.isArray(input)
        ? Object.keys(input)
        : [];

    if (
      fields.length === 0 ||
      fields.some((field) => !editableFields.includes(field))
    ) {
      throw new ApiError(
        400,
        "PATCH body must include title and/or status; these are the only editable fields.",
        { operation: "update_note" },
      );
    }

    const updates = {};
    if (Object.hasOwn(input, "title")) {
      if (typeof input.title !== "string" || !input.title.trim()) {
        throw new ApiError(400, "Title must be a non-empty string.", {
          operation: "update_note",
        });
      }
      updates.title = input.title.trim();
    }

    if (Object.hasOwn(input, "status")) {
      if (typeof input.status !== "string" || !input.status.trim()) {
        throw new ApiError(400, "Status must be a non-empty string.", {
          operation: "update_note",
        });
      }
      updates.status = input.status.trim();
    }

    const notes = await loadFile();
    const updatedNote = await updateNoteRecord(notes, id, updates);
    if (!updatedNote) {
      throw new ApiError(404, `Note with id: ${id} was not found to be updated`, {
        operation: "update_note",
      });
    }

    logger.info("Note updated successfully", {
      requestId: req.requestId,
      noteId: updatedNote.id,
      fields: Object.keys(updates),
    });
    jsonResponse(res, 200, { status: "success", message: "OK!" });
    return;
  }

  if (req.method === "GET") {
    const notes = await loadFile();
    const noteToDisplay = notes.find((note) => String(note.id) === id);

    if (!noteToDisplay) {
      throw new ApiError(
        404,
        `Note with id: ${id} was not found in the notes list`,
        { operation: "search_note" },
      );
    }

    jsonResponse(res, 200, {
      status: "success",
      message: "OK! Here is the note",
      note: noteToDisplay,
    });
    return;
  }

  methodNotAllowed(allowedMethods);
}

module.exports = { listOrCreateTask, getUpdateOrDeleteTask };
