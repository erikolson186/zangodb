'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('../util.js');

var unknownOp = _require.unknownOp;
var MISSING = require('./missing_symbol.js');
var Path = require('./path.js');
var Value = function () {
    function Value(value) {
        _classCallCheck(this, Value);

        this.value = value;
    }

    _createClass(Value, [{
        key: 'run',
        value: function run() {
            return this.value;
        }
    }, {
        key: 'ResultType',
        get: function get() {
            return this.constructor;
        }
    }], [{
        key: 'any',
        value: function any(value) {
            if (typeof value === 'number') {
                return new NumberValue(value);
            }

            if (typeof value === 'string') {
                return new StringValue(value);
            }

            if (Array.isArray(value)) {
                return new ArrayValue(value);
            }

            if (value instanceof Date) {
                return new DateValue(value);
            }

            return new Value(value);
        }
    }, {
        key: 'literal',
        value: function literal(value) {
            return new Literal(Value.any(value));
        }
    }]);

    return Value;
}();

var NumberValue = function (_Value) {
    _inherits(NumberValue, _Value);

    function NumberValue() {
        _classCallCheck(this, NumberValue);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(NumberValue).apply(this, arguments));
    }

    _createClass(NumberValue, null, [{
        key: 'isType',
        value: function isType(value) {
            return typeof value === 'number';
        }
    }]);

    return NumberValue;
}(Value);

var StringValue = function (_Value2) {
    _inherits(StringValue, _Value2);

    function StringValue() {
        _classCallCheck(this, StringValue);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(StringValue).apply(this, arguments));
    }

    _createClass(StringValue, null, [{
        key: 'isType',
        value: function isType(value) {
            return typeof value === 'string';
        }
    }]);

    return StringValue;
}(Value);

var ArrayValue = function (_Value3) {
    _inherits(ArrayValue, _Value3);

    function ArrayValue() {
        _classCallCheck(this, ArrayValue);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(ArrayValue).apply(this, arguments));
    }

    _createClass(ArrayValue, null, [{
        key: 'isType',
        value: function isType(value) {
            return Array.isArray(value);
        }
    }]);

    return ArrayValue;
}(Value);

var DateValue = function (_Value4) {
    _inherits(DateValue, _Value4);

    function DateValue() {
        _classCallCheck(this, DateValue);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(DateValue).apply(this, arguments));
    }

    _createClass(DateValue, null, [{
        key: 'isType',
        value: function isType(value) {
            return value instanceof Date;
        }
    }]);

    return DateValue;
}(Value);

var Literal = function (_Value5) {
    _inherits(Literal, _Value5);

    function Literal() {
        _classCallCheck(this, Literal);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Literal).apply(this, arguments));
    }

    _createClass(Literal, [{
        key: 'run',
        value: function run() {
            return this.value.run();
        }
    }, {
        key: 'ResultType',
        get: function get() {
            return this.value.ResultType;
        }
    }]);

    return Literal;
}(Value);

var Get = function () {
    function Get(path) {
        _classCallCheck(this, Get);

        this.path = path;
    }

    _createClass(Get, [{
        key: 'run',
        value: function run(fields) {
            var value = fields.get(this.path);

            return value === MISSING ? null : value;
        }
    }]);

    return Get;
}();

var ObjectExpr = function (_Value6) {
    _inherits(ObjectExpr, _Value6);

    function ObjectExpr() {
        _classCallCheck(this, ObjectExpr);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(ObjectExpr).apply(this, arguments));
    }

    _createClass(ObjectExpr, [{
        key: 'run',
        value: function run(fields) {
            var result = {};var value = this.value;


            for (var field in value) {
                result[field] = value[field].run(fields);
            }

            return result;
        }
    }]);

    return ObjectExpr;
}(Value);

var Operator = function () {
    function Operator() {
        _classCallCheck(this, Operator);

        this.args = [];
    }

    _createClass(Operator, [{
        key: 'add',
        value: function add(node) {
            this.args.push(node);
        }
    }, {
        key: 'alt',
        get: function get() {
            return new Value(null);
        }
    }]);

    return Operator;
}();

