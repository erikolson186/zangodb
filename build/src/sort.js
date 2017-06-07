'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _require = require('./util.js');

var toPathPieces = _require.toPathPieces;
var isObject = _require.isObject;
var equal = _require.equal;


var compare = function compare(a, b, path_pieces, order) {
    for (var i = 0; i < path_pieces.length - 1; i++) {
        var _piece = path_pieces[i];

        a = a[_piece];
        b = b[_piece];

        if (!isObject(a)) {
            if (!isObject(b)) {
                return null;
            }
        } else if (isObject(b)) {
            continue;
        }

        return order;
    }

    var piece = path_pieces[i];

    if (!a.hasOwnProperty(piece)) {
        if (!b.hasOwnProperty(piece)) {
            return null;
        }
    } else if (b.hasOwnProperty(piece)) {
        a = a[piece];
        b = b[piece];

        if (equal(a, b)) {
            return 0;
        }

        return (a < b ? 1 : -1) * order;
    }

    return order;
};

module.exports = function (_next, spec) {
    var sorts = [];

    for (var path in spec) {
        sorts.push([toPathPieces(path), spec[path]]);
    }

    var sortFn = function sortFn(a, b) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = sorts[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var _step$value = _slicedToArray(_step.value, 2);

                var path_pieces = _step$value[0];
                var order = _step$value[1];

                var result = compare(a, b, path_pieces, order);

                if (result > 0 || result < 0) {
                    return result;
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

        return -order;
    };

    var docs = [];

    var fn = function fn(cb) {
        return cb(null, docs.pop());
    };

    var _next2 = function next(cb) {
        var done = function done(error) {
            if (error) {
                return cb(error);
            }

            docs = docs.sort(sortFn);

            (_next2 = fn)(cb);
        };

        (function iterate() {
            _next(function (error, doc) {
                if (!doc) {
                    return done(error);
                }

                docs.push(doc);
                iterate();
            });
        })();
    };

    return function (cb) {
        return _next2(cb);
    };
};