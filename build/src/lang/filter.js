'use strict';

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('../util.js');

var isObject = _require.isObject;
var equal = _require.equal;
var unknownOp = _require.unknownOp;


var MISSING = require('./missing_symbol.js'),
    Path = require('./path.js'),
    Fields = require('./fields.js');

var isIndexMatchable = function isIndexMatchable(value) {
    if (typeof value === 'number') {
        return !isNaN(value);
    }
    if (typeof value === 'string') {
        return true;
    }
    if (typeof value === 'boolean') {
        return true;
    }
    if (!value) {
        return false;
    }
    if (value.constructor === Object) {
        return false;
    }

    if (Array.isArray(value)) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = value[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var element = _step.value;

                if (!isIndexMatchable(element)) {
                    return false;
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

        return true;
    }

    if (value instanceof Date) {
        return !isNaN(value.valueOf());
    }

    return false;
};

var Operator = function () {
    function Operator() {
        _classCallCheck(this, Operator);
    }

    _createClass(Operator, [{
        key: 'getClauses',
        value: function getClauses() {
            return this.is_index_matchable ? [this] : [];
        }
    }]);

    return Operator;
}();

var Connective = function (_Operator) {
    _inherits(Connective, _Operator);

    function Connective(args) {
        _classCallCheck(this, Connective);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Connective).call(this));

        _this.args = args;
        return _this;
    }

    return Connective;
}(Operator);

var Conjunction = function (_Connective) {
    _inherits(Conjunction, _Connective);

    function Conjunction() {
        _classCallCheck(this, Conjunction);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Conjunction).apply(this, arguments));
    }

    _createClass(Conjunction, [{
        key: 'getClauses',
        value: function getClauses() {
            var clauses = [];

            for (var i = 0; i < this.args.length; i++) {
                var op = this.args[i];

                if (op instanceof Connective) {
                    clauses.push.apply(clauses, _toConsumableArray(op.getClauses()));
                } else if (op.is_index_matchable) {
                    op.parent = this;
                    op.index = i;

                    clauses.push(op);
                }
            }

            return clauses;
        }
    }, {
        key: 'run',
        value: function run(fields) {
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = this.args[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var arg = _step2.value;

                    if (!arg.run(fields)) {
                        return false;
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

            return true;
        }
    }]);

    return Conjunction;
}(Connective);

var Disjunction = function (_Connective2) {
    _inherits(Disjunction, _Connective2);

    function Disjunction() {
        _classCallCheck(this, Disjunction);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Disjunction).apply(this, arguments));
    }

    _createClass(Disjunction, [{
        key: 'getClauses',
        value: function getClauses() {
            return [];
        }
    }, {
        key: 'run',
        value: function run(fields) {
            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
                for (var _iterator3 = this.args[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var arg = _step3.value;

                    if (arg.run(fields)) {
                        return true;
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

            return false;
        }
    }]);

    return Disjunction;
}(Connective);

var Negation = function (_Conjunction) {
    _inherits(Negation, _Conjunction);

    function Negation() {
        _classCallCheck(this, Negation);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Negation).apply(this, arguments));
    }

    _createClass(Negation, [{
        key: 'getClauses',
        value: function getClauses() {
            return [];
        }
    }, {
        key: 'run',
        value: function run(fields) {
            return !_get(Object.getPrototypeOf(Negation.prototype), 'run', this).call(this, fields);
        }
    }]);

    return Negation;
}(Conjunction);

var Exists = function (_Operator2) {
    _inherits(Exists, _Operator2);

    function Exists(path, bool) {
        _classCallCheck(this, Exists);

        var _this5 = _possibleConstructorReturn(this, Object.getPrototypeOf(Exists).call(this));

        _this5.path = path;
        _this5.bool = bool;
        return _this5;
    }

    _createClass(Exists, [{
        key: 'run',
        value: function run(fields) {
            return fields.get(this.path) !== MISSING === this.bool;
        }
    }, {
        key: 'is_index_matchable',
        get: function get() {
            return !!this.bool;
        }
    }]);

    return Exists;
}(Operator);

