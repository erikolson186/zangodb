const { expect } = require('chai');

const waterfall = require('./waterfall.js');

const db = new zango.Db(Math.random(), ['col']);
const col = db.collection('col');

const doc = {
    _id: 1,
    x: 4,
    k: { g: 3, z: 8 },
    a: [3, 6, 4],
    str: 'FoO'
};

before(() => col.insert(doc));
after(() => db.drop());

const project = (spec, expected_doc, done) => {
    const cur = col.find({}, spec);

    cur.toArray((error, docs) => {
        if (error) { throw error; }

        expect(docs).to.have.lengthOf(1);
        expect(docs[0]).to.deep.equal(expected_doc);

        done();
    });
};

it('should support inclusion of pre-existing fields', (done) => {
    project({ x: 1, str: 1 }, { _id: 1, x: 4, str: 'FoO' }, done);
});

it('should support inclusion of pre-existing sub fields', (done) => {
    project({
        'k.g': 1,
        'a.1': 1
    }, {
        _id: 1,
        k: { g: 3 },
        a: [, 6]
    }, done);
});

it('should support exclusion of pre-existing fields', (done) => {
    project({ k: 0, a: 0 }, { _id: 1, x: 4, str: 'FoO' }, done);
});

it('should support exclusion of pre-existing sub fields', (done) => {
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

it("should support inclusion of '_id' field", (done) => {
    waterfall([
        (next) => {
            project({
                _id: 1,
                k: 0,
                a: 0
            }, {
                _id: 1,
                x: 4,
                str: 'FoO'
            }, next);
        },

        (next) => {
            project({
                _id: 0,
                k: 0,
                a: 0
            }, {
                x: 4,
                str: 'FoO'
            }, next);
        }
    ], done);
});

it("should support exclusion of '_id' field", (done) => {
    waterfall([
        (next) => {
            project({
                _id: 0,
                x: 1,
                str: 1
            }, {
                x: 4,
                str: 'FoO'
            }, next);
        },

        (next) => {
            project({
                _id: 1,
                x: 1,
                str: 1
            }, {
                _id: 1,
                x: 4,
                str: 'FoO'
            }, next);
        }
    ], done);
});

it('should support addition of new computed fields', (done) => {
    const expected_doc = Object.assign({ s: 'FOO' }, doc);

    project({ s: { $toUpper: '$str' } }, expected_doc, done);
});

it('should support addition of new literal fields', (done) => {
    const expected_doc = Object.assign({ t: 8 }, doc);

    project({ t: { $literal: 8 } }, expected_doc, done);
});
