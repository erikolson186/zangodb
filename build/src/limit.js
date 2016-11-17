"use strict";

module.exports = function (cur, num) {
    var count = 0;

    var next = function next(cb) {
        if (count++ < num) {
            cur._next(function (error, doc) {
                return cb(error, doc);
            });
        } else {
            cb();
        }
    };

    return next;
};