var Equal = function (_Operator3) {
    _inherits(Equal, _Operator3);

    function Equal(path, value) {
        _classCallCheck(this, Equal);

        var _this6 = _possibleConstructorReturn(this, Object.getPrototypeOf(Equal).call(this));

        _this6.path = path;
        _this6.value = value;
        return _this6;
    }

    _createClass(Equal, [{
        key: 'run',
        value: function run(fields) {
            var value = fields.get(this.path);
            if (value === MISSING) {
                return false;
            }

            return equal(value, this.value);
        }
    }, {
        key: 'is_index_matchable',
        get: function get() {
            return isIndexMatchable(this.value);
        }
    }, {
        key: 'idb_key_range',
        get: function get() {
            return IDBKeyRange.only(this.value);
        }
    }]);

    return Equal;
}(Operator);

var NotEqual = function (_Equal) {
    _inherits(NotEqual, _Equal);

    function NotEqual() {
        _classCallCheck(this, NotEqual);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(NotEqual).apply(this, arguments));
    }

    _createClass(NotEqual, [{
        key: 'run',
        value: function run(fields) {
            return !_get(Object.getPrototypeOf(NotEqual.prototype), 'run', this).call(this, fields);
        }
    }, {
        key: 'is_index_matchable',
        get: function get() {
            return false;
        }
    }]);

    return NotEqual;
}(Equal);

var Range = function (_Operator4) {
    _inherits(Range, _Operator4);

    function Range(path, fns, values) {
        _classCallCheck(this, Range);

        var _this8 = _possibleConstructorReturn(this, Object.getPrototypeOf(Range).call(this));

        _this8.path = path;
        _this8.fns = fns;
        _this8.values = values;
        return _this8;
    }

    _createClass(Range, [{
        key: 'run',
        value: function run(fields) {
            var value = fields.get(this.path);

            if (value === MISSING || value == null) {
                return false;
            }

            var fns = this.fns;
            var values = this.values;


            for (var i = 0; i < fns.length; i++) {
                if (!fns[i](value, values[i])) {
                    return false;
                }
            }

            return true;
        }
    }, {
        key: 'is_index_matchable',
        get: function get() {
            return true;
        }
    }]);

    return Range;
}(Operator);

var rangeMixin = function rangeMixin() {
    for (var _len = arguments.length, fns = Array(_len), _key = 0; _key < _len; _key++) {
        fns[_key] = arguments[_key];
    }

    return function (_Range) {
        _inherits(_class, _Range);

        function _class(path, values) {
            _classCallCheck(this, _class);

            return _possibleConstructorReturn(this, Object.getPrototypeOf(_class).call(this, path, fns, values));
        }

        return _class;
    }(Range);
};

var gt = function gt(a, b) {
    return a > b;
},
    gte = function gte(a, b) {
    return a >= b;
},
    lt = function lt(a, b) {
    return a < b;
},
    lte = function lte(a, b) {
    return a <= b;
};

var Gt = function (_rangeMixin) {
    _inherits(Gt, _rangeMixin);

    function Gt() {
        _classCallCheck(this, Gt);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Gt).apply(this, arguments));
    }

    _createClass(Gt, [{
        key: 'idb_key_range',
        get: function get() {
            var _IDBKeyRange;

            return (_IDBKeyRange = IDBKeyRange).lowerBound.apply(_IDBKeyRange, _toConsumableArray(this.values).concat([true]));
        }
    }]);

    return Gt;
}(rangeMixin(gt));

var Gte = function (_rangeMixin2) {
    _inherits(Gte, _rangeMixin2);

    function Gte() {
        _classCallCheck(this, Gte);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Gte).apply(this, arguments));
    }

    _createClass(Gte, [{
        key: 'idb_key_range',
        get: function get() {
            var _IDBKeyRange2;

            return (_IDBKeyRange2 = IDBKeyRange).lowerBound.apply(_IDBKeyRange2, _toConsumableArray(this.values));
        }
    }]);

    return Gte;
}(rangeMixin(gte));

var Lt = function (_rangeMixin3) {
    _inherits(Lt, _rangeMixin3);

    function Lt() {
        _classCallCheck(this, Lt);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Lt).apply(this, arguments));
    }

    _createClass(Lt, [{
        key: 'idb_key_range',
        get: function get() {
            var _IDBKeyRange3;

            return (_IDBKeyRange3 = IDBKeyRange).upperBound.apply(_IDBKeyRange3, _toConsumableArray(this.values).concat([true]));
        }
    }]);

    return Lt;
}(rangeMixin(lt));

