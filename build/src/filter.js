'use strict';

var Fields = require('./lang/fields.js');

module.exports = function (next, pred) {
    return function (cb) {
        (function iterate() {
            next(function (error, doc, idb_cur) {
                if (!doc) {
                    cb(error);
                } else if (pred.run(new Fields(doc))) {
                    cb(null, doc, idb_cur);
                } else {
                    iterate();
                }
            });
        })();
    };
};