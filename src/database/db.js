require("dotenv").config();
const mongoose = require("mongoose");
const { DB_URL, MONGODB_URI } = process.env;

const clientDb = () => {
    return mongoose.connect(
        DB_URL,
        {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        },
        (err) => {
            if (err) console.log(err);
            else console.log("mongdb is connected");
        }
    );
};

module.exports = clientDb;