var FnOp = function (_Operator) {
    _inherits(FnOp, _Operator);

    function FnOp(fn) {
        _classCallCheck(this, FnOp);

        var _this7 = _possibleConstructorReturn(this, Object.getPrototypeOf(FnOp).call(this));

        _this7.fn = fn;
        return _this7;
    }

    _createClass(FnOp, [{
        key: 'run',
        value: function run(fields) {
            var args = this.args;
            var fn = this.fn;


            return args.map(function (arg) {
                return arg.run(fields);
            }).reduce(fn);
        }
    }, {
        key: 'length',
        get: function get() {
            return Infinity;
        }
    }]);

    return FnOp;
}(Operator);

var UnaryFnOp = function (_FnOp) {
    _inherits(UnaryFnOp, _FnOp);

    function UnaryFnOp() {
        _classCallCheck(this, UnaryFnOp);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(UnaryFnOp).apply(this, arguments));
    }

    _createClass(UnaryFnOp, [{
        key: 'run',
        value: function run(fields) {
            return this.fn(this.args[0].run(fields));
        }
    }, {
        key: 'length',
        get: function get() {
            return 1;
        }
    }]);

    return UnaryFnOp;
}(FnOp);

var fnOp = function fnOp(Parent, fn) {
    return function (_Parent) {
        _inherits(_class, _Parent);

        function _class() {
            _classCallCheck(this, _class);

            return _possibleConstructorReturn(this, Object.getPrototypeOf(_class).call(this, fn));
        }

        return _class;
    }(Parent);
};

var opTypes = function opTypes(Parent, InputType) {
    var ResultType = arguments.length <= 2 || arguments[2] === undefined ? InputType : arguments[2];

    var Constructor = function (_Parent2) {
        _inherits(Constructor, _Parent2);

        function Constructor() {
            _classCallCheck(this, Constructor);

            return _possibleConstructorReturn(this, Object.getPrototypeOf(Constructor).apply(this, arguments));
        }

        return Constructor;
    }(Parent);

    Constructor.prototype.InputType = InputType;
    Constructor.prototype.ResultType = ResultType;

    return Constructor;
};

var ArithOp = function (_opTypes) {
    _inherits(ArithOp, _opTypes);

    function ArithOp() {
        _classCallCheck(this, ArithOp);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(ArithOp).apply(this, arguments));
    }

    return ArithOp;
}(opTypes(FnOp, NumberValue));

var arithOp = function arithOp(fn) {
    return fnOp(ArithOp, fn);
};

var Add = function (_arithOp) {
    _inherits(Add, _arithOp);

    function Add() {
        _classCallCheck(this, Add);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Add).apply(this, arguments));
    }

    return Add;
}(arithOp(function (a, b) {
    return a + b;
}));

var Subtract = function (_arithOp2) {
    _inherits(Subtract, _arithOp2);

    function Subtract() {
        _classCallCheck(this, Subtract);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Subtract).apply(this, arguments));
    }

    return Subtract;
}(arithOp(function (a, b) {
    return a - b;
}));

var Multiply = function (_arithOp3) {
    _inherits(Multiply, _arithOp3);

    function Multiply() {
        _classCallCheck(this, Multiply);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Multiply).apply(this, arguments));
    }

    return Multiply;
}(arithOp(function (a, b) {
    return a * b;
}));

var Divide = function (_arithOp4) {
    _inherits(Divide, _arithOp4);

    function Divide() {
        _classCallCheck(this, Divide);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Divide).apply(this, arguments));
    }

    return Divide;
}(arithOp(function (a, b) {
    return a / b;
}));

var Mod = function (_arithOp5) {
    _inherits(Mod, _arithOp5);

    function Mod() {
        _classCallCheck(this, Mod);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Mod).apply(this, arguments));
    }

    return Mod;
}(arithOp(function (a, b) {
    return a % b;
}));

