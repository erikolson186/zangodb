'use strict';

var _require = require('chai'),
    expect = _require.expect;

var _require2 = require('../src/lang/filter.js'),
    build = _require2.build,
    Fields = require('../src/lang/fields.js'),
    waterfall = require('./waterfall.js');

var db = new zango.Db(Math.random(), { col: ['x', 'g'] });
var col = db.collection('col');

var docs = [{ x: 2, g: 3 }, { x: 2, g: 8 }, { x: 2, g: 8, z: 10 }, { x: 3, z: 3 }, { x: 4, k: 8 }, { x: 6, g: 9 }, { x: 10, k: 4 }, { x: undefined }, { x: null }, { x: [{ k: 2 }, { k: 8 }] }];

before(function () {
    return col.insert(docs);
});
after(function () {
    return db.drop();
});

var query = function query(expr, done) {
    var cur = col.findOne(expr);

    var pred = build(expr);
    var fn = function fn(doc) {
        return pred.run(new Fields(doc));
    };

    var expected_doc = docs.filter(fn)[0];
    expect(expected_doc).to.exist;

    cur.then(function (doc) {
        delete doc._id;
        expect(expected_doc).to.deep.equal(doc);
        done();
    }).catch(function (e) {
        return console.log(e);
    });
};

describe('equality (without $eq)', function () {
    it('should test for equality', function (done) {
        waterfall([function (next) {
            return query({ x: 4 }, next);
        }, function (next) {
            return query({ x: undefined }, next);
        }, function (next) {
            return query({ x: null }, next);
        }], done);
    });
});

describe('$eq', function () {
    it('should test for equality', function (done) {
        query({ x: { $eq: 4 } }, done);
    });
});

describe('conjunction without $and', function () {
    it('should perform conjunction', function (done) {
        query({ x: 2, g: 3 }, done);
    });
});

describe('$and', function () {
    it('should perform conjunction', function (done) {
        query({ $and: [{ x: 2 }, { g: 3 }] }, done);
    });
});

describe('$or', function () {
    it('should perform disjunction', function (done) {
        waterfall([function (next) {
            return query({ $or: [{ x: 2 }, { g: 3 }] }, next);
        }, function (next) {
            query({
                $or: [{ $or: [{ x: 2 }, { g: 3 }] }, { z: 8 }]
            }, next);
        }], done);
    });
});

describe('$gt', function () {
    it('should perform greater than comparison', function (done) {
        query({ x: { $gt: 3 } }, done);
    });
});

describe('$gte', function () {
    it('should perform greater than or equal comparison', function (done) {
        query({ x: { $gte: 6 } }, done);
    });
});

describe('$lt', function () {
    it('should perform less than comparison', function (done) {
        query({ x: { $lt: 8 } }, done);
    });
});

describe('$lte', function () {
    it('should perform less than or equal comparison', function (done) {
        query({ x: { $lte: 6 } }, done);
    });
});

describe('$gt and $lt', function () {
    it('should perform gt and lt comparison', function (done) {
        query({ x: { $gt: 3, $lt: 8 } }, done);
    });
});

describe('$gte and $lt', function () {
    it('should perform gte and lt comparison', function (done) {
        query({ x: { $gte: 3, $lt: 8 } }, done);
    });
});

describe('$gt and $lte', function () {
    it('should perform gt and lte comparison', function (done) {
        query({ x: { $gt: 3, $lte: 8 } }, done);
    });
});

describe('$gte and $lte', function () {
    it('should perform gte and lte comparison', function (done) {
        query({ x: { $gte: 3, $lte: 8 } }, done);
    });
});

describe('$in', function () {
    it('should perform disjunction equality test', function (done) {
        query({ x: { $in: [2, 4, 8] } }, done);
    });
});

describe('$nin', function () {
    it('should perform conjunction inequality test', function (done) {
        query({ x: { $nin: [2, 4, 8] } }, done);
    });
});

describe('$elemMatch', function () {
    it('should test if any iterable elements satisify a predicate', function (done) {
        query({ x: { $elemMatch: { k: 8 } } }, done);
    });
});

describe('$exists', function () {
    it('should test if document contains a field', function (done) {
        query({ g: { $exists: 1 } }, done);
    });

    it("should test if document doesn't contain a field", function (done) {
        query({ g: { $exists: 0 } }, done);
    });
});