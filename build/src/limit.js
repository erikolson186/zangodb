"use strict";

module.exports = function (_next, num) {
    var count = 0;

    var next = function next(cb) {
        if (count++ < num) {
            _next(cb);
        } else {
            cb();
        }
    };

    return next;
};