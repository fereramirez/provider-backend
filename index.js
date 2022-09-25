require("dotenv").config();
const mongoose = require("mongoose");
const { DB_URL, MONGODB_URI } = process.env;
const app = require("./src/app.js");
const PORT = process.env.PORT || 4000;
const {
    salesChecker,
    flashSales,
    salesMaker,
} = require("./src/jobs/salesMaker");
const { deliveryGuy, deliveryUpdater } = require("./src/jobs/deliveryGuy");

const START = () => {
    try {
        //? primero intenta conectar Mongo
        mongoose.connect(
            DB_URL,
            {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            },
            (err) => {
                if (err) console.log(err);
                else console.log("MongDB is connected.");

                //? después levanta Express
                app.listen(PORT, () => {
                    console.log(`Server listening on port ${PORT}.`);
                });
            }
        );
    } catch (error) {
        console.log(error);
        console.log(`Failed to connect`);
    }
};

START();

//: ---------------- START JOB
flashSales.start();
console.log(
    flashSales.running
        ? "# Cron Job (flashSales): Running."
        : "# Cron Job (flashSales): Not executed."
);
salesChecker();
// salesMaker();

deliveryUpdater.start();
console.log(
    deliveryUpdater.running
        ? "# Cron Job (deliveryUpdater): Running."
        : "# Cron Job (flashSales): Not executed."
);
deliveryGuy();
