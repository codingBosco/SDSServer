const express = require("express");
const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("db.sqlite");

function nullBodyError(res) {
  res.status(400).json({
    success: false,
    message: "Nessun dato ricevuto nel body della richiesta",
  });
  return;
}

const router = express.Router();

router.post("/append", (req, res) => {
  if (!req.body) {
    nullBodyError(res);
  }

  const { id, formal, date, days } = req.body;

  try {
    const trancheStructure = db.prepare(`
      INSERT INTO tranches (id, formal, date, days)
      VALUES (
      @id, @formal, @date, @days
      )
      `);

    const result = trancheStructure.run({
      id,
      formal,
      date,
      days: JSON.stringify(days),
    });

    res.status(200).json({
      success: true,
      message: "Dati inseriti con successo",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Errore durante l'inserimento: ${error.message}`,
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

  const { formal, date, days } = req.body;

  try {
    // Verifica se la tranche esiste
    const checkQuery = db.prepare("SELECT * FROM tranches WHERE id = ?");
    const existingTranche = checkQuery.get(id);

    if (!existingTranche) {
      res.status(404).json({
        success: false,
        message: "Tranche non trovata",
      });
      return;
    }

    // Aggiorna i dati della tranche
    const updateQuery = db.prepare(
      "UPDATE tranches SET formal = ?, date = ?, days = ? WHERE id = ?",
    );
    updateQuery.run(formal, date, days, id);

    res.status(200).json({
      success: true,
      message: "Tranche aggiornata con successo",
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
    // Verifica se la tranche esiste
    const checkQuery = db.prepare("SELECT * FROM tranches WHERE id = ?");
    const existingTranche = checkQuery.get(id);

    if (!existingTranche) {
      res.status(404).json({
        success: false,
        message: "Tranche non trovata",
      });
      return;
    }

    // Rimuove la tranche dal database
    const deleteQuery = db.prepare("DELETE FROM tranches WHERE id = ?");
    deleteQuery.run(id);

    res.status(200).json({
      success: true,
      message: "Tranche rimossa con successo",
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
    const query = db.prepare("SELECT * FROM tranches ORDER BY id");
    const tranches = query.all();

    const parsedTranche = tranches.map((tranche) => {
      return {
        ...tranche,
        days: tranche.days ? JSON.parse(tranche.days) : [],
      };
    });
    res.status(200).json(parsedTranche);
    console.log("tranche sended!");
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Errore durante il recupero delle tranches: ${error.message}`,
      error: error,
    });
    console.log("tranche no!");
  }
});

module.exports = router;
