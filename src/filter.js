const Fields = require('./lang/fields.js');

module.exports = (next, pred) => (cb) => {
    (function iterate() {
        next((error, doc, idb_cur) => {
            if (!doc) { cb(error); }
            else if (pred.run(new Fields(doc))) {
                cb(null, doc, idb_cur);
            } else { iterate(); }
        });
    })();
};
