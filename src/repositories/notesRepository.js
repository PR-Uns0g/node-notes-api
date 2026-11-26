const fs = require("node:fs/promises");
const path = require("node:path");

const { logger } = require("../config/logger");

const directoryPath = path.join(__dirname, "..", "..", ".output");
const notesPath = path.join(directoryPath, "notes.json");

async function addNewNoteRecord(oldNotesFile, newRecordTitle, requestId) {
  const maxId = oldNotesFile.reduce(
    (max, noteRecord) => Math.max(max, noteRecord.id),
    0,
  );
  const newRecord = {
    id: maxId + 1,
    title: newRecordTitle,
    status: "pending",
  };

  const createdDirectory = await fs.mkdir(directoryPath, { recursive: true });
  if (createdDirectory) {
    logger.info(`Directory ${directoryPath} created.`, { requestId });
  }

  await fs.writeFile(notesPath, JSON.stringify([...oldNotesFile, newRecord]));
  return newRecord;
}

async function deleteNoteRecord(notes, id) {
  const noteToDelete = notes.find((note) => String(note.id) === id);
  if (!noteToDelete) return null;

  const remainingNotes = notes.filter((note) => String(note.id) !== id);
  await fs.writeFile(notesPath, JSON.stringify(remainingNotes));
  return noteToDelete;
}

async function updateNoteRecord(notes, id, updates) {
  const noteIndex = notes.findIndex((note) => String(note.id) === id);
  if (noteIndex === -1) return null;

  const updatedNote = { ...notes[noteIndex], ...updates };
  const updatedNotes = [...notes];
  updatedNotes[noteIndex] = updatedNote;
  await fs.writeFile(notesPath, JSON.stringify(updatedNotes));
  return updatedNote;
}

async function loadFile() {
  try {
    const fileData = await fs.readFile(notesPath, "utf-8");
    return JSON.parse(fileData);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

module.exports = {
  loadFile,
  addNewNoteRecord,
  deleteNoteRecord,
  updateNoteRecord,
};
