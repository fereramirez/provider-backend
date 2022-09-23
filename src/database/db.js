require("dotenv").config();
const mongoose = require("mongoose");
const { DB_URL, MONGODB_URI } = process.env;

const clientDb = mongoose.connect(
    DB_URL,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    },
    () => {
        console.log("Mongoose connected");
    }
);

module.exports = clientDb;