var MathOp = function (_opTypes2) {
    _inherits(MathOp, _opTypes2);

    function MathOp() {
        _classCallCheck(this, MathOp);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(MathOp).apply(this, arguments));
    }

    _createClass(MathOp, [{
        key: 'run',
        value: function run(fields) {
            return this.fn.apply(this, _toConsumableArray(this.args.map(function (arg) {
                return arg.run(fields);
            })));
        }
    }, {
        key: 'length',
        get: function get() {
            return this.fn.length;
        }
    }]);

    return MathOp;
}(opTypes(FnOp, NumberValue));

var mathOp = function mathOp(fn) {
    return fnOp(MathOp, fn);
};

var Abs = function (_mathOp) {
    _inherits(Abs, _mathOp);

    function Abs() {
        _classCallCheck(this, Abs);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Abs).apply(this, arguments));
    }

    return Abs;
}(mathOp(Math.abs));

var Ceil = function (_mathOp2) {
    _inherits(Ceil, _mathOp2);

    function Ceil() {
        _classCallCheck(this, Ceil);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Ceil).apply(this, arguments));
    }

    return Ceil;
}(mathOp(Math.ceil));

var Floor = function (_mathOp3) {
    _inherits(Floor, _mathOp3);

    function Floor() {
        _classCallCheck(this, Floor);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Floor).apply(this, arguments));
    }

    return Floor;
}(mathOp(Math.floor));

var Ln = function (_mathOp4) {
    _inherits(Ln, _mathOp4);

    function Ln() {
        _classCallCheck(this, Ln);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Ln).apply(this, arguments));
    }

    return Ln;
}(mathOp(Math.log));

var Log10 = function (_mathOp5) {
    _inherits(Log10, _mathOp5);

    function Log10() {
        _classCallCheck(this, Log10);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Log10).apply(this, arguments));
    }

    return Log10;
}(mathOp(Math.log10));

var Pow = function (_mathOp6) {
    _inherits(Pow, _mathOp6);

    function Pow() {
        _classCallCheck(this, Pow);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Pow).apply(this, arguments));
    }

    return Pow;
}(mathOp(Math.pow));

var Sqrt = function (_mathOp7) {
    _inherits(Sqrt, _mathOp7);

    function Sqrt() {
        _classCallCheck(this, Sqrt);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Sqrt).apply(this, arguments));
    }

    return Sqrt;
}(mathOp(Math.sqrt));

var Trunc = function (_mathOp8) {
    _inherits(Trunc, _mathOp8);

    function Trunc() {
        _classCallCheck(this, Trunc);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Trunc).apply(this, arguments));
    }

    return Trunc;
}(mathOp(Math.trunc));

var StringConcatOp = function (_opTypes3) {
    _inherits(StringConcatOp, _opTypes3);

    function StringConcatOp() {
        _classCallCheck(this, StringConcatOp);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(StringConcatOp).apply(this, arguments));
    }

    return StringConcatOp;
}(opTypes(FnOp, StringValue));

var Concat = function (_fnOp) {
    _inherits(Concat, _fnOp);

    function Concat() {
        _classCallCheck(this, Concat);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Concat).apply(this, arguments));
    }

    return Concat;
}(fnOp(StringConcatOp, function (a, b) {
    return a + b;
}));

var CaseOp = function (_opTypes4) {
    _inherits(CaseOp, _opTypes4);

    function CaseOp() {
        _classCallCheck(this, CaseOp);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(CaseOp).apply(this, arguments));
    }

    _createClass(CaseOp, [{
        key: 'alt',
        get: function get() {
            return new StringValue('');
        }
    }]);

    return CaseOp;
}(opTypes(UnaryFnOp, StringValue));

var ToLower = function (_fnOp2) {
    _inherits(ToLower, _fnOp2);

    function ToLower() {
        _classCallCheck(this, ToLower);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(ToLower).apply(this, arguments));
    }

    return ToLower;
}(fnOp(CaseOp, function (s) {
    return s.toLowerCase();
}));

