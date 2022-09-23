const CronJob = require('cron').CronJob;
const product = require('../models/product')

const restorer = async () => {

    // let ogProducts = [];
    // for (const prod of ogProducts) {
    //     await product.findOneAndUpdate({ id: prod._id }, prod, { new: true }, async (error, result) => {
    //         if (!error) {
    //             // If the document doesn't exist
    //             if (!result) {
    //                 // Create it
    //                 result = await new product(prod);
    //             }
    //             // Save the document
    //             await result.save(function (error) {
    //                 if (error) {
    //                     throw error;
    //                 }
    //             });
    //         }
    //     });
    // };

    return '// Products restored';
};

const productsRestorer = new CronJob('0 55 23 * * *', async function () {
    console.log(`// Restoring products...`);
    let log = await restorer();
    console.log(log);
},
    null,
    false,
    'America/Sao_Paulo'
);

module.exports = {
    restorer,
    productsRestorer
}