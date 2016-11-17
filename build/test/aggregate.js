'use strict';

var _require = require('chai');

var expect = _require.expect;


describe('$match', function () {
    var db = new zango.Db(Math.random(), ['col']);
    var col = db.collection('col');

    var docs = [{ x: 4, k: 2 }, { x: 4, k: 3 }];

    before(function () {
        return col.insert(docs);
    });
    after(function () {
        return db.drop();
    });

    it('should match documents', function (done) {
        col.aggregate([{ $match: { x: 4 } }, { $match: { k: 2 } }, { $match: {} }]).toArray(function (error, docs) {
            if (error) {
                throw error;
            }

            expect(docs).to.have.lengthOf(1);

            delete docs[0]._id;
            expect(docs[0]).to.deep.equal({ x: 4, k: 2 });

            done();
        });
    });
});

describe('$group', function () {
    return require('./group.js');
});
describe('$unwind', function () {
    return require('./unwind.js');
});