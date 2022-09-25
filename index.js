const app = require("./src/app.js");
const PORT = process.env.PORT || 4000;
const {
  salesChecker,
  flashSales,
  salesMaker,
} = require("./src/jobs/salesMaker");
const { deliveryGuy, deliveryUpdater } = require("./src/jobs/deliveryGuy");
const clientDb = require("./src/database/db");

const connectToDB = async () => {
  try {
    await clientDb();
    app.listen(PORT, () => {
      console.log(`Server escuchando on port ${PORT}.`);
    });
  } catch (error) {
    console.log(error);
    console.log(`Failed to connect`);
  }
};

connectToDB();

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
