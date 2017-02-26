'use strict';

var _require = require('./util.js');

var getIDBError = _require.getIDBError;


module.exports = function (cur, cb) {
    (function iterate() {
        cur._next(function (error, doc, idb_cur) {
            if (!doc) {
                return cb(error);
            }

            var idb_req = idb_cur.delete();

            idb_req.onsuccess = iterate;
            idb_req.onerror = function (e) {
                return cb(getIDBError(e));
            };
        });
    })();
};