const express = require("express");
const path = require("path");
require("dotenv").config();

// Import routes
const lineRoutes = require("./routes/lineRoutes");
const dataRoutes = require('./routes/dataRoutes')

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "app")));

app.use("/api/checker", lineRoutes);
app.use('/api/data', dataRoutes)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});