const Wishlist = require("../models/wishlist");
const { rawIdProductGetter } = require("../utils/rawIdProductGetter");

const getUserList = async (req, res, next) => {
    const { _id } = req.user;
    if (!_id) return res.json('fuerita de aca')

    try {
        let message = false;
        const wishlist = await Wishlist.findOne({ user: _id });

        if (!wishlist) {
            const newList = await Wishlist.create({
                products: [],
                user: _id,
            });
            return res.json({
                products: newList.products,
                id_list: newList.products,
            });
        }

        let promises = [];
        wishlist.products.map((e) => promises.push(rawIdProductGetter(e)));
        const rawProds = await Promise.allSettled(promises);

        let response = [];
        let new_id_list = [];
        rawProds.forEach((e) => {
            if (e.value._id) {
                response.push(e.value);
                new_id_list.push(e.value._id.toString());
            }
        });

        if (wishlist.products.length !== new_id_list.length) {
            wishlist.products = new_id_list;
            wishlist.save();
            message = "Algunos de tus favoritos ya no están disponibles";
        }

        return res.json({ products: response, id_list: new_id_list, message });
    } catch (error) {
        next(error);
    }
};

const addToList = async (req, res, next) => {
    try {
        if (!req.params.id) {
            throw new Error("no id");
        }
        const list = await Wishlist.findOne({ user: req.user._id });

        if (list) {
            let aux = list.products.includes(req.params.id);
            if (!aux) {
                list.products.push(req.params.id);
                await list.save();
                return res.json({ message: "Producto agregado a Favoritos", list });
            }
            return res.json({ message: "El producto ya se encuentra en Favoritos" });
        } else {
            const newList = new Wishlist({
                products: [req.params.id],
                user: req.user._id,
            });
            await newList.save();
            return res.send("ok");
        }
    } catch (error) {
        next(error);
    }
};

const removeFromList = async (req, res, next) => {
    try {
        const target = req.params.id;
        const list = await Wishlist.findOneAndUpdate(
            {
                user: req.user._id,
            },
            {
                $pull: {
                    products: target,
                },
            },
            { new: true }
        );
        return res.json({ message: "Producto removido de Favoritos", list });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getUserList,
    addToList,
    removeFromList,
};
