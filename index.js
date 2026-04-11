const express = require("express");
const cors = require('cors')
const path = require("path");
require("dotenv").config();

const connectMongoDB = require('./services/mongo')

// Import routes
const lineRoutes = require("./routes/lineRoutes");
const dataRoutes = require('./routes/dataRoutes')
const brandRoutes = require('./routes/brandRoutes')

const app = express();
const PORT = 3000;


const allowedOrigins = [
  'http://localhost:3000',
  'https://microservice-line-checker.vercel.app'
]

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}))

app.use(express.json());
app.use(express.static(path.join(__dirname, "app")));

app.use("/api/checker", lineRoutes);
app.use('/api/data', dataRoutes)
app.use('/api/brand', brandRoutes)

connectMongoDB()

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});