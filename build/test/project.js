'use strict';

var _require = require('chai');

var expect = _require.expect;


var waterfall = require('./waterfall.js');

var db = new zango.Db(Math.random(), ['col']);
var col = db.collection('col');

var doc = {
    _id: 1,
    x: 4,
    k: { g: 3, z: 8 },
    a: [3, 6, 4],
    str: 'FoO'
};

before(function () {
    return col.insert(doc);
});
after(function () {
    return db.drop();
});

var project = function project(spec, expected_doc, done) {
    var cur = col.find({}, spec);

    cur.toArray(function (error, docs) {
        if (error) {
            throw error;
        }

        expect(docs).to.have.lengthOf(1);
        expect(docs[0]).to.deep.equal(expected_doc);

        done();
    });
};

it('should support inclusion of pre-existing fields', function (done) {
    project({ x: 1, str: 1 }, { _id: 1, x: 4, str: 'FoO' }, done);
});

it('should support inclusion of pre-existing sub fields', function (done) {
    project({
        'k.g': 1,
        'a.1': 1
    }, {
        _id: 1,
        k: { g: 3 },
        a: [, 6]
    }, done);
});

it('should support exclusion of pre-existing fields', function (done) {
    project({ k: 0, a: 0 }, { _id: 1, x: 4, str: 'FoO' }, done);
});

it('should support exclusion of pre-existing sub fields', function (done) {
    project({
        'k.g': 0,
        'a.1': 0
    }, {
        _id: 1,
        x: 4,
        k: { z: 8 },
        a: [3,, 4],
        str: 'FoO'
    }, done);
});

it("should support inclusion of '_id' field", function (done) {
    waterfall([function (next) {
        project({
            _id: 1,
            k: 0,
            a: 0
        }, {
            _id: 1,
            x: 4,
            str: 'FoO'
        }, next);
    }, function (next) {
        project({
            _id: 0,
            k: 0,
            a: 0
        }, {
            x: 4,
            str: 'FoO'
        }, next);
    }], done);
});

it("should support exclusion of '_id' field", function (done) {
    waterfall([function (next) {
        project({
            _id: 0,
            x: 1,
            str: 1
        }, {
            x: 4,
            str: 'FoO'
        }, next);
    }, function (next) {
        project({
            _id: 1,
            x: 1,
            str: 1
        }, {
            _id: 1,
            x: 4,
            str: 'FoO'
        }, next);
    }], done);
});

it('should support addition of new computed fields', function (done) {
    var expected_doc = Object.assign({ s: 'FOO' }, doc);

    project({ s: { $toUpper: '$str' } }, expected_doc, done);
});

it('should support addition of new literal fields', function (done) {
    var expected_doc = Object.assign({ t: 8 }, doc);

    project({ t: { $literal: 8 } }, expected_doc, done);
});