const CronJob = require('cron').CronJob;
const Notifications = require('../models/Notifications');
const order = require('../models/order');

const deliveryGuy = async () => {
    const orders = await order.find({ delivery_status: 'shipping' });
    let deliveries = 0;

    for (const o of orders) {
        if ((Date.now()) - new Date(o.delivery_date) >= 0) {
            deliveries += 1;

            const newOrder = await order.findByIdAndUpdate(o._id,
                {
                    '$set': {
                        delivery_status: 'dispatched'
                    }
                },
                { new: true }
            );

            const notif = await Notifications.findOne({ user_id: newOrder.user });
            if (notif) {
                notif.notif_list.push({
                    notif_type: 'success',
                    title: '¡Tu pedido fue entregado!',
                    description: `Tu orden del ${new Date(newOrder.created_at).toLocaleString("es-Ar", { timeZone: "America/Buenos_Aires" }).split(', ')[0]} ha sido entregada. ¡Esperamos que disfrutes de ${newOrder.products.length > 1 ? 'tus nuevos productos!' : 'tu nuevo producto!'} No olvides que ahora puedes crear una reseña ${newOrder.products.length > 1 ? 'de los productos.' : 'del producto.'}`,
                    link: newOrder.products.length > 1 ? false : `/details/${newOrder.products[0].product_id}`,
                    date: new Date().toLocaleString("es-Ar", { timeZone: "America/Buenos_Aires" }),
                    seen: false
                })
                await notif.save();
            }
        };
    };
    return `// ${deliveries || 'No'} packages delivered.`;
};

const deliveryUpdater = new CronJob('0 1 15 * * *', async function () {
    console.log(`// Sending the delivery guy...`);
    let log = await deliveryGuy();
    console.log(log);
},
    null,
    false,
    'America/Sao_Paulo'
);

module.exports = {
    deliveryGuy,
    deliveryUpdater
}