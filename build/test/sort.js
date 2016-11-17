'use strict';

var _require = require('chai');

var expect = _require.expect;


var db = new zango.Db(Math.random(), { col: ['x'] });
var col = db.collection('col');

var docs = [{ x: 4, k: 3 }, { x: 2, k: 9 }, { x: 3, k: 8 }];

before(function () {
    return col.insert(docs);
});
after(function () {
    return db.drop();
});

var _sort = function _sort(spec) {
    return col.find().sort(spec);
};

var sort = function sort(cur, expected_docs, done) {
    cur.toArray(function (error, docs) {
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

                delete doc._id;

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

var sortWithIndex = function sortWithIndex(spec) {
    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
    }

    sort.apply(undefined, [_sort(spec).hint('x')].concat(args));
};

var sortWithoutIndex = function sortWithoutIndex(spec) {
    for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
    }

    sort.apply(undefined, [_sort(spec)].concat(args));
};

it('should sort by ascending using index', function (done) {
    sortWithIndex({
        x: 1
    }, [{ x: 2, k: 9 }, { x: 3, k: 8 }, { x: 4, k: 3 }], done);
});

it('should sort by ascending without index', function (done) {
    sortWithoutIndex({
        k: 1
    }, [{ x: 4, k: 3 }, { x: 3, k: 8 }, { x: 2, k: 9 }], done);
});

it('should sort by descending using index', function (done) {
    sortWithIndex({
        x: -1
    }, [{ x: 4, k: 3 }, { x: 3, k: 8 }, { x: 2, k: 9 }], done);
});

it('should sort by descending without index', function (done) {
    sortWithoutIndex({
        k: -1
    }, [{ x: 2, k: 9 }, { x: 3, k: 8 }, { x: 4, k: 3 }], done);
});