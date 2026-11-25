const fs = require("node:fs/promises");
const path = require("node:path");

const notesPath = path.join(__dirname, ".output/notes.json");

async function addNewNoteRecord(oldNotesFile, newRecordTitle) {
  const maxID = oldNotesFile.reduce(
    (max, noteRecord) => Math.max(max, noteRecord.id),
    0,
  );

  let newRecord = {
    id: maxID + 1,
    title: newRecordTitle,
    status: "pending",
  };

  await fs.writeFile(
    notesPath, 
    JSON.stringify([...oldNotesFile, newRecord])
  );

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
  let updatedNotes = [...notes];
  updatedNotes[noteIndex] = updatedNote;
  await fs.writeFile(notesPath, JSON.stringify(updatedNotes));

  return updatedNote;
}

async function loadFile() {
  try {
    const fileData = await fs.readFile(notesPath, "utf-8");
    return JSON.parse(fileData);
  } catch (err) {
    if (err.code === "ENOENT") {
      return [];
    }

    throw err;
  }
}

module.exports = {
  loadFile,
  addNewNoteRecord,
  deleteNoteRecord,
  updateNoteRecord,
};
