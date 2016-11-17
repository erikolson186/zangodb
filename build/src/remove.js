'use strict';

var _require = require('./util.js');

var getIDBError = _require.getIDBError;


module.exports = function (cur, cb) {
    (function iterate() {
        cur._next(function (error, doc) {
            if (!doc) {
                return cb(error);
            }

            var req = cur._idb_cur.delete();

            req.onsuccess = iterate;
            req.onerror = function (e) {
                return cb(getIDBError(e));
            };
        });
    })();
};