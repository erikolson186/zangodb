'use strict';

var _require = require('chai');

var expect = _require.expect;


var db = new zango.Db(Math.random(), ['col']);
var col = db.collection('col');

var doc = { elements: [1, 3, 3] };

before(function () {
    return col.insert(doc);
});
after(function () {
    return db.drop();
});

it('should unwind an iterable', function (done) {
    var expected_docs = [{ elements: 1 }, { elements: 3 }, { elements: 3 }];

    col.aggregate([{ $unwind: '$elements' }]).toArray(function (error, docs) {
        if (error) {
            throw error;
        }

        expect(docs).to.have.lengthOf(expected_docs.length);

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = docs[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var _doc = _step.value;

                delete _doc._id;

                expect(expected_docs).to.deep.include(_doc);
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
});