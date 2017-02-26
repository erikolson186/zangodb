const { getIDBError } = require('./util.js');

module.exports = (cur, cb) => {
    (function iterate() {
        cur._next((error, doc, idb_cur) => {
            if (!doc) { return cb(error); }

            const idb_req = idb_cur.delete();

            idb_req.onsuccess = iterate;
            idb_req.onerror = e => cb(getIDBError(e));
        });
    })();
};
