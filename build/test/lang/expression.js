'use strict';

var _require = require('chai');

var expect = _require.expect;


var build = require('../../src/lang/expression.js');
var Fields = require('../../src/lang/fields.js');

var evalExpr = function evalExpr(expr) {
    var doc = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var _build = build(expr);

    var ast = _build.ast;
    var has_refs = _build.has_refs;

    if (ast === false) {
        return false;
    }

    if (has_refs) {
        return ast.run(new Fields(doc));
    }

    return ast.run();
};

describe('$literal', function () {
    it('should not evaluate operators', function () {
        var literal1 = { $lt: [2, 3] };
        expect(evalExpr({ $literal: literal1 })).to.deep.equal(literal1);

        var literal2 = { $multiply: [3, 4] };

        expect(evalExpr({
            x: { $add: [1, 3] },
            b: { $literal: literal2 }
        })).to.deep.equal({ x: 4, b: literal2 });

        var literal3 = { $literal: { $add: [10, 4] } };
        expect(evalExpr({ $literal: literal3 })).to.deep.equal(literal3);
    });
});

describe('arithmetic', function () {
    describe('$add', function () {
        it('should report refs', function () {
            expect(build({ $add: ['$x'] }).has_refs).to.be.true;
            expect(build({ $add: [4] }).has_refs).to.be.false;
            expect(build({ y: { $add: ['$x'] } }).has_refs).to.be.true;
            expect(build({ y: { $add: [4] } }).has_refs).to.be.false;
        });

        it('should add numbers', function () {
            expect(evalExpr({ $add: [3, 4, 2] })).to.equal(9);
            expect(evalExpr({ $add: [3, { $add: [3, 4] }] })).to.equal(10);
            expect(evalExpr({ $add: ['$x', 2] }, { x: 4 })).to.equal(6);
        });
    });

    describe('$subtract', function () {
        it('should report refs', function () {
            expect(build({ $subtract: ['$x'] }).has_refs).to.be.true;
            expect(build({ $subtract: [4] }).has_refs).to.be.false;
            expect(build({ y: { $subtract: ['$x'] } }).has_refs).to.be.true;
            expect(build({ y: { $subtract: [4] } }).has_refs).to.be.false;
        });

        it('should subtract numbers', function () {
            expect(evalExpr({ $subtract: [3, 4, 2] })).to.equal(-3);

            expect(evalExpr({
                $subtract: [3, { $subtract: [3, 4] }]
            })).to.equal(4);

            expect(evalExpr({ $subtract: ['$x', 2] }, { x: 4 })).to.equal(2);
        });
    });

    describe('$multiply', function () {
        it('should report refs', function () {
            expect(build({ $multiply: ['$x'] }).has_refs).to.be.true;
            expect(build({ $multiply: [4] }).has_refs).to.be.false;
            expect(build({ y: { $multiply: ['$x'] } }).has_refs).to.be.true;
            expect(build({ y: { $multiply: [4] } }).has_refs).to.be.false;
        });

        it('should multiply numbers', function () {
            expect(evalExpr({ $multiply: [3, 4, 2] })).to.equal(24);

            expect(evalExpr({
                $multiply: [3, { $multiply: [3, 4] }]
            })).to.equal(36);

            expect(evalExpr({ $multiply: ['$x', 2] }, { x: 4 })).to.equal(8);
        });
    });

    describe('$divide', function () {
        it('should report refs', function () {
            expect(build({ $divide: ['$x'] }).has_refs).to.be.true;
            expect(build({ $divide: [4] }).has_refs).to.be.false;
            expect(build({ y: { $divide: ['$x'] } }).has_refs).to.be.true;
            expect(build({ y: { $divide: [4] } }).has_refs).to.be.false;
        });

        it('should divide numbers', function () {
            expect(evalExpr({ $divide: [3, 4, 2] })).to.equal(0.375);
            expect(evalExpr({ $divide: [3, { $divide: [3, 4] }] })).to.equal(4);
            expect(evalExpr({ $divide: ['$x', 2] }, { x: 4 })).to.equal(2);
        });
    });

    describe('$abs', function () {
        it('should report refs', function () {
            expect(build({ $abs: '$x' }).has_refs).to.be.true;
            expect(build({ $abs: 4 }).has_refs).to.be.false;
            expect(build({ y: { $abs: '$x' } }).has_refs).to.be.true;
            expect(build({ y: { $abs: 4 } }).has_refs).to.be.false;
        });

        it('should return the absolute value of a number', function () {
            expect(evalExpr({ $abs: 3 })).to.equal(3);
            expect(evalExpr({ $abs: -3 })).to.equal(3);
            expect(evalExpr({ $abs: { $abs: -4 } })).to.equal(4);
            expect(evalExpr({ $abs: '$x' }, { x: 4 })).to.equal(4);
        });
    });

    describe('$ceil', function () {
        it('should report refs', function () {
            expect(build({ $ceil: '$x' }).has_refs).to.be.true;
            expect(build({ $ceil: 4 }).has_refs).to.be.false;
            expect(build({ y: { $ceil: '$x' } }).has_refs).to.be.true;
            expect(build({ y: { $ceil: 4 } }).has_refs).to.be.false;
        });

        it('should return the ceiling value of a number', function () {
            expect(evalExpr({ $ceil: 1 })).to.equal(1);
            expect(evalExpr({ $ceil: 7.80 })).to.equal(8);
            expect(evalExpr({ $ceil: -2.8 })).to.equal(-2);
            expect(evalExpr({ $ceil: { $ceil: 7.80 } })).to.equal(8);
            expect(evalExpr({ $ceil: '$x' }, { x: 8.4 })).to.equal(9);
        });
    });

    describe('$floor', function () {
        it('should report refs', function () {
            expect(build({ $floor: '$x' }).has_refs).to.be.true;
            expect(build({ $floor: 4 }).has_refs).to.be.false;
            expect(build({ y: { $floor: '$x' } }).has_refs).to.be.true;
            expect(build({ y: { $floor: 4 } }).has_refs).to.be.false;
        });

        it('should return the floor value of a number', function () {
            expect(evalExpr({ $floor: 1 })).to.equal(1);
            expect(evalExpr({ $floor: 7.80 })).to.equal(7);
            expect(evalExpr({ $floor: -2.8 })).to.equal(-3);
            expect(evalExpr({ $floor: '$x' }, { x: 4.8 })).to.equal(4);
        });
    });

    describe('$ln', function () {
        it('should report refs', function () {
            expect(build({ $ln: '$x' }).has_refs).to.be.true;
            expect(build({ $ln: 4 }).has_refs).to.be.false;
            expect(build({ y: { $ln: '$x' } }).has_refs).to.be.true;
            expect(build({ y: { $ln: 4 } }).has_refs).to.be.false;
        });

        it('should return the natural logarithm of a number', function () {
            expect(evalExpr({ $ln: 1 })).to.equal(0);
            expect(evalExpr({ $ln: Math.E })).to.equal(1);
            expect(evalExpr({ $ln: 10 })).to.equal(2.302585092994046);
            expect(evalExpr({ $ln: '$x' }, { x: 1 })).to.equal(0);
        });
    });

    describe('$log10', function () {
        it('should report refs', function () {
            expect(build({ $log10: '$x' }).has_refs).to.be.true;
            expect(build({ $log10: 4 }).has_refs).to.be.false;
            expect(build({ y: { $log10: '$x' } }).has_refs).to.be.true;
            expect(build({ y: { $log10: 4 } }).has_refs).to.be.false;
        });

        it('should return the log base 10 of a number', function () {
            expect(evalExpr({ $log10: 1 })).to.equal(0);
            expect(evalExpr({ $log10: 10 })).to.equal(1);
            expect(evalExpr({ $log10: '$x' }, { x: 100 })).to.equal(2);
        });
    });

    describe('$mod', function () {
        it('should report refs', function () {
            expect(build({ $mod: '$x' }).has_refs).to.be.true;
            expect(build({ $mod: 4 }).has_refs).to.be.false;
            expect(build({ y: { $mod: '$x' } }).has_refs).to.be.true;
            expect(build({ y: { $mod: 4 } }).has_refs).to.be.false;
        });

        it('should return the modulo operation of numbers', function () {
            expect(evalExpr({ $mod: [3, 4, 2] })).to.equal(1);
            expect(evalExpr({ $mod: [3, { $mod: [3, 4] }] })).to.equal(0);
            expect(evalExpr({ $mod: ['$x', 2] }, { x: 4 })).to.equal(0);
        });
    });

    describe('$pow', function () {
        it('should report refs', function () {
            expect(build({ $pow: '$x' }).has_refs).to.be.true;
            expect(build({ $pow: 4 }).has_refs).to.be.false;
            expect(build({ y: { $pow: '$x' } }).has_refs).to.be.true;
            expect(build({ y: { $pow: 4 } }).has_refs).to.be.false;
        });

        it('should raise a number to a specified exponent', function () {
            expect(evalExpr({ $pow: [5, 0] })).to.equal(1);
            expect(evalExpr({ $pow: [5, 2] })).to.equal(25);

            expect(evalExpr({
                $pow: ['$x', '$y']
            }, { x: 5, y: -2 })).to.equal(0.04);
        });
    });

    describe('$sqrt', function () {
        it('should report refs', function () {
            expect(build({ $sqrt: '$x' }).has_refs).to.be.true;
            expect(build({ $sqrt: 4 }).has_refs).to.be.false;
            expect(build({ y: { $sqrt: '$x' } }).has_refs).to.be.true;
            expect(build({ y: { $sqrt: 4 } }).has_refs).to.be.false;
        });

        it('should return the sqrt of a number', function () {
            expect(evalExpr({ $sqrt: 25 })).to.equal(5);
            expect(evalExpr({ $sqrt: 30 })).to.equal(5.477225575051661);
            expect(evalExpr({ $sqrt: '$x' }, { x: 4 })).to.equal(2);
        });
    });

    describe('$trunc', function () {
        it('should report refs', function () {
            expect(build({ $trunc: '$x' }).has_refs).to.be.true;
            expect(build({ $trunc: 4 }).has_refs).to.be.false;
            expect(build({ y: { $trunc: '$x' } }).has_refs).to.be.true;
            expect(build({ y: { $trunc: 4 } }).has_refs).to.be.false;
        });

        it("should truncate a number to its integer", function () {
            expect(evalExpr({ $trunc: 0 })).to.equal(0);
            expect(evalExpr({ $trunc: 7.80 })).to.equal(7);
            expect(evalExpr({ $trunc: '$x' }, { x: -2.3 })).to.equal(-2);
        });
    });

    it('should return null for non-numbers', function () {
        expect(evalExpr({ $add: [4, null] })).to.equal(null);
        expect(evalExpr({ $add: [4, undefined] })).to.equal(null);
        expect(evalExpr({ $add: [4, ''] })).to.equal(null);
        expect(evalExpr({ $add: [4, {}] })).to.equal(null);
        expect(evalExpr({ $add: [4, []] })).to.equal(null);
        expect(evalExpr({ $add: [4, new Set()] })).to.equal(null);
        expect(evalExpr({ $add: [4, new Date()] })).to.equal(null);
        expect(evalExpr({ $add: [4, true] })).to.equal(null);
        expect(evalExpr({ $add: ['$x', 4] }, { x: null })).to.equal(null);

        expect(evalExpr({
            $add: [4, { $multiply: [3, null] }]
        })).to.equal(null);

        expect(evalExpr({ $add: [4, { $toUpper: 'foo' }] })).to.equal(null);
        expect(evalExpr({ $add: [4, { $literal: 'foo' }] })).to.equal(null);
        expect(evalExpr({ x: { $add: [4, null] } })).to.deep.equal({ x: null });
    });
});

