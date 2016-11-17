const EventEmitter = require('events'),
      Q = require('q'),
      merge = require('deepmerge');

const {
    hashify,
    getIDBError
} = require('./util.js');

const filter = require('./filter.js'),
      project = require('./project.js'),
      group = require('./group.js'),
      unwind = require('./unwind.js'),
      sort = require('./sort.js'),
      skip = require('./skip.js'),
      limit = require('./limit.js');

const {
    build,
    Conjunction,
    Disjunction,
    Exists
} = require('./lang/filter.js');

const proxyCursorNext = (cur) => {
    const next = cur._next;

    return new Proxy(cur, {
        get: (obj, prop) => prop === '_next' ? next : obj[prop]
    });
};

const toIDBDirection = value => value > 0 ? 'next' : 'prev';

const joinPredicates = (preds) => {
    if (preds.length > 1) {
        return new Conjunction(preds);
    }

    return preds[0];
};

const removeClause = ({ parent, index }) => {
    parent.args.splice(index, 1);
};

/**
 * Cursor data event.
 * @event Cursor#data
 * @type {object}
 */

/**
 * Cursor end event.
 * @event Cursor#end
 */

/**
 * Class representing a query cursor.
 * <strong>Note:</strong> The filter, limit, skip, project, group,
 * unwind and sort, methods each add an additional stage to the
 * cursor pipeline and thus do not override any previous invocations.
 */
class Cursor extends EventEmitter {
    /** <strong>Note:</strong> Do not instantiate directly. */
    constructor(col, read_pref) {
        super();

        this._col = col;
        this._read_pref = read_pref;
        this._pipeline = [];
        this._getIDBReq = this._getIDBReqWithoutIndex;
        this._firstNext = this._init;
    }

    _next(cb) {
        this._firstNext((error, doc) => {
            if (error) { return cb(error); }

            if (doc) { this.emit('data', doc); }
            else { this.emit('end'); }

            cb(null, doc);
        });
    }

    _proxyCursorNext(fn, arg) {
        this._next = fn(proxyCursorNext(this), arg);

        return this;
    }

    _getIDBReqWithIndex(store) {
        const clause = this._index_clause,
              { path } = clause,
              key_range = clause.idb_key_range || null,
              direction = clause.idb_direction || 'next';

        if (path.literal === '_id') {
            return store.openCursor(key_range, direction);
        }

        const index = store.index(path.literal);
        return index.openCursor(key_range, direction);
    }

    _getIDBReqWithoutIndex(store) {
        return store.openCursor();
    }

    _onIDBReq(cb) {
        this._onIDBCur((error, cur) => {
            if (!cur) { return cb(error); }

            this._firstNext = this._progressCur;
            this._sort = this._sortWithoutIndex;

            cb(null, cur.value);
        });
    }

    _onIDBCur(cb) {
        this._idb_req.onsuccess = (e) => {
            const cur = e.target.result;

            if (cur) { this._idb_cur = cur; }

            cb(null, cur);
        };

        this._idb_req.onerror = e => cb(getIDBError(e));
    }

    _selectIndex(cb) {
        const col = this._col, clauses = this._clauses;

        let i = 0,
            clause = clauses[i],
            index_size;

        const done = () => {
            removeClause(clause);

            this._index_clause = clause;
            this._firstNext = this._openConn;
            this._firstNext(cb);
        };

        const getIndexSize = ({ path }, cb) => {
            col._getIndexSize(path.literal, cb);
        };

        const iterate = () => {
            if (++i === clauses.length) { return done(); }

            const new_clause = clauses[i];

            getIndexSize(new_clause, (error, size) => {
                if (error) { return cb(error); }

                if (size < index_size) {
                    clause = new_clause;
                    index_size = size;
                }

                iterate();
            });
        };

        getIndexSize(clause, (error, size) => {
            if (error) { return cb(error); }

            index_size = size;

            iterate();
        });
    }

    _openConn(cb) {
        const col = this._col, read_pref = this._read_pref;

        col._db._getConn((error, idb) => {
            if (error) { return cb(error); }

            try {
                const trans = idb.transaction([col._name], read_pref);
                trans.onerror = e => cb(getIDBError(e));

                const store = trans.objectStore(col._name);

                this._idb_req = this._getIDBReq(store);
                this._onIDBReq(cb);
            } catch (error) { cb(error); }
        });
    }

    _progressCur(cb) {
        this._onIDBCur((error, cur) => {
            if (!cur) { cb(error); }
            else { cb(null, cur.value); }
        });

        this._idb_cur.continue();
    }

