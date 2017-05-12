'use strict';

var _require = require('chai'),
    expect = _require.expect;

var db = new zango.Db(Math.random(), ['col']);
var col = db.collection('col');

var docs = [{ x: 4, k: 3 }, { x: 2, k: 9 }, { x: 3, k: 8 }];

before(function () {
    return col.insert(docs);
});
after(function () {
    return db.drop();
});

it('should skip a specified number of documents', function (done) {
    col.find().skip(2).toArray(function (error, docs) {
        if (error) {
            throw error;
        }

        expect(docs).to.have.lengthOf(1);

        done();
    });
});