'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var memoize = require('memoizee');

var _require = require('./util.js');

var unknownOp = _require.unknownOp;
var hashify = _require.hashify;
var build = require('./lang/expression.js');
var Fields = require('./lang/fields.js');
var Operator = function () {
    function Operator() {
        _classCallCheck(this, Operator);
    }

    _createClass(Operator, [{
        key: 'getOpValueWithRefs',
        value: function getOpValueWithRefs(expr, doc, cb) {
            var ast = expr.ast;
            var fields = expr.fields;


            cb(ast.run(fields));
        }
    }, {
        key: 'value',
        get: function get() {
            return this._value;
        }
    }], [{
        key: 'getNoRefsSteps',
        value: function getNoRefsSteps(steps) {
            return steps.in_iter;
        }
    }, {
        key: 'getOpValue',
        value: function getOpValue(expr, cb) {
            cb(expr.ast.run());
        }
    }]);

    return Operator;
}();

var Sum = function (_Operator) {
    _inherits(Sum, _Operator);

    function Sum() {
        _classCallCheck(this, Sum);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Sum).call(this));

        _this._value = 0;
        return _this;
    }

    _createClass(Sum, [{
        key: 'getOpValueWithRefs',
        value: function getOpValueWithRefs(expr, doc, cb) {
            _get(Object.getPrototypeOf(Sum.prototype), 'getOpValueWithRefs', this).call(this, expr, doc, function (value) {
                Sum._verify(value, cb);
            });
        }
    }, {
        key: 'add',
        value: function add(value) {
            this._value += value;
        }
    }], [{
        key: '_verify',
        value: function _verify(value, cb) {
            if (typeof value === 'number') {
                cb(value);
            }
        }
    }, {
        key: 'getOpValue',
        value: function getOpValue(expr, cb) {
            _get(Object.getPrototypeOf(Sum), 'getOpValue', this).call(this, expr, function (value) {
                return Sum._verify(value, cb);
            });
        }
    }]);

    return Sum;
}(Operator);

var Avg = function (_Sum) {
    _inherits(Avg, _Sum);

    function Avg() {
        _classCallCheck(this, Avg);

        var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(Avg).call(this));

        _this2._count = 0;
        return _this2;
    }

    _createClass(Avg, [{
        key: 'add',
        value: function add(value) {
            this._count++;

            _get(Object.getPrototypeOf(Avg.prototype), 'add', this).call(this, value);
        }
    }, {
        key: 'value',
        get: function get() {
            return this._value / this._count || 0;
        }
    }]);

    return Avg;
}(Sum);

var Compare = function (_Operator2) {
    _inherits(Compare, _Operator2);

    function Compare(fn) {
        _classCallCheck(this, Compare);

        var _this3 = _possibleConstructorReturn(this, Object.getPrototypeOf(Compare).call(this));

        _this3._value = null;
        _this3._fn = fn;
        _this3._add = _this3._add1;
        return _this3;
    }

    _createClass(Compare, [{
        key: '_add1',
        value: function _add1(value) {
            this._value = value;
            this._add = this._add2;
        }
    }, {
        key: '_add2',
        value: function _add2(new_value) {
            if (this._fn(new_value, this._value)) {
                this._value = new_value;
            }
        }
    }, {
        key: 'add',
        value: function add(value) {
            if (value != null) {
                this._add(value);
            }
        }
    }], [{
        key: 'getNoRefsSteps',
        value: function getNoRefsSteps(steps) {
            return steps.in_end;
        }
    }]);

    return Compare;
}(Operator);

var Min = function (_Compare) {
    _inherits(Min, _Compare);

    function Min() {
        _classCallCheck(this, Min);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Min).call(this, function (a, b) {
            return a < b;
        }));
    }

    return Min;
}(Compare);

var Max = function (_Compare2) {
    _inherits(Max, _Compare2);

    function Max() {
        _classCallCheck(this, Max);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Max).call(this, function (a, b) {
            return a > b;
        }));
    }

    return Max;
}(Compare);

var Push = function (_Operator3) {
    _inherits(Push, _Operator3);

    function Push() {
        _classCallCheck(this, Push);

        var _this6 = _possibleConstructorReturn(this, Object.getPrototypeOf(Push).call(this));

        _this6._value = [];
        return _this6;
    }

    _createClass(Push, [{
        key: 'add',
        value: function add(value) {
            this._value.push(value);
        }
    }]);

    return Push;
}(Operator);

var AddToSet = function (_Operator4) {
    _inherits(AddToSet, _Operator4);

    function AddToSet() {
        _classCallCheck(this, AddToSet);

        var _this7 = _possibleConstructorReturn(this, Object.getPrototypeOf(AddToSet).call(this));

        _this7._hashes = {};
        return _this7;
    }

    _createClass(AddToSet, [{
        key: 'add',
        value: function add(value) {
            this._hashes[hashify(value)] = value;
        }
    }, {
        key: 'value',
        get: function get() {
            var docs = [];

            for (var hash in this._hashes) {
                docs.push(this._hashes[hash]);
            }

            return docs;
        }
    }], [{
        key: 'getNoRefsSteps',
        value: function getNoRefsSteps(steps) {
            return steps.in_end;
        }
    }]);

    return AddToSet;
}(Operator);