var Lte = function (_rangeMixin4) {
    _inherits(Lte, _rangeMixin4);

    function Lte() {
        _classCallCheck(this, Lte);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Lte).apply(this, arguments));
    }

    _createClass(Lte, [{
        key: 'idb_key_range',
        get: function get() {
            var _IDBKeyRange4;

            return (_IDBKeyRange4 = IDBKeyRange).upperBound.apply(_IDBKeyRange4, _toConsumableArray(this.values));
        }
    }]);

    return Lte;
}(rangeMixin(lte));

var GtLt = function (_rangeMixin5) {
    _inherits(GtLt, _rangeMixin5);

    function GtLt() {
        _classCallCheck(this, GtLt);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(GtLt).apply(this, arguments));
    }

    _createClass(GtLt, [{
        key: 'idb_key_range',
        get: function get() {
            var _IDBKeyRange5;

            return (_IDBKeyRange5 = IDBKeyRange).bound.apply(_IDBKeyRange5, _toConsumableArray(this.values).concat([true, true]));
        }
    }]);

    return GtLt;
}(rangeMixin(gt, lt));

var GteLt = function (_rangeMixin6) {
    _inherits(GteLt, _rangeMixin6);

    function GteLt() {
        _classCallCheck(this, GteLt);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(GteLt).apply(this, arguments));
    }

    _createClass(GteLt, [{
        key: 'idb_key_range',
        get: function get() {
            var _IDBKeyRange6;

            return (_IDBKeyRange6 = IDBKeyRange).bound.apply(_IDBKeyRange6, _toConsumableArray(this.values).concat([false, true]));
        }
    }]);

    return GteLt;
}(rangeMixin(gte, lt));

var GtLte = function (_rangeMixin7) {
    _inherits(GtLte, _rangeMixin7);

    function GtLte() {
        _classCallCheck(this, GtLte);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(GtLte).apply(this, arguments));
    }

    _createClass(GtLte, [{
        key: 'idb_key_range',
        get: function get() {
            var _IDBKeyRange7;

            return (_IDBKeyRange7 = IDBKeyRange).bound.apply(_IDBKeyRange7, _toConsumableArray(this.values).concat([true, false]));
        }
    }]);

    return GtLte;
}(rangeMixin(gt, lte));

var GteLte = function (_rangeMixin8) {
    _inherits(GteLte, _rangeMixin8);

    function GteLte() {
        _classCallCheck(this, GteLte);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(GteLte).apply(this, arguments));
    }

    _createClass(GteLte, [{
        key: 'idb_key_range',
        get: function get() {
            var _IDBKeyRange8;

            return (_IDBKeyRange8 = IDBKeyRange).bound.apply(_IDBKeyRange8, _toConsumableArray(this.values));
        }
    }]);

    return GteLte;
}(rangeMixin(gte, lte));

