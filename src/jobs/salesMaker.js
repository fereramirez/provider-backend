
const CronJob = require('cron').CronJob;
const Product = require('../models/product');
const Sales = require('../models/Sales');
const { random } = require('../utils/random');

const salesMaker = async () => {
    const discounts = [25, 30, 50, 35, 40];
    try {
        // quita las ofertas anteriores
        const sales = await Sales.findOne();
        await Product.updateMany({ _id: { $in: sales.products } },
            {
                '$set': {
                    'on_sale': false,
                    'discount': 0,
                    'free_shipping': false
                }
            }
        );

        const products = await Product.find();
        const available = products.filter(e => !e.on_sale && e.available_quantity > 0 && !e.premium && e.undeletable);

        const indx = random(available.length - 1, 5);

        let new_ids = [];
        let newList = [];
        // setea las ofertas
        for (let i = 0; i < 5; i++) {
            let aux = available;
            available.length < 5 && (aux = products)

            let current = aux[indx[i]];
            new_ids.push(current.id);
            newList.push(`${current.name}: ${discounts[i]}%`);

            (async () => await Product.findByIdAndUpdate(current.id, {
                '$set': {
                    'on_sale': true,
                    'discount': discounts[i],
                    'free_shipping': true,
                    'available_quantity': 50,
                }
            }))()
        };

        // guarda las id nuevas
        sales.products = new_ids;
        sales.last_update = Date.now()
        await sales.save();

        return sales;
    } catch (error) {
        return error
    }
}

const salesChecker = async () => {
    const sales = await Sales.findOne();

    let now = Date.now();
    let then = new Date(sales.last_update);

    if (!sales || sales.products.length < 1) {
        console.log('Sales not found, updating...');
        salesMaker();
        return;
    } else if (now - then > 86400000) {
        console.log('Sales update missed, updating...');
        salesMaker();
    }
}

const flashSales = new CronJob('0 0 0 * * *', function () {
    salesMaker();
    console.log('// New Flash Sales published.');
},
    null,
    false,
    'America/Sao_Paulo'
);

module.exports = {
    salesMaker,
    salesChecker,
    flashSales,
};