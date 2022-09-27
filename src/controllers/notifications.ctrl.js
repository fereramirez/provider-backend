const Notifications = require("../models/Notifications");

const getUserNotifications = async (req, res, next) => {
    try {
        const firstNotif = {
            notif_type: 'success',
            title: '¡Provider te da la bienvenida!',
            description: 'Gracias por crear una cuenta en nuestra tienda. Esperamos que disfrutes de lo que tenemos para ofrecerte. No olvides pasar por la sección de preguntas frecuentes para quitarte cualquier duda que puedas tener.',
            link: '/faqs',
            date: new Date().toLocaleString('es-Ar', { timeZone: "America/Buenos_Aires" }),
            seen: false
        };
        const userId = req.user._id;

        if (!userId) return res.json({ error: true, message: 'ID de usuario no necesaria' });

        const userNotifs = await Notifications.findOne({ user_id: userId })

        if (!userNotifs) {
            const newNotif = await Notifications.create({
                user_id: userId,
                notif_list: []
            })

            const response = await Notifications.findByIdAndUpdate(newNotif.id,
                {
                    $push: {
                        notif_list: firstNotif
                    }
                },
                { new: true }
            )

            return res.json(response.notif_list);
        } else {
            return res.json(userNotifs.notif_list)
        }

    } catch (error) {
        console.log(error)
        next(error)
    }
}

const deleteNotification = async (req, res, next) => {
    try {
        const target = req.params.id;
        const userId = req.user._id;

        if (!userId) return res.json({ error: true, message: 'ID de usuario necesaria' });
        if (!target) return res.json({ error: true, message: 'ID de notificación necesaria' });

        const updatedNotfis = await Notifications.findOneAndUpdate(
            {
                'user_id': userId
            },
            {
                '$pull': {
                    'notif_list': {
                        '_id': target
                    }
                }
            },
            { new: true }
        );

        if (updatedNotfis) return res.json({ message: 'Notificación eliminada', notif_list: updatedNotfis.notif_list })
        else return res.json({ error: true, message: 'Algo salió mal' })

    } catch (error) {
        console.log(error)
        next(error)
    }
}

const markAsSeen = async (req, res, next) => {
    try {
        const target = req.params.id;
        const userId = req.user._id;

        if (!userId) return res.json({ error: true, message: 'ID de usuario necesaria' });
        if (!target) return res.json({ error: true, message: 'ID de notificación necesaria' });

        const { notif_list } = await Notifications.findOneAndUpdate(
            {
                'user_id': userId,
                'notif_list._id': target
            },
            {
                $set: {
                    "notif_list.$.seen": true
                }
            },
            { new: true }
        );

        return res.json({ message: 'Notificación marcada como vista', notif_list });

    } catch (error) {
        console.log(error)
        next(error)
    }
}

const post = async (req, res, next) => {
    try {
        const { userId } = req.body
        const {
            notif_type,
            title,
            description,
            link
        } = req.body

        const notif = await Notifications.findOne({ user_id: userId });
        if (notif) {
            notif.notif_list.push({
                notif_type,
                title,
                description,
                link: link || false,
                date: '1/1/1111, 11:11:11',
                seen: false
            })
            await notif.save();
        } else {
            res.json('error');
        }

        res.json('done');

    } catch (error) {
        console.log(error);
        next(error)
    }
}

module.exports = {
    getUserNotifications,
    deleteNotification,
    markAsSeen,
    post
}