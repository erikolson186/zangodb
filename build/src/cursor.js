'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events');
var Q = require('q');

var createNextFn = require('./create_next_fn.js'),
    _filter = require('./filter.js'),
    _project = require('./project.js'),
    _group = require('./group.js'),
    _unwind = require('./unwind.js'),
    _sort = require('./sort.js'),
    _skip = require('./skip.js'),
    _limit = require('./limit.js');

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

var Cursor = function (_EventEmitter) {
    _inherits(Cursor, _EventEmitter);

    /** <strong>Note:</strong> Do not instantiate directly. */
    function Cursor(col, read_pref) {
        _classCallCheck(this, Cursor);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Cursor).call(this));

        _this._col = col;
        _this._read_pref = read_pref;
        _this._pipeline = [];
        _this._next = _this._init;
        return _this;
    }

    _createClass(Cursor, [{
        key: '_forEach',
        value: function _forEach(fn, cb) {
            var _this2 = this;

            this._next(function (error, doc) {
                if (doc) {
                    fn(doc);

                    _this2.emit('data', doc);
                    _this2._forEach(fn, cb);
                } else {
                    _this2.emit('end');

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

    }, {
        key: 'forEach',
        value: function forEach() {
            var fn = arguments.length <= 0 || arguments[0] === undefined ? function () {} : arguments[0];
            var cb = arguments[1];

            var deferred = Q.defer();

            this._forEach(fn, function (error) {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve();
                }
            });

            deferred.promise.nodeify(cb);

            return deferred.promise;
        }
    }, {
        key: '_toArray',
        value: function _toArray(cb) {
            var docs = [];

            this._forEach(function (doc) {
                docs.push(doc);
            }, function (error) {
                return cb(error, docs);
            });
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

    }, {
        key: 'toArray',
        value: function toArray(cb) {
            var deferred = Q.defer();

            this._toArray(function (error, docs) {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve(docs);
                }
            });

            deferred.promise.nodeify(cb);

            return deferred.promise;
        }
    }, {
        key: '_assertUnopened',
        value: function _assertUnopened() {
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

    }, {
        key: 'hint',
        value: function hint(path) {
            this._assertUnopened();

            if (!this._col._isIndexed(path)) {
                throw Error('index \'' + path + '\' does not exist');
            }

            this._hint = path;

            return this;
        }
    }, {
        key: '_addStage',
        value: function _addStage(fn, arg) {
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

    }, {
        key: 'filter',
        value: function filter(expr) {
            return this._addStage(_filter, expr);
        }

        /**
         * Limit the number of documents that can be iterated.
         * @param {number} num The limit.
         * @return {Cursor}
         *
         * @example
         * col.find().limit(10);
         */

    }, {
        key: 'limit',
        value: function limit(num) {
            return this._addStage(_limit, num);
        }

        /**
         * Skip over a specified number of documents.
         * @param {number} num The number of documents to skip.
         * @return {Cursor}
         *
         * @example
         * col.find().skip(4);
         */

    }, {
        key: 'skip',
        value: function skip(num) {
            return this._addStage(_skip, num);
        }

        /**
         * Add new fields, and include or exclude pre-existing fields.
         * @param {object} spec Specification for projection.
         * @return {Cursor}
         *
         * @example
         * col.find().project({ _id: 0, x: 1, n: { $add: ['$k', 4] } });
         */

    }, {
        key: 'project',
        value: function project(spec) {
            return this._addStage(_project, spec);
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

    }, {
        key: 'group',
        value: function group(spec) {
            return this._addStage(_group, spec);
        }

        /**
         * Deconstruct an iterable and output a document for each element.
         * @param {string} path A path to an iterable to unwind.
         * @return {Cursor}
         *
         * @example
         * col.find().unwind('$elements');
         */

    }, {
        key: 'unwind',
        value: function unwind(path) {
            return this._addStage(_unwind, path);
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

    }, {
        key: 'sort',
        value: function sort(spec) {
            return this._addStage(_sort, spec);
        }
    }, {
        key: '_init',
        value: function _init(cb) {
            this._opened = true;
            this._next = createNextFn(this);
            this._next(cb);
        }
    }]);

    return Cursor;
}(EventEmitter);

module.exports = Cursor;