var ElemMatch = function (_Operator5) {
    _inherits(ElemMatch, _Operator5);

    function ElemMatch(path, op) {
        _classCallCheck(this, ElemMatch);

        var _this18 = _possibleConstructorReturn(this, Object.getPrototypeOf(ElemMatch).call(this));

        _this18.path = path;
        _this18.op = op;
        return _this18;
    }

    _createClass(ElemMatch, [{
        key: 'run',
        value: function run(fields) {
            var elements = fields.get(this.path);

            if (!elements || !elements[Symbol.iterator]) {
                return false;
            }

            var op = this.op;
            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {

                for (var _iterator4 = elements[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                    var obj = _step4.value;

                    if (isObject(obj) && op.run(new Fields(obj))) {
                        return true;
                    }
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

            return false;
        }
    }, {
        key: 'is_index_matchable',
        get: function get() {
            return false;
        }
    }]);

    return ElemMatch;
}(Operator);

var RegEx = function (_Operator6) {
    _inherits(RegEx, _Operator6);

    function RegEx(path, expr) {
        _classCallCheck(this, RegEx);

        var _this19 = _possibleConstructorReturn(this, Object.getPrototypeOf(RegEx).call(this));

        _this19.path = path;
        _this19.expr = expr;
        return _this19;
    }

    _createClass(RegEx, [{
        key: 'run',
        value: function run(fields) {
            var value = fields.get(this.path);
            if (value === MISSING) {
                return false;
            }

            return this.expr.test(value);
        }
    }, {
        key: 'is_index_matchable',
        get: function get() {
            return false;
        }
    }]);

    return RegEx;
}(Operator);

var $and = function $and(parent_args, args) {
    var _iteratorNormalCompletion5 = true;
    var _didIteratorError5 = false;
    var _iteratorError5 = undefined;

    try {
        for (var _iterator5 = args[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
            var expr = _step5.value;

            var arg = build(expr);

            if (arg === false) {
                return false;
            }
            if (!arg) {
                continue;
            }

            if (arg.constructor === Conjunction) {
                parent_args.push.apply(parent_args, _toConsumableArray(arg.args));
            } else {
                parent_args.push(arg);
            }
        }
    } catch (err) {
        _didIteratorError5 = true;
        _iteratorError5 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion5 && _iterator5.return) {
                _iterator5.return();
            }
        } finally {
            if (_didIteratorError5) {
                throw _iteratorError5;
            }
        }
    }

    return true;
};

var $or = function $or(parent_args, args) {
    var new_args = [];

    var has_false = void 0;

    var _iteratorNormalCompletion6 = true;
    var _didIteratorError6 = false;
    var _iteratorError6 = undefined;

    try {
        for (var _iterator6 = args[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
            var expr = _step6.value;

            var arg = build(expr);

            if (!arg) {
                if (arg === false) {
                    has_false = true;
                }

                continue;
            }

            if (arg.constructor === Disjunction) {
                new_args.push.apply(new_args, _toConsumableArray(arg.args));
            } else {
                new_args.push(arg);
            }
        }
    } catch (err) {
        _didIteratorError6 = true;
        _iteratorError6 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion6 && _iterator6.return) {
                _iterator6.return();
            }
        } finally {
            if (_didIteratorError6) {
                throw _iteratorError6;
            }
        }
    }

    if (new_args.length > 1) {
        parent_args.push(new Disjunction(new_args));
    } else if (new_args.length) {
        parent_args.push(new_args[0]);
    } else if (has_false) {
        return false;
    }

    return true;
};

var $not = function $not(parent_args, args) {
    var new_args = [];

    var _iteratorNormalCompletion7 = true;
    var _didIteratorError7 = false;
    var _iteratorError7 = undefined;

    try {
        for (var _iterator7 = args[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
            var expr = _step7.value;

            var arg = build(expr);

            if (arg) {
                new_args.push(arg);
            }
        }
    } catch (err) {
        _didIteratorError7 = true;
        _iteratorError7 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion7 && _iterator7.return) {
                _iterator7.return();
            }
        } finally {
            if (_didIteratorError7) {
                throw _iteratorError7;
            }
        }
    }

    if (new_args.length) {
        parent_args.push(new Negation(new_args));
    }

    return true;
};

var connectives = {
    $and: $and,
    $or: $or,
    $not: $not,
    $nor: $not
};

var ranges = [[GtLt, '$gt', '$lt'], [GteLt, '$gte', '$lt'], [GtLte, '$gt', '$lte'], [GteLte, '$gte', '$lte'], [Gt, '$gt'], [Gte, '$gte'], [Lt, '$lt'], [Lte, '$lte']];

var buildRange = function buildRange(new_args, path, params, op_keys) {
    var build = function build(RangeOp, range_keys) {
        var values = [];

        var _iteratorNormalCompletion8 = true;
        var _didIteratorError8 = false;
        var _iteratorError8 = undefined;

        try {
            for (var _iterator8 = range_keys[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                var name = _step8.value;

                if (!op_keys.has(name)) {
                    return;
                }

                var value = params[name];
                if (!isIndexMatchable(value)) {
                    return false;
                }

                values.push(value);
            }
        } catch (err) {
            _didIteratorError8 = true;
            _iteratorError8 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion8 && _iterator8.return) {
                    _iterator8.return();
                }
            } finally {
                if (_didIteratorError8) {
                    throw _iteratorError8;
                }
            }
        }

        new_args.push(new RangeOp(path, values));

        return true;
    };

    var _iteratorNormalCompletion9 = true;
    var _didIteratorError9 = false;
    var _iteratorError9 = undefined;

    try {
        for (var _iterator9 = ranges[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
            var _step9$value = _toArray(_step9.value);

            var RangeOp = _step9$value[0];

            var range_keys = _step9$value.slice(1);

            var result = build(RangeOp, range_keys);

            if (result === false) {
                return;
            }
            if (!result) {
                continue;
            }

            op_keys.delete('$gt');
            op_keys.delete('$gte');
            op_keys.delete('$lt');
            op_keys.delete('$lte');

            break;
        }
    } catch (err) {
        _didIteratorError9 = true;
        _iteratorError9 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion9 && _iterator9.return) {
                _iterator9.return();
            }
        } finally {
            if (_didIteratorError9) {
                throw _iteratorError9;
            }
        }
    }

    return true;
};