var ToUpper = function (_fnOp3) {
    _inherits(ToUpper, _fnOp3);

    function ToUpper() {
        _classCallCheck(this, ToUpper);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(ToUpper).apply(this, arguments));
    }

    return ToUpper;
}(fnOp(CaseOp, function (s) {
    return s.toUpperCase();
}));

var ConcatArraysOp = function (_opTypes5) {
    _inherits(ConcatArraysOp, _opTypes5);

    function ConcatArraysOp() {
        _classCallCheck(this, ConcatArraysOp);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(ConcatArraysOp).apply(this, arguments));
    }

    return ConcatArraysOp;
}(opTypes(FnOp, ArrayValue));

var ConcatArrays = function (_fnOp4) {
    _inherits(ConcatArrays, _fnOp4);

    function ConcatArrays() {
        _classCallCheck(this, ConcatArrays);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(ConcatArrays).apply(this, arguments));
    }

    return ConcatArrays;
}(fnOp(ConcatArraysOp, function (a, b) {
    return a.concat(b);
}));

var DateOp = function (_opTypes6) {
    _inherits(DateOp, _opTypes6);

    function DateOp() {
        _classCallCheck(this, DateOp);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(DateOp).apply(this, arguments));
    }

    return DateOp;
}(opTypes(UnaryFnOp, DateValue, NumberValue));

var dateOp = function dateOp(fn) {
    return fnOp(DateOp, fn);
};

var DayOfMonth = function (_dateOp) {
    _inherits(DayOfMonth, _dateOp);

    function DayOfMonth() {
        _classCallCheck(this, DayOfMonth);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(DayOfMonth).apply(this, arguments));
    }

    return DayOfMonth;
}(dateOp(function (d) {
    return d.getDate();
}));

var Year = function (_dateOp2) {
    _inherits(Year, _dateOp2);

    function Year() {
        _classCallCheck(this, Year);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Year).apply(this, arguments));
    }

    return Year;
}(dateOp(function (d) {
    return d.getUTCFullYear();
}));

var Month = function (_dateOp3) {
    _inherits(Month, _dateOp3);

    function Month() {
        _classCallCheck(this, Month);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Month).apply(this, arguments));
    }

    return Month;
}(dateOp(function (d) {
    return d.getUTCMonth() + 1;
}));

var Hour = function (_dateOp4) {
    _inherits(Hour, _dateOp4);

    function Hour() {
        _classCallCheck(this, Hour);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Hour).apply(this, arguments));
    }

    return Hour;
}(dateOp(function (d) {
    return d.getUTCHours();
}));

var Minute = function (_dateOp5) {
    _inherits(Minute, _dateOp5);

    function Minute() {
        _classCallCheck(this, Minute);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Minute).apply(this, arguments));
    }

    return Minute;
}(dateOp(function (d) {
    return d.getUTCMinutes();
}));

var Second = function (_dateOp6) {
    _inherits(Second, _dateOp6);

    function Second() {
        _classCallCheck(this, Second);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Second).apply(this, arguments));
    }

    return Second;
}(dateOp(function (d) {
    return d.getUTCSeconds();
}));

var Millisecond = function (_dateOp7) {
    _inherits(Millisecond, _dateOp7);

    function Millisecond() {
        _classCallCheck(this, Millisecond);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(Millisecond).apply(this, arguments));
    }

    return Millisecond;
}(dateOp(function (d) {
    return d.getUTCMilliseconds();
}));

