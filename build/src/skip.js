"use strict";

module.exports = function (cur, num) {
    var count = 0;

    var next = function next(cb) {
        cur._next(function (error, doc) {
            if (!doc) {
                cb(error);
            } else if (++count > num) {
                cb(null, doc);
            } else {
                next(cb);
            }
        });
    };

    return next;
};