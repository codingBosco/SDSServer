const express = require("express");
const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("db.sqlite");
const tranchesDelegate = db.prepare(
  "INSERT INTO tranches (id, formal, date, days) VALUES (?,?,?,?)",
);
function nullBodyError(res) {
  res.status(400).json({
    success: false,
    message: "Nessun dato ricevuto nel body della richiesta",
  });
  return;
}

const router = express.Router();

router.post("/data/tranches/append", (req, res) => {
  if (!req.body) {
    nullBodyError(res);
  }

  const { id, formal, date, days } = req.body;

  try {
    tranchesDelegate.run(id, formal, date, days);
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

router.post("/data/tranches/update/:id", (req, res) => {
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

router.post("/data/tranches/remove/:id", (req, res) => {
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

router.get("/data/tranches", (req, res) => {
  try {
    const query = db.prepare("SELECT * FROM tranches ORDER BY id");
    const tranches = query.all();
    res.status(200).json(tranches);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Errore durante il recupero delle tranches: ${error.message}`,
      error: error,
    });
  }
});

module.exports = router;
