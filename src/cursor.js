const EventEmitter = require('events');
const Q = require('q');

const createNextFn = require('./create_next_fn.js'),
      filter = require('./filter.js'),
      project = require('./project.js'),
      group = require('./group.js'),
      unwind = require('./unwind.js'),
      sort = require('./sort.js'),
      skip = require('./skip.js'),
      limit = require('./limit.js');

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
        this._next = this._init;
    }

    _forEach(fn, cb) {
        this._next((error, doc) => {
            if (doc) {
                fn(doc);

                this.emit('data', doc);
                this._forEach(fn, cb);
            } else {
                this.emit('end');

                cb(error);
            }
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

    _addStage(fn, arg) {
        this._assertUnopened();
        this._pipeline.push([fn, arg]);

        return this;
    }

    /**
     * Filter documents.
     * @param {object} expr The query document to filter by.
     * @return {Cursor}
     *
     * @example
     * col.find().filter({ x: 4 });
     */
    filter(expr) { return this._addStage(filter, expr); }

    /**
     * Limit the number of documents that can be iterated.
     * @param {number} num The limit.
     * @return {Cursor}
     *
     * @example
     * col.find().limit(10);
     */
    limit(num) { return this._addStage(limit, num); }

    /**
     * Skip over a specified number of documents.
     * @param {number} num The number of documents to skip.
     * @return {Cursor}
     *
     * @example
     * col.find().skip(4);
     */
    skip(num) { return this._addStage(skip, num); }

    /**
     * Add new fields, and include or exclude pre-existing fields.
     * @param {object} spec Specification for projection.
     * @return {Cursor}
     *
     * @example
     * col.find().project({ _id: 0, x: 1, n: { $add: ['$k', 4] } });
     */
    project(spec) { return this._addStage(project, spec); }

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
    group(spec) { return this._addStage(group, spec); }

    /**
     * Deconstruct an iterable and output a document for each element.
     * @param {string} path A path to an iterable to unwind.
     * @return {Cursor}
     *
     * @example
     * col.find().unwind('$elements');
     */
    unwind(path) { return this._addStage(unwind, path); }

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
    sort(spec) { return this._addStage(sort, spec); }

    _init(cb) {
        this._opened = true;
        this._next = createNextFn(this);
        this._next(cb);
    }
}

module.exports = Cursor;