describe('string', function () {
    describe('$concat', function () {
        it('should report refs', function () {
            expect(build({ $concat: ['$x'] }).has_refs).to.be.true;
            expect(build({ $concat: ['foo'] }).has_refs).to.be.false;
            expect(build({ y: { $concat: ['$x'] } }).has_refs).to.be.true;
            expect(build({ y: { $concat: ['foo'] } }).has_refs).to.be.false;
        });

        it('should concatenate strings', function () {
            expect(evalExpr({ $concat: ['foo', 'bar'] })).to.equal('foobar');

            expect(evalExpr({
                $concat: ['foo', '$s']
            }, { s: 'bar' })).to.equal('foobar');
        });

        it('should return null for non-strings ($concat)', function () {
            expect(evalExpr({ $concat: ['foo', null] })).to.equal(null);
            expect(evalExpr({ $concat: ['foo', undefined] })).to.equal(null);
            expect(evalExpr({ $concat: ['foo', {}] })).to.equal(null);
            expect(evalExpr({ $concat: ['foo', []] })).to.equal(null);
            expect(evalExpr({ $concat: ['foo', new Set()] })).to.equal(null);
            expect(evalExpr({ $concat: ['foo', new Date()] })).to.equal(null);
            expect(evalExpr({ $concat: ['foo', 4] })).to.equal(null);
            expect(evalExpr({ $concat: ['foo', true] })).to.equal(null);

            expect(evalExpr({
                $concat: ['foo', '$s']
            }, { s: null })).to.equal(null);

            expect(evalExpr({
                $concat: ['foo', { $add: [3, 2] }]
            })).to.equal(null);

            expect(evalExpr({
                $concat: ['foo', { $literal: 10 }]
            })).to.equal(null);

            expect(evalExpr({
                s: { $concat: ['foo', null] }
            })).to.deep.equal({ s: null });
        });
    });

    describe('$toLower', function () {
        it('should report refs', function () {
            expect(build({ $toLower: '$x' }).has_refs).to.be.true;
            expect(build({ $toLower: 'foo' }).has_refs).to.be.false;
            expect(build({ y: { $toLower: '$x' } }).has_refs).to.be.true;
            expect(build({ y: { $toLower: 'foo' } }).has_refs).to.be.false;
        });

        it('it should convert string to lowercase', function () {
            expect(evalExpr({ $toLower: 'FoO' })).to.equal('foo');

            expect(evalExpr({
                $toLower: '$s'
            }, { s: 'FoO' })).to.equal('foo');
        });
    });

    describe('$toUpper', function () {
        it('should report refs', function () {
            expect(build({ $toUpper: '$x' }).has_refs).to.be.true;
            expect(build({ $toUpper: 'foo' }).has_refs).to.be.false;
            expect(build({ y: { $toUpper: '$x' } }).has_refs).to.be.true;
            expect(build({ y: { $toUpper: 'foo' } }).has_refs).to.be.false;
        });

        it('should convert string to uppercase', function () {
            expect(evalExpr({ $toUpper: 'FoO' })).to.equal('FOO');

            expect(evalExpr({
                $toUpper: '$s'
            }, { s: 'FoO' })).to.equal('FOO');
        });
    });

    it('should return an empty string for non-strings (non-$concat)', function () {
        expect(evalExpr({ $toLower: null })).to.equal('');
        expect(evalExpr({ $toLower: undefined })).to.equal('');
        expect(evalExpr({ $toLower: {} })).to.equal('');
        expect(evalExpr({ $toLower: [[]] })).to.equal('');
        expect(evalExpr({ $toLower: new Set() })).to.equal('');
        expect(evalExpr({ $toLower: new Date() })).to.equal('');
        expect(evalExpr({ $toLower: 4 })).to.equal('');
        expect(evalExpr({ $toLower: true })).to.equal('');
        expect(evalExpr({ $toLower: '$s' }, { s: null })).to.equal('');
        expect(evalExpr({ $toLower: { $add: [3, 2] } })).to.equal('');
        expect(evalExpr({ $toLower: { $literal: 10 } })).to.equal('');
        expect(evalExpr({ s: { $toLower: 4 } })).to.deep.equal({ s: '' });
    });
});

