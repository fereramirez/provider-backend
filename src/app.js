require("dotenv").config();
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const router = require("./routes/index");
const { v4: uuidv4 } = require("uuid");
//const csrf = require("csurf");

const clientDb = require("./database/db");

const app = express();

// ---------------- Config
let whitelist = ["http://localhost:3000", "otro dominio"];
let corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

// ---------------- MIDDLEWARES
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
//app.use(csrf());
app.use(morgan("dev"));

app.use(cookieParser());

app.use(mongoSanitize());
app.use("/", cors(corsOptions), router);
require("./config/auth");

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || err;

  return res.status(status).send(message);
});

app.get("/", (req, res) => {
  res.send('"hola." -Facu-sama');
});

module.exports = app;
