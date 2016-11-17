const { getIDBError } = require('./util.js');

module.exports = (cur, cb) => {
    (function iterate() {
        cur._next((error, doc) => {
            if (!doc) { return cb(error); }

            const req = cur._idb_cur.delete();

            req.onsuccess = iterate;
            req.onerror = e => cb(getIDBError(e));
        });
    })();
};
