module.exports = (cur, num) => {
    let count = 0;

    const next = (cb) => {
        if (count++ < num) {
            cur._next((error, doc) => cb(error, doc));
        } else { cb(); }
    };

    return next;
};
