const {
    toPathPieces,
    isObject,
    equal
} = require('./util.js');

const compare = (a, b, path_pieces, order) => {
    for (var i = 0; i < path_pieces.length - 1; i++) {
        const piece = path_pieces[i];

        a = a[piece];
        b = b[piece];

        if (!isObject(a)) {
            if (!isObject(b)) { return null; }
        } else if (isObject(b)) { continue; }

        return order;
    }

    const piece = path_pieces[i];

    if (!a.hasOwnProperty(piece)) {
        if (!b.hasOwnProperty(piece)) { return null; }
    } else if (b.hasOwnProperty(piece)) {
        a = a[piece];
        b = b[piece];

        if (equal(a, b)) { return 0; }

        return (a < b ? 1 : -1) * order;
    }

    return order;
};

module.exports = (_next, spec) => {
    const sorts = [];

    for (let path in spec) {
        sorts.push([toPathPieces(path), spec[path]]);
    }

    const sortFn = (a, b) => {
        for (var [path_pieces, order] of sorts) {
            const result = compare(a, b, path_pieces, order);

            if (result > 0 || result < 0) { return result; }
        }

        return -order;
    };

    let docs = [];

    const fn = cb => cb(null, docs.pop());

    let next = (cb) => {
        const done = (error) => {
            if (error) { return cb(error); }

            docs = docs.sort(sortFn);

            (next = fn)(cb);
        };

        (function iterate() {
            _next((error, doc) => {
                if (!doc) { return done(error); }

                docs.push(doc);
                iterate();
            });
        })();
    };

    return cb => next(cb);
};
