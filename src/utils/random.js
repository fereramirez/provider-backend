const random = (max, amount) => {
    if (max < 5) return [0, 1, 2, 3, 4]
    let aux = [];
    for (let i = 0; i < amount; i++) {
        let num = Math.floor(Math.random() * max);

        if (!aux.includes(num)) {
            aux.push(num);
        } else {
            i -= 1
        }
    }
    return aux;
};

module.exports = {
    random
}