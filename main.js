const express = require('express');

const port = 3000;
const app = express();

// Middleware per il parsing del JSON
app.use(express.json());

// API di esempio
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Ciao, mondo!' });
});

app.listen(port, () => {
  console.log(`Server in esecuzione su http://localhost:${port}`);
});
