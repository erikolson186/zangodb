'use strict';

var _require = require('./util.js'),
    toPathPieces = _require.toPathPieces,
    get = _require.get,
    set = _require.set,
    modify = _require.modify,
    remove1 = _require.remove1,
    rename = _require.rename,
    unknownOp = _require.unknownOp,
    getIDBError = _require.getIDBError;

var $set = function $set(path_pieces, value) {
    return function (doc) {
        set(doc, path_pieces, value);
    };
};

var $unset = function $unset(path_pieces) {
    return function (doc) {
        return remove1(doc, path_pieces);
    };
};

var $rename = function $rename(path_pieces, new_name) {
    return function (doc) {
        rename(doc, path_pieces, new_name);
    };
};

var modifyOp = function modifyOp(path_pieces, update, init) {
    return function (doc) {
        modify(doc, path_pieces, update, init);
    };
};

var arithOp = function arithOp(fn) {
    return function (path_pieces, value1) {
        var update = function update(obj, field) {
            var value2 = obj[field];

            if (typeof value2 === 'number') {
                obj[field] = fn(value1, value2);
            }
        };

        var init = function init(obj, field) {
            return obj[field] = 0;
        };

        return modifyOp(path_pieces, update, init);
    };
};

var $inc = arithOp(function (a, b) {
    return a + b;
});
var $mul = arithOp(function (a, b) {
    return a * b;
});

var compareOp = function compareOp(fn) {
    return function (path_pieces, value) {
        var update = function update(obj, field) {
            if (fn(value, obj[field])) {
                obj[field] = value;
            }
        };

        var init = function init(obj, field) {
            return obj[field] = value;
        };

        return modifyOp(path_pieces, update, init);
    };
};

var $min = compareOp(function (a, b) {
    return a < b;
});
var $max = compareOp(function (a, b) {
    return a > b;
});

var $push = function $push(path_pieces, value) {
    var update = function update(obj, field) {
        var elements = obj[field];

        if (Array.isArray(elements)) {
            elements.push(value);
        }
    };

    var init = function init(obj, field) {
        return obj[field] = [value];
    };

    return modifyOp(path_pieces, update, init);
};

var $pop = function $pop(path_pieces, direction) {
    var pop = void 0;

    if (direction < 1) {
        pop = function pop(e) {
            return e.shift();
        };
    } else {
        pop = function pop(e) {
            return e.pop();
        };
    }

    return function (doc) {
        get(doc, path_pieces, function (obj, field) {
            var elements = obj[field];

            if (Array.isArray(elements)) {
                pop(elements);
            }
        });
    };
};

var ops = {
    $set: $set,
    $unset: $unset,
    $rename: $rename,
    $inc: $inc,
    $mul: $mul,
    $min: $min,
    $max: $max,
    $push: $push,
    $pop: $pop
};

var build = function build(steps, field, value) {
    if (field[0] !== '$') {
        return steps.push($set(toPathPieces(field), value));
    }

    var op = ops[field];
    if (!op) {
        unknownOp(field);
    }

    for (var path in value) {
        steps.push(op(toPathPieces(path), value[path]));
    }
};

module.exports = function (cur, spec, cb) {
    var steps = [];

    for (var field in spec) {
        build(steps, field, spec[field]);
    }

    if (!steps.length) {
        return cb(null);
    }

    (function iterate() {
        cur._next(function (error, doc, idb_cur) {
            if (!doc) {
                return cb(error);
            }

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = steps[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var fn = _step.value;
                    fn(doc);
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            var idb_req = idb_cur.update(doc);

            idb_req.onsuccess = iterate;
            idb_req.onerror = function (e) {
                return cb(getIDBError(e));
            };
        });
    })();
};