const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

app.use(express.json());
app.use(express.static(ROOT));

function readJson(filename) {
  const filePath = path.join(ROOT, filename);
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

app.get("/api/events", (req, res) => {
  res.json(readJson("events.json"));
});

app.get("/api/live-score", (req, res) => {
  res.json(readJson("live-score.json"));
});

app.get("/api/results", (req, res) => {
  res.json(readJson("results.json"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

app.listen(PORT, () => {
  console.log(`DSSPL server running at http://localhost:${PORT}`);
});
