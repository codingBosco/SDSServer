const express = require("express");
const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("db.sqlite");
const router = express.Router();

router.post("/inTranche=:tranche/append", (req, res) => {
  if (!req.body) {
    nullBodyError(res);
  }

  const { tranche } = req.params;
  const { id, date, packs } = req.body;

  try {
    // Verifica se la tranche esiste
    const checkQuery = db.prepare("SELECT * FROM tranches WHERE id = ?");
    const existingTranche = checkQuery.get(tranche);

    if (!existingTranche) {
      res.status(404).json({
        success: false,
        message: "Tranche non trovata",
      });
      return;
    }

    // Verifica se il giorno esiste già
    const checkDayQuery = db.prepare("SELECT * FROM days WHERE id = ?");
    const existingDay = checkDayQuery.get(id);

    if (existingDay) {
      res.status(409).json({
        success: false,
        message: "Un giorno con questo ID esiste già",
      });
      return;
    }

    // Inserisce il giorno
    const query = db.prepare(
      `INSERT INTO days (id, date, packs)
      VALUES (
      @id, @date, @packs
        )`,
    );
    query.run(id, date, packs);

    // Aggiorna l'array dei giorni nella tranche
    let days = JSON.parse(existingTranche.days || "[]");
    days.push(id);

    const updateQuery = db.prepare("UPDATE tranches SET days = ? WHERE id = ?");
    updateQuery.run(JSON.stringify(days), tranche);

    res.status(200).json({
      success: true,
      message: "Giorno inserito con successo",
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

  const { date, packs } = req.body;

  try {
    // Verifica se il giorno esiste
    const checkQuery = db.prepare("SELECT * FROM days WHERE id = ?");
    const existingDay = checkQuery.get(id);

    if (!existingDay) {
      res.status(404).json({
        success: false,
        message: "Giorno non trovato",
      });
      return;
    }

    // Aggiorna i dati del giorno
    const updateQuery = db.prepare(
      "UPDATE days SET date = ?, packs = ? WHERE id = ?",
    );
    updateQuery.run(date, packs, id);

    res.status(200).json({
      success: true,
      message: "Giorno aggiornato con successo",
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
    // Verifica se il giorno esiste
    const checkQuery = db.prepare("SELECT * FROM days WHERE id = ?");
    const existingDay = checkQuery.get(id);

    if (!existingDay) {
      res.status(404).json({
        success: false,
        message: "Giorno non trovato",
      });
      return;
    }

    // Rimuove il giorno dal database
    const deleteQuery = db.prepare("DELETE FROM days WHERE id = ?");
    deleteQuery.run(id);

    res.status(200).json({
      success: true,
      message: "Giorno rimosso con successo",
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
    const query = db.prepare("SELECT * FROM days ORDER BY date");
    const days = query.all();

    const parsedStruct = days.map((day) => {
      return {
        ...day,
        packs: day.packs ? JSON.parse(day.packs) : [],
      };
    });

    res.status(200).json(parsedStruct);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Errore durante il recupero dei giorni: ${error.message}`,
      error: error,
    });
  }
});

router.get("/inTranche=:tranche/", (req, res) => {
  const { tranche } = req.params;

  try {
    if (tranche === "") {
      nullBodyError();
      return;
    }

    const queriedTranche = db
      .prepare("SELECT * FROM tranches WHERE id = ?")
      .get(tranche);

    if (!queriedTranche) {
      res.status(404).json({
        success: false,
        message: "Tranche non trovata",
      });
      return;
    }

    if (queriedTranche.days === "") {
      res.status(404).json({
        success: false,
        message: "Nessun giorno trovato per questa tranche",
      });
    } else {
      const dayIds = JSON.parse(queriedTranche.days).map((id) => id.toString());
      const query = db.prepare(
        "SELECT * FROM days WHERE id IN (" +
          dayIds.map(() => "?").join(",") +
          ") ORDER BY date",
      );
      const days = query.all(...dayIds);

      res.status(200).json({
        success: true,
        data: days,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Errore durante il recupero dei giorni: ${error.message}`,
      error: error,
    });
  }
});

module.exports = router;