var runSteps = function runSteps(steps) {
    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
    }

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = steps[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var fn = _step.value;
            fn.apply(undefined, args);
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

var runInEnd = function runInEnd(in_end, groups) {
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
        for (var _iterator2 = groups[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var group_doc = _step2.value;

            runSteps(in_end, group_doc);
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
};

var groupLoopFn = function groupLoopFn(next, in_end, groups, fn) {
    return function (cb) {
        var done = function done(error) {
            if (!error) {
                runInEnd(in_end, groups);
            }

            cb(error, groups);
        };

        (function iterate() {
            next(function (error, doc) {
                if (!doc) {
                    return done(error);
                }

                fn(doc);
                iterate();
            });
        })();
    };
};

var createGroupByRefFn = function createGroupByRefFn(next, expr, steps) {
    var in_start = steps.in_start;
    var in_iter = steps.in_iter;
    var in_end = steps.in_end;

    var groups = [];

    var add = memoize(function (_id_hash, _id) {
        var group_doc = { _id: _id };

        groups.push(group_doc);
        runSteps(in_start, group_doc);

        return group_doc;
    }, { length: 1 });

    var ast = expr.ast;

    var _idFn = function _idFn(doc) {
        return ast.run(new Fields(doc));
    };

    var onDoc = void 0;

    if (in_iter.length) {
        onDoc = function onDoc(doc) {
            var _id = _idFn(doc);
            var group_doc = add(hashify(_id), _id);

            runSteps(in_iter, group_doc, doc);
        };
    } else {
        onDoc = function onDoc(doc) {
            var _id = _idFn(doc);

            add(hashify(_id), _id);
        };
    }

    return groupLoopFn(next, in_end, groups, onDoc);
};

var createGroupFn = function createGroupFn(next, expr, steps) {
    if (expr.has_refs) {
        return createGroupByRefFn(next, expr, steps);
    }

    var in_start = steps.in_start;
    var in_iter = steps.in_iter;
    var in_end = steps.in_end;

    var groups = [];

    var initGroupDoc = function initGroupDoc() {
        var group_doc = { _id: expr.ast.run() };

        runSteps(in_start, group_doc);
        groups.push(group_doc);

        return group_doc;
    };

    if (in_iter.length) {
        var _ret = function () {
            var add = memoize(function () {
                return initGroupDoc();
            });

            return {
                v: groupLoopFn(next, in_end, groups, function (doc) {
                    runSteps(in_iter, add(), doc);
                })
            };
        }();

        if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
    }

    return function (cb) {
        next(function (error, doc) {
            if (doc) {
                initGroupDoc();

                runInEnd(in_end, groups);
            }

            cb(error, groups);
        });
    };
};

var ops = {
    $sum: Sum,
    $avg: Avg,
    $min: Min,
    $max: Max,
    $push: Push,
    $addToSet: AddToSet
};

var _build = function _build(steps, field, value) {
    var in_start = steps.in_start;
    var in_iter = steps.in_iter;
    var in_end = steps.in_end;

    var op_strs = Object.keys(value);

    if (op_strs.length > 1) {
        throw Error('fields must have only one operator');
    }

    var op_str = op_strs[0],
        Op = ops[op_str];

    if (!Op) {
        if (op_str[0] === '$') {
            unknownOp(op_str);
        }

        throw Error('unexpected field \'' + op_str + '\'');
    }

    var expr = build(value[op_str]);

    in_start.push(function (group_doc) {
        group_doc[field] = new Op(expr);
    });

    if (expr.has_refs) {
        in_iter.push(function (group_doc, doc) {
            var fields = new Fields(doc);
            if (!fields.ensure(expr.paths)) {
                return;
            }

            var op = group_doc[field],
                _expr = Object.assign({ fields: fields }, expr),
                add = function add(value) {
                return op.add(value);
            };

            op.getOpValueWithRefs(_expr, doc, add);
        });
    } else {
        Op.getOpValue(expr, function (value) {
            Op.getNoRefsSteps(steps).push(function (group_doc) {
                group_doc[field].add(value);
            });
        });
    }

    in_end.push(function (group_doc) {
        group_doc[field] = group_doc[field].value;
    });
};

module.exports = function (_next, spec) {
    if (!spec.hasOwnProperty('_id')) {
        throw Error("the '_id' field is missing");
    }

    var expr = build(spec._id);
    var new_spec = Object.assign({}, spec);

    delete new_spec._id;

    var steps = {
        in_start: [],
        in_iter: [],
        in_end: []
    };

    for (var field in new_spec) {
        _build(steps, field, new_spec[field]);
    }

    var group = createGroupFn(_next, expr, steps);

    var _next2 = function next(cb) {
        group(function (error, groups) {
            if (error) {
                cb(error);
            } else {
                (_next2 = function next(cb) {
                    return cb(null, groups.pop());
                })(cb);
            }
        });
    };

    return function (cb) {
        return _next2(cb);
    };
};