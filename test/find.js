const { expect } = require('chai');

const { build } = require('../src/lang/filter.js'),
      Fields = require('../src/lang/fields.js'),
      waterfall = require('./waterfall.js');

const db = new zango.Db(Math.random(), { col: ['x', 'g'] });
const col = db.collection('col');

const docs = [
    { x: 4, k: 8 },
    { x: 2, g: 3 },
    { x: 3, z: 3 },
    { x: 6, g: 9 },
    { x: 10, k: 4 },
    { x: 2, g: 8 },
    { x: 2, g: 8, z: 10 },
    { x: undefined },
    { x: null },
    { x: [{ k: 2 }, { k: 8 }] }
];

before(() => col.insert(docs));
after(() => db.drop());

const query = (expr, done) => {
    const cur = col.find(expr);

    const pred = build(expr);
    const fn = doc => pred.run(new Fields(doc));

    const expected_docs = docs.filter(fn);
    expect(expected_docs).to.have.length.above(0);

    cur.toArray((error, docs) => {
        if (error) { throw error; }

        expect(docs).to.have.lengthOf(expected_docs.length);

        for (let doc of docs) {
            delete doc._id;

            expect(expected_docs).to.deep.include(doc);
        }

        done();
    });
};

describe('equality (without $eq)', () => {
    it('should test for equality', (done) => {
        waterfall([
            next => query({ x: 4 }, next),
            next => query({ x: undefined }, next),
            next => query({ x: null }, next)
        ], done);
    });
});

describe('$eq', () => {
    it('should test for equality', (done) => {
        query({ x: { $eq: 4 } }, done);
    });
});

describe('conjunction without $and', () => {
    it('should perform conjunction', (done) => {
        query({ x: 2, g: 3 }, done);
    });
});

describe('$and', () => {
    it('should perform conjunction', (done) => {
        query({ $and: [{ x: 2 }, { g: 3 }] }, done);
    });
});

describe('$or', () => {
    it('should perform disjunction', (done) => {
        waterfall([
            next => query({ $or: [{ x: 2 }, { g: 3 }] }, next),

            (next) => {
                query({
                    $or: [{ $or: [{ x: 2 }, { g: 3 }] }, { z: 8 }]
                }, next);
            }
        ], done);
    });
});

describe('$gt', () => {
    it('should perform greater than comparison', (done) => {
        query({ x: { $gt: 3 } }, done);
    });
});

describe('$gte', () => {
    it('should perform greater than or equal comparison', (done) => {
        query({ x: { $gte: 6 } }, done);
    });
});

describe('$lt', () => {
    it('should perform less than comparison', (done) => {
        query({ x: { $lt: 8 } }, done);
    });
});

describe('$lte', () => {
    it('should perform less than or equal comparison', (done) => {
        query({ x: { $lte: 6 } }, done);
    });
});

describe('$gt and $lt', () => {
    it('should perform gt and lt comparison', (done) => {
        query({ x: { $gt: 3, $lt: 8 } }, done);
    });
});

describe('$gte and $lt', () => {
    it('should perform gte and lt comparison', (done) => {
        query({ x: { $gte: 3, $lt: 8 } }, done);
    });
});

describe('$gt and $lte', () => {
    it('should perform gt and lte comparison', (done) => {
        query({ x: { $gt: 3, $lte: 8 } }, done);
    });
});

describe('$gte and $lte', () => {
    it('should perform gte and lte comparison', (done) => {
        query({ x: { $gte: 3, $lte: 8 } }, done);
    });
});

describe('$in', () => {
    it('should perform disjunction equality test', (done) => {
        query({ x: { $in: [2, 4, 8] } }, done);
    });
});

describe('$nin', () => {
    it('should perform conjunction inequality test', (done) => {
        query({ x: { $nin: [2, 4, 8] } }, done);
    });
});

describe('$elemMatch', () => {
    it('should test if any iterable elements satisify a predicate', (done) => {
        query({ x: { $elemMatch: { k: 8 } } }, done);
    });
});

describe('$exists', () => {
    it('should test if document contains a field', (done) => {
        query({ g: { $exists: 1 } }, done);
    });

    it("should test if document doesn't contain a field", (done) => {
        query({ g: { $exists: 0 } }, done);
    });
});
