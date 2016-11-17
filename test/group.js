const { expect } = require('chai');

const docs = [
    { x: 2, g: 1 },
    { x: 2, g: 4 },
    { x: 2, g: 4 },
    { x: 2, g: 3 },
    { x: 8, g: 8 },
    { x: 8, g: 8 },
    { x: 8, g: 6 },
    { x: 8, g: 2 }
];

const db = new zango.Db(Math.random(), ['col']);
const col = db.collection('col');

before(() => col.insert(docs));
after(() => db.drop());

const group = (spec, expected_docs, done) => {
    col.aggregate([{ $group: spec }]).toArray((error, docs) => {
        if (error) { throw error; }

        expect(docs).to.have.lengthOf(expected_docs.length);

        for (let doc of docs) {
            expect(expected_docs).to.deep.include(doc);
        }

        done();
    });
};


describe('grouping', () => {
    it('should group by a literal value', (done) => {
        group({ _id: null }, [{ _id: null }], done);
    });

    it('should group by a referenced value', (done) => {
        group({ _id: '$x' }, [{ _id: 2 }, { _id: 8 }], done);
    });
});

describe('$sum', () => {
    it('should compute the sum of a literal value', (done) => {
        group({
            _id: '$x',
            sum: { $sum: 1 }
        }, [
            { _id: 2, sum: 4 },
            { _id: 8, sum: 4 }
        ], done);
    });

    it('should compute the sum of a referenced value', (done) => {
        group({
            _id: '$x',
            sum: { $sum: '$g' }
        }, [
            { _id: 2, sum: 12 },
            { _id: 8, sum: 24 }
        ], done);
    });
});

describe('$avg', () => {
    it('should compute the average of a literal value', (done) => {
        group({
            _id: '$x',
            avg: { $avg: 1 }
        }, [
            { _id: 2, avg: 1 },
            { _id: 8, avg: 1 }
        ], done);
    });

    it('should compute the average of a referenced value', (done) => {
        group({
            _id: '$x',
            avg: { $avg: '$g' }
        }, [
            { _id: 2, avg: 3 },
            { _id: 8, avg: 6 }
        ], done);
    });
});

describe('$push', () => {
    it('should push a literal value to an array', (done) => {
        group({
            _id: '$x',
            array: { $push: 1 }
        }, [
            { _id: 2, array: [1, 1, 1, 1] },
            { _id: 8, array: [1, 1, 1, 1] }
        ], done);
    });

    it('should push a referenced value to an array', (done) => {
        group({
            _id: '$x',
            array: { $push: '$g' }
        }, [
            { _id: 2, array: [1, 4, 4, 3] },
            { _id: 8, array: [8, 8, 6, 2] }
        ], done);
    });
});

describe('$addToSet', () => {
    it('should push a unique literal value to an array', (done) => {
        group({
            _id: '$x',
            array: { $addToSet: 1 }
        }, [
            { _id: 2, array: [1] },
            { _id: 8, array: [1] }
        ], done);
    });

    it('should push a unique referenced value to an array', (done) => {
        group({
            _id: '$x',
            array: { $addToSet: '$g' }
        }, [
            { _id: 2, array: [1, 4, 3] },
            { _id: 8, array: [8, 6, 2] }
        ], done);
    });
});

describe('$max', () => {
    it('should retrieve the max literal value', (done) => {
        group({
            _id: '$x',
            max: { $max: 1 }
        }, [
            { _id: 2, max: 1 },
            { _id: 8, max: 1 }
        ], done);
    });

    it('should retrieve the max referenced value', (done) => {
        group({
            _id: '$x',
            max: { $max: '$g' }
        }, [
            { _id: 2, max: 4 },
            { _id: 8, max: 8 }
        ], done);
    });
});

describe('$min', () => {
    it('should retrieve the min literal value', (done) => {
        group({
            _id: '$x',
            min: { $min: 1 }
        }, [
            { _id: 2, min: 1 },
            { _id: 8, min: 1 }
        ], done);
    });

    it('should retrieve the min referenced value', (done) => {
        group({
            _id: '$x',
            min: { $min: '$g' }
        }, [
            { _id: 2, min: 1 },
            { _id: 8, min: 2 }
        ], done);
    });
});
