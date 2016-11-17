'use strict';

var _require = require('chai');

var expect = _require.expect;


var docs = [{ x: 2, g: 1 }, { x: 2, g: 4 }, { x: 2, g: 4 }, { x: 2, g: 3 }, { x: 8, g: 8 }, { x: 8, g: 8 }, { x: 8, g: 6 }, { x: 8, g: 2 }];

var db = new zango.Db(Math.random(), ['col']);
var col = db.collection('col');

before(function () {
    return col.insert(docs);
});
after(function () {
    return db.drop();
});

var group = function group(spec, expected_docs, done) {
    col.aggregate([{ $group: spec }]).toArray(function (error, docs) {
        if (error) {
            throw error;
        }

        expect(docs).to.have.lengthOf(expected_docs.length);

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = docs[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var doc = _step.value;

                expect(expected_docs).to.deep.include(doc);
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

        done();
    });
};

describe('grouping', function () {
    it('should group by a literal value', function (done) {
        group({ _id: null }, [{ _id: null }], done);
    });

    it('should group by a referenced value', function (done) {
        group({ _id: '$x' }, [{ _id: 2 }, { _id: 8 }], done);
    });
});

describe('$sum', function () {
    it('should compute the sum of a literal value', function (done) {
        group({
            _id: '$x',
            sum: { $sum: 1 }
        }, [{ _id: 2, sum: 4 }, { _id: 8, sum: 4 }], done);
    });

    it('should compute the sum of a referenced value', function (done) {
        group({
            _id: '$x',
            sum: { $sum: '$g' }
        }, [{ _id: 2, sum: 12 }, { _id: 8, sum: 24 }], done);
    });
});

describe('$avg', function () {
    it('should compute the average of a literal value', function (done) {
        group({
            _id: '$x',
            avg: { $avg: 1 }
        }, [{ _id: 2, avg: 1 }, { _id: 8, avg: 1 }], done);
    });

    it('should compute the average of a referenced value', function (done) {
        group({
            _id: '$x',
            avg: { $avg: '$g' }
        }, [{ _id: 2, avg: 3 }, { _id: 8, avg: 6 }], done);
    });
});

describe('$push', function () {
    it('should push a literal value to an array', function (done) {
        group({
            _id: '$x',
            array: { $push: 1 }
        }, [{ _id: 2, array: [1, 1, 1, 1] }, { _id: 8, array: [1, 1, 1, 1] }], done);
    });

    it('should push a referenced value to an array', function (done) {
        group({
            _id: '$x',
            array: { $push: '$g' }
        }, [{ _id: 2, array: [1, 4, 4, 3] }, { _id: 8, array: [8, 8, 6, 2] }], done);
    });
});

describe('$addToSet', function () {
    it('should push a unique literal value to an array', function (done) {
        group({
            _id: '$x',
            array: { $addToSet: 1 }
        }, [{ _id: 2, array: [1] }, { _id: 8, array: [1] }], done);
    });

    it('should push a unique referenced value to an array', function (done) {
        group({
            _id: '$x',
            array: { $addToSet: '$g' }
        }, [{ _id: 2, array: [1, 4, 3] }, { _id: 8, array: [8, 6, 2] }], done);
    });
});

describe('$max', function () {
    it('should retrieve the max literal value', function (done) {
        group({
            _id: '$x',
            max: { $max: 1 }
        }, [{ _id: 2, max: 1 }, { _id: 8, max: 1 }], done);
    });

    it('should retrieve the max referenced value', function (done) {
        group({
            _id: '$x',
            max: { $max: '$g' }
        }, [{ _id: 2, max: 4 }, { _id: 8, max: 8 }], done);
    });
});

describe('$min', function () {
    it('should retrieve the min literal value', function (done) {
        group({
            _id: '$x',
            min: { $min: 1 }
        }, [{ _id: 2, min: 1 }, { _id: 8, min: 1 }], done);
    });

    it('should retrieve the min referenced value', function (done) {
        group({
            _id: '$x',
            min: { $min: '$g' }
        }, [{ _id: 2, min: 1 }, { _id: 8, min: 2 }], done);
    });
});