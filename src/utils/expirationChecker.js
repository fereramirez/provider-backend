const expirationChecker = (expDate) => {
    if ((Date.now()) - new Date(expDate) > 0) return true;
    return false;
}

module.exports = expirationChecker;