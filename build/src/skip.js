"use strict";

module.exports = function (_next, num) {
    var count = 0;

    var next = function next(cb) {
        _next(function (error, doc) {
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