var buildClause = function buildClause(parent_args, path, params) {
    var withoutOps = function withoutOps() {
        parent_args.push(new Equal(path, params));

        return true;
    };

    if (params == null || params.constructor !== Object) {
        return withoutOps();
    }

    var op_keys = new Set(Object.keys(params));

    if (op_keys.has('$exists') && !params.$exists) {
        parent_args.push(new Exists(path, false));

        return true;
    }

    var new_args = [];

    if (op_keys.has('$eq')) {
        new_args.push(new Equal(path, params.$eq));

        op_keys.delete('$eq');
    }

    if (op_keys.has('$ne')) {
        new_args.push(new NotEqual(path, params.$ne));

        op_keys.delete('$ne');
    }

    if (!buildRange(new_args, path, params, op_keys)) {
        return false;
    }

    if (op_keys.has('$in')) {
        var eqs = [];

        var _iteratorNormalCompletion10 = true;
        var _didIteratorError10 = false;
        var _iteratorError10 = undefined;

        try {
            for (var _iterator10 = params.$in[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
                var value = _step10.value;

                eqs.push(new Equal(path, value));
            }
        } catch (err) {
            _didIteratorError10 = true;
            _iteratorError10 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion10 && _iterator10.return) {
                    _iterator10.return();
                }
            } finally {
                if (_didIteratorError10) {
                    throw _iteratorError10;
                }
            }
        }

        if (eqs.length > 1) {
            new_args.push(new Disjunction(eqs));
        } else if (eqs.length) {
            new_args.push(eqs[0]);
        }

        op_keys.delete('$in');
    }

    if (op_keys.has('$nin')) {
        var _iteratorNormalCompletion11 = true;
        var _didIteratorError11 = false;
        var _iteratorError11 = undefined;

        try {
            for (var _iterator11 = params.$nin[Symbol.iterator](), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
                var _value = _step11.value;

                new_args.push(new NotEqual(path, _value));
            }
        } catch (err) {
            _didIteratorError11 = true;
            _iteratorError11 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion11 && _iterator11.return) {
                    _iterator11.return();
                }
            } finally {
                if (_didIteratorError11) {
                    throw _iteratorError11;
                }
            }
        }

        op_keys.delete('$nin');
    }

    if (op_keys.has('$elemMatch')) {
        var op = build(params.$elemMatch);

        if (op) {
            new_args.push(new ElemMatch(path, op));
        }

        op_keys.delete('$elemMatch');
    }

    if (op_keys.has('$regex')) {
        var expr = new RegExp(params.$regex, params.$options);

        new_args.push(new RegEx(path, expr));

        op_keys.delete('$regex');
        op_keys.delete('$options');
    }

    if (params.$exists && !new_args.length) {
        new_args.push(new Exists(path, true));

        op_keys.delete('$exists');
    }

    var _iteratorNormalCompletion12 = true;
    var _didIteratorError12 = false;
    var _iteratorError12 = undefined;

    try {
        for (var _iterator12 = op_keys[Symbol.iterator](), _step12; !(_iteratorNormalCompletion12 = (_step12 = _iterator12.next()).done); _iteratorNormalCompletion12 = true) {
            var name = _step12.value;

            if (name[0] === '$') {
                unknownOp(name);
            }
        }
    } catch (err) {
        _didIteratorError12 = true;
        _iteratorError12 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion12 && _iterator12.return) {
                _iterator12.return();
            }
        } finally {
            if (_didIteratorError12) {
                throw _iteratorError12;
            }
        }
    }

    if (!new_args.length) {
        return withoutOps();
    }

    parent_args.push.apply(parent_args, new_args);

    return true;
};

var build = function build(expr) {
    var args = [];

    for (var field in expr) {
        var value = expr[field],
            result = void 0;

        if (field[0] !== '$') {
            result = buildClause(args, new Path(field), value);
        } else {
            if (!Array.isArray(value)) {
                value = [value];
            }

            var fn = connectives[field];
            if (!fn) {
                unknownOp(field);
            }

            result = fn(args, value);
        }

        if (!result) {
            return result;
        }
    }

    if (!args.length) {
        return;
    }
    if (args.length === 1) {
        return args[0];
    }

    return new Conjunction(args);
};

module.exports.build = build;
module.exports.Conjunction = Conjunction;
module.exports.Disjunction = Disjunction;
module.exports.Exists = Exists;