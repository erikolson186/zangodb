'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _require = require('./util.js');

var toPathPieces = _require.toPathPieces;
var set = _require.set;
var remove2 = _require.remove2;
var copy = _require.copy;


var build = require('./lang/expression.js');
var Fields = require('./lang/fields.js');

var addition = function addition(doc, new_doc, new_fields) {
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = new_fields[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var _step$value = _slicedToArray(_step.value, 2);

            var path_pieces = _step$value[0];
            var add = _step$value[1];

            add(doc, new_doc, path_pieces);
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

    return new_doc;
};

var _build = function _build(value1) {
    var _build2 = build(value1);

    var ast = _build2.ast;
    var paths = _build2.paths;
    var has_refs = _build2.has_refs;


    if (!has_refs) {
        var _ret = function () {
            var value2 = ast.run();

            return {
                v: function v(doc) {
                    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                        args[_key - 1] = arguments[_key];
                    }

                    return set.apply(undefined, args.concat([value2]));
                }
            };
        }();

        if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
    }

    return function (doc) {
        for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
            args[_key2 - 1] = arguments[_key2];
        }

        var fields = new Fields(doc);

        if (fields.ensure(paths)) {
            set.apply(undefined, args.concat([ast.run(fields)]));
        }
    };
};

var project = function project(_next, spec) {
    var toBool = function toBool(path) {
        return !!spec[path];
    };
    var _id_bool = true;

    if (spec.hasOwnProperty('_id')) {
        _id_bool = toBool('_id');

        delete spec._id;
    }

    var existing_fields = [],
        new_fields = [];
    var is_inclusion = true;

    var _mode = function _mode(path) {
        if (toBool(path) !== is_inclusion) {
            throw Error('cannot mix inclusions and exclusions');
        }
    };

    var _mode2 = function mode(path) {
        is_inclusion = toBool(path);

        _mode2 = _mode;
    };

    for (var path in spec) {
        var value = spec[path];
        var path_pieces = toPathPieces(path);

        if (typeof value === 'boolean' || value === 1 || value === 0) {
            _mode2(path);
            existing_fields.push(path_pieces);
        } else {
            new_fields.push([path_pieces, _build(value)]);
        }
    }

    var steps = [];

    if (new_fields.length) {
        steps.push(function (doc, new_doc) {
            return addition(doc, new_doc, new_fields);
        });
    }

    if (!existing_fields.length) {
        (function () {
            var project = void 0;

            if (_id_bool) {
                project = function project(doc, new_doc) {
                    if (doc.hasOwnProperty('_id')) {
                        new_doc._id = doc._id;
                    }
                };
            } else {
                project = function project(doc, new_doc) {
                    delete new_doc._id;
                };
            }

            steps.push(function (doc, new_doc) {
                project(doc, new_doc);

                return new_doc;
            });
        })();
    } else {
        (function () {
            if (is_inclusion === _id_bool) {
                existing_fields.push(['_id']);
            }

            var project = is_inclusion ? copy : remove2;

            steps.push(function (doc) {
                return project(doc, existing_fields);
            });
        })();
    }

    var next = function next(cb) {
        _next(function (error, doc) {
            if (!doc) {
                return cb(error);
            }

            var new_doc = doc;

            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = steps[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var fn = _step2.value;

                    new_doc = fn(doc, new_doc);
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

            cb(null, new_doc);
        });
    };

    return next;
};

module.exports = project;