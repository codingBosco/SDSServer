const express = require("express");
const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("db.sqlite");
const router = express.Router();

router.get("/", (req, res) => {
  try {
    const query = db.prepare("SELECT * FROM packs ORDER BY day, classroom");
    const packs = query.all();

    const parsedPacks = packs.map((pack) => {
      return {
        ...pack,
        conferences: pack.conferences ? JSON.parse(pack.conferences) : [],
        arguments: pack.arguments ? JSON.parse(pack.arguments) : [],
      };
    });

    res.status(200).json(parsedPacks);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Errore durante il recupero dei pacchetti: ${error.message}`,
      error: error,
    });
  }
});

router.post("/append", (req, res) => {
  if (!req.body) {
    nullBodyError(res);
  }

  const { id, formal, classroom, conferences, day } = req.body;

  try {
    const query = db.prepare(
      `INSERT INTO packs (id, formal, classroom, conferences, day) VALUES (
      @id,
      @formal,
      @classroom,
      @conferences,
      @day
    )`,
    );

    query.run(id, formal, classroom, conferences, day);
    res.status(200).json({
      success: true,
      message: "Pacchetto inserito con successo",
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

  const { formal, classroom, conferences, day } = req.body;

  try {
    // Verifica se il pacchetto esiste
    const checkQuery = db.prepare("SELECT * FROM packs WHERE id = ?");
    const existingPack = checkQuery.get(id);

    if (!existingPack) {
      res.status(404).json({
        success: false,
        message: "Pacchetto non trovato",
      });
      return;
    }

    // Aggiorna i dati del pacchetto
    const updateQuery = db.prepare(
      "UPDATE packs SET formal = ?, classroom = ?, conferences = ?, day = ? WHERE id = ?",
    );
    updateQuery.run(formal, classroom, conferences, day, id);

    res.status(200).json({
      success: true,
      message: "Pacchetto aggiornato con successo",
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
    // Verifica se il pacchetto esiste
    const checkQuery = db.prepare("SELECT * FROM packs WHERE id = ?");
    const existingPack = checkQuery.get(id);

    if (!existingPack) {
      res.status(404).json({
        success: false,
        message: "Pacchetto non trovato",
      });
      return;
    }

    // Rimuove il pacchetto dal database
    const deleteQuery = db.prepare("DELETE FROM packs WHERE id = ?");
    deleteQuery.run(id);

    res.status(200).json({
      success: true,
      message: "Pacchetto rimosso con successo",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Errore durante la rimozione: ${error.message}`,
      error: error,
    });
  }
});

module.exports = router;
