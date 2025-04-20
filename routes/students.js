const express = require("express");
const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("db.sqlite");
const router = express.Router();

//Students
router.post("/append", (req, res) => {
  const {
    id,
    name,
    surname,
    classroom,
    attendedPacks,
    isGuardian,
    isIgnored,
    isModerator,
  } = req.body;

  try {
    const insertQuery = db.prepare(`
            INSERT INTO students (
                id, name, surname, classroom,
                attendedPacks, isGuardian, isIgnored, isModerator
            ) VALUES (
                @id, @name, @surname, @classroom,
                @attendedPacks, @isGuardian, @isIgnored, @isModerator
            )
        `);

    // Inserisci i dati nel database
    const result = insertQuery.run({
      id,
      name,
      surname,
      classroom,
      attendedPacks: JSON.stringify(attendedPacks), // Se necessario
      isGuardian: JSON.stringify(isGuardian), // Se necessario
      isIgnored: JSON.stringify(isIgnored), // Se necessario
      isModerator: JSON.stringify(isModerator), // Se necessario
    });

    res.status(200).json({
      success: true,
      message: "Studente inserito con successo",
      studentId: result.lastInsertRowId,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Errore durante l'inserimento dello studente: ${error.message}`,
      error: error,
    });
  }
});

router.post("/update/:id", (req, res) => {
  const { id } = req.params;

  if (!req.body) {
    nullBodyError(res);
    return;
  }

  const { name, surname, email, phone } = req.body;

  try {
    // Verifica se lo studente esiste
    const checkQuery = db.prepare("SELECT * FROM students WHERE id = ?");
    const existingStudent = checkQuery.get(id);

    if (!existingStudent) {
      res.status(404).json({
        success: false,
        message: "Studente non trovato",
      });
      return;
    }

    // Aggiorna i dati dello studente
    const updateQuery = db.prepare(
      "UPDATE students SET name = ?, surname = ?, email = ?, phone = ? WHERE id = ?",
    );
    updateQuery.run(name, surname, email, phone, id);

    res.status(200).json({
      success: true,
      message: "Studente aggiornato con successo",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Errore durante l'aggiornamento dello studente: ${error.message}`,
      error: error,
    });
  }
});

router.post("/remove/:id", (req, res) => {
  const { id } = req.params;

  if (!req.body) {
    nullBodyError(res);
    return;
  }

  try {
    // Verifica se lo studente esiste
    const checkQuery = db.prepare("SELECT * FROM students WHERE id = ?");
    const existingStudent = checkQuery.get(id);

    if (!existingStudent) {
      res.status(404).json({
        success: false,
        message: "Studente non trovato",
      });
      return;
    }

    // Rimuove lo studente dal database
    const deleteQuery = db.prepare("DELETE FROM students WHERE id = ?");
    deleteQuery.run(id);

    res.status(200).json({
      success: true,
      message: "Studente rimosso con successo",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Errore durante la rimozione dello studente: ${error.message}`,
      error: error,
    });
  }
});

router.get("/", (req, res) => {
  try {
    const query = db.prepare("SELECT * FROM students ORDER BY surname, name");
    const students = query.all();

    const formattedStudents = students.map((student) => {
      return {
        ...student,
        // Assicurati che i campi vuoti vengano trattati come array vuoti, se necessario
        attendedPacks: student.attendedPacks
          ? JSON.parse(student.attendedPacks)
          : [],
        isGuardian: student.isGuardian ? JSON.parse(student.isGuardian) : [],
        isIgnored: student.isIgnored ? JSON.parse(student.isIgnored) : [],
        isModerator: student.isModerator ? JSON.parse(student.isModerator) : [],
      };
    });

    res.status(200).json(formattedStudents);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Errore durante il recupero degli studenti: ${error.message}`,
      error: error,
    });
  }
});

module.exports = router;
