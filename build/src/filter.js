'use strict';

var Fields = require('./lang/fields.js');

module.exports = function (cur, pred) {
    return function (cb) {
        (function iterate() {
            cur._next(function (error, doc) {
                if (!doc) {
                    cb(error);
                } else if (pred.run(new Fields(doc))) {
                    cb(null, doc);
                } else {
                    iterate();
                }
            });
        })();
    };
};