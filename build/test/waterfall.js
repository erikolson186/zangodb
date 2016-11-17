"use strict";

module.exports = function (fns, cb) {
    var last = fns.pop();

    (function next() {
        var fn = fns.shift();

        if (fn) {
            fn(next);
        }
    })();

    last(cb);
};