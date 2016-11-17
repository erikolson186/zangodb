const { expect } = require('chai');

const db = new zango.Db(Math.random(), ['col']);
const col = db.collection('col');

const docs = [
    { x: 4, k: 3 },
    { x: 2, k: 9 },
    { x: 3, k: 8 }
];

before(() => col.insert(docs));
after(() => db.drop());

it('should limit the number of documents', (done) => {
    col.find().limit(2).toArray((error, docs) => {
        if (error) { throw error; }

        expect(docs).to.have.lengthOf(2);

        done();
    });
});
