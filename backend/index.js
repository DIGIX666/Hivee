// index.js
const express = require("express");
const app = express();

const PORT = 3000;

// middleware
app.use(express.json());

// routes
app.get("/", (req, res) => {
  res.send("Hello Express");
});

// start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
