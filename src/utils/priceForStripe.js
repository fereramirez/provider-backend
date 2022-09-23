const stripePrice = (price) => {
    let partes = price.toString().split('.')
    let int = partes[0]
    let cents = partes[1] || '00'

    while (cents.length < 2) {
        cents += '0'
    }

    let newPrice = parseInt(int + cents)
    return newPrice
};

module.exports = {
    stripePrice
}