var TypeCond = function () {
    function TypeCond(stack, args, op) {
        _classCallCheck(this, TypeCond);

        var InputType = op.InputType;
        var alt = op.alt;


        this.result_types = new Set([op.ResultType, alt.ResultType]);
        this.stack = stack;
        this.isType = InputType.isType;
        this.args = args;
        this.op = op;
        this.alt_value = alt.value;
    }

    _createClass(TypeCond, [{
        key: 'run',
        value: function run(fields) {
            var stack = this.stack;
            var isType = this.isType;
            var op = this.op;

            var new_args = [];

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = this.args[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var arg = _step.value;

                    var result = arg.run(fields);

                    if (!isType(result)) {
                        return this.alt_value;
                    }

                    new_args.push(result);
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

            for (var i = new_args.length - 1; i >= 0; i--) {
                stack.push(new_args[i]);
            }

            return op.run(fields);
        }
    }]);

    return TypeCond;
}();

var PopFromStack = function () {
    function PopFromStack(stack) {
        _classCallCheck(this, PopFromStack);

        this.stack = stack;
    }

    _createClass(PopFromStack, [{
        key: 'run',
        value: function run() {
            return this.stack.pop();
        }
    }]);

    return PopFromStack;
}();

var ops = {
    $add: Add,
    $subtract: Subtract,
    $multiply: Multiply,
    $divide: Divide,
    $mod: Mod,
    $abs: Abs,
    $ceil: Ceil,
    $floor: Floor,
    $ln: Ln,
    $log10: Log10,
    $pow: Pow,
    $sqrt: Sqrt,
    $trunc: Trunc,
    $concat: Concat,
    $toLower: ToLower,
    $toUpper: ToUpper,
    $concatArrays: ConcatArrays,
    $dayOfMonth: DayOfMonth,
    $year: Year,
    $month: Month,
    $hour: Hour,
    $minute: Minute,
    $second: Second,
    $millisecond: Millisecond
};

var buildOp = function buildOp(paths, name, args) {
    var Op = ops[name];
    if (!Op) {
        unknownOp(name);
    }

    if (!Array.isArray(args)) {
        args = [args];
    }

    var op = new Op(),
        tc_nodes = [],
        new_paths = [],
        stack = [];

    for (var i = 0; i < args.length && i < op.length; i++) {
        var arg = build(new_paths, args[i]);

        if (arg.ResultType) {
            if (arg.ResultType !== op.InputType) {
                return op.alt;
            }

            op.add(arg);

            continue;
        }

        if (arg instanceof TypeCond) {
            if (!arg.result_types.has(op.InputType)) {
                return op.alt;
            }

            if (arg.result_types.size === 1) {
                op.add(arg);

                continue;
            }
        }

        tc_nodes.push(arg);
        op.add(new PopFromStack(stack));
    }

    if (!new_paths.length) {
        return new op.ResultType(op.run());
    }

    paths.push.apply(paths, new_paths);

    if (!tc_nodes.length) {
        return op;
    }

    return new TypeCond(stack, tc_nodes, op);
};

var buildObject = function buildObject(paths, expr) {
    var op_names = new Set(),
        fields = new Set();

    for (var field in expr) {
        (field[0] === '$' ? op_names : fields).add(field);
    }

    if (op_names.size > 1) {
        throw Error('objects cannot have more than one operator');
    }

    if (op_names.size) {
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
            for (var _iterator2 = fields[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                var path = _step2.value;

                throw Error('unexpected field \'' + path + '\'');
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

        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
            for (var _iterator3 = op_names[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                var name = _step3.value;

                if (name === '$literal') {
                    return Value.literal(expr[name]);
                }

                return buildOp(paths, name, expr[name]);
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
    }

    var new_paths = [],
        obj = {};

    for (var _field in expr) {
        obj[_field] = build(new_paths, expr[_field]);
    }

    var node = new ObjectExpr(obj);

    if (!new_paths.length) {
        return new Value(node.run());
    }

    paths.push.apply(paths, new_paths);

    return node;
};

var build = function build(paths, expr) {
    if (typeof expr === 'string' && expr[0] === '$') {
        var path = new Path(expr.substring(1));

        paths.push(path);

        return new Get(path);
    }

    if (expr == null || expr.constructor !== Object) {
        return Value.any(expr);
    }

    return buildObject(paths, expr);
};

module.exports = function (expr) {
    var paths = [],
        ast = build(paths, expr);

    return {
        ast: ast,
        paths: paths,
        has_refs: !!paths.length
    };
};