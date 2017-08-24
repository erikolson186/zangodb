'use strict';

var _require = require('./util.js');

var toPathPieces = _require.toPathPieces;
var get = _require.get;
var set = _require.set;
var modify = _require.modify;
var remove1 = _require.remove1;
var rename = _require.rename;
var equal = _require.equal;
var unknownOp = _require.unknownOp;
var getIDBError = _require.getIDBError;


var ops = {};

ops.$set = function (path_pieces, value) {
    return function (doc) {
        set(doc, path_pieces, value);
    };
};

ops.$unset = function (path_pieces) {
    return function (doc) {
        return remove1(doc, path_pieces);
    };
};

ops.$rename = function (path_pieces, new_name) {
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

ops.$inc = arithOp(function (a, b) {
    return a + b;
});
ops.$mul = arithOp(function (a, b) {
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

ops.$min = compareOp(function (a, b) {
    return a < b;
});
ops.$max = compareOp(function (a, b) {
    return a > b;
});

ops.$push = function (path_pieces, value) {
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

ops.$pop = function (path_pieces, direction) {
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

ops.$pullAll = function (path_pieces, values) {
    return function (doc) {
        get(doc, path_pieces, function (obj, field) {
            var elements = obj[field];
            if (!Array.isArray(elements)) {
                return;
            }

            var new_elements = [];

            var hasValue = function hasValue(value1) {
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = values[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var value2 = _step.value;

                        if (equal(value1, value2)) {
                            return true;
                        }
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
            };

            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = elements[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var element = _step2.value;

                    if (!hasValue(element)) {
                        new_elements.push(element);
                    }
                }
            } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion2 && _iterator2.return) {
                        _iterator2.return();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }

            obj[field] = new_elements;
        });
    };
};

ops.$pull = function (path_pieces, value) {
    return ops.$pullAll(path_pieces, [value]);
};

ops.$addToSet = function (path_pieces, value) {
    return function (doc) {
        get(doc, path_pieces, function (obj, field) {
            var elements = obj[field];
            if (!Array.isArray(elements)) {
                return;
            }

            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
                for (var _iterator3 = elements[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var element = _step3.value;

                    if (equal(element, value)) {
                        return;
                    }
                }
            } catch (err) {
                _didIteratorError3 = true;
                _iteratorError3 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion3 && _iterator3.return) {
                        _iterator3.return();
                    }
                } finally {
                    if (_didIteratorError3) {
                        throw _iteratorError3;
                    }
                }
            }

            elements.push(value);
        });
    };
};

var build = function build(steps, field, value) {
    if (field[0] !== '$') {
        return steps.push(ops.$set(toPathPieces(field), value));
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

            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {
                for (var _iterator4 = steps[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                    var fn = _step4.value;
                    fn(doc);
                }
            } catch (err) {
                _didIteratorError4 = true;
                _iteratorError4 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion4 && _iterator4.return) {
                        _iterator4.return();
                    }
                } finally {
                    if (_didIteratorError4) {
                        throw _iteratorError4;
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