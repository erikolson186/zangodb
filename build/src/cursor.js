'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events'),
    Q = require('q'),
    merge = require('deepmerge');

var _require = require('./util.js');

var hashify = _require.hashify;
var getIDBError = _require.getIDBError;


var filter = require('./filter.js'),
    _project = require('./project.js'),
    _group = require('./group.js'),
    _unwind = require('./unwind.js'),
    _sort = require('./sort.js'),
    _skip = require('./skip.js'),
    _limit = require('./limit.js');

var _require2 = require('./lang/filter.js');

var build = _require2.build;
var Conjunction = _require2.Conjunction;
var Disjunction = _require2.Disjunction;
var Exists = _require2.Exists;


var proxyCursorNext = function proxyCursorNext(cur) {
    var next = cur._next;

    return new Proxy(cur, {
        get: function get(obj, prop) {
            return prop === '_next' ? next : obj[prop];
        }
    });
};

var toIDBDirection = function toIDBDirection(value) {
    return value > 0 ? 'next' : 'prev';
};

var joinPredicates = function joinPredicates(preds) {
    if (preds.length > 1) {
        return new Conjunction(preds);
    }

    return preds[0];
};

var removeClause = function removeClause(_ref) {
    var parent = _ref.parent;
    var index = _ref.index;

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

var Cursor = function (_EventEmitter) {
    _inherits(Cursor, _EventEmitter);

    /** <strong>Note:</strong> Do not instantiate directly. */
    function Cursor(col, read_pref) {
        _classCallCheck(this, Cursor);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Cursor).call(this));

        _this._col = col;
        _this._read_pref = read_pref;
        _this._pipeline = [];
        _this._getIDBReq = _this._getIDBReqWithoutIndex;
        _this._firstNext = _this._init;
        return _this;
    }

    _createClass(Cursor, [{
        key: '_next',
        value: function _next(cb) {
            var _this2 = this;

            this._firstNext(function (error, doc) {
                if (error) {
                    return cb(error);
                }

                if (doc) {
                    _this2.emit('data', doc);
                } else {
                    _this2.emit('end');
                }

                cb(null, doc);
            });
        }
    }, {
        key: '_proxyCursorNext',
        value: function _proxyCursorNext(fn, arg) {
            this._next = fn(proxyCursorNext(this), arg);

            return this;
        }
    }, {
        key: '_getIDBReqWithIndex',
        value: function _getIDBReqWithIndex(store) {
            var clause = this._index_clause;
            var path = clause.path;
            var key_range = clause.idb_key_range || null;
            var direction = clause.idb_direction || 'next';

            if (path.literal === '_id') {
                return store.openCursor(key_range, direction);
            }

            var index = store.index(path.literal);
            return index.openCursor(key_range, direction);
        }
    }, {
        key: '_getIDBReqWithoutIndex',
        value: function _getIDBReqWithoutIndex(store) {
            return store.openCursor();
        }
    }, {
        key: '_onIDBReq',
        value: function _onIDBReq(cb) {
            var _this3 = this;

            this._onIDBCur(function (error, cur) {
                if (!cur) {
                    return cb(error);
                }

                _this3._firstNext = _this3._progressCur;
                _this3._sort = _this3._sortWithoutIndex;

                cb(null, cur.value);
            });
        }
    }, {
        key: '_onIDBCur',
        value: function _onIDBCur(cb) {
            var _this4 = this;

            this._idb_req.onsuccess = function (e) {
                var cur = e.target.result;

                if (cur) {
                    _this4._idb_cur = cur;
                }

                cb(null, cur);
            };

            this._idb_req.onerror = function (e) {
                return cb(getIDBError(e));
            };
        }
    }, {
        key: '_selectIndex',
        value: function _selectIndex(cb) {
            var _this5 = this;

            var col = this._col,
                clauses = this._clauses;

            var i = 0,
                clause = clauses[i],
                index_size = void 0;

            var done = function done() {
                removeClause(clause);

                _this5._index_clause = clause;
                _this5._firstNext = _this5._openConn;
                _this5._firstNext(cb);
            };

            var getIndexSize = function getIndexSize(_ref2, cb) {
                var path = _ref2.path;

                col._getIndexSize(path.literal, cb);
            };

            var iterate = function iterate() {
                if (++i === clauses.length) {
                    return done();
                }

                var new_clause = clauses[i];

                getIndexSize(new_clause, function (error, size) {
                    if (error) {
                        return cb(error);
                    }

                    if (size < index_size) {
                        clause = new_clause;
                        index_size = size;
                    }

                    iterate();
                });
            };

            getIndexSize(clause, function (error, size) {
                if (error) {
                    return cb(error);
                }

                index_size = size;

                iterate();
            });
        }
    }, {
        key: '_openConn',
        value: function _openConn(cb) {
            var _this6 = this;

            var col = this._col,
                read_pref = this._read_pref;

            col._db._getConn(function (error, idb) {
                if (error) {
                    return cb(error);
                }

                try {
                    var trans = idb.transaction([col._name], read_pref);
                    trans.onerror = function (e) {
                        return cb(getIDBError(e));
                    };

                    var store = trans.objectStore(col._name);

                    _this6._idb_req = _this6._getIDBReq(store);
                    _this6._onIDBReq(cb);
                } catch (error) {
                    cb(error);
                }
            });
        }
    }, {
        key: '_progressCur',
        value: function _progressCur(cb) {
            this._onIDBCur(function (error, cur) {
                if (!cur) {
                    cb(error);
                } else {
                    cb(null, cur.value);
                }
            });

            this._idb_cur.continue();
        }
    }, {
        key: '_forEach',
        value: function _forEach(fn, cb) {
            var _this7 = this;

            this._next(function (error, doc) {
                if (!doc) {
                    return cb(error);
                }

                fn(doc);

                _this7.forEach(fn, cb);
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
        key: '_filter',
        value: function _filter(pred) {
            if (pred) {
                this._pipeline.push([filter, pred]);
            } else {
                this._has_false_pred = true;
            }
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
            this._assertUnopened();

            var pred = build(expr);

            if (pred || pred === false) {
                this._filter(pred);
            }

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

    }, {
        key: 'limit',
        value: function limit(num) {
            this._assertUnopened();
            this._pipeline.push([_limit, num]);

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

    }, {
        key: 'skip',
        value: function skip(num) {
            this._assertUnopened();
            this._pipeline.push([_skip, num]);

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

    }, {
        key: 'project',
        value: function project(spec) {
            this._assertUnopened();
            this._pipeline.push([_project, spec]);

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

    }, {
        key: 'group',
        value: function group(spec) {
            this._assertUnopened();
            this._pipeline.push([_group, spec]);

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

    }, {
        key: 'unwind',
        value: function unwind(path) {
            this._assertUnopened();
            this._pipeline.push([_unwind, path]);

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

    }, {
        key: 'sort',
        value: function sort(spec) {
            this._assertUnopened();
            this._pipeline.push([_sort, spec]);

            return this;
        }
    }, {
        key: '_initSort',
        value: function _initSort(spec, clauses) {
            var new_clauses = [];

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = clauses[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var clause = _step.value;
                    var path = clause.path;

                    if (!spec.hasOwnProperty(path.literal)) {
                        continue;
                    }

                    var order = spec[path.literal];
                    clause.idb_direction = toIDBDirection(order);

                    new_clauses.push(clause);
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

            if (new_clauses.length) {
                return new_clauses;
            }

            this._proxyCursorNext(_sort, spec);

            return clauses;
        }
    }, {
        key: '_initClauses',
        value: function _initClauses(pred) {
            if (!pred) {
                return [];
            }

            var clauses = [],
                exists_clauses = [];

            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = pred.getClauses()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var clause = _step2.value;

                    if (this._col._isIndexed(clause.path.literal)) {
                        if (clause instanceof Exists) {
                            exists_clauses.push(clause);
                        } else {
                            clauses.push(clause);
                        }
                    }
                }
            } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion2 && _iterator2.return) {
                        _iterator2.return();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }

            if (clauses.length) {
                return clauses;
            }

            return exists_clauses;
        }
    }, {
        key: '_onClauses',
        value: function _onClauses(clauses, pred) {
            if (clauses.length) {
                this._getIDBReq = this._getIDBReqWithIndex;

                if (clauses.length > 1) {
                    this._clauses = clauses;
                    this._firstNext = this._selectIndex;
                } else {
                    var clause = clauses[0];

                    this._index_clause = clause;
                    this._firstNext = this._openConn;

                    if (!pred || clause === pred) {
                        return;
                    }

                    removeClause(clause);
                }
            } else {
                this._firstNext = this._openConn;

                if (!pred) {
                    return;
                }
            }

            this._proxyCursorNext(filter, pred);
        }
    }, {
        key: '_initHint',
        value: function _initHint(hint, clauses) {
            var new_clauses = [];

            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
                for (var _iterator3 = clauses[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var clause = _step3.value;

                    if (clause.path.literal === hint) {
                        new_clauses.push(clause);
                    }
                }
            } catch (err) {
                _didIteratorError3 = true;
                _iteratorError3 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion3 && _iterator3.return) {
                        _iterator3.return();
                    }
                } finally {
                    if (_didIteratorError3) {
                        throw _iteratorError3;
                    }
                }
            }

            if (new_clauses.length) {
                return new_clauses;
            }

            return [{ path: { literal: hint } }];
        }
    }, {
        key: '_initParallelFilter',
        value: function _initParallelFilter(pred) {
            var curs = [];

            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {
                for (var _iterator4 = pred.args[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                    var node = _step4.value;

                    var cur = new Cursor(this._col, this._read_pref);

                    cur._filter(node);
                    curs.push(cur);
                }
            } catch (err) {
                _didIteratorError4 = true;
                _iteratorError4 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion4 && _iterator4.return) {
                        _iterator4.return();
                    }
                } finally {
                    if (_didIteratorError4) {
                        throw _iteratorError4;
                    }
                }
            }

            var _id_hashes = new Set();

            var onDoc = function onDoc(doc) {
                var _id_hash = hashify(doc._id);

                if (!_id_hashes.has(_id_hash)) {
                    return _id_hashes.add(_id_hash);
                }
            };

            var getCur = function getCur() {
                return curs.pop();
            };
            var current_cur = getCur();

            var changeCur = function changeCur(cb) {
                if (current_cur = getCur()) {
                    next(cb);
                } else {
                    cb();
                }
            };

            var next = function next(cb) {
                current_cur._next(function (error, doc) {
                    if (error) {
                        cb(error);
                    } else if (!doc) {
                        changeCur(cb);
                    } else if (onDoc(doc)) {
                        cb(null, doc);
                    } else {
                        next(cb);
                    }
                });
            };

            this._firstNext = next;

            Object.defineProperty(this, '_idb_cur', {
                get: function get() {
                    return current_cur._idb_cur;
                }
            });
        }
    }, {
        key: '_init',
        value: function _init(cb) {
            this._opened = true;

            if (this._has_false_pred) {
                return (this._next = function (cb) {
                    return cb();
                })(cb);
            }

            var pipeline = this._pipeline,
                preds = [],
                sort_specs = [];

            for (var i = 0; i < pipeline.length; i++) {
                var _pipeline$i = _slicedToArray(pipeline[i], 2);

                var fn = _pipeline$i[0];
                var arg = _pipeline$i[1];


                if (fn === _sort) {
                    sort_specs.push(arg);
                } else if (fn === filter) {
                    preds.push(arg);
                } else {
                    break;
                }
            }

            var pred = joinPredicates(preds);
            var sort_spec = sort_specs.reduce(merge, {});

            if (pred instanceof Disjunction) {
                this._initParallelFilter(pred);

                if (sort_specs.length) {
                    this._proxyCursorNext(_sort, sort_spec);
                }
            } else {
                var hint = this._hint;
                var clauses = this._initClauses(pred);

                if (hint) {
                    clauses = this._initHint(hint, clauses);
                }

                if (sort_specs.length) {
                    clauses = this._initSort(sort_spec, clauses);
                }

                this._onClauses(clauses, pred);
            }

            for (; i < pipeline.length; i++) {
                var _pipeline$i2 = _slicedToArray(pipeline[i], 2);

                var fn = _pipeline$i2[0];
                var arg = _pipeline$i2[1];


                this._proxyCursorNext(fn, arg);
            }

            this._next(cb);
        }
    }]);

    return Cursor;
}(EventEmitter);

module.exports = Cursor;