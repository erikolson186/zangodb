'use strict';

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _require = require('./util.js');

var toPathPieces = _require.toPathPieces;
var get = _require.get;


module.exports = function (_next, path) {
    var path_pieces = toPathPieces(path.substring(1)),
        elements = [],
        fn = function fn(cb) {
        return cb(null, elements.pop());
    };

    var onDoc = function onDoc(doc, cb) {
        var old_length = elements.length;

        get(doc, path_pieces, function (obj, field) {
            var new_elements = obj[field];
            if (!new_elements) {
                return;
            }

            if (new_elements[Symbol.iterator]) {
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = new_elements[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var element = _step.value;

                        elements.push(_defineProperty({}, field, element));
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
            }
        });

        if (old_length === elements.length) {
            return _next2(cb);
        }

        fn(cb);
    };

    var _next2 = function next(cb) {
        _next(function (error, doc) {
            if (error) {
                cb(error);
            } else if (doc) {
                onDoc(doc, cb);
            } else {
                (_next2 = fn)(cb);
            }
        });
    };

    return function (cb) {
        return _next2(cb);
    };
};