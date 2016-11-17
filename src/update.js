const {
    toPathPieces,
    get,
    set,
    modify,
    remove1,
    rename,
    unknownOp,
    getIDBError
} = require('./util.js');

const $set = (path_pieces, value) => (doc) => {
    set(doc, path_pieces, value);
};

const $unset = path_pieces => doc => remove1(doc, path_pieces);

const $rename = (path_pieces, new_name) => (doc) => {
    rename(doc, path_pieces, new_name);
};

const modifyOp = (path_pieces, update, init) => (doc) => {
    modify(doc, path_pieces, update, init);
};

const arithOp = (fn) => (path_pieces, value1) => {
    const update = (obj, field) => {
        const value2 = obj[field];

        if (typeof value2 === 'number') {
            obj[field] = fn(value1, value2);
        }
    };

    const init = (obj, field) => obj[field] = 0;

    return modifyOp(path_pieces, update, init);
};

const $inc = arithOp((a, b) => a + b);
const $mul = arithOp((a, b) => a * b);

const compareOp = (fn) => (path_pieces, value) => {
    const update = (obj, field) => {
        if (fn(value, obj[field])) { obj[field] = value; }
    };

    const init = (obj, field) => obj[field] = value;

    return modifyOp(path_pieces, update, init);
};

const $min = compareOp((a, b) => a < b);
const $max = compareOp((a, b) => a >  b);

const $push = (path_pieces, value) => {
    const update = (obj, field) => {
        const elements = obj[field];

        if (Array.isArray(elements)) { elements.push(value); }
    };

    const init = (obj, field) => obj[field] = [value];

    return modifyOp(path_pieces, update, init);
};

const $pop = (path_pieces, direction) => {
    let pop;

    if (direction < 1) {
        pop = e => e.shift();
    } else {
        pop = e => e.pop();
    }

    return (doc) => {
        get(doc, path_pieces, (obj, field) => {
            const elements = obj[field];

            if (Array.isArray(elements)) { pop(elements); }
        });
    };
};

const ops = {
    $set,
    $unset,
    $rename,
    $inc,
    $mul,
    $min,
    $max,
    $push,
    $pop
};

const build = (steps, field, value) => {
    if (field[0] !== '$') {
        return steps.push($set(toPathPieces(field), value));
    }

    const op = ops[field];
    if (!op) { unknownOp(field); }

    for (let path in value) {
        steps.push(op(toPathPieces(path), value[path]));
    }
};

module.exports = (cur, spec, cb) => {
    const steps = [];

    for (let field in spec) { build(steps, field, spec[field]); }

    if (!steps.length) { return cb(null); }

    (function iterate() {
        cur._next((error, doc) => {
            if (!doc) { return cb(error); }

            for (let fn of steps) { fn(doc); }

            const req = cur._idb_cur.update(doc);

            req.onsuccess = iterate;
            req.onerror = e => cb(getIDBError(e));
        });
    })();
};
