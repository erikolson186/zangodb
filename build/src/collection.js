'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Q = require('q');

var _require = require('./util.js');

var getIDBError = _require.getIDBError;
var Cursor = require('./cursor.js');
var _aggregate = require('./aggregate.js');
var _update = require('./update.js');
var _remove = require('./remove.js');

/** Class representing a collection. */

var Collection = function () {
    /** <strong>Note:</strong> Do not instantiate directly. */
    function Collection(db, name) {
        _classCallCheck(this, Collection);

        this._db = db;
        this._name = name;
        this._indexes = new Set();
    }

    /**
     * The name of the collection.
     * @type {string}
     */


    _createClass(Collection, [{
        key: '_isIndexed',
        value: function _isIndexed(path) {
            return this._indexes.has(path) || path === '_id';
        }

        /**
         * Open a cursor that satisfies the specified query criteria.
         * @param {object} [expr] The query document to filter by.
         * @param {object} [projection_spec] Specification for projection.
         * @return {Cursor}
         *
         * @example
         * col.find({ x: 4, g: { $lt: 10 } }, { k: 0 });
         */

    }, {
        key: 'find',
        value: function find(expr, projection_spec) {
            var cur = new Cursor(this, 'readonly');

            cur.filter(expr);

            if (projection_spec) {
                cur.project(projection_spec);
            }

            return cur;
        }

        /**
         * Retrieve one document that satisfies the specified query criteria.
         * @param {object} [expr] The query document to filter by.
         * @param {object} [projection_spec] Specification for projection.
         * @param {function} [cb] The result callback.
         * @return {Promise}
         *
         * @example
         * col.findOne({ x: 4, g: { $lt: 10 } }, { k: 0 });
         */

    }, {
        key: 'findOne',
        value: function findOne(expr, projection_spec, cb) {
            if (typeof projection_spec === 'function') {
                cb = projection_spec;
                projection_spec = null;
            }

            var deferred = Q.defer();
            var cur = this.find(expr, projection_spec).limit(1);

            cur.toArray(function (error, docs) {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve(docs[0]);
                }
            });

            deferred.promise.nodeify(cb);

            return deferred.promise;
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

    }, {
        key: 'aggregate',
        value: function aggregate(pipeline) {
            return _aggregate(this, pipeline);
        }
    }, {
        key: '_validate',
        value: function _validate(doc) {
            for (var field in doc) {
                if (field[0] === '$') {
                    throw Error("field name cannot start with '$'");
                }

                var value = doc[field];

                if (Array.isArray(value)) {
                    var _iteratorNormalCompletion = true;
                    var _didIteratorError = false;
                    var _iteratorError = undefined;

                    try {
                        for (var _iterator = value[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                            var element = _step.value;

                            this._validate(element);
                        }
                    } catch (err) {
                        _didIteratorError = true;
                        _iteratorError = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion && _iterator.return) {
                                _iterator.return();
                            }
                        } finally {
                            if (_didIteratorError) {
                                throw _iteratorError;
                            }
                        }
                    }
                } else if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
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

    }, {
        key: 'insert',
        value: function insert(docs, cb) {
            var _this = this;

            if (!Array.isArray(docs)) {
                docs = [docs];
            }

            var deferred = Q.defer();

            this._db._getConn(function (error, idb) {
                var trans = void 0;

                var name = _this._name;

                try {
                    trans = idb.transaction([name], 'readwrite');
                } catch (error) {
                    return deferred.reject(error);
                }

                trans.oncomplete = function () {
                    return deferred.resolve();
                };
                trans.onerror = function (e) {
                    return deferred.reject(getIDBError(e));
                };

                var store = trans.objectStore(name);

                var i = 0;

                var iterate = function iterate() {
                    var doc = docs[i];

                    try {
                        _this._validate(doc);
                    } catch (error) {
                        return deferred.reject(error);
                    }

                    var req = store.add(doc);

                    req.onsuccess = function () {
                        i++;

                        if (i < docs.length) {
                            iterate();
                        }
                    };
                };

                iterate();
            });

            deferred.promise.nodeify(cb);

            return deferred.promise;
        }
    }, {
        key: '_modify',
        value: function _modify(fn, expr, cb) {
            var deferred = Q.defer();
            var cur = new Cursor(this, 'readwrite');

            cur.filter(expr);

            fn(cur, function (error) {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve();
                }
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

    }, {
        key: 'update',
        value: function update(expr, spec, cb) {
            var fn = function fn(cur, cb) {
                return _update(cur, spec, cb);
            };

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

    }, {
        key: 'remove',
        value: function remove(expr, cb) {
            return this._modify(_remove, expr, cb);
        }
    }, {
        key: 'name',
        get: function get() {
            return this._name;
        }
    }]);

    return Collection;
}();

module.exports = Collection;