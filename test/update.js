const { expect } = require('chai');

const db = new zango.Db(Math.random(), ['col']);
const col = db.collection('col');

const doc = {
    k: 3,
    t: 4,
    a: [3, 4, 8],
    n: [8, 2],
    m: { x: 80 }
};

after(() => db.drop());

let _id = 0;

const update = (spec, expected_doc, done) => {
    ++_id;

    const new_doc = Object.assign({ _id }, doc);

    col.insert(new_doc)
        .then(() => col.update({ _id }, spec))
        .then(() => col.find({ _id }).toArray())
        .then((docs) => {
            expect(docs).to.have.lengthOf(1);

            const doc = docs[0];
            delete doc._id;

            expect(doc).to.deep.equal(expected_doc);

            done();
        })
        .fail(done);
};

it('should set the value of a field without $set', (done) => {
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

describe('$set', () => {
    it('should set the value of a field', (done) => {
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

    it('should set the value of a sub-field', (done) => {
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

describe('$unset', () => {
    it('should support the removal of fields', (done) => {
        update({
            $unset: { k: 1 }
        }, {
            t: 4,
            a: [3, 4, 8],
            n: [8, 2],
            m: { x: 80 }
        }, done);
    });

    it('should support the removal of sub-fields', (done) => {
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

describe('$rename', () => {
    it('should supporting renaming of fields', (done) => {
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

    it('should supporting renaming of sub-fields', (done) => {
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

describe('$inc', () => {
    it('should support incrementing the value of a field', (done) => {
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

    it('should support incrementing the value of a sub-field', (done) => {
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

describe('$mul', () => {
    it('should support multiplying the value of a field', (done) => {
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

    it('should support multiplying the value of a sub-field', (done) => {
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

describe('$min', () => {
    it('should update to the minimum value', (done) => {
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

describe('$max', () => {
    it('should update to the maximum value', (done) => {
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

describe('$push', () => {
    it('should push a value to an array', (done) => {
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

describe('$pop', () => {
    it('should remove the first or last element of an array', (done) => {
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

describe('$pullAll', () => {
    it('', (done) => {
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

describe('$pull', () => {
    it('should remove instances of a value from an array', (done) => {
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

describe('$addToSet', () => {
    it('should add a unique value to an array', (done) => {
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
