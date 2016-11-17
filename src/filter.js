const Fields = require('./lang/fields.js');

module.exports = (cur, pred) => (cb) => {
    (function iterate() {
        cur._next((error, doc) => {
            if (!doc) { cb(error); }
            else if (pred.run(new Fields(doc))) {
                cb(null, doc);
            } else { iterate(); }
        });
    })();
};