    _forEach(fn, cb) {
        this._next((error, doc) => {
            if (!doc) { return cb(error); }

            fn(doc);

            this.forEach(fn, cb);
        });
    }

    /**
     * Iterate over each document and apply a function.
     * @param {function} [fn] The function to apply to each document.
     * @param {function} [cb] The result callback.
     * @return {Promise}
     *
     * @example
     * col.find().forEach((doc) => {
     *     console.log('doc:', doc);
     * }, (error) => {
     *     if (error) { throw error; }
     * });
     */
    forEach(fn = () => { }, cb) {
        const deferred = Q.defer();

        this._forEach(fn, (error) => {
            if (error) { deferred.reject(error); }
            else { deferred.resolve(); }
        });

        deferred.promise.nodeify(cb);

        return deferred.promise;
    }

    _toArray(cb) {
        const docs = [];

        this._forEach((doc) => {
            docs.push(doc);
        }, error => cb(error, docs));
    }

    /**
     * Collect all documents as an array.
     * @param {function} [cb] The result callback.
     * @return {Promise}
     *
     * @example
     * col.find().toArray((error, docs) => {
     *     if (error) { throw error; }
     *
     *     for (let doc of docs) {
     *         console.log('doc:', doc);
     *     }
     * });
     */
    toArray(cb) {
        const deferred = Q.defer();

        this._toArray((error, docs) => {
            if (error) { deferred.reject(error); }
            else { deferred.resolve(docs); }
        });

        deferred.promise.nodeify(cb);

        return deferred.promise;
    }

    _assertUnopened() {
        if (this._opened) {
            throw Error('cursor has already been opened');
        }
    }

    /**
     * Suggest an index to use.
     * <strong>Note:</strong> When an index hint is used only documents
     * that contain the indexed path will be in the results.
     * @param {string} path An indexed path to use.
     * @return {Cursor}
     *
     * @example
     * col.find().hint('myindex');
     */
    hint(path) {
        this._assertUnopened();

        if (!this._col._isIndexed(path)) {
            throw Error(`index '${path}' does not exist`);
        }

        this._hint = path;

        return this;
    }

    _filter(pred) {
        if (pred) { this._pipeline.push([filter, pred]); }
        else { this._has_false_pred = true; }
    }

    /**
     * Filter documents.
     * @param {object} expr The query document to filter by.
     * @return {Cursor}
     *
     * @example
     * col.find().filter({ x: 4 });
     */
    filter(expr) {
        this._assertUnopened();

        const pred = build(expr);

        if (pred || pred === false) { this._filter(pred); }

        return this;
    }

    /**
     * Limit the number of documents that can be iterated.
     * @param {number} num The limit.
     * @return {Cursor}
     *
     * @example
     * col.find().limit(10);
     */
    limit(num) {
        this._assertUnopened();
        this._pipeline.push([limit, num]);

        return this;
    }

    /**
     * Skip over a specified number of documents.
     * @param {number} num The number of documents to skip.
     * @return {Cursor}
     *
     * @example
     * col.find().skip(4);
     */
    skip(num) {
        this._assertUnopened();
        this._pipeline.push([skip, num]);

        return this;
    }

    /**
     * Add new fields, and include or exclude pre-existing fields.
     * @param {object} spec Specification for projection.
     * @return {Cursor}
     *
     * @example
     * col.find().project({ _id: 0, x: 1, n: { $add: ['$k', 4] } });
     */
    project(spec) {
        this._assertUnopened();
        this._pipeline.push([project, spec]);

        return this;
    }

    /**
     * Group documents by an _id and optionally add computed fields.
     * @param {object} spec Specification for grouping documents.
     * @return {Cursor}
     *
     * @example
     * col.find().group({
     *     _id: '$author',
     *     books: { $push: '$book' },
     *     count: { $sum: 1 }
     * });
     */
    group(spec) {
        this._assertUnopened();
        this._pipeline.push([group, spec]);

        return this;
    }

    /**
     * Deconstruct an iterable and output a document for each element.
     * @param {string} path A path to an iterable to unwind.
     * @return {Cursor}
     *
     * @example
     * col.find().unwind('$elements');
     */
    unwind(path) {
        this._assertUnopened();
        this._pipeline.push([unwind, path]);

        return this;
    }

