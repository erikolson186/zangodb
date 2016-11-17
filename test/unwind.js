const { expect } = require('chai');

const db = new zango.Db(Math.random(), ['col']);
const col = db.collection('col');

const doc = { elements: [1, 3, 3] };

before(() => col.insert(doc));
after(() => db.drop());

it('should unwind an iterable', (done) => {
    const expected_docs = [
        { elements: 1 },
        { elements: 3 },
        { elements: 3 }
    ];

    col.aggregate([
        { $unwind: '$elements' }
    ]).toArray((error, docs) => {
        if (error) { throw error; }

        expect(docs).to.have.lengthOf(expected_docs.length);

        for (let doc of docs) {
            delete doc._id;

            expect(expected_docs).to.deep.include(doc);
        }

        done();
    });
});
