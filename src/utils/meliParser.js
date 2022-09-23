const { default: axios } = require("axios");

const disc = (original, price) => {
    return (100 - Math.round((price / original) * 100))
}
const discPrice = (original, price) => {
    let discount = (100 - Math.round((price / original) * 100));
    return Math.round(original * (1 - (discount / 100)))
}
const imagesParser = (pic) => {
    let aux = pic.map(e => ({
        imgURL: e.url,
        public_id: e.id
    }));
    return aux;
}
const thumbnailParser = async (id) => {
    const { data } = await axios(`https://api.mercadolibre.com/items/${id}`)
    return `https://http2.mlstatic.com/D_NQ_NP_${data.thumbnail_id}-V.jpg`
}

const categoryMaker = async (cid) => {
    const { data } = await axios(`https://api.mercadolibre.com/categories/${cid}`);
    const { id, name, path_from_root } = data;
    return ({ category: { id, name }, path_from_root });
}

const meliSearchParser = (results) => {
    let aux = results.map(e => ({
        _id: e.catalog_product_id || 'I' + e.id,
        name: e.title,
        thumbnail: `https://http2.mlstatic.com/D_NQ_NP_${e.thumbnail_id}-V.jpg`,
        price: e.original_price ? e.original_price : e.price,
        on_sale: e.original_price ? true : false,
        discount: e.original_price ? disc(e.original_price, e.price) : 0,
        sale_price: e.original_price ? discPrice(e.original_price, e.price) : 0,
        free_shipping: e.shipping.free_shipping,
        brand: e.attributes.find(e => e.id === 'BRAND')?.value_name || '',
        available_quantity: e.available_quantity,
    }))

    return aux;
};

const meliProductParser = async (p) => {
    //?PRODUCT
    if (p.status === 'inactive') return { error: true, message: 'PRODUCTO NO DISPONIBLE' };
    const { category, path_from_root } = await categoryMaker(p.buy_box_winner.category_id);
    let aux = {
        _id: p.id,
        name: p.name,
        images: imagesParser(p.pictures),
        thumbnail: await thumbnailParser(p.buy_box_winner.item_id),
        attributes: p.attributes.map(a => ({
            name: a.name,
            value_name: a.value_name
        })),
        main_features: p.main_features?.map(e => e.text),
        brand: p.attributes.find(e => e.id === 'BRAND')?.value_name || '',
        category,
        path_from_root,
        description: p.short_description?.content,
        price: p.buy_box_winner.original_price ? p.buy_box_winner.original_price : p.buy_box_winner.price,
        sale_price: p.buy_box_winner.original_price ? p.buy_box_winner.price : 0,
        on_sale: p.buy_box_winner.original_price ? true : false,
        discount: p.buy_box_winner.original_price ? disc(p.buy_box_winner.original_price, p.buy_box_winner.price) : 0,
        free_shipping: p.buy_box_winner.shipping.free_shipping,
        available_quantity: p.buy_box_winner.available_quantity,
    }
    return aux;
}

const meliItemParser = async (p) => {
    //:ITEM
    const { category, path_from_root } = await categoryMaker(p.category_id);
    let aux = {
        _id: 'I' + p.id,
        name: p.title,
        images: imagesParser(p.pictures),
        thumbnail: `https://http2.mlstatic.com/D_NQ_NP_${p.thumbnail_id}-V.jpg`,
        attributes: p.attributes.map(a => ({
            name: a.name,
            value_name: a.value_name
        })),
        brand: p.attributes.find(e => e.id === 'BRAND')?.value_name || '',
        category,
        path_from_root,
        description: p.descriptions?.content || '',
        price: p.original_price ? p.original_price : p.price,
        sale_price: p.original_price ? p.price : 0,
        on_sale: p.original_price ? true : false,
        discount: p.original_price ? disc(p.original_price, p.price) : 0,
        free_shipping: p.shipping.free_shipping,
        available_quantity: p.available_quantity,
    }
    return aux;
}

module.exports = {
    meliSearchParser,
    meliProductParser,
    meliItemParser
}