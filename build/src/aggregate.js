'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _require = require('./util.js');

var unknownOp = _require.unknownOp;

var Cursor = require('./cursor.js');

var ops = {
    $match: function $match(cur, doc) {
        return cur.filter(doc);
    },
    $project: function $project(cur, spec) {
        return cur.project(spec);
    },
    $group: function $group(cur, spec) {
        return cur.group(spec);
    },
    $unwind: function $unwind(cur, path) {
        return cur.unwind(path);
    },
    $sort: function $sort(cur, spec) {
        return cur.sort(spec);
    },
    $skip: function $skip(cur, num) {
        return cur.skip(num);
    },
    $limit: function $limit(cur, num) {
        return cur.limit(num);
    }
};

var getStageObject = function getStageObject(doc) {
    var op_keys = Object.keys(doc);

    if (op_keys.length > 1) {
        throw Error('stages must be passed only one operator');
    }

    var op_key = op_keys[0],
        fn = ops[op_key];

    if (!fn) {
        unknownOp(op_key);
    }

    return [fn, doc[op_key]];
};

var aggregate = function aggregate(col, pipeline) {
    var cur = new Cursor(col, 'readonly');

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = pipeline[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var doc = _step.value;

            var _getStageObject = getStageObject(doc);

            var _getStageObject2 = _slicedToArray(_getStageObject, 2);

            var fn = _getStageObject2[0];
            var arg = _getStageObject2[1];


            fn(cur, arg);
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

    return cur;
};

module.exports = aggregate;