    /**
     * Sort documents.
     * <strong>Note:</strong> An index will not be used for sorting
     * unless the query predicate references one of the fields to
     * sort by or {@link Cursor#hint} is used. This is so as not to exclude
     * documents that do not contain the indexed field, in accordance
     * with the functionality of MongoDB.
     * @param {object} spec Specification for sorting.
     * @return {Cursor}
     *
     * @example
     * // No indexes will be used for sorting.
     * col.find().sort({ x: 1 });
     *
     * @example
     * // If x is indexed, it will be used for sorting.
     * col.find({ x: { $gt: 4 } }).sort({ x: 1 });
     *
     * @example
     * // If x is indexed, it will be used for sorting.
     * col.find().sort({ x: 1 }).hint('x');
     */
    sort(spec) {
        this._assertUnopened();
        this._pipeline.push([sort, spec]);

        return this;
    }

    _initSort(spec, clauses) {
        const new_clauses = [];

        for (let clause of clauses) {
            const { path } = clause;
            if (!spec.hasOwnProperty(path.literal)) { continue; }

            const order = spec[path.literal];
            clause.idb_direction = toIDBDirection(order);

            new_clauses.push(clause);
        }

        if (new_clauses.length) { return new_clauses; }

        this._proxyCursorNext(sort, spec);

        return clauses;
    }

    _initClauses(pred) {
        if (!pred) { return []; }

        const clauses = [], exists_clauses = [];

        for (let clause of pred.getClauses()) {
            if (this._col._isIndexed(clause.path.literal)) {
                if (clause instanceof Exists) {
                    exists_clauses.push(clause);
                } else { clauses.push(clause); }
            }
        }

        if (clauses.length) { return clauses; }

        return exists_clauses;
    }

    _onClauses(clauses, pred) {
        if (clauses.length) {
            this._getIDBReq = this._getIDBReqWithIndex;

            if (clauses.length > 1) {
                this._clauses = clauses;
                this._firstNext = this._selectIndex;
            } else {
                const clause = clauses[0];

                this._index_clause = clause;
                this._firstNext = this._openConn;

                if (!pred || clause === pred) { return; }

                removeClause(clause);
            }
        } else {
            this._firstNext = this._openConn;

            if (!pred) { return; }
        }

        this._proxyCursorNext(filter, pred);
    }

    _initHint(hint, clauses) {
        const new_clauses = [];

        for (let clause of clauses) {
            if (clause.path.literal === hint) {
                new_clauses.push(clause);
            }
        }

        if (new_clauses.length) { return new_clauses; }

        return [{ path: { literal: hint } }];
    }

    _initParallelFilter(pred) {
        const curs = [];

        for (let node of pred.args) {
            const cur = new Cursor(this._col, this._read_pref);

            cur._filter(node);
            curs.push(cur);
        }

        const _id_hashes = new Set();

        const onDoc = (doc) => {
            const _id_hash = hashify(doc._id);

            if (!_id_hashes.has(_id_hash)) {
                return _id_hashes.add(_id_hash);
            }
        };

        const getCur = () => curs.pop();
        let current_cur = getCur();

        const changeCur = (cb) => {
            if (current_cur = getCur()) { next(cb); }
            else { cb(); }
        };

        const next = (cb) => {
            current_cur._next((error, doc) => {
                if (error) { cb(error); }
                else if (!doc) { changeCur(cb); }
                else if (onDoc(doc)) { cb(null, doc); }
                else { next(cb); }
            });
        };

        this._firstNext = next;

        Object.defineProperty(this, '_idb_cur', {
            get: () => current_cur._idb_cur
        });
    }

    _init(cb) {
        this._opened = true;

        if (this._has_false_pred) {
            return (this._next = cb => cb())(cb);
        }

        const pipeline = this._pipeline,
              preds = [],
              sort_specs = [];

        for (var i = 0; i < pipeline.length; i++) {
            const [fn, arg] = pipeline[i];

            if (fn === sort) { sort_specs.push(arg); }
            else if (fn === filter) { preds.push(arg); }
            else { break; }
        }

        const pred = joinPredicates(preds);
        const sort_spec = sort_specs.reduce(merge, {});

        if (pred instanceof Disjunction) {
            this._initParallelFilter(pred);

            if (sort_specs.length) {
                this._proxyCursorNext(sort, sort_spec);
            }
        } else {
            const hint = this._hint;
            let clauses = this._initClauses(pred);

            if (hint) { clauses = this._initHint(hint, clauses); }

            if (sort_specs.length) {
                clauses = this._initSort(sort_spec, clauses);
            }

            this._onClauses(clauses, pred);
        }

        for (; i < pipeline.length; i++) {
            const [fn, arg] = pipeline[i];

            this._proxyCursorNext(fn, arg);
        }

        this._next(cb);
    }
}

module.exports = Cursor;