describe('array', function () {
    describe('$concatArrays', function () {
        it('should report refs', function () {
            expect(build({ $concatArrays: ['$x'] }).has_refs).to.be.true;
            expect(build({ $concatArrays: [[]] }).has_refs).to.be.false;

            expect(build({
                y: { $concatArrays: ['$x'] }
            }).has_refs).to.be.true;

            expect(build({
                y: { $concatArrays: [[]] }
            }).has_refs).to.be.false;
        });

        it('should concatenate arrays', function () {
            expect(evalExpr({
                $concatArrays: [['hello', ' '], ['world']]
            })).to.deep.equal(['hello', ' ', 'world']);

            expect(evalExpr({
                $concatArrays: ['$a', '$b']
            }, {
                a: ['hello', ' '],
                b: [['world'], 'again']
            })).to.deep.equal(['hello', ' ', ['world'], 'again']);
        });
    });
});

describe('date', function () {
    var date = new Date('2014-01-01T08:15:39.736Z');

    describe('$dayOfMonth', function () {
        it('should report refs', function () {
            expect(build({ $dayOfMonth: '$x' }).has_refs).to.be.true;
            expect(build({ $dayOfMonth: date }).has_refs).to.be.false;
            expect(build({ d: { $dayOfMonth: '$x' } }).has_refs).to.be.true;
            expect(build({ d: { $dayOfMonth: date } }).has_refs).to.be.false;
        });

        it('should return day of month of a date', function () {
            expect(evalExpr({ $dayOfMonth: date })).to.equal(1);
            expect(evalExpr({ $dayOfMonth: '$date' }, { date: date })).to.equal(1);
        });
    });

    describe('$year', function () {
        it('should report refs', function () {
            expect(build({ $year: '$x' }).has_refs).to.be.true;
            expect(build({ $year: date }).has_refs).to.be.false;
            expect(build({ d: { $year: '$x' } }).has_refs).to.be.true;
            expect(build({ d: { $year: date } }).has_refs).to.be.false;
        });

        it('should return year of a date', function () {
            expect(evalExpr({ $year: date })).to.equal(2014);
            expect(evalExpr({ $year: '$date' }, { date: date })).to.equal(2014);
        });
    });

    describe('$month', function () {
        it('should report refs', function () {
            expect(build({ $month: '$x' }).has_refs).to.be.true;
            expect(build({ $month: date }).has_refs).to.be.false;
            expect(build({ d: { $month: '$x' } }).has_refs).to.be.true;
            expect(build({ d: { $month: date } }).has_refs).to.be.false;
        });

        it('should return month of a date', function () {
            expect(evalExpr({ $month: date })).to.equal(1);
            expect(evalExpr({ $month: '$date' }, { date: date })).to.equal(1);
        });
    });

    describe('$hour', function () {
        it('should report refs', function () {
            expect(build({ $hour: '$x' }).has_refs).to.be.true;
            expect(build({ $hour: date }).has_refs).to.be.false;
            expect(build({ d: { $hour: '$x' } }).has_refs).to.be.true;
            expect(build({ d: { $hour: date } }).has_refs).to.be.false;
        });

        it('should return hour of a date', function () {
            expect(evalExpr({ $hour: date })).to.equal(8);
            expect(evalExpr({ $hour: '$date' }, { date: date })).to.equal(8);
        });
    });

    describe('$minute', function () {
        it('should report refs', function () {
            expect(build({ $minute: '$x' }).has_refs).to.be.true;
            expect(build({ $minute: date }).has_refs).to.be.false;
            expect(build({ d: { $minute: '$x' } }).has_refs).to.be.true;
            expect(build({ d: { $minute: date } }).has_refs).to.be.false;
        });

        it('should return minutes of a date', function () {
            expect(evalExpr({ $minute: date })).to.equal(15);
            expect(evalExpr({ $minute: '$date' }, { date: date })).to.equal(15);
        });
    });

    describe('$second', function () {
        it('should report refs', function () {
            expect(build({ $second: '$x' }).has_refs).to.be.true;
            expect(build({ $second: date }).has_refs).to.be.false;
            expect(build({ d: { $second: '$x' } }).has_refs).to.be.true;
            expect(build({ d: { $second: date } }).has_refs).to.be.false;
        });

        it('should return seconds of a date', function () {
            expect(evalExpr({ $second: date })).to.equal(39);
            expect(evalExpr({ $second: '$date' }, { date: date })).to.equal(39);
        });
    });

    describe('$millisecond', function () {
        it('should report refs', function () {
            expect(build({ $millisecond: '$x' }).has_refs).to.be.true;
            expect(build({ $millisecond: date }).has_refs).to.be.false;
            expect(build({ d: { $millisecond: '$x' } }).has_refs).to.be.true;
            expect(build({ d: { $millisecond: date } }).has_refs).to.be.false;
        });

        it('should return milliseconds of a date', function () {
            expect(evalExpr({ $millisecond: date })).to.equal(736);
            expect(evalExpr({ $millisecond: '$date' }, { date: date })).to.equal(736);
        });
    });

    it('should return null for non-dates', function () {
        expect(evalExpr({ $year: null })).to.equal(null);
        expect(evalExpr({ $year: undefined })).to.equal(null);
        expect(evalExpr({ $year: {} })).to.equal(null);
        expect(evalExpr({ $year: [[]] })).to.equal(null);
        expect(evalExpr({ $year: new Set() })).to.equal(null);
        expect(evalExpr({ $year: 4 })).to.equal(null);
        expect(evalExpr({ $year: '$s' }, { s: null })).to.equal(null);
        expect(evalExpr({ $year: true })).to.equal(null);
        expect(evalExpr({ $year: { $add: [3, 2] } })).to.equal(null);
        expect(evalExpr({ $year: { $literal: 10 } })).to.equal(null);
        expect(evalExpr({ d: { $year: 4 } })).to.deep.equal({ d: null });
    });
});