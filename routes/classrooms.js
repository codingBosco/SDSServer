const express = require("express");
const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("db.sqlite");
const router = express.Router();

router.post("/append", (req, res) => {
  if (!req.body) {
    return nullBodyError(res);
  }

  const {
    id,
    entrance,
    position,
    num,
    max,
    formal,
    studentsNum,
    avaible,
    plex,
  } = req.body;

  // Lista dei campi richiesti (senza "name")
  const requiredFields = {
    id,
    entrance,
    position,
    num,
    max,
    formal,
    studentsNum,
    avaible,
    plex,
  };

  // Trova i campi mancanti o nulli/undefined
  const missingFields = Object.entries(requiredFields)
    .filter(
      ([_, value]) => value === undefined || value === null || value === "",
    )
    .map(([key]) => key);

  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Alcuni campi richiesti sono mancanti.",
      missingFields: missingFields,
    });
  }

  try {
    const query = db.prepare(`
      INSERT INTO classrooms (
        id, entrance, position, num, max, formal, studentsNum, avaible, plex
      ) VALUES (
        @id, @entrance, @position, @num, @max, @formal, @studentsNum, @avaible, @plex
      )
    `);

    const toSQLiteBool = (value) =>
      value === true || value === "true" ? 1 : 0;

    const result = query.run({
      id: String(id),
      entrance: String(entrance),
      position: String(position),
      num: String(num),
      max: Number(max),
      formal: String(formal),
      studentsNum: Number(studentsNum),
      avaible: toSQLiteBool(avaible),
      plex: String(plex),
    });

    res.status(200).json({
      success: true,
      message: "Aula inserita con successo",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Errore durante l'inserimento: ${error.message}`,
      error: error,
      passedHeader: req.body,
    });
  }
});

router.post("/update/:id", (req, res) => {
  const { id } = req.params;

  if (!req.body) {
    nullBodyError(res);
    return;
  }

  const { entrance, position, num, max, formal, studentsNum, avaible } =
    req.body;

  try {
    // Verifica se l'aula esiste
    const checkQuery = db.prepare("SELECT * FROM classrooms WHERE id = ?");
    const existingClassroom = checkQuery.get(id);

    if (!existingClassroom) {
      res.status(404).json({
        success: false,
        message: "Aula non trovata",
      });
      return;
    }

    // Aggiorna i dati dell'aula
    const updateQuery = db.prepare(
      "UPDATE classrooms SET entrance = ?, position = ?, num = ?, max = ?, formal = ?, studentsNum = ?, avaible = ?, plex = ? WHERE id = ?",
    );
    updateQuery.run(
      entrance,
      position,
      num,
      max,
      formal,
      studentsNum,
      avaible,
      id,
      plex,
    );

    res.status(200).json({
      success: true,
      message: "Aula aggiornata con successo",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Errore durante l'aggiornamento: ${error.message}`,
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
    // Verifica se l'aula esiste
    const checkQuery = db.prepare("SELECT * FROM classrooms WHERE id = ?");
    const existingClassroom = checkQuery.get(id);

    if (!existingClassroom) {
      res.status(404).json({
        success: false,
        message: "Aula non trovata",
      });
      return;
    }

    // Rimuove l'aula dal database
    const deleteQuery = db.prepare("DELETE FROM classrooms WHERE id = ?");
    deleteQuery.run(id);

    res.status(200).json({
      success: true,
      message: "Aula rimossa con successo",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Errore durante la rimozione: ${error.message}`,
      error: error,
    });
  }
});

router.get("/", (req, res) => {
  try {
    const query = db.prepare("SELECT * FROM classrooms ORDER BY formal");
    const classesRaw = query.all();

    // Funzione per convertire 0/1 in booleano
    const fromSQLiteBool = (value) => value === 1 || value === "1";

    // Applica la conversione a ogni riga
    const classes = classesRaw.map((row) => ({
      ...row,
      num: String(row.num),
      avaible: fromSQLiteBool(row.avaible),
    }));

    res.status(200).json(classes);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Errore durante il recupero delle classi: ${error.message}`,
      error: error,
    });
  }
});

module.exports = router;
