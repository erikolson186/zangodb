'use strict';

var _require = require('chai');

var expect = _require.expect;


var db = new zango.Db(Math.random(), ['col']);
var col = db.collection('col');

var doc = {
    k: 3,
    t: 4,
    a: [3, 4, 8],
    n: [8, 2],
    m: { x: 80 }
};

after(function () {
    return db.drop();
});

var _id = 0;

var update = function update(spec, expected_doc, done) {
    ++_id;

    var new_doc = Object.assign({ _id: _id }, doc);

    col.insert(new_doc).then(function () {
        return col.update({ _id: _id }, spec);
    }).then(function () {
        return col.find({ _id: _id }).toArray();
    }).then(function (docs) {
        expect(docs).to.have.lengthOf(1);

        var doc = docs[0];
        delete doc._id;

        expect(doc).to.deep.equal(expected_doc);

        done();
    }).fail(done);
};

it('should set the value of a field without $set', function (done) {
    update({
        x: 10
    }, {
        x: 10,
        k: 3,
        t: 4,
        a: [3, 4, 8],
        n: [8, 2],
        m: { x: 80 }
    }, done);
});

describe('$set', function () {
    it('should set the value of a field', function (done) {
        update({
            $set: { x: 30 }
        }, {
            x: 30,
            k: 3,
            t: 4,
            a: [3, 4, 8],
            n: [8, 2],
            m: { x: 80 }
        }, done);
    });

    it('should set the value of a sub-field', function (done) {
        update({
            $set: { 'm.x': 30 }
        }, {
            k: 3,
            t: 4,
            a: [3, 4, 8],
            n: [8, 2],
            m: { x: 30 }
        }, done);
    });
});

describe('$unset', function () {
    it('should support the removal of fields', function (done) {
        update({
            $unset: { k: 1 }
        }, {
            t: 4,
            a: [3, 4, 8],
            n: [8, 2],
            m: { x: 80 }
        }, done);
    });

    it('should support the removal of sub-fields', function (done) {
        update({
            $unset: { 'm.x': 1 }
        }, {
            k: 3,
            t: 4,
            a: [3, 4, 8],
            n: [8, 2],
            m: {}
        }, done);
    });
});

describe('$rename', function () {
    it('should supporting renaming of fields', function (done) {
        update({
            $rename: { k: 'g' }
        }, {
            g: 3,
            t: 4,
            a: [3, 4, 8],
            n: [8, 2],
            m: { x: 80 }
        }, done);
    });

    it('should supporting renaming of sub-fields', function (done) {
        update({
            $rename: { 'm.x': 'g' }
        }, {
            k: 3,
            t: 4,
            a: [3, 4, 8],
            n: [8, 2],
            m: { g: 80 }
        }, done);
    });
});

describe('$inc', function () {
    it('should support incrementing the value of a field', function (done) {
        update({
            $inc: { k: 2 }
        }, {
            k: 5,
            t: 4,
            a: [3, 4, 8],
            n: [8, 2],
            m: { x: 80 }
        }, done);
    });

    it('should support incrementing the value of a sub-field', function (done) {
        update({
            $inc: { 'm.x': 2 }
        }, {
            k: 3,
            t: 4,
            a: [3, 4, 8],
            n: [8, 2],
            m: { x: 82 }
        }, done);
    });
});

describe('$mul', function () {
    it('should support multiplying the value of a field', function (done) {
        update({
            $mul: { k: 2 }
        }, {
            k: 6,
            t: 4,
            a: [3, 4, 8],
            n: [8, 2],
            m: { x: 80 }
        }, done);
    });

    it('should support multiplying the value of a sub-field', function (done) {
        update({
            $mul: { 'm.x': 2 }
        }, {
            k: 3,
            t: 4,
            a: [3, 4, 8],
            n: [8, 2],
            m: { x: 160 }
        }, done);
    });
});

describe('$min', function () {
    it('should update to the minimum value', function (done) {
        update({
            $min: { k: 3, t: 1 }
        }, {
            k: 3,
            t: 1,
            a: [3, 4, 8],
            n: [8, 2],
            m: { x: 80 }
        }, done);
    });
});

describe('$max', function () {
    it('should update to the maximum value', function (done) {
        update({
            $max: { k: 3, t: 10 }
        }, {
            k: 3,
            t: 10,
            a: [3, 4, 8],
            n: [8, 2],
            m: { x: 80 }
        }, done);
    });
});

describe('$push', function () {
    it('should push a value to an array', function (done) {
        update({
            $push: { a: 9 }
        }, {
            k: 3,
            t: 4,
            a: [3, 4, 8, 9],
            n: [8, 2],
            m: { x: 80 }
        }, done);
    });
});

describe('$pop', function () {
    it('should remove the first or last element of an array', function (done) {
        update({
            $pop: { a: 1, n: -1 }
        }, {
            k: 3,
            t: 4,
            a: [3, 4],
            n: [2],
            m: { x: 80 }
        }, done);
    });
});

describe('$pullAll', function () {
    it('', function (done) {
        update({
            $pullAll: { a: [3, 8] }
        }, {
            k: 3,
            t: 4,
            a: [4],
            n: [8, 2],
            m: { x: 80 }
        }, done);
    });
});

describe('$pull', function () {
    it('should remove instances of a value from an array', function (done) {
        update({
            $pull: { a: 4 }
        }, {
            k: 3,
            t: 4,
            a: [3, 8],
            n: [8, 2],
            m: { x: 80 }
        }, done);
    });
});

describe('$addToSet', function () {
    it('should add a unique value to an array', function (done) {
        update({
            $addToSet: { a: 3, n: 4 }
        }, {
            k: 3,
            t: 4,
            a: [3, 4, 8],
            n: [8, 2, 4],
            m: { x: 80 }
        }, done);
    });
});