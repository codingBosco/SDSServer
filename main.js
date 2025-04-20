const path = require("path");
const os = require("os");
const process = require("process");
const timer = require("node-cron");
const si = require("systeminformation");
const disk = require("check-disk-space");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");
const { log, error } = require("console");
const { json } = require("stream/consumers");

const express = require("express");
const http = require("http");
const WebSocket = require("ws");

//**Only availale in DEBUG mode.
const port = 3000;
const app = express();

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("Client Connected");

  ws.on("message", (mess) => {
    console.log("Received: ", mess);
    ws.send("Echo: to messae");
  });

  ws.on("close", (closed) => {
    console.log("Client Disconnected");
  });
});

wss.on("error", (err) => {
  console.error("WEBSocket error: ", err);
});

wss.addListener("close", (disconnection) => {
  console.log("Client Disconnected", disconnection.reason);
});

server.listen(port, () => {
  console.log("Server + WebSocket listening on port: ${port}");
});

app.use(
  express.json({
    limit: "20mb",
  }),
);

const router = express.Router();

router.use((req, res, next) => {
  next();
});

app.use(router);

//----------- GENERAL FUNCTIONS ------------

const db = new DatabaseSync("db.sql");

db.exec(
  "CREATE TABLE IF NOT EXISTS tranches (id STRING PRIMARY KEY, formal STRING, date DATETIME, days TEXT)",
);
db.exec(
  "CREATE TABLE IF NOT EXISTS days (id STRING PRIMARY KEY, date DATETIME, packs TEXT)",
);

db.exec(
  "CREATE TABLE IF NOT EXISTS students (id STRING PRIMARY KEY, name STRING, surname STRING, classroom STRING, attendedPacks TEXT, isGuardian TEXT, isIgnored TEXT, isModerator TEXT)",
);
db.exec(
  "CREATE TABLE IF NOT EXISTS classrooms (id STRING PRIMARY KEY, entrance STRING, position STRING, num STRING, name STRING, max SMALLINT, formal STRING, studentsNum SMALLINT, avaible BOOLEAN, plex STRING)",
);
db.exec(
  "CREATE TABLE IF NOT EXISTS packs (id STRING PRIMARY KEY, formal STRING, classroom STRING, conferences TEXT, arguments TEXT, day STRING)",
);

const tranchesDelegate = db.prepare(
  `INSERT INTO tranches (id, formal, date, days)
  VALUES (
  @id, @formal, @date, @days
  )`,
);

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

async function createFolder(basePath, folderName) {
  try {
    const fullPath = path.join(basePath, folderName);

    // Verifica se la cartella esiste già
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      return {
        success: true,
        message: `Cartella "${folderName}" creata con successo`,
        path: fullPath,
      };
    } else {
      return {
        success: false,
        message: `La cartella "${folderName}" esiste già`,
        path: fullPath,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Errore durante la creazione della cartella: ${error.message}`,
      error: error,
    };
  }
}

function nullBodyError(res) {
  res.status(400).json({
    success: false,
    message: "Nessun dato ricevuto nel body della richiesta",
  });
  return;
}

//----------- DATAS APIs ------------

//Tranches APIs Group
const tranchesRoute = require("./routes/tranches");
app.use("/data/tranches", tranchesRoute);

//Students APIs Group
const studentsRoute = require("./routes/students");
app.use("/data/students", studentsRoute);

//Classrooms APIs Group
const classroomsRoute = require("./routes/classrooms");
app.use("/data/classrooms", classroomsRoute);

//Packs APIs Group
const packsRoute = require("./routes/packs");
app.use("/data/packs", packsRoute);

//Days APIs Group
const daysRoute = require("./routes/days");
app.use("/data/days", daysRoute);

//Conferences APIs Groupt
// const confsRoute = require("./routes/conferences");
// app.use("/data/conferences", confsRoute);

//Queries

const { parse } = require("path/win32");

app.get("/data/query/:id", (req, res) => {
  const { itemID } = req.params;

  if (!req.body) {
    nullBodyError(res);
  }

  switch (itemID.substring(0, 1)) {
    case "t":
      try {
        const query = db.prepare("SELECT * FROM tranches WHERE id = ?");
        const tranche = query.get(itemID.substring(1));

        if (!tranche) {
          res.status(404).json({
            success: false,
            message: "Tranche non trovata",
          });
          return;
        }

        res.status(200).json({
          success: true,
          data: tranche,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: `Errore durante la ricerca: ${error.message}`,
          error: error,
        });
      }
      break;

    default:
      res.status(400).json({
        success: false,
        message: "Tipo di query non valido",
      });
  }
});

//----------- GENERAL API SECTION ------------

app.get("/api/availability", (req, res) => {
  res.json({
    result: "success",
    message: "Server fully avaible",
  });
});

app.use(express.static("public"));

app.get("/app/profile", async (req, res) => {});

app.get("/api/diagnostics/files", (req, res) => {
  const diagnosticFolder = path.join(__dirname, "diagnostics");
  fs.readdir(diagnosticFolder, (err, items) => {
    if (err) {
      console.error("Errore nella lettura della cartella", err);
      return res.status(500).json({
        status: "error",
        error: err,
      });
    }

    const files = items.filter((item) => {
      const itemPath = path.join(diagnosticFolder, item);
      return fs.statSync(itemPath).isFile();
    });

    res.json(files);
  });
});

const diagnosticFolder = path.join(__dirname, "diagnostics");

app.get("/api/diagnostics/files/remove/:fileID", (req, res) => {
  const fileID = req.params.fileID;

  if (!fileID) {
    return res.status(400).json({
      error: "Il nome del file è incorretto",
    });
  }

  const filePath = path.join(diagnosticFolder, fileID);
  fs.unlink(filePath, (err) => {
    if (err) {
      if (err.code === "ENOENT") {
        return res.status(404).json({
          error: "File non trovato" + err,
        });
      }

      return res.status(500).json({
        error: "Errore nell'eliminazione",
      });
    }

    res.status(200).json({
      result: "File eliminato",
    });
  });
});

app.get("/api/diagnostics/files/removeAll", (req, res) => {
  // const folderPath = req.body.folderPath;

  // if (!folderPath) {
  //   return res
  //     .status(400)
  //     .json({ error: "Il percorso della cartella è richiesto" });
  // }

  const directoryPath = diagnosticFolder;

  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Errore nel leggere la cartella" });
    }

    if (files.length === 0) {
      return res
        .status(404)
        .json({ message: "La cartella è vuota o non esiste" });
    }

    files.forEach((file) => {
      const filePath = path.join(directoryPath, file);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`Errore nell\'eliminazione del file ${file}: ${err}`);
        } else {
          console.log(`File ${file} eliminato`);
        }
      });
    });

    res.status(200).json({
      result: `I file sono stati eliminati`,
    });
  });
});

