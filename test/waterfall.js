module.exports = (fns, cb) => {
    const last = fns.pop();

    (function next() {
        const fn = fns.shift();

        if (fn) { fn(next); }
    })();

    last(cb);
};
