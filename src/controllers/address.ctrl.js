const Address = require("../models/Address");
const User = require("../models/user");

const getAddress = async (req, res, next) => {
    const { _id } = req.user;

    try {
        const address = await Address.findOne({
            user: _id,
        });

        if (!address) return res.json("Address not found");
        return res.json(address);
    } catch (error) {
        next(error);
    }
};

const addAddress = async (req, res, next) => {
    const { _id } = req.user;

    try {
        const addressFound = await Address.findOne({
            user: _id,
        });

        if (addressFound) {
            if (addressFound.address.length > 0) {
                addressFound.address.push({ ...req.body, isDefault: false });
            } else {
                addressFound.address.push({ ...req.body, isDefault: true });
            }
            await addressFound.save();

            return res.json({
                message: "New address registered.",
                address: addressFound.address,
            });
        } else {
            const userFound = await User.findById(_id);
            const newAddress = new Address({
                address: [{ ...req.body, isDefault: true }],
                user: _id,
            });

            userFound.addresses = newAddress._id;
            await userFound.save();
            await newAddress.save();
            return res.json({
                message: "New address registered.",
                address: newAddress.address,
                //! VOLVER A VER al crear la primer address se renderiza undefined undefined undefined undefined
            });
        }
    } catch (error) {
        next(error);
    }
};

const updateAddress = async (req, res, next) => {
    try {
        const addressUpdated = await Address.findOneAndUpdate(
            {
                'user': req.user._id,
                "address._id": req.params.id,
            },
            {
                $set: {
                    "address.$": req.body,
                },
            },
            { new: true }
        );

        return res.json({
            message: "Address updated",
            address: addressUpdated.address,
        });
    } catch (error) {
        next(error);
    }
};

const removeAddress = async (req, res, next) => {
    try {
        const { _id } = req.user;

        const list = await Address.findOneAndUpdate(
            {
                user: _id,
            },
            {
                $pull: {
                    address: { _id: req.params.id },
                },
            },
            { new: true }
        );

        if (!list.address.some(e => e.isDefault) && list.address.length > 0) {

            list.address[0].isDefault = true;
            await list.save();

            return res.json({ message: "Address removed, new default setted.", address: list.address });
        }

        return res.json({ message: "Address removed.", address: list.address });
    } catch (error) {
        next(error);
    }
};

const setDefault = async (req, res, next) => {
    const { _id } = req.user;

    try {
        await Address.findOneAndUpdate(
            {
                'user': _id,
                "address.isDefault": true,
            },
            {
                $set: {
                    "address.$.isDefault": false,
                },
            }
        );
        //! VOLVER A VER ¿por qué se hacen dos findOneAndUpdate?
        const { address } = await Address.findOneAndUpdate(
            {
                'user': _id,
                "address._id": req.params.id,
            },
            {
                $set: {
                    "address.$.isDefault": true,
                },
            },
            { new: true }
        );

        res.json({ message: "Address selected.", address });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAddress,
    addAddress,
    updateAddress,
    removeAddress,
    setDefault,
};