app.get("/api/diagnostics/files/:fileID", (req, res) => {
  const fileID = req.params.fileID;

  const filePath = path.join(diagnosticFolder, fileID);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: "File non trovato",
    });
  }

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Errore nella lettura", err);
      return res.status(500).json({
        error: "Errore nella lettura del file",
        extensive: err,
      });
    }

    try {
      const parsed = JSON.parse(data);
      res.json(parsed);
    } catch (parsedError) {
      res.status(400).json({
        error: "non decodificabile",
        type: parsedError,
      });
    }
  });
});

app.get("/api/diagnostics/generate", async (req, res) => {
  try {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    const cpus = os.cpus();
    const loadAvg = os.loadavg()[0];

    const availableCPUAmount = cpus.length;
    const cpuIsOnOverload = loadAvg > availableCPUAmount;

    let osType = os.type();
    if (osType.includes("Windows")) {
      osType = "windows";
    } else if (osType.includes("Darwin")) {
      osType = "macos";
    } else {
      osType = "linux";
    }

    const networkStats = await si.networkStats();
    const connection =
      networkStats[0].operstate === "up" ? "stabile" : "instabile";

    const diskInfo = disk.default;

    let freeDisk = "";
    let sizeDisk = "";

    if (osType.includes("Windows")) {
      diskInfo("C:/").then((diskSpace) => {
        freeDisk = formatBytes(diskSpace.free.toString());
        sizeDisk = formatBytes(diskSpace.size.toString());
      });
    } else {
      diskInfo("/").then((diskSpace) => {
        freeDisk = formatBytes(diskSpace.free);
        sizeDisk = formatBytes(diskSpace.size);
      });
    }

    const serverFolderPath = path.resolve(__dirname);
    let serverFolderSize = 0;

    const getDirectorySize = (dirPath) => {
      const files = fs.readdirSync(dirPath);
      files.forEach((file) => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          serverFolderSize += getDirectorySize(filePath);
        } else {
          serverFolderSize += stats.size;
        }
      });
      return serverFolderSize;
    };

    let serverSize = formatBytes(getDirectorySize(serverFolderPath));

    const totalRam = os.totalmem();
    const freeRam = os.freemem();
    const usedRam = totalRam - freeRam;

    const report = {
      serverStatus: "active",
      firstActivationTimestamp: firstActivationTimestamp,

      joinedUsersSinceAct: joinedUsersSinceAct,
      activeUsers: activeUsers,

      os: osType,

      serverCPU: cpus[0].model,
      availableCPUAmount: availableCPUAmount,
      cpuIsOnOverload: cpuIsOnOverload,
      totalRamAmount: Math.round(totalRam / (1024 * 1024 * 1024)) + " GB",
      usedRamAmount: Math.round(usedRam / (1024 * 1024 * 1024)) + " GB",
      availableRamAmount: Math.round(freeRam / (1024 * 1024 * 1024)) + " GB",

      totalDisk: sizeDisk + " GB",
      memoryTakenByServer: serverSize + " GB",

      connectionStatus: connection,
      telegramServiceStatus: "OK",
      webServiceStatus: "OK",
      databaseHealthCheckCycleStatus: "OK",
      panicsReporterStatus: "OK",
    };

    res.json(report);
    saveFile(report);
  } catch (error) {
    res.status(500).json({
      error: "Errore nel recupero delle informazioni del sistema" + error,
    });
  }
});

let firstActivationTimestamp = new Date().toISOString();
let joinedUsersSinceAct = 0;
let activeUsers = 0;

function saveFile(data) {
  const now = new Date();
  const filename = `${now.toISOString().replace(/:/g, "-").replace(/\..+/, "")}.json`;
  const dirPath = path.join(__dirname, "diagnostics");

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }
  const filePath = path.join(dirPath, filename);
  fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
    if (err) {
      console.error("Errore nel salvataggio", err);
    } else {
      console.log("Saved Diagnostic File.");
    }
  });
}
