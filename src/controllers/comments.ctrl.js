const product = require("../models/product");
const commentsParser = require("../utils/commentsParser");

const getComments = async (req, res, next) => {
    try {
        return res.json('Currently, comments are only obtainable on /product/:id')
    } catch (error) {
        next(error)
    }
}

const postComment = async (req, res, next) => {
    try {
        const userId = req.user._id
        const { product_id, text, calification } = req.body;

        if (!userId) return res.json({ error: true, message: 'ID de usuario necesaria' });
        if (!text || !calification) return res.json({ error: true, message: 'Datos de comentario necesarios incompletos' });
        if (calification > 5 || calification < 1) return res.json({ error: true, message: 'Calificación incorrecta' });

        const targetProduct = await product.findById(product_id);

        if (!targetProduct) return res.json({ error: true, message: 'Producto no encontrado, ID incorrecta' });
        if (!targetProduct.buyers.includes(userId)) return res.json({ error: true, message: 'Usuario no autorizado' });


        if (targetProduct.comments.find(c => c.user_id === userId)) return res.json({ error: true, message: 'Este usuario ya comentó en esta publicación' });

        const newProd = await product.findByIdAndUpdate(product_id,
            {
                $push: {
                    comments: {
                        user_id: userId,
                        text,
                        calification,
                        date: new Date().toLocaleString('es-Ar', { timeZone: "America/Buenos_Aires" })
                    },
                },
            },
            { new: true }
        );

        const newComment = newProd.comments.find(c => c.user_id === userId.toString())
        console.log(newComment);
        const new_id = newComment?._id.toString();
        console.log(new_id);

        if (newProd) return res.json({ message: 'Comentario publicado', new_id })
        else return res.json({ error: true, message: 'Algo salió mal' })

    } catch (error) {
        console.log(error)
        next(error)
    }
}

const editComment = async (req, res, next) => {
    try {
        const userId = req.user._id
        const { product_id, text, calification } = req.body;

        if (!userId) return res.json({ error: true, message: 'ID de usuario necesaria' });

        const targetProduct = await product.findById(product_id);

        if (!targetProduct) return res.json({ error: true, message: 'Producto no encontrado, ID incorrecta' });
        if (!targetProduct.buyers.includes(userId)) return res.json({ error: true, message: 'Usuario no autorizado' });

        const updatedComment = await product.findOneAndUpdate(
            {
                '_id': product_id,
                "comments.user_id": userId,
            },
            {
                $set: {
                    "comments.$": {
                        user_id: userId,
                        text,
                        calification,
                        date: new Date().toLocaleString('es-Ar', { timeZone: "America/Buenos_Aires" })
                    },
                },
            },
            { new: true }
        );

        if (updatedComment) return res.json({ message: 'Comentario actualizado' })
        else return res.json({ error: true, message: 'Algo salió mal' })

    } catch (error) {
        console.log(error)
        next(error)
    }
}
const deleteComment = async (req, res, next) => {
    try {
        return res.json('Currently, comments are not removable.')
    } catch (error) {
        next(error)
    }
}

module.exports = {
    getComments,
    postComment,
    editComment,
    deleteComment
};