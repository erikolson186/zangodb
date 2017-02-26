module.exports = (_next, num) => {
    let count = 0;

    const next = (cb) => {
        _next((error, doc) => {
            if (!doc) { cb(error); }
            else if (++count > num) { cb(null, doc); }
            else { next(cb); }
        });
    };

    return next;
};
