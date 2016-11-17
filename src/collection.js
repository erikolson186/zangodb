const Q = require('q');

const { getIDBError } = require('./util.js'),
      Cursor = require('./cursor.js'),
      aggregate = require('./aggregate.js'),
      update = require('./update.js'),
      remove = require('./remove.js');

/** Class representing a collection. */
class Collection {
    /** <strong>Note:</strong> Do not instantiate directly. */
    constructor(db, name) {
        this._db = db;
        this._name = name;
        this._indexes = new Set();
    }

    /**
     * The name of the collection.
     * @type {string}
     */
    get name() { return this._name; }

    _isIndexed(path) {
        return this._indexes.has(path) || path === '_id';
    }

    _getIndexSize(path, cb) {
        let count = 0;

        this._db._getConn((error, idb) => {
            if (error) { return cb(error); }

            const trans = idb.transaction([this._name], 'readonly');

            trans.oncomplete = () => cb(null, count);
            trans.onerror = e => cb(getIDBError(e));

            const store = trans.objectStore(this._name),
                  index = store.index(path),
                  req = index.count();

            req.onsuccess = e => count = e.target.result;
        });
    }

    /**
     * Open a cursor and optionally filter documents and apply a projection.
     * @param {object} [expr] The query document to filter by.
     * @param {object} [projection_spec] Specification for projection.
     * @return {Cursor}
     *
     * @example
     * col.find({ x: 4, g: { $lt: 10 } }, { k: 0 });
     */
    find(expr, projection_spec) {
        const cur = new Cursor(this, 'readonly');

        cur.filter(expr);

        if (projection_spec) { cur.project(projection_spec); }

        return cur;
    }

    /**
     * Evaluate an aggregation framework pipeline.
     * @param {object[]} pipeline The pipeline.
     * @return {Cursor}
     *
     * @example
     * col.aggregate([
     *     { $match: { x: { $lt: 8 } } },
     *     { $group: { _id: '$x', array: { $push: '$y' } } },
     *     { $unwind: '$array' }
     * ]);
     */
    aggregate(pipeline) { return aggregate(this, pipeline); }

    _validate(doc) {
        for (let field in doc) {
            if (field[0] === '$') {
                throw Error("field name cannot start with '$'");
            }

            const value = doc[field];

            if (Array.isArray(value)) {
                for (let element of value) { this._validate(element); }
            } else if (typeof value === 'object') {
                this._validate(value);
            }
        }
    }

    /**
     * @param {object|object[]} docs Documents to insert.
     * @param {function} [cb] The result callback.
     * @return {Promise}
     *
     * @example
     * col.insert([{ x: 4 }, { k: 8 }], (error) => {
     *     if (error) { throw error; }
     * });
     *
     * @example
     * col.insert({ x: 4 }, (error) => {
     *     if (error) { throw error; }
     * });
     */
    insert(docs, cb) {
        if (!Array.isArray(docs)) { docs = [docs]; }

        const deferred = Q.defer();

        this._db._getConn((error, idb) => {
            let trans;

            try {
                trans = idb.transaction([this._name], 'readwrite');
            } catch (error) { return deferred.reject(error); }

            trans.oncomplete = () => deferred.resolve();
            trans.onerror = e => deferred.reject(getIDBError(e));

            const store = trans.objectStore(this._name);

            let i = 0;

            const iterate = () => {
                const doc = docs[i];

                try { this._validate(doc); }
                catch (error) { return deferred.reject(error); }

                const req = store.add(doc);

                req.onsuccess = () => {
                    i++;

                    if (i < docs.length) { iterate(); }
                };
            };

            iterate();
        });

        deferred.promise.nodeify(cb);

        return deferred.promise;
    }

    _modify(fn, expr, cb) {
        const deferred = Q.defer();
        const cur = new Cursor(this, 'readwrite');

        cur.filter(expr);

        fn(cur, (error) => {
            if (error) { deferred.reject(error); }
            else { deferred.resolve(); }
        });

        deferred.promise.nodeify(cb);

        return deferred.promise;
    }

    /**
     * Update documents that match a filter.
     * @param {object} expr The query document to filter by.
     * @param {object} spec Specification for updating.
     * @param {function} [cb] The result callback.
     * @return {Promise}
     *
     * @example
     * col.update({
     *     age: { $gte: 18 }
     * }, {
     *     adult: true
     * }, (error) => {
     *     if (error) { throw error; }
     * });
     */
    update(expr, spec, cb) {
        const fn = (cur, cb) => update(cur, spec, cb);

        return this._modify(fn, expr, cb);
    }

    /**
     * Delete documents that match a filter.
     * @param {object} expr The query document to filter by.
     * @param {function} [cb] The result callback.
     * @return {Promise}
     *
     * @example
     * col.remove({ x: { $ne: 10 } }, (error) => {
     *     if (error) { throw error; }
     * });
     */
    remove(expr, cb) {
        return this._modify(remove, expr, cb);
    }
}

module.exports = Collection;
