require("dotenv").config();
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const express = require("express");
const cors = require("cors");
const path = require("path");
const allowCors = require("./allowCors");
const cookieParser = require("cookie-parser");
const router = require("./routes/index");
const { v4: uuidv4 } = require("uuid");

const mongoose = require("mongoose");
const { DB_URL, MONGODB_URI } = process.env;

//const csrf = require("csurf");

// const clientDb = require("./database/db");

// ---------------- Config
// let whitelist = [
//     "http://localhost:3000",
//     "https://providerstore.vercel.app",
//     "*",
// ];
// let corsOptions = {
//     origin: function (origin, callback) {
//         if (whitelist.indexOf(origin) !== -1 || !origin) {
//             callback(null, true);
//         } else {
//             callback(new Error("Not allowed by CORS"));
//         }
//     },
//     credentials: true,
// };

const app = express();

// ---------------- MIDDLEWARES
const options = {
    useUnifiedTopology: true,
    useNewUrlParser: true,
};

let mongoClient = null;

const mongoConn = async (req, res, next) => {
    try {
        if (mongoClient) {
            console.log('ya esta conectado');
            return mongoClient;
        }
        setTimeout(() => {
            return mongoose.connect(
                DB_URL,
                {
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                },
                (err) => {
                    if (err) console.log(err);
                    else {
                        mongoClient = true;
                        console.log("MongDB is connected")
                    };
                }
            );
        }, 5000);

    } catch (error) {
        console.log(error)
    } finally {
        next()
    }
};

app.use(cors());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
//app.use(express.static("public"));
//app.use(csrf());
app.use(morgan("dev"));

app.use(cookieParser());

app.use('/', mongoConn);

app.use(mongoSanitize());

app.use("/", router);
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
