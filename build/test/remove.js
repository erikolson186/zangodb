'use strict';

var _require = require('chai');

var expect = _require.expect;


var db = new zango.Db(Math.random(), { col: ['x'] });
var col = db.collection('col');

var docs = [{ x: 4, k: 3 }, { x: 2, k: 9 }, { x: 3, k: 8 }];

before(function () {
    return col.insert(docs);
});
after(function () {
    return db.drop();
});

it('should delete documents', function (done) {
    col.remove({ x: 4 }, function (error) {
        if (error) {
            throw error;
        }

        col.find().toArray(function (error, docs) {
            if (error) {
                throw error;
            }

            expect(docs).to.have.lengthOf(2);
            expect(docs).to.not.deep.include({ _id: 1, x: 4, k: 3 });

            done();
        });
    });
});