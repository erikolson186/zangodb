(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _require = require('./util.js'),
    unknownOp = _require.unknownOp;

var Cursor = require('./cursor.js');

var ops = {
    $match: function $match(cur, doc) {
        return cur.filter(doc);
    },
    $project: function $project(cur, spec) {
        return cur.project(spec);
    },
    $group: function $group(cur, spec) {
        return cur.group(spec);
    },
    $unwind: function $unwind(cur, path) {
        return cur.unwind(path);
    },
    $sort: function $sort(cur, spec) {
        return cur.sort(spec);
    },
    $skip: function $skip(cur, num) {
        return cur.skip(num);
    },
    $limit: function $limit(cur, num) {
        return cur.limit(num);
    }
};

var getStageObject = function getStageObject(doc) {
    var op_keys = Object.keys(doc);

    if (op_keys.length > 1) {
        throw Error('stages must be passed only one operator');
    }

    var op_key = op_keys[0],
        fn = ops[op_key];

    if (!fn) {
        unknownOp(op_key);
    }

    return [fn, doc[op_key]];
};

var aggregate = function aggregate(col, pipeline) {
    var cur = new Cursor(col, 'readonly');

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = pipeline[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var doc = _step.value;

            var _getStageObject = getStageObject(doc),
                _getStageObject2 = _slicedToArray(_getStageObject, 2),
                fn = _getStageObject2[0],
                arg = _getStageObject2[1];

            fn(cur, arg);
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

    return cur;
};

module.exports = aggregate;
},{"./cursor.js":4,"./util.js":21}],2:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Q = require('q');

var _require = require('./util.js'),
    getIDBError = _require.getIDBError,
    Cursor = require('./cursor.js'),
    _aggregate = require('./aggregate.js'),
    _update = require('./update.js'),
    _remove = require('./remove.js');

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
         * Open a cursor and optionally filter documents and apply a projection.
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
         * Returns one document that satisfies the specified query criteria
         * @param {object} [expr] The query document to filter by.
         * @param {object} [projection_spec] Specification for projection.
         * @return {Promise} resolves with first document matching the query
         *
         * @example
         * col.findOne({ x: 4, g: { $lt: 10 } }, { k: 0 });
         */

    }, {
        key: 'findOne',
        value: function findOne(expr, projection_spec) {
            var cur = this.find(expr, projection_spec).limit(1);
            return cur.toArray().then(function (docs) {
                return docs[0];
            });
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
},{"./aggregate.js":1,"./cursor.js":4,"./remove.js":16,"./update.js":20,"./util.js":21,"q":181}],3:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var merge = require('deepmerge');

var _require = require('./util.js'),
    hashify = _require.hashify,
    getIDBError = _require.getIDBError,
    filter = require('./filter.js'),
    sort = require('./sort.js');

var _require2 = require('./lang/filter.js'),
    build = _require2.build,
    Conjunction = _require2.Conjunction,
    Disjunction = _require2.Disjunction,
    Exists = _require2.Exists;

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
    var parent = _ref.parent,
        index = _ref.index;

    parent.args.splice(index, 1);
};

var openConn = function openConn(_ref2, cb) {
    var col = _ref2.col,
        read_pref = _ref2.read_pref;

    col._db._getConn(function (error, idb) {
        if (error) {
            return cb(error);
        }

        var name = col._name;

        try {
            var trans = idb.transaction([name], read_pref);
            trans.onerror = function (e) {
                return cb(getIDBError(e));
            };

            cb(null, trans.objectStore(name));
        } catch (error) {
            cb(error);
        }
    });
};

var getIDBReqWithIndex = function getIDBReqWithIndex(store, clause) {
    var key_range = clause.idb_key_range || null,
        direction = clause.idb_direction || 'next',
        literal = clause.path.literal;


    var index = void 0;

    if (literal === '_id') {
        index = store;
    } else {
        index = store.index(literal);
    }

    return index.openCursor(key_range, direction);
};

var getIDBReqWithoutIndex = function getIDBReqWithoutIndex(store) {
    return store.openCursor();
};

var buildPredicates = function buildPredicates(pipeline) {
    var new_pipeline = [];

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = pipeline[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var _step$value = _slicedToArray(_step.value, 2),
                fn = _step$value[0],
                arg = _step$value[1];

            if (fn === filter) {
                var pred = build(arg);

                if (pred === false) {
                    return;
                }
                if (!pred) {
                    continue;
                }

                arg = pred;
            }

            new_pipeline.push([fn, arg]);
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

    return new_pipeline;
};

var initPredAndSortSpec = function initPredAndSortSpec(config) {
    var pipeline = config.pipeline,
        preds = [],
        sort_specs = [];


    var i = 0;

    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
        for (var _iterator2 = pipeline[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var _step2$value = _slicedToArray(_step2.value, 2),
                fn = _step2$value[0],
                arg = _step2$value[1];

            if (fn === sort) {
                sort_specs.push(arg);
            } else if (fn === filter) {
                preds.push(arg);
            } else {
                break;
            }

            i++;
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

    pipeline.splice(0, i);

    config.pred = joinPredicates(preds);

    if (sort_specs.length) {
        config.sort_spec = sort_specs.reduce(merge, {});
    }
};

var getClauses = function getClauses(col, pred) {
    if (!pred) {
        return [];
    }

    var clauses = [],
        exists_clauses = [];

    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
        for (var _iterator3 = pred.getClauses()[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var clause = _step3.value;

            if (col._isIndexed(clause.path.literal)) {
                if (clause instanceof Exists) {
                    exists_clauses.push(clause);
                } else {
                    clauses.push(clause);
                }
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

    if (clauses.length) {
        return clauses;
    }

    return exists_clauses;
};

var initClauses = function initClauses(config) {
    var col = config.col,
        pred = config.pred;


    config.clauses = getClauses(col, pred);
};

var initHint = function initHint(config) {
    if (!config.hint) {
        return;
    }

    var clauses = config.clauses,
        hint = config.hint;


    var new_clauses = [];

    var _iteratorNormalCompletion4 = true;
    var _didIteratorError4 = false;
    var _iteratorError4 = undefined;

    try {
        for (var _iterator4 = clauses[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            var clause = _step4.value;

            if (clause.path.literal === hint) {
                new_clauses.push(clause);
            }
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

    if (!new_clauses.length) {
        new_clauses = [{ path: { literal: hint } }];
    }

    config.clauses = new_clauses;
};

var initSort = function initSort(config) {
    if (!config.sort_spec) {
        return;
    }

    var clauses = config.clauses,
        spec = config.sort_spec,
        pipeline = config.pipeline;

    var new_clauses = [];

    var _iteratorNormalCompletion5 = true;
    var _didIteratorError5 = false;
    var _iteratorError5 = undefined;

    try {
        for (var _iterator5 = clauses[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
            var clause = _step5.value;
            var literal = clause.path.literal;

            if (!spec.hasOwnProperty(literal)) {
                continue;
            }

            var order = spec[literal];
            clause.idb_direction = toIDBDirection(order);

            new_clauses.push(clause);
        }
    } catch (err) {
        _didIteratorError5 = true;
        _iteratorError5 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion5 && _iterator5.return) {
                _iterator5.return();
            }
        } finally {
            if (_didIteratorError5) {
                throw _iteratorError5;
            }
        }
    }

    if (new_clauses.length) {
        config.clauses = new_clauses;
    } else {
        pipeline.push([sort, spec]);
    }
};

var createGetIDBReqFn = function createGetIDBReqFn(_ref3) {
    var pred = _ref3.pred,
        clauses = _ref3.clauses,
        pipeline = _ref3.pipeline;

    var getIDBReq = void 0;

    if (clauses.length) {
        var clause = clauses[0];

        getIDBReq = function getIDBReq(store) {
            return getIDBReqWithIndex(store, clause);
        };

        if (!pred || clause === pred) {
            return getIDBReq;
        }

        removeClause(clause);
    } else {
        getIDBReq = getIDBReqWithoutIndex;

        if (!pred) {
            return getIDBReq;
        }
    }

    pipeline.unshift([filter, pred]);

    return getIDBReq;
};

var createGetIDBCurFn = function createGetIDBCurFn(config) {
    var idb_cur = void 0,
        idb_req = void 0;

    var getIDBReq = createGetIDBReqFn(config);

    var onIDBCur = function onIDBCur(cb) {
        idb_req.onsuccess = function (e) {
            idb_cur = e.target.result;

            cb();
        };

        idb_req.onerror = function (e) {
            return cb(getIDBError(e));
        };
    };

    var progressCur = function progressCur(cb) {
        onIDBCur(cb);
        idb_cur.continue();
    };

    var _getCur = function getCur(cb) {
        openConn(config, function (error, store) {
            if (error) {
                return cb(error);
            }

            idb_req = getIDBReq(store);

            onIDBCur(function (error) {
                if (idb_cur) {
                    _getCur = progressCur;
                }

                cb(error);
            });
        });
    };

    return function (cb) {
        return _getCur(function (error) {
            return cb(error, idb_cur);
        });
    };
};

var addPipelineStages = function addPipelineStages(_ref4, next) {
    var pipeline = _ref4.pipeline;
    var _iteratorNormalCompletion6 = true;
    var _didIteratorError6 = false;
    var _iteratorError6 = undefined;

    try {
        for (var _iterator6 = pipeline[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
            var _step6$value = _slicedToArray(_step6.value, 2),
                fn = _step6$value[0],
                arg = _step6$value[1];

            next = fn(next, arg);
        }
    } catch (err) {
        _didIteratorError6 = true;
        _iteratorError6 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion6 && _iterator6.return) {
                _iterator6.return();
            }
        } finally {
            if (_didIteratorError6) {
                throw _iteratorError6;
            }
        }
    }

    return next;
};

var createParallelNextFn = function createParallelNextFn(config) {
    var next_fns = [];

    var _iteratorNormalCompletion7 = true;
    var _didIteratorError7 = false;
    var _iteratorError7 = undefined;

    try {
        for (var _iterator7 = config.pred.args[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
            var node = _step7.value;

            var new_config = {
                col: config.col,
                read_pref: config.read_pref,
                pred: node,
                pipeline: []
            };

            initClauses(new_config);

            var _next = createNextFn(new_config);

            next_fns.push(addPipelineStages(new_config, _next));
        }
    } catch (err) {
        _didIteratorError7 = true;
        _iteratorError7 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion7 && _iterator7.return) {
                _iterator7.return();
            }
        } finally {
            if (_didIteratorError7) {
                throw _iteratorError7;
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

    var getNextFn = function getNextFn() {
        return next_fns.shift();
    };

    var currentNextFn = getNextFn();

    var changeNextFn = function changeNextFn(cb) {
        if (currentNextFn = getNextFn()) {
            next(cb);
        } else {
            cb();
        }
    };

    var next = function next(cb) {
        currentNextFn(function (error, doc, idb_cur) {
            if (error) {
                cb(error);
            } else if (!doc) {
                changeNextFn(cb);
            } else if (onDoc(doc)) {
                cb(null, doc, idb_cur);
            } else {
                next(cb);
            }
        });
    };

    var spec = config.sort_spec;
    if (spec) {
        config.pipeline.push([sort, spec]);
    }

    return next;
};

var createNextFn = function createNextFn(config) {
    var getIDBCur = createGetIDBCurFn(config);

    var next = function next(cb) {
        getIDBCur(function (error, idb_cur) {
            if (!idb_cur) {
                cb(error);
            } else {
                cb(null, idb_cur.value, idb_cur);
            }
        });
    };

    return next;
};

module.exports = function (cur) {
    var pipeline = void 0;

    try {
        pipeline = buildPredicates(cur._pipeline);
    } catch (error) {
        return function (cb) {
            return cb(error);
        };
    }

    if (!pipeline) {
        return function (cb) {
            return cb();
        };
    }

    var config = {
        col: cur._col,
        read_pref: cur._read_pref,
        hint: cur._hint,
        pipeline: pipeline
    };

    initPredAndSortSpec(config);

    var next = void 0;

    if (config.pred instanceof Disjunction) {
        next = createParallelNextFn(config);
    } else {
        initClauses(config);
        initHint(config);
        initSort(config);

        next = createNextFn(config);
    }

    return addPipelineStages(config, next);
};
},{"./filter.js":6,"./lang/filter.js":11,"./sort.js":18,"./util.js":21,"deepmerge":77}],4:[function(require,module,exports){
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

        var _this = _possibleConstructorReturn(this, (Cursor.__proto__ || Object.getPrototypeOf(Cursor)).call(this));

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
            var fn = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function () {};
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
},{"./create_next_fn.js":3,"./filter.js":6,"./group.js":7,"./limit.js":14,"./project.js":15,"./skip.js":17,"./sort.js":18,"./unwind.js":19,"events":117,"q":181}],5:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events'),
    memoize = require('memoizee'),
    Q = require('q');

var _require = require('./util.js'),
    getIDBError = _require.getIDBError;

var Collection = require('./collection.js');

/**
 * Db blocked event.
 * @event Db#blocked
 *
 * @example
 * db.on('blocked', () => {
 *     console.log('database version cannot be upgraded');
 * });
 */

/**
 * Class representing a database.
 * @param {string} name The name of the database.
 * @param {number} [version] The version of the database.
 * @param {object|string[]} config The collections configuration.
 *
 * @example
 * let db = new zango.Db('mydb', {
 *     // Define collection.
 *     col1: {
 *         // Create index if it doesn't already exist.
 *         index1: true,
 *
 *         // Delete index from pre-existing database.
 *         index2: false
 *     },
 *
 *      // Define collection with indexes.
 *     col2: ['index1', 'index2'],
 *
 *     // Define collection without indexes.
 *     col3: true,
 *
 *     // Delete collection from pre-existing database.
 *     col4: false
 * });
 *
 * @example
 * // Define collections without indexes.
 * let db = new zango.Db('mydb', ['col1', 'col2']);
 */

var Db = function (_EventEmitter) {
    _inherits(Db, _EventEmitter);

    function Db(name, version, config) {
        _classCallCheck(this, Db);

        var _this = _possibleConstructorReturn(this, (Db.__proto__ || Object.getPrototypeOf(Db)).call(this));

        _this._name = name;

        if ((typeof version === 'undefined' ? 'undefined' : _typeof(version)) === 'object') {
            config = version;
        } else {
            _this._version = version;
        }

        _this._cols = {};
        _this._config = {};
        _this._initGetConn();

        if (Array.isArray(config)) {
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = config[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var _name = _step.value;

                    _this._addCollection(_name);
                    _this._config[_name] = true;
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
        } else {
            for (var _name2 in config) {
                _this._addCollection(_name2);
                _this._addIndex(config[_name2], _name2);
            }
        }
        return _this;
    }

    /**
     * The name of the database.
     * @type {string}
     */


    _createClass(Db, [{
        key: '_addCollection',
        value: function _addCollection(name) {
            this._cols[name] = new Collection(this, name);
        }
    }, {
        key: '_addIndex',
        value: function _addIndex(index_config, path) {
            var config = this._config;

            if (!index_config) {
                return config[path] = false;
            }

            if ((typeof index_config === 'undefined' ? 'undefined' : _typeof(index_config)) !== 'object') {
                return config[path] = {};
            }

            var col = this._cols[path];

            if (Array.isArray(index_config)) {
                var new_value = {};

                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = index_config[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var index_path = _step2.value;

                        new_value[index_path] = true;

                        col._indexes.add(index_path);
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

                config[path] = new_value;
            } else {
                for (var _index_path in index_config) {
                    if (index_config[_index_path]) {
                        col._indexes.add(_index_path);
                    }
                }

                config[path] = index_config;
            }
        }
    }, {
        key: '_addStore',
        value: function _addStore(idb, name) {
            var store = idb.createObjectStore(name, {
                keyPath: '_id',
                autoIncrement: true
            });

            var index_config = this._config[name];

            for (var path in index_config) {
                if (index_config[path]) {
                    store.createIndex(path, path, { unique: false });
                } else {
                    store.deleteIndex(path);
                }
            }
        }
    }, {
        key: '_getConn',
        value: function _getConn(cb) {
            var _this2 = this;

            var req = void 0;

            if (this._version) {
                req = indexedDB.open(this._name, this._version);
            } else {
                req = indexedDB.open(this._name);
            }

            req.onsuccess = function (e) {
                var idb = e.target.result;

                _this2._idb = idb;
                _this2._version = idb.version;
                _this2._open = true;

                cb(null, idb);
            };

            req.onerror = function (e) {
                return cb(getIDBError(e));
            };

            req.onupgradeneeded = function (e) {
                var idb = e.target.result;

                for (var name in _this2._config) {
                    try {
                        if (_this2._config[name]) {
                            _this2._addStore(idb, name);
                        } else {
                            idb.deleteObjectStore(name);
                        }
                    } catch (error) {
                        return cb(error);
                    }
                }
            };

            req.onblocked = function () {
                return _this2.emit('blocked');
            };
        }
    }, {
        key: '_initGetConn',
        value: function _initGetConn() {
            this._getConn = memoize(this._getConn, { async: true });
        }

        /**
         * Retrieve a {@link Collection} instance.
         * @param {string} name The name of the collection.
         * @return {Collection}
         *
         * @example
         * let col = db.collection('mycol');
         */

    }, {
        key: 'collection',
        value: function collection(name) {
            var col = this._cols[name];

            if (!col) {
                throw Error('collection \'' + name + '\' does not exist');
            }

            return col;
        }

        /**
         * Open connection to the database.
         * @param {function} [cb] The result callback.
         * @return {Promise}
         */

    }, {
        key: 'open',
        value: function open(cb) {
            var _this3 = this;

            var deferred = Q.defer();

            this._getConn(function (error) {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve(_this3);
                }
            });

            deferred.promise.nodeify(cb);

            return deferred.promise;
        }

        /**
         * Close the connection if it is open.
         */

    }, {
        key: 'close',
        value: function close() {
            if (this._open) {
                this._idb.close();
                this._open = false;
                this._initGetConn();
            }
        }

        /**
         * Delete the database, closing the connection if it is open.
         * @param {function} [cb] The result callback.
         * @return {Promise}
         *
         * @example
         * db.drop((error) => {
         *     if (error) { throw error; }
         * });
         */

    }, {
        key: 'drop',
        value: function drop(cb) {
            this.close();

            var deferred = Q.defer();
            var req = indexedDB.deleteDatabase(this._name);

            req.onsuccess = function () {
                return deferred.resolve();
            };
            req.onerror = function (e) {
                return deferred.reject(getIDBError(e));
            };

            deferred.promise.nodeify(cb);

            return deferred.promise;
        }
    }, {
        key: 'name',
        get: function get() {
            return this._name;
        }

        /**
         * The version of the database.
         * @type {number}
         */

    }, {
        key: 'version',
        get: function get() {
            return this._version;
        }
    }]);

    return Db;
}(EventEmitter);

module.exports = Db;
},{"./collection.js":2,"./util.js":21,"events":117,"memoizee":166,"q":181}],6:[function(require,module,exports){
'use strict';

var Fields = require('./lang/fields.js');

module.exports = function (next, pred) {
    return function (cb) {
        (function iterate() {
            next(function (error, doc, idb_cur) {
                if (!doc) {
                    cb(error);
                } else if (pred.run(new Fields(doc))) {
                    cb(null, doc, idb_cur);
                } else {
                    iterate();
                }
            });
        })();
    };
};
},{"./lang/fields.js":10}],7:[function(require,module,exports){
'use strict';

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var memoize = require('memoizee');

var _require = require('./util.js'),
    unknownOp = _require.unknownOp,
    hashify = _require.hashify,
    build = require('./lang/expression.js'),
    Fields = require('./lang/fields.js');

var Operator = function () {
    function Operator() {
        _classCallCheck(this, Operator);
    }

    _createClass(Operator, [{
        key: 'getOpValueWithRefs',
        value: function getOpValueWithRefs(expr, doc, cb) {
            var ast = expr.ast,
                fields = expr.fields;


            cb(ast.run(fields));
        }
    }, {
        key: 'value',
        get: function get() {
            return this._value;
        }
    }], [{
        key: 'getNoRefsSteps',
        value: function getNoRefsSteps(steps) {
            return steps.in_iter;
        }
    }, {
        key: 'getOpValue',
        value: function getOpValue(expr, cb) {
            cb(expr.ast.run());
        }
    }]);

    return Operator;
}();

var Sum = function (_Operator) {
    _inherits(Sum, _Operator);

    function Sum() {
        _classCallCheck(this, Sum);

        var _this = _possibleConstructorReturn(this, (Sum.__proto__ || Object.getPrototypeOf(Sum)).call(this));

        _this._value = 0;
        return _this;
    }

    _createClass(Sum, [{
        key: 'getOpValueWithRefs',
        value: function getOpValueWithRefs(expr, doc, cb) {
            _get(Sum.prototype.__proto__ || Object.getPrototypeOf(Sum.prototype), 'getOpValueWithRefs', this).call(this, expr, doc, function (value) {
                Sum._verify(value, cb);
            });
        }
    }, {
        key: 'add',
        value: function add(value) {
            this._value += value;
        }
    }], [{
        key: '_verify',
        value: function _verify(value, cb) {
            if (typeof value === 'number') {
                cb(value);
            }
        }
    }, {
        key: 'getOpValue',
        value: function getOpValue(expr, cb) {
            _get(Sum.__proto__ || Object.getPrototypeOf(Sum), 'getOpValue', this).call(this, expr, function (value) {
                return Sum._verify(value, cb);
            });
        }
    }]);

    return Sum;
}(Operator);

var Avg = function (_Sum) {
    _inherits(Avg, _Sum);

    function Avg() {
        _classCallCheck(this, Avg);

        var _this2 = _possibleConstructorReturn(this, (Avg.__proto__ || Object.getPrototypeOf(Avg)).call(this));

        _this2._count = 0;
        return _this2;
    }

    _createClass(Avg, [{
        key: 'add',
        value: function add(value) {
            this._count++;

            _get(Avg.prototype.__proto__ || Object.getPrototypeOf(Avg.prototype), 'add', this).call(this, value);
        }
    }, {
        key: 'value',
        get: function get() {
            return this._value / this._count || 0;
        }
    }]);

    return Avg;
}(Sum);

var Compare = function (_Operator2) {
    _inherits(Compare, _Operator2);

    function Compare(fn) {
        _classCallCheck(this, Compare);

        var _this3 = _possibleConstructorReturn(this, (Compare.__proto__ || Object.getPrototypeOf(Compare)).call(this));

        _this3._value = null;
        _this3._fn = fn;
        _this3._add = _this3._add1;
        return _this3;
    }

    _createClass(Compare, [{
        key: '_add1',
        value: function _add1(value) {
            this._value = value;
            this._add = this._add2;
        }
    }, {
        key: '_add2',
        value: function _add2(new_value) {
            if (this._fn(new_value, this._value)) {
                this._value = new_value;
            }
        }
    }, {
        key: 'add',
        value: function add(value) {
            if (value != null) {
                this._add(value);
            }
        }
    }], [{
        key: 'getNoRefsSteps',
        value: function getNoRefsSteps(steps) {
            return steps.in_end;
        }
    }]);

    return Compare;
}(Operator);

var Min = function (_Compare) {
    _inherits(Min, _Compare);

    function Min() {
        _classCallCheck(this, Min);

        return _possibleConstructorReturn(this, (Min.__proto__ || Object.getPrototypeOf(Min)).call(this, function (a, b) {
            return a < b;
        }));
    }

    return Min;
}(Compare);

var Max = function (_Compare2) {
    _inherits(Max, _Compare2);

    function Max() {
        _classCallCheck(this, Max);

        return _possibleConstructorReturn(this, (Max.__proto__ || Object.getPrototypeOf(Max)).call(this, function (a, b) {
            return a > b;
        }));
    }

    return Max;
}(Compare);

var Push = function (_Operator3) {
    _inherits(Push, _Operator3);

    function Push() {
        _classCallCheck(this, Push);

        var _this6 = _possibleConstructorReturn(this, (Push.__proto__ || Object.getPrototypeOf(Push)).call(this));

        _this6._value = [];
        return _this6;
    }

    _createClass(Push, [{
        key: 'add',
        value: function add(value) {
            this._value.push(value);
        }
    }]);

    return Push;
}(Operator);

var AddToSet = function (_Operator4) {
    _inherits(AddToSet, _Operator4);

    function AddToSet() {
        _classCallCheck(this, AddToSet);

        var _this7 = _possibleConstructorReturn(this, (AddToSet.__proto__ || Object.getPrototypeOf(AddToSet)).call(this));

        _this7._hashes = {};
        return _this7;
    }

    _createClass(AddToSet, [{
        key: 'add',
        value: function add(value) {
            this._hashes[hashify(value)] = value;
        }
    }, {
        key: 'value',
        get: function get() {
            var docs = [];

            for (var hash in this._hashes) {
                docs.push(this._hashes[hash]);
            }

            return docs;
        }
    }], [{
        key: 'getNoRefsSteps',
        value: function getNoRefsSteps(steps) {
            return steps.in_end;
        }
    }]);

    return AddToSet;
}(Operator);

var runSteps = function runSteps(steps) {
    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
    }

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = steps[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var fn = _step.value;
            fn.apply(undefined, args);
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
};

var runInEnd = function runInEnd(in_end, groups) {
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
        for (var _iterator2 = groups[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var group_doc = _step2.value;

            runSteps(in_end, group_doc);
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
};

var groupLoopFn = function groupLoopFn(next, in_end, groups, fn) {
    return function (cb) {
        var done = function done(error) {
            if (!error) {
                runInEnd(in_end, groups);
            }

            cb(error, groups);
        };

        (function iterate() {
            next(function (error, doc) {
                if (!doc) {
                    return done(error);
                }

                fn(doc);
                iterate();
            });
        })();
    };
};

var createGroupByRefFn = function createGroupByRefFn(next, expr, steps) {
    var in_start = steps.in_start,
        in_iter = steps.in_iter,
        in_end = steps.in_end;

    var groups = [];

    var add = memoize(function (_id_hash, _id) {
        var group_doc = { _id: _id };

        groups.push(group_doc);
        runSteps(in_start, group_doc);

        return group_doc;
    }, { length: 1 });

    var ast = expr.ast;

    var _idFn = function _idFn(doc) {
        return ast.run(new Fields(doc));
    };

    var onDoc = void 0;

    if (in_iter.length) {
        onDoc = function onDoc(doc) {
            var _id = _idFn(doc);
            var group_doc = add(hashify(_id), _id);

            runSteps(in_iter, group_doc, doc);
        };
    } else {
        onDoc = function onDoc(doc) {
            var _id = _idFn(doc);

            add(hashify(_id), _id);
        };
    }

    return groupLoopFn(next, in_end, groups, onDoc);
};

var createGroupFn = function createGroupFn(next, expr, steps) {
    if (expr.has_refs) {
        return createGroupByRefFn(next, expr, steps);
    }

    var in_start = steps.in_start,
        in_iter = steps.in_iter,
        in_end = steps.in_end;

    var groups = [];

    var initGroupDoc = function initGroupDoc() {
        var group_doc = { _id: expr.ast.run() };

        runSteps(in_start, group_doc);
        groups.push(group_doc);

        return group_doc;
    };

    if (in_iter.length) {
        var add = memoize(function () {
            return initGroupDoc();
        });

        return groupLoopFn(next, in_end, groups, function (doc) {
            runSteps(in_iter, add(), doc);
        });
    }

    return function (cb) {
        next(function (error, doc) {
            if (doc) {
                initGroupDoc();

                runInEnd(in_end, groups);
            }

            cb(error, groups);
        });
    };
};

var ops = {
    $sum: Sum,
    $avg: Avg,
    $min: Min,
    $max: Max,
    $push: Push,
    $addToSet: AddToSet
};

var _build = function _build(steps, field, value) {
    var in_start = steps.in_start,
        in_iter = steps.in_iter,
        in_end = steps.in_end;

    var op_strs = Object.keys(value);

    if (op_strs.length > 1) {
        throw Error('fields must have only one operator');
    }

    var op_str = op_strs[0],
        Op = ops[op_str];

    if (!Op) {
        if (op_str[0] === '$') {
            unknownOp(op_str);
        }

        throw Error('unexpected field \'' + op_str + '\'');
    }

    var expr = build(value[op_str]);

    in_start.push(function (group_doc) {
        group_doc[field] = new Op(expr);
    });

    if (expr.has_refs) {
        in_iter.push(function (group_doc, doc) {
            var fields = new Fields(doc);
            if (!fields.ensure(expr.paths)) {
                return;
            }

            var op = group_doc[field],
                _expr = Object.assign({ fields: fields }, expr),
                add = function add(value) {
                return op.add(value);
            };

            op.getOpValueWithRefs(_expr, doc, add);
        });
    } else {
        Op.getOpValue(expr, function (value) {
            Op.getNoRefsSteps(steps).push(function (group_doc) {
                group_doc[field].add(value);
            });
        });
    }

    in_end.push(function (group_doc) {
        group_doc[field] = group_doc[field].value;
    });
};

module.exports = function (_next, spec) {
    if (!spec.hasOwnProperty('_id')) {
        throw Error("the '_id' field is missing");
    }

    var expr = build(spec._id);
    var new_spec = Object.assign({}, spec);

    delete new_spec._id;

    var steps = {
        in_start: [],
        in_iter: [],
        in_end: []
    };

    for (var field in new_spec) {
        _build(steps, field, new_spec[field]);
    }

    var group = createGroupFn(_next, expr, steps);

    var _next2 = function next(cb) {
        group(function (error, groups) {
            if (error) {
                cb(error);
            } else {
                (_next2 = function next(cb) {
                    return cb(null, groups.pop());
                })(cb);
            }
        });
    };

    return function (cb) {
        return _next2(cb);
    };
};
},{"./lang/expression.js":9,"./lang/fields.js":10,"./util.js":21,"memoizee":166}],8:[function(require,module,exports){
'use strict';

module.exports = { Db: require('./db.js') };
},{"./db.js":5}],9:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('../util.js'),
    unknownOp = _require.unknownOp,
    MISSING = require('./missing_symbol.js'),
    Path = require('./path.js');

var Value = function () {
    function Value(value) {
        _classCallCheck(this, Value);

        this.value = value;
    }

    _createClass(Value, [{
        key: 'run',
        value: function run() {
            return this.value;
        }
    }, {
        key: 'ResultType',
        get: function get() {
            return this.constructor;
        }
    }], [{
        key: 'any',
        value: function any(value) {
            if (typeof value === 'number') {
                return new NumberValue(value);
            }

            if (typeof value === 'string') {
                return new StringValue(value);
            }

            if (Array.isArray(value)) {
                return new ArrayValue(value);
            }

            if (value instanceof Date) {
                return new DateValue(value);
            }

            return new Value(value);
        }
    }, {
        key: 'literal',
        value: function literal(value) {
            return new Literal(Value.any(value));
        }
    }]);

    return Value;
}();

var NumberValue = function (_Value) {
    _inherits(NumberValue, _Value);

    function NumberValue() {
        _classCallCheck(this, NumberValue);

        return _possibleConstructorReturn(this, (NumberValue.__proto__ || Object.getPrototypeOf(NumberValue)).apply(this, arguments));
    }

    _createClass(NumberValue, null, [{
        key: 'isType',
        value: function isType(value) {
            return typeof value === 'number';
        }
    }]);

    return NumberValue;
}(Value);

var StringValue = function (_Value2) {
    _inherits(StringValue, _Value2);

    function StringValue() {
        _classCallCheck(this, StringValue);

        return _possibleConstructorReturn(this, (StringValue.__proto__ || Object.getPrototypeOf(StringValue)).apply(this, arguments));
    }

    _createClass(StringValue, null, [{
        key: 'isType',
        value: function isType(value) {
            return typeof value === 'string';
        }
    }]);

    return StringValue;
}(Value);

var ArrayValue = function (_Value3) {
    _inherits(ArrayValue, _Value3);

    function ArrayValue() {
        _classCallCheck(this, ArrayValue);

        return _possibleConstructorReturn(this, (ArrayValue.__proto__ || Object.getPrototypeOf(ArrayValue)).apply(this, arguments));
    }

    _createClass(ArrayValue, null, [{
        key: 'isType',
        value: function isType(value) {
            return Array.isArray(value);
        }
    }]);

    return ArrayValue;
}(Value);

var DateValue = function (_Value4) {
    _inherits(DateValue, _Value4);

    function DateValue() {
        _classCallCheck(this, DateValue);

        return _possibleConstructorReturn(this, (DateValue.__proto__ || Object.getPrototypeOf(DateValue)).apply(this, arguments));
    }

    _createClass(DateValue, null, [{
        key: 'isType',
        value: function isType(value) {
            return value instanceof Date;
        }
    }]);

    return DateValue;
}(Value);

var Literal = function (_Value5) {
    _inherits(Literal, _Value5);

    function Literal() {
        _classCallCheck(this, Literal);

        return _possibleConstructorReturn(this, (Literal.__proto__ || Object.getPrototypeOf(Literal)).apply(this, arguments));
    }

    _createClass(Literal, [{
        key: 'run',
        value: function run() {
            return this.value.run();
        }
    }, {
        key: 'ResultType',
        get: function get() {
            return this.value.ResultType;
        }
    }]);

    return Literal;
}(Value);

var Get = function () {
    function Get(path) {
        _classCallCheck(this, Get);

        this.path = path;
    }

    _createClass(Get, [{
        key: 'run',
        value: function run(fields) {
            var value = fields.get(this.path);

            return value === MISSING ? null : value;
        }
    }]);

    return Get;
}();

var ObjectExpr = function (_Value6) {
    _inherits(ObjectExpr, _Value6);

    function ObjectExpr() {
        _classCallCheck(this, ObjectExpr);

        return _possibleConstructorReturn(this, (ObjectExpr.__proto__ || Object.getPrototypeOf(ObjectExpr)).apply(this, arguments));
    }

    _createClass(ObjectExpr, [{
        key: 'run',
        value: function run(fields) {
            var result = {},
                value = this.value;

            for (var field in value) {
                result[field] = value[field].run(fields);
            }

            return result;
        }
    }]);

    return ObjectExpr;
}(Value);

var Operator = function () {
    function Operator() {
        _classCallCheck(this, Operator);

        this.args = [];
    }

    _createClass(Operator, [{
        key: 'add',
        value: function add(node) {
            this.args.push(node);
        }
    }, {
        key: 'alt',
        get: function get() {
            return new Value(null);
        }
    }]);

    return Operator;
}();

var FnOp = function (_Operator) {
    _inherits(FnOp, _Operator);

    function FnOp(fn) {
        _classCallCheck(this, FnOp);

        var _this7 = _possibleConstructorReturn(this, (FnOp.__proto__ || Object.getPrototypeOf(FnOp)).call(this));

        _this7.fn = fn;
        return _this7;
    }

    _createClass(FnOp, [{
        key: 'run',
        value: function run(fields) {
            var args = this.args,
                fn = this.fn;


            return args.map(function (arg) {
                return arg.run(fields);
            }).reduce(fn);
        }
    }, {
        key: 'length',
        get: function get() {
            return Infinity;
        }
    }]);

    return FnOp;
}(Operator);

var UnaryFnOp = function (_FnOp) {
    _inherits(UnaryFnOp, _FnOp);

    function UnaryFnOp() {
        _classCallCheck(this, UnaryFnOp);

        return _possibleConstructorReturn(this, (UnaryFnOp.__proto__ || Object.getPrototypeOf(UnaryFnOp)).apply(this, arguments));
    }

    _createClass(UnaryFnOp, [{
        key: 'run',
        value: function run(fields) {
            return this.fn(this.args[0].run(fields));
        }
    }, {
        key: 'length',
        get: function get() {
            return 1;
        }
    }]);

    return UnaryFnOp;
}(FnOp);

var fnOp = function fnOp(Parent, fn) {
    return function (_Parent) {
        _inherits(_class, _Parent);

        function _class() {
            _classCallCheck(this, _class);

            return _possibleConstructorReturn(this, (_class.__proto__ || Object.getPrototypeOf(_class)).call(this, fn));
        }

        return _class;
    }(Parent);
};

var opTypes = function opTypes(Parent, InputType) {
    var ResultType = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : InputType;

    var Constructor = function (_Parent2) {
        _inherits(Constructor, _Parent2);

        function Constructor() {
            _classCallCheck(this, Constructor);

            return _possibleConstructorReturn(this, (Constructor.__proto__ || Object.getPrototypeOf(Constructor)).apply(this, arguments));
        }

        return Constructor;
    }(Parent);

    Constructor.prototype.InputType = InputType;
    Constructor.prototype.ResultType = ResultType;

    return Constructor;
};

var ArithOp = function (_opTypes) {
    _inherits(ArithOp, _opTypes);

    function ArithOp() {
        _classCallCheck(this, ArithOp);

        return _possibleConstructorReturn(this, (ArithOp.__proto__ || Object.getPrototypeOf(ArithOp)).apply(this, arguments));
    }

    return ArithOp;
}(opTypes(FnOp, NumberValue));

var arithOp = function arithOp(fn) {
    return fnOp(ArithOp, fn);
};

var Add = function (_arithOp) {
    _inherits(Add, _arithOp);

    function Add() {
        _classCallCheck(this, Add);

        return _possibleConstructorReturn(this, (Add.__proto__ || Object.getPrototypeOf(Add)).apply(this, arguments));
    }

    return Add;
}(arithOp(function (a, b) {
    return a + b;
}));

var Subtract = function (_arithOp2) {
    _inherits(Subtract, _arithOp2);

    function Subtract() {
        _classCallCheck(this, Subtract);

        return _possibleConstructorReturn(this, (Subtract.__proto__ || Object.getPrototypeOf(Subtract)).apply(this, arguments));
    }

    return Subtract;
}(arithOp(function (a, b) {
    return a - b;
}));

var Multiply = function (_arithOp3) {
    _inherits(Multiply, _arithOp3);

    function Multiply() {
        _classCallCheck(this, Multiply);

        return _possibleConstructorReturn(this, (Multiply.__proto__ || Object.getPrototypeOf(Multiply)).apply(this, arguments));
    }

    return Multiply;
}(arithOp(function (a, b) {
    return a * b;
}));

var Divide = function (_arithOp4) {
    _inherits(Divide, _arithOp4);

    function Divide() {
        _classCallCheck(this, Divide);

        return _possibleConstructorReturn(this, (Divide.__proto__ || Object.getPrototypeOf(Divide)).apply(this, arguments));
    }

    return Divide;
}(arithOp(function (a, b) {
    return a / b;
}));

var Mod = function (_arithOp5) {
    _inherits(Mod, _arithOp5);

    function Mod() {
        _classCallCheck(this, Mod);

        return _possibleConstructorReturn(this, (Mod.__proto__ || Object.getPrototypeOf(Mod)).apply(this, arguments));
    }

    return Mod;
}(arithOp(function (a, b) {
    return a % b;
}));

var MathOp = function (_opTypes2) {
    _inherits(MathOp, _opTypes2);

    function MathOp() {
        _classCallCheck(this, MathOp);

        return _possibleConstructorReturn(this, (MathOp.__proto__ || Object.getPrototypeOf(MathOp)).apply(this, arguments));
    }

    _createClass(MathOp, [{
        key: 'run',
        value: function run(fields) {
            return this.fn.apply(this, _toConsumableArray(this.args.map(function (arg) {
                return arg.run(fields);
            })));
        }
    }, {
        key: 'length',
        get: function get() {
            return this.fn.length;
        }
    }]);

    return MathOp;
}(opTypes(FnOp, NumberValue));

var mathOp = function mathOp(fn) {
    return fnOp(MathOp, fn);
};

var Abs = function (_mathOp) {
    _inherits(Abs, _mathOp);

    function Abs() {
        _classCallCheck(this, Abs);

        return _possibleConstructorReturn(this, (Abs.__proto__ || Object.getPrototypeOf(Abs)).apply(this, arguments));
    }

    return Abs;
}(mathOp(Math.abs));

var Ceil = function (_mathOp2) {
    _inherits(Ceil, _mathOp2);

    function Ceil() {
        _classCallCheck(this, Ceil);

        return _possibleConstructorReturn(this, (Ceil.__proto__ || Object.getPrototypeOf(Ceil)).apply(this, arguments));
    }

    return Ceil;
}(mathOp(Math.ceil));

var Floor = function (_mathOp3) {
    _inherits(Floor, _mathOp3);

    function Floor() {
        _classCallCheck(this, Floor);

        return _possibleConstructorReturn(this, (Floor.__proto__ || Object.getPrototypeOf(Floor)).apply(this, arguments));
    }

    return Floor;
}(mathOp(Math.floor));

var Ln = function (_mathOp4) {
    _inherits(Ln, _mathOp4);

    function Ln() {
        _classCallCheck(this, Ln);

        return _possibleConstructorReturn(this, (Ln.__proto__ || Object.getPrototypeOf(Ln)).apply(this, arguments));
    }

    return Ln;
}(mathOp(Math.log));

var Log10 = function (_mathOp5) {
    _inherits(Log10, _mathOp5);

    function Log10() {
        _classCallCheck(this, Log10);

        return _possibleConstructorReturn(this, (Log10.__proto__ || Object.getPrototypeOf(Log10)).apply(this, arguments));
    }

    return Log10;
}(mathOp(Math.log10));

var Pow = function (_mathOp6) {
    _inherits(Pow, _mathOp6);

    function Pow() {
        _classCallCheck(this, Pow);

        return _possibleConstructorReturn(this, (Pow.__proto__ || Object.getPrototypeOf(Pow)).apply(this, arguments));
    }

    return Pow;
}(mathOp(Math.pow));

var Sqrt = function (_mathOp7) {
    _inherits(Sqrt, _mathOp7);

    function Sqrt() {
        _classCallCheck(this, Sqrt);

        return _possibleConstructorReturn(this, (Sqrt.__proto__ || Object.getPrototypeOf(Sqrt)).apply(this, arguments));
    }

    return Sqrt;
}(mathOp(Math.sqrt));

var Trunc = function (_mathOp8) {
    _inherits(Trunc, _mathOp8);

    function Trunc() {
        _classCallCheck(this, Trunc);

        return _possibleConstructorReturn(this, (Trunc.__proto__ || Object.getPrototypeOf(Trunc)).apply(this, arguments));
    }

    return Trunc;
}(mathOp(Math.trunc));

var StringConcatOp = function (_opTypes3) {
    _inherits(StringConcatOp, _opTypes3);

    function StringConcatOp() {
        _classCallCheck(this, StringConcatOp);

        return _possibleConstructorReturn(this, (StringConcatOp.__proto__ || Object.getPrototypeOf(StringConcatOp)).apply(this, arguments));
    }

    return StringConcatOp;
}(opTypes(FnOp, StringValue));

var Concat = function (_fnOp) {
    _inherits(Concat, _fnOp);

    function Concat() {
        _classCallCheck(this, Concat);

        return _possibleConstructorReturn(this, (Concat.__proto__ || Object.getPrototypeOf(Concat)).apply(this, arguments));
    }

    return Concat;
}(fnOp(StringConcatOp, function (a, b) {
    return a + b;
}));

var CaseOp = function (_opTypes4) {
    _inherits(CaseOp, _opTypes4);

    function CaseOp() {
        _classCallCheck(this, CaseOp);

        return _possibleConstructorReturn(this, (CaseOp.__proto__ || Object.getPrototypeOf(CaseOp)).apply(this, arguments));
    }

    _createClass(CaseOp, [{
        key: 'alt',
        get: function get() {
            return new StringValue('');
        }
    }]);

    return CaseOp;
}(opTypes(UnaryFnOp, StringValue));

var ToLower = function (_fnOp2) {
    _inherits(ToLower, _fnOp2);

    function ToLower() {
        _classCallCheck(this, ToLower);

        return _possibleConstructorReturn(this, (ToLower.__proto__ || Object.getPrototypeOf(ToLower)).apply(this, arguments));
    }

    return ToLower;
}(fnOp(CaseOp, function (s) {
    return s.toLowerCase();
}));

var ToUpper = function (_fnOp3) {
    _inherits(ToUpper, _fnOp3);

    function ToUpper() {
        _classCallCheck(this, ToUpper);

        return _possibleConstructorReturn(this, (ToUpper.__proto__ || Object.getPrototypeOf(ToUpper)).apply(this, arguments));
    }

    return ToUpper;
}(fnOp(CaseOp, function (s) {
    return s.toUpperCase();
}));

var ConcatArraysOp = function (_opTypes5) {
    _inherits(ConcatArraysOp, _opTypes5);

    function ConcatArraysOp() {
        _classCallCheck(this, ConcatArraysOp);

        return _possibleConstructorReturn(this, (ConcatArraysOp.__proto__ || Object.getPrototypeOf(ConcatArraysOp)).apply(this, arguments));
    }

    return ConcatArraysOp;
}(opTypes(FnOp, ArrayValue));

var ConcatArrays = function (_fnOp4) {
    _inherits(ConcatArrays, _fnOp4);

    function ConcatArrays() {
        _classCallCheck(this, ConcatArrays);

        return _possibleConstructorReturn(this, (ConcatArrays.__proto__ || Object.getPrototypeOf(ConcatArrays)).apply(this, arguments));
    }

    return ConcatArrays;
}(fnOp(ConcatArraysOp, function (a, b) {
    return a.concat(b);
}));

var DateOp = function (_opTypes6) {
    _inherits(DateOp, _opTypes6);

    function DateOp() {
        _classCallCheck(this, DateOp);

        return _possibleConstructorReturn(this, (DateOp.__proto__ || Object.getPrototypeOf(DateOp)).apply(this, arguments));
    }

    return DateOp;
}(opTypes(UnaryFnOp, DateValue, NumberValue));

var dateOp = function dateOp(fn) {
    return fnOp(DateOp, fn);
};

var DayOfMonth = function (_dateOp) {
    _inherits(DayOfMonth, _dateOp);

    function DayOfMonth() {
        _classCallCheck(this, DayOfMonth);

        return _possibleConstructorReturn(this, (DayOfMonth.__proto__ || Object.getPrototypeOf(DayOfMonth)).apply(this, arguments));
    }

    return DayOfMonth;
}(dateOp(function (d) {
    return d.getDate();
}));

var Year = function (_dateOp2) {
    _inherits(Year, _dateOp2);

    function Year() {
        _classCallCheck(this, Year);

        return _possibleConstructorReturn(this, (Year.__proto__ || Object.getPrototypeOf(Year)).apply(this, arguments));
    }

    return Year;
}(dateOp(function (d) {
    return d.getUTCFullYear();
}));

var Month = function (_dateOp3) {
    _inherits(Month, _dateOp3);

    function Month() {
        _classCallCheck(this, Month);

        return _possibleConstructorReturn(this, (Month.__proto__ || Object.getPrototypeOf(Month)).apply(this, arguments));
    }

    return Month;
}(dateOp(function (d) {
    return d.getUTCMonth() + 1;
}));

var Hour = function (_dateOp4) {
    _inherits(Hour, _dateOp4);

    function Hour() {
        _classCallCheck(this, Hour);

        return _possibleConstructorReturn(this, (Hour.__proto__ || Object.getPrototypeOf(Hour)).apply(this, arguments));
    }

    return Hour;
}(dateOp(function (d) {
    return d.getUTCHours();
}));

var Minute = function (_dateOp5) {
    _inherits(Minute, _dateOp5);

    function Minute() {
        _classCallCheck(this, Minute);

        return _possibleConstructorReturn(this, (Minute.__proto__ || Object.getPrototypeOf(Minute)).apply(this, arguments));
    }

    return Minute;
}(dateOp(function (d) {
    return d.getUTCMinutes();
}));

var Second = function (_dateOp6) {
    _inherits(Second, _dateOp6);

    function Second() {
        _classCallCheck(this, Second);

        return _possibleConstructorReturn(this, (Second.__proto__ || Object.getPrototypeOf(Second)).apply(this, arguments));
    }

    return Second;
}(dateOp(function (d) {
    return d.getUTCSeconds();
}));

var Millisecond = function (_dateOp7) {
    _inherits(Millisecond, _dateOp7);

    function Millisecond() {
        _classCallCheck(this, Millisecond);

        return _possibleConstructorReturn(this, (Millisecond.__proto__ || Object.getPrototypeOf(Millisecond)).apply(this, arguments));
    }

    return Millisecond;
}(dateOp(function (d) {
    return d.getUTCMilliseconds();
}));

var TypeCond = function () {
    function TypeCond(stack, args, op) {
        _classCallCheck(this, TypeCond);

        var InputType = op.InputType,
            alt = op.alt;


        this.result_types = new Set([op.ResultType, alt.ResultType]);
        this.stack = stack;
        this.isType = InputType.isType;
        this.args = args;
        this.op = op;
        this.alt_value = alt.value;
    }

    _createClass(TypeCond, [{
        key: 'run',
        value: function run(fields) {
            var stack = this.stack,
                isType = this.isType,
                op = this.op;

            var new_args = [];

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = this.args[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var arg = _step.value;

                    var result = arg.run(fields);

                    if (!isType(result)) {
                        return this.alt_value;
                    }

                    new_args.push(result);
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

            for (var i = new_args.length - 1; i >= 0; i--) {
                stack.push(new_args[i]);
            }

            return op.run(fields);
        }
    }]);

    return TypeCond;
}();

var PopFromStack = function () {
    function PopFromStack(stack) {
        _classCallCheck(this, PopFromStack);

        this.stack = stack;
    }

    _createClass(PopFromStack, [{
        key: 'run',
        value: function run() {
            return this.stack.pop();
        }
    }]);

    return PopFromStack;
}();

var ops = {
    $add: Add,
    $subtract: Subtract,
    $multiply: Multiply,
    $divide: Divide,
    $mod: Mod,
    $abs: Abs,
    $ceil: Ceil,
    $floor: Floor,
    $ln: Ln,
    $log10: Log10,
    $pow: Pow,
    $sqrt: Sqrt,
    $trunc: Trunc,
    $concat: Concat,
    $toLower: ToLower,
    $toUpper: ToUpper,
    $concatArrays: ConcatArrays,
    $dayOfMonth: DayOfMonth,
    $year: Year,
    $month: Month,
    $hour: Hour,
    $minute: Minute,
    $second: Second,
    $millisecond: Millisecond
};

var buildOp = function buildOp(paths, name, args) {
    var Op = ops[name];
    if (!Op) {
        unknownOp(name);
    }

    if (!Array.isArray(args)) {
        args = [args];
    }

    var op = new Op(),
        tc_nodes = [],
        new_paths = [],
        stack = [];

    for (var i = 0; i < args.length && i < op.length; i++) {
        var arg = build(new_paths, args[i]);

        if (arg.ResultType) {
            if (arg.ResultType !== op.InputType) {
                return op.alt;
            }

            op.add(arg);

            continue;
        }

        if (arg instanceof TypeCond) {
            if (!arg.result_types.has(op.InputType)) {
                return op.alt;
            }

            if (arg.result_types.size === 1) {
                op.add(arg);

                continue;
            }
        }

        tc_nodes.push(arg);
        op.add(new PopFromStack(stack));
    }

    if (!new_paths.length) {
        return new op.ResultType(op.run());
    }

    paths.push.apply(paths, new_paths);

    if (!tc_nodes.length) {
        return op;
    }

    return new TypeCond(stack, tc_nodes, op);
};

var buildObject = function buildObject(paths, expr) {
    var op_names = new Set(),
        fields = new Set();

    for (var field in expr) {
        (field[0] === '$' ? op_names : fields).add(field);
    }

    if (op_names.size > 1) {
        throw Error('objects cannot have more than one operator');
    }

    if (op_names.size) {
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
            for (var _iterator2 = fields[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                var path = _step2.value;

                throw Error('unexpected field \'' + path + '\'');
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

        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
            for (var _iterator3 = op_names[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                var name = _step3.value;

                if (name === '$literal') {
                    return Value.literal(expr[name]);
                }

                return buildOp(paths, name, expr[name]);
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
    }

    var new_paths = [],
        obj = {};

    for (var _field in expr) {
        obj[_field] = build(new_paths, expr[_field]);
    }

    var node = new ObjectExpr(obj);

    if (!new_paths.length) {
        return new Value(node.run());
    }

    paths.push.apply(paths, new_paths);

    return node;
};

var build = function build(paths, expr) {
    if (typeof expr === 'string' && expr[0] === '$') {
        var path = new Path(expr.substring(1));

        paths.push(path);

        return new Get(path);
    }

    if (expr == null || expr.constructor !== Object) {
        return Value.any(expr);
    }

    return buildObject(paths, expr);
};

module.exports = function (expr) {
    var paths = [],
        ast = build(paths, expr);

    return {
        ast: ast,
        paths: paths,
        has_refs: !!paths.length
    };
};
},{"../util.js":21,"./missing_symbol.js":12,"./path.js":13}],10:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var memoize = require('memoizee');

var _require = require('../util.js'),
    _get = _require.get;

var MISSING = require('./missing_symbol.js');

var Fields = function () {
    function Fields(doc) {
        _classCallCheck(this, Fields);

        this._doc = doc;
        this.get = memoize(this.get);
    }

    _createClass(Fields, [{
        key: 'get',
        value: function get(path) {
            var value = MISSING;

            _get(this._doc, path.pieces, function (obj, field) {
                value = obj[field];
            });

            return value;
        }
    }, {
        key: 'ensure',
        value: function ensure(paths) {
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = paths[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var path = _step.value;

                    if (this.get(path) === MISSING) {
                        return false;
                    }
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

            return true;
        }
    }]);

    return Fields;
}();

module.exports = Fields;
},{"../util.js":21,"./missing_symbol.js":12,"memoizee":166}],11:[function(require,module,exports){
'use strict';

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('../util.js'),
    isObject = _require.isObject,
    equal = _require.equal,
    unknownOp = _require.unknownOp;

var MISSING = require('./missing_symbol.js'),
    Path = require('./path.js'),
    Fields = require('./fields.js');

var isIndexMatchable = function isIndexMatchable(value) {
    if (typeof value === 'number') {
        return !isNaN(value);
    }
    if (typeof value === 'string') {
        return true;
    }
    if (typeof value === 'boolean') {
        return true;
    }
    if (!value) {
        return false;
    }
    if (value.constructor === Object) {
        return false;
    }

    if (Array.isArray(value)) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = value[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var element = _step.value;

                if (!isIndexMatchable(element)) {
                    return false;
                }
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

        return true;
    }

    if (value instanceof Date) {
        return !isNaN(value.valueOf());
    }

    return false;
};

var Operator = function () {
    function Operator() {
        _classCallCheck(this, Operator);
    }

    _createClass(Operator, [{
        key: 'getClauses',
        value: function getClauses() {
            return this.is_index_matchable ? [this] : [];
        }
    }]);

    return Operator;
}();

var Connective = function (_Operator) {
    _inherits(Connective, _Operator);

    function Connective(args) {
        _classCallCheck(this, Connective);

        var _this = _possibleConstructorReturn(this, (Connective.__proto__ || Object.getPrototypeOf(Connective)).call(this));

        _this.args = args;
        return _this;
    }

    return Connective;
}(Operator);

var Conjunction = function (_Connective) {
    _inherits(Conjunction, _Connective);

    function Conjunction() {
        _classCallCheck(this, Conjunction);

        return _possibleConstructorReturn(this, (Conjunction.__proto__ || Object.getPrototypeOf(Conjunction)).apply(this, arguments));
    }

    _createClass(Conjunction, [{
        key: 'getClauses',
        value: function getClauses() {
            var clauses = [];

            for (var i = 0; i < this.args.length; i++) {
                var op = this.args[i];

                if (op instanceof Connective) {
                    clauses.push.apply(clauses, _toConsumableArray(op.getClauses()));
                } else if (op.is_index_matchable) {
                    op.parent = this;
                    op.index = i;

                    clauses.push(op);
                }
            }

            return clauses;
        }
    }, {
        key: 'run',
        value: function run(fields) {
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = this.args[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var arg = _step2.value;

                    if (!arg.run(fields)) {
                        return false;
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

            return true;
        }
    }]);

    return Conjunction;
}(Connective);

var Disjunction = function (_Connective2) {
    _inherits(Disjunction, _Connective2);

    function Disjunction() {
        _classCallCheck(this, Disjunction);

        return _possibleConstructorReturn(this, (Disjunction.__proto__ || Object.getPrototypeOf(Disjunction)).apply(this, arguments));
    }

    _createClass(Disjunction, [{
        key: 'getClauses',
        value: function getClauses() {
            return [];
        }
    }, {
        key: 'run',
        value: function run(fields) {
            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
                for (var _iterator3 = this.args[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var arg = _step3.value;

                    if (arg.run(fields)) {
                        return true;
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

            return false;
        }
    }]);

    return Disjunction;
}(Connective);

var Negation = function (_Conjunction) {
    _inherits(Negation, _Conjunction);

    function Negation() {
        _classCallCheck(this, Negation);

        return _possibleConstructorReturn(this, (Negation.__proto__ || Object.getPrototypeOf(Negation)).apply(this, arguments));
    }

    _createClass(Negation, [{
        key: 'getClauses',
        value: function getClauses() {
            return [];
        }
    }, {
        key: 'run',
        value: function run(fields) {
            return !_get(Negation.prototype.__proto__ || Object.getPrototypeOf(Negation.prototype), 'run', this).call(this, fields);
        }
    }]);

    return Negation;
}(Conjunction);

var Exists = function (_Operator2) {
    _inherits(Exists, _Operator2);

    function Exists(path, bool) {
        _classCallCheck(this, Exists);

        var _this5 = _possibleConstructorReturn(this, (Exists.__proto__ || Object.getPrototypeOf(Exists)).call(this));

        _this5.path = path;
        _this5.bool = bool;
        return _this5;
    }

    _createClass(Exists, [{
        key: 'run',
        value: function run(fields) {
            return fields.get(this.path) !== MISSING === this.bool;
        }
    }, {
        key: 'is_index_matchable',
        get: function get() {
            return !!this.bool;
        }
    }]);

    return Exists;
}(Operator);

var Equal = function (_Operator3) {
    _inherits(Equal, _Operator3);

    function Equal(path, value) {
        _classCallCheck(this, Equal);

        var _this6 = _possibleConstructorReturn(this, (Equal.__proto__ || Object.getPrototypeOf(Equal)).call(this));

        _this6.path = path;
        _this6.value = value;
        return _this6;
    }

    _createClass(Equal, [{
        key: 'run',
        value: function run(fields) {
            var value = fields.get(this.path);
            if (value === MISSING) {
                return false;
            }

            return equal(value, this.value);
        }
    }, {
        key: 'is_index_matchable',
        get: function get() {
            return isIndexMatchable(this.value);
        }
    }, {
        key: 'idb_key_range',
        get: function get() {
            return IDBKeyRange.only(this.value);
        }
    }]);

    return Equal;
}(Operator);

var NotEqual = function (_Equal) {
    _inherits(NotEqual, _Equal);

    function NotEqual() {
        _classCallCheck(this, NotEqual);

        return _possibleConstructorReturn(this, (NotEqual.__proto__ || Object.getPrototypeOf(NotEqual)).apply(this, arguments));
    }

    _createClass(NotEqual, [{
        key: 'run',
        value: function run(fields) {
            return !_get(NotEqual.prototype.__proto__ || Object.getPrototypeOf(NotEqual.prototype), 'run', this).call(this, fields);
        }
    }, {
        key: 'is_index_matchable',
        get: function get() {
            return false;
        }
    }]);

    return NotEqual;
}(Equal);

var Range = function (_Operator4) {
    _inherits(Range, _Operator4);

    function Range(path, fns, values) {
        _classCallCheck(this, Range);

        var _this8 = _possibleConstructorReturn(this, (Range.__proto__ || Object.getPrototypeOf(Range)).call(this));

        _this8.path = path;
        _this8.fns = fns;
        _this8.values = values;
        return _this8;
    }

    _createClass(Range, [{
        key: 'run',
        value: function run(fields) {
            var value = fields.get(this.path);

            if (value === MISSING || value == null) {
                return false;
            }

            var fns = this.fns,
                values = this.values;


            for (var i = 0; i < fns.length; i++) {
                if (!fns[i](value, values[i])) {
                    return false;
                }
            }

            return true;
        }
    }, {
        key: 'is_index_matchable',
        get: function get() {
            return true;
        }
    }]);

    return Range;
}(Operator);

var rangeMixin = function rangeMixin() {
    for (var _len = arguments.length, fns = Array(_len), _key = 0; _key < _len; _key++) {
        fns[_key] = arguments[_key];
    }

    return function (_Range) {
        _inherits(_class, _Range);

        function _class(path, values) {
            _classCallCheck(this, _class);

            return _possibleConstructorReturn(this, (_class.__proto__ || Object.getPrototypeOf(_class)).call(this, path, fns, values));
        }

        return _class;
    }(Range);
};

var gt = function gt(a, b) {
    return a > b;
},
    gte = function gte(a, b) {
    return a >= b;
},
    lt = function lt(a, b) {
    return a < b;
},
    lte = function lte(a, b) {
    return a <= b;
};

var Gt = function (_rangeMixin) {
    _inherits(Gt, _rangeMixin);

    function Gt() {
        _classCallCheck(this, Gt);

        return _possibleConstructorReturn(this, (Gt.__proto__ || Object.getPrototypeOf(Gt)).apply(this, arguments));
    }

    _createClass(Gt, [{
        key: 'idb_key_range',
        get: function get() {
            var _IDBKeyRange;

            return (_IDBKeyRange = IDBKeyRange).lowerBound.apply(_IDBKeyRange, _toConsumableArray(this.values).concat([true]));
        }
    }]);

    return Gt;
}(rangeMixin(gt));

var Gte = function (_rangeMixin2) {
    _inherits(Gte, _rangeMixin2);

    function Gte() {
        _classCallCheck(this, Gte);

        return _possibleConstructorReturn(this, (Gte.__proto__ || Object.getPrototypeOf(Gte)).apply(this, arguments));
    }

    _createClass(Gte, [{
        key: 'idb_key_range',
        get: function get() {
            var _IDBKeyRange2;

            return (_IDBKeyRange2 = IDBKeyRange).lowerBound.apply(_IDBKeyRange2, _toConsumableArray(this.values));
        }
    }]);

    return Gte;
}(rangeMixin(gte));

var Lt = function (_rangeMixin3) {
    _inherits(Lt, _rangeMixin3);

    function Lt() {
        _classCallCheck(this, Lt);

        return _possibleConstructorReturn(this, (Lt.__proto__ || Object.getPrototypeOf(Lt)).apply(this, arguments));
    }

    _createClass(Lt, [{
        key: 'idb_key_range',
        get: function get() {
            var _IDBKeyRange3;

            return (_IDBKeyRange3 = IDBKeyRange).upperBound.apply(_IDBKeyRange3, _toConsumableArray(this.values).concat([true]));
        }
    }]);

    return Lt;
}(rangeMixin(lt));

var Lte = function (_rangeMixin4) {
    _inherits(Lte, _rangeMixin4);

    function Lte() {
        _classCallCheck(this, Lte);

        return _possibleConstructorReturn(this, (Lte.__proto__ || Object.getPrototypeOf(Lte)).apply(this, arguments));
    }

    _createClass(Lte, [{
        key: 'idb_key_range',
        get: function get() {
            var _IDBKeyRange4;

            return (_IDBKeyRange4 = IDBKeyRange).upperBound.apply(_IDBKeyRange4, _toConsumableArray(this.values));
        }
    }]);

    return Lte;
}(rangeMixin(lte));

var GtLt = function (_rangeMixin5) {
    _inherits(GtLt, _rangeMixin5);

    function GtLt() {
        _classCallCheck(this, GtLt);

        return _possibleConstructorReturn(this, (GtLt.__proto__ || Object.getPrototypeOf(GtLt)).apply(this, arguments));
    }

    _createClass(GtLt, [{
        key: 'idb_key_range',
        get: function get() {
            var _IDBKeyRange5;

            return (_IDBKeyRange5 = IDBKeyRange).bound.apply(_IDBKeyRange5, _toConsumableArray(this.values).concat([true, true]));
        }
    }]);

    return GtLt;
}(rangeMixin(gt, lt));

var GteLt = function (_rangeMixin6) {
    _inherits(GteLt, _rangeMixin6);

    function GteLt() {
        _classCallCheck(this, GteLt);

        return _possibleConstructorReturn(this, (GteLt.__proto__ || Object.getPrototypeOf(GteLt)).apply(this, arguments));
    }

    _createClass(GteLt, [{
        key: 'idb_key_range',
        get: function get() {
            var _IDBKeyRange6;

            return (_IDBKeyRange6 = IDBKeyRange).bound.apply(_IDBKeyRange6, _toConsumableArray(this.values).concat([false, true]));
        }
    }]);

    return GteLt;
}(rangeMixin(gte, lt));

var GtLte = function (_rangeMixin7) {
    _inherits(GtLte, _rangeMixin7);

    function GtLte() {
        _classCallCheck(this, GtLte);

        return _possibleConstructorReturn(this, (GtLte.__proto__ || Object.getPrototypeOf(GtLte)).apply(this, arguments));
    }

    _createClass(GtLte, [{
        key: 'idb_key_range',
        get: function get() {
            var _IDBKeyRange7;

            return (_IDBKeyRange7 = IDBKeyRange).bound.apply(_IDBKeyRange7, _toConsumableArray(this.values).concat([true, false]));
        }
    }]);

    return GtLte;
}(rangeMixin(gt, lte));

var GteLte = function (_rangeMixin8) {
    _inherits(GteLte, _rangeMixin8);

    function GteLte() {
        _classCallCheck(this, GteLte);

        return _possibleConstructorReturn(this, (GteLte.__proto__ || Object.getPrototypeOf(GteLte)).apply(this, arguments));
    }

    _createClass(GteLte, [{
        key: 'idb_key_range',
        get: function get() {
            var _IDBKeyRange8;

            return (_IDBKeyRange8 = IDBKeyRange).bound.apply(_IDBKeyRange8, _toConsumableArray(this.values));
        }
    }]);

    return GteLte;
}(rangeMixin(gte, lte));

var ElemMatch = function (_Operator5) {
    _inherits(ElemMatch, _Operator5);

    function ElemMatch(path, op) {
        _classCallCheck(this, ElemMatch);

        var _this18 = _possibleConstructorReturn(this, (ElemMatch.__proto__ || Object.getPrototypeOf(ElemMatch)).call(this));

        _this18.path = path;
        _this18.op = op;
        return _this18;
    }

    _createClass(ElemMatch, [{
        key: 'run',
        value: function run(fields) {
            var elements = fields.get(this.path);

            if (!elements || !elements[Symbol.iterator]) {
                return false;
            }

            var op = this.op;
            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {

                for (var _iterator4 = elements[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                    var obj = _step4.value;

                    if (isObject(obj) && op.run(new Fields(obj))) {
                        return true;
                    }
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

            return false;
        }
    }, {
        key: 'is_index_matchable',
        get: function get() {
            return false;
        }
    }]);

    return ElemMatch;
}(Operator);

var $and = function $and(parent_args, args) {
    var _iteratorNormalCompletion5 = true;
    var _didIteratorError5 = false;
    var _iteratorError5 = undefined;

    try {
        for (var _iterator5 = args[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
            var expr = _step5.value;

            var arg = build(expr);

            if (arg === false) {
                return false;
            }
            if (!arg) {
                continue;
            }

            if (arg.constructor === Conjunction) {
                parent_args.push.apply(parent_args, _toConsumableArray(arg.args));
            } else {
                parent_args.push(arg);
            }
        }
    } catch (err) {
        _didIteratorError5 = true;
        _iteratorError5 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion5 && _iterator5.return) {
                _iterator5.return();
            }
        } finally {
            if (_didIteratorError5) {
                throw _iteratorError5;
            }
        }
    }

    return true;
};

var $or = function $or(parent_args, args) {
    var new_args = [];

    var has_false = void 0;

    var _iteratorNormalCompletion6 = true;
    var _didIteratorError6 = false;
    var _iteratorError6 = undefined;

    try {
        for (var _iterator6 = args[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
            var expr = _step6.value;

            var arg = build(expr);

            if (!arg) {
                if (arg === false) {
                    has_false = true;
                }

                continue;
            }

            if (arg.constructor === Disjunction) {
                new_args.push.apply(new_args, _toConsumableArray(arg.args));
            } else {
                new_args.push(arg);
            }
        }
    } catch (err) {
        _didIteratorError6 = true;
        _iteratorError6 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion6 && _iterator6.return) {
                _iterator6.return();
            }
        } finally {
            if (_didIteratorError6) {
                throw _iteratorError6;
            }
        }
    }

    if (new_args.length > 1) {
        parent_args.push(new Disjunction(new_args));
    } else if (new_args.length) {
        parent_args.push(new_args[0]);
    } else if (has_false) {
        return false;
    }

    return true;
};

var $not = function $not(parent_args, args) {
    var new_args = [];

    var _iteratorNormalCompletion7 = true;
    var _didIteratorError7 = false;
    var _iteratorError7 = undefined;

    try {
        for (var _iterator7 = args[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
            var expr = _step7.value;

            var arg = build(expr);

            if (arg) {
                new_args.push(arg);
            }
        }
    } catch (err) {
        _didIteratorError7 = true;
        _iteratorError7 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion7 && _iterator7.return) {
                _iterator7.return();
            }
        } finally {
            if (_didIteratorError7) {
                throw _iteratorError7;
            }
        }
    }

    if (new_args.length) {
        parent_args.push(new Negation(new_args));
    }

    return true;
};

var connectives = {
    $and: $and,
    $or: $or,
    $not: $not,
    $nor: $not
};

var ranges = [[GtLt, '$gt', '$lt'], [GteLt, '$gte', '$lt'], [GtLte, '$gt', '$lte'], [GteLte, '$gte', '$lte'], [Gt, '$gt'], [Gte, '$gte'], [Lt, '$lt'], [Lte, '$lte']];

var buildRange = function buildRange(new_args, path, params, op_keys) {
    var build = function build(RangeOp, range_keys) {
        var values = [];

        var _iteratorNormalCompletion8 = true;
        var _didIteratorError8 = false;
        var _iteratorError8 = undefined;

        try {
            for (var _iterator8 = range_keys[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                var name = _step8.value;

                if (!op_keys.has(name)) {
                    return;
                }

                var value = params[name];
                if (!isIndexMatchable(value)) {
                    return false;
                }

                values.push(value);
            }
        } catch (err) {
            _didIteratorError8 = true;
            _iteratorError8 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion8 && _iterator8.return) {
                    _iterator8.return();
                }
            } finally {
                if (_didIteratorError8) {
                    throw _iteratorError8;
                }
            }
        }

        new_args.push(new RangeOp(path, values));

        return true;
    };

    var _iteratorNormalCompletion9 = true;
    var _didIteratorError9 = false;
    var _iteratorError9 = undefined;

    try {
        for (var _iterator9 = ranges[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
            var _step9$value = _toArray(_step9.value),
                RangeOp = _step9$value[0],
                range_keys = _step9$value.slice(1);

            var result = build(RangeOp, range_keys);

            if (result === false) {
                return;
            }
            if (!result) {
                continue;
            }

            op_keys.delete('$gt');
            op_keys.delete('$gte');
            op_keys.delete('$lt');
            op_keys.delete('$lte');

            break;
        }
    } catch (err) {
        _didIteratorError9 = true;
        _iteratorError9 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion9 && _iterator9.return) {
                _iterator9.return();
            }
        } finally {
            if (_didIteratorError9) {
                throw _iteratorError9;
            }
        }
    }

    return true;
};

var buildClause = function buildClause(parent_args, path, params) {
    var withoutOps = function withoutOps() {
        parent_args.push(new Equal(path, params));

        return true;
    };

    if (params == null || params.constructor !== Object) {
        return withoutOps();
    }

    var op_keys = new Set(Object.keys(params));

    if (op_keys.has('$exists') && !params.$exists) {
        parent_args.push(new Exists(path, false));

        return true;
    }

    var new_args = [];

    if (op_keys.has('$eq')) {
        new_args.push(new Equal(path, params.$eq));

        op_keys.delete('$eq');
    }

    if (op_keys.has('$ne')) {
        new_args.push(new NotEqual(path, params.$ne));

        op_keys.delete('$ne');
    }

    if (!buildRange(new_args, path, params, op_keys)) {
        return false;
    }

    if (op_keys.has('$in')) {
        var eqs = [];

        var _iteratorNormalCompletion10 = true;
        var _didIteratorError10 = false;
        var _iteratorError10 = undefined;

        try {
            for (var _iterator10 = params.$in[Symbol.iterator](), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
                var value = _step10.value;

                eqs.push(new Equal(path, value));
            }
        } catch (err) {
            _didIteratorError10 = true;
            _iteratorError10 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion10 && _iterator10.return) {
                    _iterator10.return();
                }
            } finally {
                if (_didIteratorError10) {
                    throw _iteratorError10;
                }
            }
        }

        if (eqs.length > 1) {
            new_args.push(new Disjunction(eqs));
        } else if (eqs.length) {
            new_args.push(eqs[0]);
        }

        op_keys.delete('$in');
    }

    if (op_keys.has('$nin')) {
        var _iteratorNormalCompletion11 = true;
        var _didIteratorError11 = false;
        var _iteratorError11 = undefined;

        try {
            for (var _iterator11 = params.$nin[Symbol.iterator](), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
                var _value = _step11.value;

                new_args.push(new NotEqual(path, _value));
            }
        } catch (err) {
            _didIteratorError11 = true;
            _iteratorError11 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion11 && _iterator11.return) {
                    _iterator11.return();
                }
            } finally {
                if (_didIteratorError11) {
                    throw _iteratorError11;
                }
            }
        }

        op_keys.delete('$nin');
    }

    if (op_keys.has('$elemMatch')) {
        var op = build(params.$elemMatch);

        if (op) {
            new_args.push(new ElemMatch(path, op));
        }

        op_keys.delete('$elemMatch');
    }

    if (params.$exists && !new_args.length) {
        new_args.push(new Exists(path, true));

        op_keys.delete('$exists');
    }

    var _iteratorNormalCompletion12 = true;
    var _didIteratorError12 = false;
    var _iteratorError12 = undefined;

    try {
        for (var _iterator12 = op_keys[Symbol.iterator](), _step12; !(_iteratorNormalCompletion12 = (_step12 = _iterator12.next()).done); _iteratorNormalCompletion12 = true) {
            var name = _step12.value;

            if (name[0] === '$') {
                unknownOp(name);
            }
        }
    } catch (err) {
        _didIteratorError12 = true;
        _iteratorError12 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion12 && _iterator12.return) {
                _iterator12.return();
            }
        } finally {
            if (_didIteratorError12) {
                throw _iteratorError12;
            }
        }
    }

    if (!new_args.length) {
        return withoutOps();
    }

    parent_args.push.apply(parent_args, new_args);

    return true;
};

var build = function build(expr) {
    var args = [];

    for (var field in expr) {
        var value = expr[field],
            result = void 0;

        if (field[0] !== '$') {
            result = buildClause(args, new Path(field), value);
        } else {
            if (!Array.isArray(value)) {
                value = [value];
            }

            var fn = connectives[field];
            if (!fn) {
                unknownOp(field);
            }

            result = fn(args, value);
        }

        if (!result) {
            return result;
        }
    }

    if (!args.length) {
        return;
    }
    if (args.length === 1) {
        return args[0];
    }

    return new Conjunction(args);
};

module.exports.build = build;
module.exports.Conjunction = Conjunction;
module.exports.Disjunction = Disjunction;
module.exports.Exists = Exists;
},{"../util.js":21,"./fields.js":10,"./missing_symbol.js":12,"./path.js":13}],12:[function(require,module,exports){
'use strict';

module.exports = Symbol('missing');
},{}],13:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('../util.js'),
    toPathPieces = _require.toPathPieces;

var Path = function Path(path) {
    _classCallCheck(this, Path);

    this.pieces = toPathPieces(path);
    this.literal = path;
};

module.exports = Path;
},{"../util.js":21}],14:[function(require,module,exports){
"use strict";

module.exports = function (_next, num) {
    var count = 0;

    var next = function next(cb) {
        if (count++ < num) {
            _next(cb);
        } else {
            cb();
        }
    };

    return next;
};
},{}],15:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _require = require('./util.js'),
    toPathPieces = _require.toPathPieces,
    set = _require.set,
    remove2 = _require.remove2,
    copy = _require.copy;

var build = require('./lang/expression.js');
var Fields = require('./lang/fields.js');

var addition = function addition(doc, new_doc, new_fields) {
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = new_fields[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var _step$value = _slicedToArray(_step.value, 2),
                path_pieces = _step$value[0],
                add = _step$value[1];

            add(doc, new_doc, path_pieces);
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

    return new_doc;
};

var _build = function _build(value1) {
    var _build2 = build(value1),
        ast = _build2.ast,
        paths = _build2.paths,
        has_refs = _build2.has_refs;

    if (!has_refs) {
        var value2 = ast.run();

        return function (doc) {
            for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
            }

            return set.apply(undefined, args.concat([value2]));
        };
    }

    return function (doc) {
        for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
            args[_key2 - 1] = arguments[_key2];
        }

        var fields = new Fields(doc);

        if (fields.ensure(paths)) {
            set.apply(undefined, args.concat([ast.run(fields)]));
        }
    };
};

var project = function project(_next, spec) {
    var toBool = function toBool(path) {
        return !!spec[path];
    };
    var _id_bool = true;

    if (spec.hasOwnProperty('_id')) {
        _id_bool = toBool('_id');

        delete spec._id;
    }

    var existing_fields = [],
        new_fields = [];
    var is_inclusion = true;

    var _mode = function _mode(path) {
        if (toBool(path) !== is_inclusion) {
            throw Error('cannot mix inclusions and exclusions');
        }
    };

    var _mode2 = function mode(path) {
        is_inclusion = toBool(path);

        _mode2 = _mode;
    };

    for (var path in spec) {
        var value = spec[path];
        var path_pieces = toPathPieces(path);

        if (typeof value === 'boolean' || value === 1 || value === 0) {
            _mode2(path);
            existing_fields.push(path_pieces);
        } else {
            new_fields.push([path_pieces, _build(value)]);
        }
    }

    var steps = [];

    if (new_fields.length) {
        steps.push(function (doc, new_doc) {
            return addition(doc, new_doc, new_fields);
        });
    }

    if (!existing_fields.length) {
        var _project = void 0;

        if (_id_bool) {
            _project = function _project(doc, new_doc) {
                if (doc.hasOwnProperty('_id')) {
                    new_doc._id = doc._id;
                }
            };
        } else {
            _project = function _project(doc, new_doc) {
                delete new_doc._id;
            };
        }

        steps.push(function (doc, new_doc) {
            _project(doc, new_doc);

            return new_doc;
        });
    } else {
        if (is_inclusion === _id_bool) {
            existing_fields.push(['_id']);
        }

        var _project2 = is_inclusion ? copy : remove2;

        steps.push(function (doc) {
            return _project2(doc, existing_fields);
        });
    }

    var next = function next(cb) {
        _next(function (error, doc) {
            if (!doc) {
                return cb(error);
            }

            var new_doc = doc;

            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = steps[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var fn = _step2.value;

                    new_doc = fn(doc, new_doc);
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

            cb(null, new_doc);
        });
    };

    return next;
};

module.exports = project;
},{"./lang/expression.js":9,"./lang/fields.js":10,"./util.js":21}],16:[function(require,module,exports){
'use strict';

var _require = require('./util.js'),
    getIDBError = _require.getIDBError;

module.exports = function (cur, cb) {
    (function iterate() {
        cur._next(function (error, doc, idb_cur) {
            if (!doc) {
                return cb(error);
            }

            var idb_req = idb_cur.delete();

            idb_req.onsuccess = iterate;
            idb_req.onerror = function (e) {
                return cb(getIDBError(e));
            };
        });
    })();
};
},{"./util.js":21}],17:[function(require,module,exports){
"use strict";

module.exports = function (_next, num) {
    var count = 0;

    var next = function next(cb) {
        _next(function (error, doc) {
            if (!doc) {
                cb(error);
            } else if (++count > num) {
                cb(null, doc);
            } else {
                next(cb);
            }
        });
    };

    return next;
};
},{}],18:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _require = require('./util.js'),
    toPathPieces = _require.toPathPieces,
    isObject = _require.isObject,
    equal = _require.equal;

var compare = function compare(a, b, path_pieces, order) {
    for (var i = 0; i < path_pieces.length - 1; i++) {
        var _piece = path_pieces[i];

        a = a[_piece];
        b = b[_piece];

        if (!isObject(a)) {
            if (!isObject(b)) {
                return null;
            }
        } else if (isObject(b)) {
            continue;
        }

        return order;
    }

    var piece = path_pieces[i];

    if (!a.hasOwnProperty(piece)) {
        if (!b.hasOwnProperty(piece)) {
            return null;
        }
    } else if (b.hasOwnProperty(piece)) {
        a = a[piece];
        b = b[piece];

        if (equal(a, b)) {
            return 0;
        }

        return (a < b ? 1 : -1) * order;
    }

    return order;
};

module.exports = function (_next, spec) {
    var sorts = [];

    for (var path in spec) {
        sorts.push([toPathPieces(path), spec[path]]);
    }

    var sortFn = function sortFn(a, b) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = sorts[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var _step$value = _slicedToArray(_step.value, 2),
                    path_pieces = _step$value[0],
                    order = _step$value[1];

                var result = compare(a, b, path_pieces, order);

                if (result !== null) {
                    return result;
                }
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

        return -order;
    };

    var docs = [];

    var fn = function fn(cb) {
        return cb(null, docs.pop());
    };

    var _next2 = function next(cb) {
        var done = function done(error) {
            if (error) {
                return cb(error);
            }

            docs = docs.sort(sortFn);

            (_next2 = fn)(cb);
        };

        (function iterate() {
            _next(function (error, doc) {
                if (!doc) {
                    return done(error);
                }

                docs.push(doc);
                iterate();
            });
        })();
    };

    return function (cb) {
        return _next2(cb);
    };
};
},{"./util.js":21}],19:[function(require,module,exports){
'use strict';

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _require = require('./util.js'),
    toPathPieces = _require.toPathPieces,
    get = _require.get;

module.exports = function (_next, path) {
    var path_pieces = toPathPieces(path.substring(1)),
        elements = [],
        fn = function fn(cb) {
        return cb(null, elements.pop());
    };

    var onDoc = function onDoc(doc, cb) {
        var old_length = elements.length;

        get(doc, path_pieces, function (obj, field) {
            var new_elements = obj[field];
            if (!new_elements) {
                return;
            }

            if (new_elements[Symbol.iterator]) {
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = new_elements[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var element = _step.value;

                        elements.push(_defineProperty({}, field, element));
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
            }
        });

        if (old_length === elements.length) {
            return _next2(cb);
        }

        fn(cb);
    };

    var _next2 = function next(cb) {
        _next(function (error, doc) {
            if (error) {
                cb(error);
            } else if (doc) {
                onDoc(doc, cb);
            } else {
                (_next2 = fn)(cb);
            }
        });
    };

    return function (cb) {
        return _next2(cb);
    };
};
},{"./util.js":21}],20:[function(require,module,exports){
'use strict';

var _require = require('./util.js'),
    toPathPieces = _require.toPathPieces,
    get = _require.get,
    set = _require.set,
    modify = _require.modify,
    remove1 = _require.remove1,
    rename = _require.rename,
    unknownOp = _require.unknownOp,
    getIDBError = _require.getIDBError;

var $set = function $set(path_pieces, value) {
    return function (doc) {
        set(doc, path_pieces, value);
    };
};

var $unset = function $unset(path_pieces) {
    return function (doc) {
        return remove1(doc, path_pieces);
    };
};

var $rename = function $rename(path_pieces, new_name) {
    return function (doc) {
        rename(doc, path_pieces, new_name);
    };
};

var modifyOp = function modifyOp(path_pieces, update, init) {
    return function (doc) {
        modify(doc, path_pieces, update, init);
    };
};

var arithOp = function arithOp(fn) {
    return function (path_pieces, value1) {
        var update = function update(obj, field) {
            var value2 = obj[field];

            if (typeof value2 === 'number') {
                obj[field] = fn(value1, value2);
            }
        };

        var init = function init(obj, field) {
            return obj[field] = 0;
        };

        return modifyOp(path_pieces, update, init);
    };
};

var $inc = arithOp(function (a, b) {
    return a + b;
});
var $mul = arithOp(function (a, b) {
    return a * b;
});

var compareOp = function compareOp(fn) {
    return function (path_pieces, value) {
        var update = function update(obj, field) {
            if (fn(value, obj[field])) {
                obj[field] = value;
            }
        };

        var init = function init(obj, field) {
            return obj[field] = value;
        };

        return modifyOp(path_pieces, update, init);
    };
};

var $min = compareOp(function (a, b) {
    return a < b;
});
var $max = compareOp(function (a, b) {
    return a > b;
});

var $push = function $push(path_pieces, value) {
    var update = function update(obj, field) {
        var elements = obj[field];

        if (Array.isArray(elements)) {
            elements.push(value);
        }
    };

    var init = function init(obj, field) {
        return obj[field] = [value];
    };

    return modifyOp(path_pieces, update, init);
};

var $pop = function $pop(path_pieces, direction) {
    var pop = void 0;

    if (direction < 1) {
        pop = function pop(e) {
            return e.shift();
        };
    } else {
        pop = function pop(e) {
            return e.pop();
        };
    }

    return function (doc) {
        get(doc, path_pieces, function (obj, field) {
            var elements = obj[field];

            if (Array.isArray(elements)) {
                pop(elements);
            }
        });
    };
};

var ops = {
    $set: $set,
    $unset: $unset,
    $rename: $rename,
    $inc: $inc,
    $mul: $mul,
    $min: $min,
    $max: $max,
    $push: $push,
    $pop: $pop
};

var build = function build(steps, field, value) {
    if (field[0] !== '$') {
        return steps.push($set(toPathPieces(field), value));
    }

    var op = ops[field];
    if (!op) {
        unknownOp(field);
    }

    for (var path in value) {
        steps.push(op(toPathPieces(path), value[path]));
    }
};

module.exports = function (cur, spec, cb) {
    var steps = [];

    for (var field in spec) {
        build(steps, field, spec[field]);
    }

    if (!steps.length) {
        return cb(null);
    }

    (function iterate() {
        cur._next(function (error, doc, idb_cur) {
            if (!doc) {
                return cb(error);
            }

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = steps[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var fn = _step.value;
                    fn(doc);
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

            var idb_req = idb_cur.update(doc);

            idb_req.onsuccess = iterate;
            idb_req.onerror = function (e) {
                return cb(getIDBError(e));
            };
        });
    })();
};
},{"./util.js":21}],21:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var deepMerge = require('deepmerge'),
    clone = require('clone'),
    objectHash = require('object-hash');

var toPathPieces = function toPathPieces(path) {
    return path.split('.');
};

var _exists = function _exists(obj, path_pieces) {
    for (var i = 0; i < path_pieces.length - 1; i++) {
        var piece = path_pieces[i];
        if (!obj.hasOwnProperty(piece)) {
            return;
        }

        obj = obj[piece];

        if (!isObject(obj)) {
            return;
        }
    }

    if (obj.hasOwnProperty(path_pieces[i])) {
        return obj;
    }
};

var exists = function exists(obj, path_pieces) {
    return !!_exists(obj, path_pieces);
};

var create = function create(obj, path_pieces, i) {
    for (var j = i; j < path_pieces.length - 1; j++) {
        obj[path_pieces[j]] = {};
        obj = obj[path_pieces[j]];
    }

    return obj;
};

var get = function get(obj, path_pieces, fn) {
    if (obj = _exists(obj, path_pieces)) {
        fn(obj, path_pieces[path_pieces.length - 1]);
    }
};

// Set a value, creating the path if it doesn't exist.
var set = function set(obj, path_pieces, value) {
    var fn = function fn(obj, field) {
        return obj[field] = value;
    };

    modify(obj, path_pieces, fn, fn);
};

var isObject = function isObject(obj) {
    return (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object' && obj !== null;
};

// Update a value or create it and it's path if it doesn't exist.
var modify = function modify(obj, path_pieces, update, init) {
    var last = path_pieces[path_pieces.length - 1];

    var _create = function _create(i) {
        obj = create(obj, path_pieces, i);

        init(obj, last);
    };

    if (!obj.hasOwnProperty(path_pieces[0])) {
        return _create(0);
    }

    if (path_pieces.length > 1) {
        obj = obj[path_pieces[0]];

        for (var i = 1; i < path_pieces.length - 1; i++) {
            var piece = path_pieces[i];

            if (!isObject(obj[piece])) {
                return;
            }
            if (Array.isArray(obj) && piece < 0) {
                return;
            }

            if (!obj.hasOwnProperty(piece)) {
                return _create(i);
            }

            obj = obj[piece];
        }
    }

    update(obj, last);
};

// Delete specified paths from object.
var remove1 = function remove1(obj, path_pieces) {
    for (var i = 0; i < path_pieces.length - 1; i++) {
        obj = obj[path_pieces[i]];

        if (!isObject(obj)) {
            return;
        }
    }

    if (Array.isArray(obj)) {
        var index = Number.parseFloat(path_pieces[i]);

        if (Number.isInteger(index)) {
            obj.splice(index, 1);
        }
    } else {
        delete obj[path_pieces[i]];
    }
};

var _remove2 = function _remove2(obj, new_obj, paths) {
    var fn = function fn(field) {
        var new_paths = [];

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = paths[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var path_pieces = _step.value;

                if (path_pieces[0] !== field) {
                    continue;
                }
                if (path_pieces.length === 1) {
                    return;
                }

                new_paths.push(path_pieces.slice(1));
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

        if (!new_paths.length) {
            new_obj[field] = clone(obj[field]);
        } else {
            var value = obj[field];

            new_obj[field] = new value.constructor();

            _remove2(value, new_obj[field], new_paths);
        }
    };

    for (var field in obj) {
        fn(field);
    }
};

// Copy an object ignoring specified paths.
var remove2 = function remove2(obj, paths) {
    var new_obj = new obj.constructor();

    _remove2(obj, new_obj, paths);

    return new_obj;
};

var rename = function rename(obj1, path_pieces, new_name) {
    get(obj1, path_pieces, function (obj2, field) {
        obj2[new_name] = obj2[field];
        delete obj2[field];
    });
};

// Copy an object by a path ignoring other fields.
var _copy = function _copy(obj, new_obj, path_pieces) {
    for (var i = 0; i < path_pieces.length - 1; i++) {
        var piece = path_pieces[i];

        obj = obj[piece];

        if (!isObject(obj)) {
            return;
        }

        new_obj[piece] = new obj.constructor();
        new_obj = new_obj[piece];
    }

    if (obj.hasOwnProperty(path_pieces[i])) {
        new_obj[path_pieces[i]] = obj[path_pieces[i]];

        return obj;
    }
};

// Copy an object by specified paths ignoring other paths.
var copy = function copy(obj, paths) {
    var new_objs = [];

    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
        for (var _iterator2 = paths[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var path_pieces = _step2.value;

            var new_obj = new obj.constructor();

            if (_copy(obj, new_obj, path_pieces)) {
                new_objs.push(new_obj);
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

    return new_objs.reduce(deepMerge, {});
};

var equal = function equal(value1, value2) {
    return hashify(value1) === hashify(value2);
};

var unknownOp = function unknownOp(name) {
    throw Error('unknown operator \'' + name + '\'');
};

var hashify = function hashify(value) {
    if (value === undefined) {
        return;
    }

    return objectHash(value);
};

var getIDBError = function getIDBError(e) {
    return Error(e.target.error.message);
};

module.exports.toPathPieces = toPathPieces;
module.exports.exists = exists;
module.exports.create = create;
module.exports.get = get;
module.exports.set = set;
module.exports.isObject = isObject;
module.exports.modify = modify;
module.exports.remove1 = remove1;
module.exports.remove2 = remove2;
module.exports.rename = rename;
module.exports.copy = copy;
module.exports.equal = equal;
module.exports.unknownOp = unknownOp;
module.exports.hashify = hashify;
module.exports.getIDBError = getIDBError;
},{"clone":71,"deepmerge":77,"object-hash":179}],22:[function(require,module,exports){
'use strict';

var _require = require('chai'),
    expect = _require.expect;

describe('$match', function () {
    var db = new zango.Db(Math.random(), ['col']);
    var col = db.collection('col');

    var docs = [{ x: 4, k: 2 }, { x: 4, k: 3 }];

    before(function () {
        return col.insert(docs);
    });
    after(function () {
        return db.drop();
    });

    it('should match documents', function (done) {
        col.aggregate([{ $match: { x: 4 } }, { $match: { k: 2 } }, { $match: {} }]).toArray(function (error, docs) {
            if (error) {
                throw error;
            }

            expect(docs).to.have.lengthOf(1);

            delete docs[0]._id;
            expect(docs[0]).to.deep.equal({ x: 4, k: 2 });

            done();
        });
    });
});

describe('$group', function () {
    return require('./group.js');
});
describe('$unwind', function () {
    return require('./unwind.js');
});
},{"./group.js":25,"./unwind.js":34,"chai":42}],23:[function(require,module,exports){
'use strict';

var _require = require('chai'),
    expect = _require.expect;

var _require2 = require('../src/lang/filter.js'),
    build = _require2.build,
    Fields = require('../src/lang/fields.js'),
    waterfall = require('./waterfall.js');

var db = new zango.Db(Math.random(), { col: ['x', 'g'] });
var col = db.collection('col');

var docs = [{ x: 4, k: 8 }, { x: 2, g: 3 }, { x: 3, z: 3 }, { x: 6, g: 9 }, { x: 10, k: 4 }, { x: 2, g: 8 }, { x: 2, g: 8, z: 10 }, { x: undefined }, { x: null }, { x: [{ k: 2 }, { k: 8 }] }];

before(function () {
    return col.insert(docs);
});
after(function () {
    return db.drop();
});

var query = function query(expr, done) {
    var cur = col.find(expr);

    var pred = build(expr);
    var fn = function fn(doc) {
        return pred.run(new Fields(doc));
    };

    var expected_docs = docs.filter(fn);
    expect(expected_docs).to.have.length.above(0);

    cur.toArray(function (error, docs) {
        if (error) {
            throw error;
        }

        expect(docs).to.have.lengthOf(expected_docs.length);

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = docs[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var doc = _step.value;

                delete doc._id;

                expect(expected_docs).to.deep.include(doc);
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

        done();
    });
};

describe('equality (without $eq)', function () {
    it('should test for equality', function (done) {
        waterfall([function (next) {
            return query({ x: 4 }, next);
        }, function (next) {
            return query({ x: undefined }, next);
        }, function (next) {
            return query({ x: null }, next);
        }], done);
    });
});

describe('$eq', function () {
    it('should test for equality', function (done) {
        query({ x: { $eq: 4 } }, done);
    });
});

describe('conjunction without $and', function () {
    it('should perform conjunction', function (done) {
        query({ x: 2, g: 3 }, done);
    });
});

describe('$and', function () {
    it('should perform conjunction', function (done) {
        query({ $and: [{ x: 2 }, { g: 3 }] }, done);
    });
});

describe('$or', function () {
    it('should perform disjunction', function (done) {
        waterfall([function (next) {
            return query({ $or: [{ x: 2 }, { g: 3 }] }, next);
        }, function (next) {
            query({
                $or: [{ $or: [{ x: 2 }, { g: 3 }] }, { z: 8 }]
            }, next);
        }], done);
    });
});

describe('$gt', function () {
    it('should perform greater than comparison', function (done) {
        query({ x: { $gt: 3 } }, done);
    });
});

describe('$gte', function () {
    it('should perform greater than or equal comparison', function (done) {
        query({ x: { $gte: 6 } }, done);
    });
});

describe('$lt', function () {
    it('should perform less than comparison', function (done) {
        query({ x: { $lt: 8 } }, done);
    });
});

describe('$lte', function () {
    it('should perform less than or equal comparison', function (done) {
        query({ x: { $lte: 6 } }, done);
    });
});

describe('$gt and $lt', function () {
    it('should perform gt and lt comparison', function (done) {
        query({ x: { $gt: 3, $lt: 8 } }, done);
    });
});

describe('$gte and $lt', function () {
    it('should perform gte and lt comparison', function (done) {
        query({ x: { $gte: 3, $lt: 8 } }, done);
    });
});

describe('$gt and $lte', function () {
    it('should perform gt and lte comparison', function (done) {
        query({ x: { $gt: 3, $lte: 8 } }, done);
    });
});

describe('$gte and $lte', function () {
    it('should perform gte and lte comparison', function (done) {
        query({ x: { $gte: 3, $lte: 8 } }, done);
    });
});

describe('$in', function () {
    it('should perform disjunction equality test', function (done) {
        query({ x: { $in: [2, 4, 8] } }, done);
    });
});

describe('$nin', function () {
    it('should perform conjunction inequality test', function (done) {
        query({ x: { $nin: [2, 4, 8] } }, done);
    });
});

describe('$elemMatch', function () {
    it('should test if any iterable elements satisify a predicate', function (done) {
        query({ x: { $elemMatch: { k: 8 } } }, done);
    });
});

describe('$exists', function () {
    it('should test if document contains a field', function (done) {
        query({ g: { $exists: 1 } }, done);
    });

    it("should test if document doesn't contain a field", function (done) {
        query({ g: { $exists: 0 } }, done);
    });
});
},{"../src/lang/fields.js":10,"../src/lang/filter.js":11,"./waterfall.js":36,"chai":42}],24:[function(require,module,exports){
'use strict';

var _require = require('chai'),
    expect = _require.expect;

var _require2 = require('../src/lang/filter.js'),
    build = _require2.build,
    Fields = require('../src/lang/fields.js'),
    waterfall = require('./waterfall.js');

var db = new zango.Db(Math.random(), { col: ['x', 'g'] });
var col = db.collection('col');

var docs = [{ x: 2, g: 3 }, { x: 2, g: 8 }, { x: 2, g: 8, z: 10 }, { x: 3, z: 3 }, { x: 4, k: 8 }, { x: 6, g: 9 }, { x: 10, k: 4 }, { x: undefined }, { x: null }, { x: [{ k: 2 }, { k: 8 }] }];

before(function () {
    return col.insert(docs);
});
after(function () {
    return db.drop();
});

var query = function query(expr, done) {
    var cur = col.findOne(expr);

    var pred = build(expr);
    var fn = function fn(doc) {
        return pred.run(new Fields(doc));
    };

    var expected_doc = docs.filter(fn)[0];
    expect(expected_doc).to.exist;

    cur.then(function (doc) {
        delete doc._id;
        expect(expected_doc).to.deep.equal(doc);
        done();
    }).catch(function (e) {
        return console.log(e);
    });
};

describe('equality (without $eq)', function () {
    it('should test for equality', function (done) {
        waterfall([function (next) {
            return query({ x: 4 }, next);
        }, function (next) {
            return query({ x: undefined }, next);
        }, function (next) {
            return query({ x: null }, next);
        }], done);
    });
});

describe('$eq', function () {
    it('should test for equality', function (done) {
        query({ x: { $eq: 4 } }, done);
    });
});

describe('conjunction without $and', function () {
    it('should perform conjunction', function (done) {
        query({ x: 2, g: 3 }, done);
    });
});

describe('$and', function () {
    it('should perform conjunction', function (done) {
        query({ $and: [{ x: 2 }, { g: 3 }] }, done);
    });
});

describe('$or', function () {
    it('should perform disjunction', function (done) {
        waterfall([function (next) {
            return query({ $or: [{ x: 2 }, { g: 3 }] }, next);
        }, function (next) {
            query({
                $or: [{ $or: [{ x: 2 }, { g: 3 }] }, { z: 8 }]
            }, next);
        }], done);
    });
});

describe('$gt', function () {
    it('should perform greater than comparison', function (done) {
        query({ x: { $gt: 3 } }, done);
    });
});

describe('$gte', function () {
    it('should perform greater than or equal comparison', function (done) {
        query({ x: { $gte: 6 } }, done);
    });
});

describe('$lt', function () {
    it('should perform less than comparison', function (done) {
        query({ x: { $lt: 8 } }, done);
    });
});

describe('$lte', function () {
    it('should perform less than or equal comparison', function (done) {
        query({ x: { $lte: 6 } }, done);
    });
});

describe('$gt and $lt', function () {
    it('should perform gt and lt comparison', function (done) {
        query({ x: { $gt: 3, $lt: 8 } }, done);
    });
});

describe('$gte and $lt', function () {
    it('should perform gte and lt comparison', function (done) {
        query({ x: { $gte: 3, $lt: 8 } }, done);
    });
});

describe('$gt and $lte', function () {
    it('should perform gt and lte comparison', function (done) {
        query({ x: { $gt: 3, $lte: 8 } }, done);
    });
});

describe('$gte and $lte', function () {
    it('should perform gte and lte comparison', function (done) {
        query({ x: { $gte: 3, $lte: 8 } }, done);
    });
});

describe('$in', function () {
    it('should perform disjunction equality test', function (done) {
        query({ x: { $in: [2, 4, 8] } }, done);
    });
});

describe('$nin', function () {
    it('should perform conjunction inequality test', function (done) {
        query({ x: { $nin: [2, 4, 8] } }, done);
    });
});

describe('$elemMatch', function () {
    it('should test if any iterable elements satisify a predicate', function (done) {
        query({ x: { $elemMatch: { k: 8 } } }, done);
    });
});

describe('$exists', function () {
    it('should test if document contains a field', function (done) {
        query({ g: { $exists: 1 } }, done);
    });

    it("should test if document doesn't contain a field", function (done) {
        query({ g: { $exists: 0 } }, done);
    });
});
},{"../src/lang/fields.js":10,"../src/lang/filter.js":11,"./waterfall.js":36,"chai":42}],25:[function(require,module,exports){
'use strict';

var _require = require('chai'),
    expect = _require.expect;

var docs = [{ x: 2, g: 1 }, { x: 2, g: 4 }, { x: 2, g: 4 }, { x: 2, g: 3 }, { x: 8, g: 8 }, { x: 8, g: 8 }, { x: 8, g: 6 }, { x: 8, g: 2 }];

var db = new zango.Db(Math.random(), ['col']);
var col = db.collection('col');

before(function () {
    return col.insert(docs);
});
after(function () {
    return db.drop();
});

var group = function group(spec, expected_docs, done) {
    col.aggregate([{ $group: spec }]).toArray(function (error, docs) {
        if (error) {
            throw error;
        }

        expect(docs).to.have.lengthOf(expected_docs.length);

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = docs[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var doc = _step.value;

                expect(expected_docs).to.deep.include(doc);
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

        done();
    });
};

describe('grouping', function () {
    it('should group by a literal value', function (done) {
        group({ _id: null }, [{ _id: null }], done);
    });

    it('should group by a referenced value', function (done) {
        group({ _id: '$x' }, [{ _id: 2 }, { _id: 8 }], done);
    });
});

describe('$sum', function () {
    it('should compute the sum of a literal value', function (done) {
        group({
            _id: '$x',
            sum: { $sum: 1 }
        }, [{ _id: 2, sum: 4 }, { _id: 8, sum: 4 }], done);
    });

    it('should compute the sum of a referenced value', function (done) {
        group({
            _id: '$x',
            sum: { $sum: '$g' }
        }, [{ _id: 2, sum: 12 }, { _id: 8, sum: 24 }], done);
    });
});

describe('$avg', function () {
    it('should compute the average of a literal value', function (done) {
        group({
            _id: '$x',
            avg: { $avg: 1 }
        }, [{ _id: 2, avg: 1 }, { _id: 8, avg: 1 }], done);
    });

    it('should compute the average of a referenced value', function (done) {
        group({
            _id: '$x',
            avg: { $avg: '$g' }
        }, [{ _id: 2, avg: 3 }, { _id: 8, avg: 6 }], done);
    });
});

describe('$push', function () {
    it('should push a literal value to an array', function (done) {
        group({
            _id: '$x',
            array: { $push: 1 }
        }, [{ _id: 2, array: [1, 1, 1, 1] }, { _id: 8, array: [1, 1, 1, 1] }], done);
    });

    it('should push a referenced value to an array', function (done) {
        group({
            _id: '$x',
            array: { $push: '$g' }
        }, [{ _id: 2, array: [1, 4, 4, 3] }, { _id: 8, array: [8, 8, 6, 2] }], done);
    });
});

describe('$addToSet', function () {
    it('should push a unique literal value to an array', function (done) {
        group({
            _id: '$x',
            array: { $addToSet: 1 }
        }, [{ _id: 2, array: [1] }, { _id: 8, array: [1] }], done);
    });

    it('should push a unique referenced value to an array', function (done) {
        group({
            _id: '$x',
            array: { $addToSet: '$g' }
        }, [{ _id: 2, array: [1, 4, 3] }, { _id: 8, array: [8, 6, 2] }], done);
    });
});

describe('$max', function () {
    it('should retrieve the max literal value', function (done) {
        group({
            _id: '$x',
            max: { $max: 1 }
        }, [{ _id: 2, max: 1 }, { _id: 8, max: 1 }], done);
    });

    it('should retrieve the max referenced value', function (done) {
        group({
            _id: '$x',
            max: { $max: '$g' }
        }, [{ _id: 2, max: 4 }, { _id: 8, max: 8 }], done);
    });
});

describe('$min', function () {
    it('should retrieve the min literal value', function (done) {
        group({
            _id: '$x',
            min: { $min: 1 }
        }, [{ _id: 2, min: 1 }, { _id: 8, min: 1 }], done);
    });

    it('should retrieve the min referenced value', function (done) {
        group({
            _id: '$x',
            min: { $min: '$g' }
        }, [{ _id: 2, min: 1 }, { _id: 8, min: 2 }], done);
    });
});
},{"chai":42}],26:[function(require,module,exports){
(function (process,global){
'use strict';

if (!process.browser) {
    global.indexedDB = require('fake-indexeddb');
    global.IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');
    global.zango = require('../src');
}

describe('lang', function () {
    describe('expressions', function () {
        require('./lang/expression.js');
    });

    describe('filtering', function () {
        require('./lang/filter.js');
    });
});

describe('Collection', function () {
    describe('.find', function () {
        return require('./find.js');
    });
    describe('.findOne', function () {
        return require('./find_one.js');
    });
    describe('.aggregate', function () {
        return require('./aggregate.js');
    });

    describe('Cursor', function () {
        describe('.project', function () {
            return require('./project.js');
        });
        describe('.sort', function () {
            return require('./sort.js');
        });
        describe('.limit', function () {
            return require('./limit.js');
        });
        describe('.skip', function () {
            return require('./skip.js');
        });
    });

    describe('.update', function () {
        return require('./update.js');
    });
    describe('.remove', function () {
        return require('./remove.js');
    });
});
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../src":8,"./aggregate.js":22,"./find.js":23,"./find_one.js":24,"./lang/expression.js":27,"./lang/filter.js":28,"./limit.js":29,"./project.js":30,"./remove.js":31,"./skip.js":32,"./sort.js":33,"./update.js":35,"_process":180,"fake-indexeddb":118,"fake-indexeddb/lib/FDBKeyRange":127}],27:[function(require,module,exports){
'use strict';

var _require = require('chai'),
    expect = _require.expect;

var build = require('../../src/lang/expression.js');
var Fields = require('../../src/lang/fields.js');

var evalExpr = function evalExpr(expr) {
    var doc = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var _build = build(expr),
        ast = _build.ast,
        has_refs = _build.has_refs;

    if (ast === false) {
        return false;
    }

    if (has_refs) {
        return ast.run(new Fields(doc));
    }

    return ast.run();
};

describe('$literal', function () {
    it('should not evaluate operators', function () {
        var literal1 = { $lt: [2, 3] };
        expect(evalExpr({ $literal: literal1 })).to.deep.equal(literal1);

        var literal2 = { $multiply: [3, 4] };

        expect(evalExpr({
            x: { $add: [1, 3] },
            b: { $literal: literal2 }
        })).to.deep.equal({ x: 4, b: literal2 });

        var literal3 = { $literal: { $add: [10, 4] } };
        expect(evalExpr({ $literal: literal3 })).to.deep.equal(literal3);
    });
});

describe('arithmetic', function () {
    describe('$add', function () {
        it('should report refs', function () {
            expect(build({ $add: ['$x'] }).has_refs).to.be.true;
            expect(build({ $add: [4] }).has_refs).to.be.false;
            expect(build({ y: { $add: ['$x'] } }).has_refs).to.be.true;
            expect(build({ y: { $add: [4] } }).has_refs).to.be.false;
        });

        it('should add numbers', function () {
            expect(evalExpr({ $add: [3, 4, 2] })).to.equal(9);
            expect(evalExpr({ $add: [3, { $add: [3, 4] }] })).to.equal(10);
            expect(evalExpr({ $add: ['$x', 2] }, { x: 4 })).to.equal(6);
        });
    });

    describe('$subtract', function () {
        it('should report refs', function () {
            expect(build({ $subtract: ['$x'] }).has_refs).to.be.true;
            expect(build({ $subtract: [4] }).has_refs).to.be.false;
            expect(build({ y: { $subtract: ['$x'] } }).has_refs).to.be.true;
            expect(build({ y: { $subtract: [4] } }).has_refs).to.be.false;
        });

        it('should subtract numbers', function () {
            expect(evalExpr({ $subtract: [3, 4, 2] })).to.equal(-3);

            expect(evalExpr({
                $subtract: [3, { $subtract: [3, 4] }]
            })).to.equal(4);

            expect(evalExpr({ $subtract: ['$x', 2] }, { x: 4 })).to.equal(2);
        });
    });

    describe('$multiply', function () {
        it('should report refs', function () {
            expect(build({ $multiply: ['$x'] }).has_refs).to.be.true;
            expect(build({ $multiply: [4] }).has_refs).to.be.false;
            expect(build({ y: { $multiply: ['$x'] } }).has_refs).to.be.true;
            expect(build({ y: { $multiply: [4] } }).has_refs).to.be.false;
        });

        it('should multiply numbers', function () {
            expect(evalExpr({ $multiply: [3, 4, 2] })).to.equal(24);

            expect(evalExpr({
                $multiply: [3, { $multiply: [3, 4] }]
            })).to.equal(36);

            expect(evalExpr({ $multiply: ['$x', 2] }, { x: 4 })).to.equal(8);
        });
    });

    describe('$divide', function () {
        it('should report refs', function () {
            expect(build({ $divide: ['$x'] }).has_refs).to.be.true;
            expect(build({ $divide: [4] }).has_refs).to.be.false;
            expect(build({ y: { $divide: ['$x'] } }).has_refs).to.be.true;
            expect(build({ y: { $divide: [4] } }).has_refs).to.be.false;
        });

        it('should divide numbers', function () {
            expect(evalExpr({ $divide: [3, 4, 2] })).to.equal(0.375);
            expect(evalExpr({ $divide: [3, { $divide: [3, 4] }] })).to.equal(4);
            expect(evalExpr({ $divide: ['$x', 2] }, { x: 4 })).to.equal(2);
        });
    });

    describe('$abs', function () {
        it('should report refs', function () {
            expect(build({ $abs: '$x' }).has_refs).to.be.true;
            expect(build({ $abs: 4 }).has_refs).to.be.false;
            expect(build({ y: { $abs: '$x' } }).has_refs).to.be.true;
            expect(build({ y: { $abs: 4 } }).has_refs).to.be.false;
        });

        it('should return the absolute value of a number', function () {
            expect(evalExpr({ $abs: 3 })).to.equal(3);
            expect(evalExpr({ $abs: -3 })).to.equal(3);
            expect(evalExpr({ $abs: { $abs: -4 } })).to.equal(4);
            expect(evalExpr({ $abs: '$x' }, { x: 4 })).to.equal(4);
        });
    });

    describe('$ceil', function () {
        it('should report refs', function () {
            expect(build({ $ceil: '$x' }).has_refs).to.be.true;
            expect(build({ $ceil: 4 }).has_refs).to.be.false;
            expect(build({ y: { $ceil: '$x' } }).has_refs).to.be.true;
            expect(build({ y: { $ceil: 4 } }).has_refs).to.be.false;
        });

        it('should return the ceiling value of a number', function () {
            expect(evalExpr({ $ceil: 1 })).to.equal(1);
            expect(evalExpr({ $ceil: 7.80 })).to.equal(8);
            expect(evalExpr({ $ceil: -2.8 })).to.equal(-2);
            expect(evalExpr({ $ceil: { $ceil: 7.80 } })).to.equal(8);
            expect(evalExpr({ $ceil: '$x' }, { x: 8.4 })).to.equal(9);
        });
    });

    describe('$floor', function () {
        it('should report refs', function () {
            expect(build({ $floor: '$x' }).has_refs).to.be.true;
            expect(build({ $floor: 4 }).has_refs).to.be.false;
            expect(build({ y: { $floor: '$x' } }).has_refs).to.be.true;
            expect(build({ y: { $floor: 4 } }).has_refs).to.be.false;
        });

        it('should return the floor value of a number', function () {
            expect(evalExpr({ $floor: 1 })).to.equal(1);
            expect(evalExpr({ $floor: 7.80 })).to.equal(7);
            expect(evalExpr({ $floor: -2.8 })).to.equal(-3);
            expect(evalExpr({ $floor: '$x' }, { x: 4.8 })).to.equal(4);
        });
    });

    describe('$ln', function () {
        it('should report refs', function () {
            expect(build({ $ln: '$x' }).has_refs).to.be.true;
            expect(build({ $ln: 4 }).has_refs).to.be.false;
            expect(build({ y: { $ln: '$x' } }).has_refs).to.be.true;
            expect(build({ y: { $ln: 4 } }).has_refs).to.be.false;
        });

        it('should return the natural logarithm of a number', function () {
            expect(evalExpr({ $ln: 1 })).to.equal(0);
            expect(evalExpr({ $ln: Math.E })).to.equal(1);
            expect(evalExpr({ $ln: 10 })).to.equal(2.302585092994046);
            expect(evalExpr({ $ln: '$x' }, { x: 1 })).to.equal(0);
        });
    });

    describe('$log10', function () {
        it('should report refs', function () {
            expect(build({ $log10: '$x' }).has_refs).to.be.true;
            expect(build({ $log10: 4 }).has_refs).to.be.false;
            expect(build({ y: { $log10: '$x' } }).has_refs).to.be.true;
            expect(build({ y: { $log10: 4 } }).has_refs).to.be.false;
        });

        it('should return the log base 10 of a number', function () {
            expect(evalExpr({ $log10: 1 })).to.equal(0);
            expect(evalExpr({ $log10: 10 })).to.equal(1);
            expect(evalExpr({ $log10: '$x' }, { x: 100 })).to.equal(2);
        });
    });

    describe('$mod', function () {
        it('should report refs', function () {
            expect(build({ $mod: '$x' }).has_refs).to.be.true;
            expect(build({ $mod: 4 }).has_refs).to.be.false;
            expect(build({ y: { $mod: '$x' } }).has_refs).to.be.true;
            expect(build({ y: { $mod: 4 } }).has_refs).to.be.false;
        });

        it('should return the modulo operation of numbers', function () {
            expect(evalExpr({ $mod: [3, 4, 2] })).to.equal(1);
            expect(evalExpr({ $mod: [3, { $mod: [3, 4] }] })).to.equal(0);
            expect(evalExpr({ $mod: ['$x', 2] }, { x: 4 })).to.equal(0);
        });
    });

    describe('$pow', function () {
        it('should report refs', function () {
            expect(build({ $pow: '$x' }).has_refs).to.be.true;
            expect(build({ $pow: 4 }).has_refs).to.be.false;
            expect(build({ y: { $pow: '$x' } }).has_refs).to.be.true;
            expect(build({ y: { $pow: 4 } }).has_refs).to.be.false;
        });

        it('should raise a number to a specified exponent', function () {
            expect(evalExpr({ $pow: [5, 0] })).to.equal(1);
            expect(evalExpr({ $pow: [5, 2] })).to.equal(25);

            expect(evalExpr({
                $pow: ['$x', '$y']
            }, { x: 5, y: -2 })).to.equal(0.04);
        });
    });

    describe('$sqrt', function () {
        it('should report refs', function () {
            expect(build({ $sqrt: '$x' }).has_refs).to.be.true;
            expect(build({ $sqrt: 4 }).has_refs).to.be.false;
            expect(build({ y: { $sqrt: '$x' } }).has_refs).to.be.true;
            expect(build({ y: { $sqrt: 4 } }).has_refs).to.be.false;
        });

        it('should return the sqrt of a number', function () {
            expect(evalExpr({ $sqrt: 25 })).to.equal(5);
            expect(evalExpr({ $sqrt: 30 })).to.equal(5.477225575051661);
            expect(evalExpr({ $sqrt: '$x' }, { x: 4 })).to.equal(2);
        });
    });

    describe('$trunc', function () {
        it('should report refs', function () {
            expect(build({ $trunc: '$x' }).has_refs).to.be.true;
            expect(build({ $trunc: 4 }).has_refs).to.be.false;
            expect(build({ y: { $trunc: '$x' } }).has_refs).to.be.true;
            expect(build({ y: { $trunc: 4 } }).has_refs).to.be.false;
        });

        it("should truncate a number to it's integer", function () {
            expect(evalExpr({ $trunc: 0 })).to.equal(0);
            expect(evalExpr({ $trunc: 7.80 })).to.equal(7);
            expect(evalExpr({ $trunc: '$x' }, { x: -2.3 })).to.equal(-2);
        });
    });

    it('should return null for non-numbers', function () {
        expect(evalExpr({ $add: [4, null] })).to.equal(null);
        expect(evalExpr({ $add: [4, undefined] })).to.equal(null);
        expect(evalExpr({ $add: [4, ''] })).to.equal(null);
        expect(evalExpr({ $add: [4, {}] })).to.equal(null);
        expect(evalExpr({ $add: [4, []] })).to.equal(null);
        expect(evalExpr({ $add: [4, new Set()] })).to.equal(null);
        expect(evalExpr({ $add: [4, new Date()] })).to.equal(null);
        expect(evalExpr({ $add: [4, true] })).to.equal(null);
        expect(evalExpr({ $add: ['$x', 4] }, { x: null })).to.equal(null);

        expect(evalExpr({
            $add: [4, { $multiply: [3, null] }]
        })).to.equal(null);

        expect(evalExpr({ $add: [4, { $toUpper: 'foo' }] })).to.equal(null);
        expect(evalExpr({ $add: [4, { $literal: 'foo' }] })).to.equal(null);
        expect(evalExpr({ x: { $add: [4, null] } })).to.deep.equal({ x: null });
    });
});

describe('string', function () {
    describe('$concat', function () {
        it('should report refs', function () {
            expect(build({ $concat: ['$x'] }).has_refs).to.be.true;
            expect(build({ $concat: ['foo'] }).has_refs).to.be.false;
            expect(build({ y: { $concat: ['$x'] } }).has_refs).to.be.true;
            expect(build({ y: { $concat: ['foo'] } }).has_refs).to.be.false;
        });

        it('should concatenate strings', function () {
            expect(evalExpr({ $concat: ['foo', 'bar'] })).to.equal('foobar');

            expect(evalExpr({
                $concat: ['foo', '$s']
            }, { s: 'bar' })).to.equal('foobar');
        });

        it('should return null for non-strings ($concat)', function () {
            expect(evalExpr({ $concat: ['foo', null] })).to.equal(null);
            expect(evalExpr({ $concat: ['foo', undefined] })).to.equal(null);
            expect(evalExpr({ $concat: ['foo', {}] })).to.equal(null);
            expect(evalExpr({ $concat: ['foo', []] })).to.equal(null);
            expect(evalExpr({ $concat: ['foo', new Set()] })).to.equal(null);
            expect(evalExpr({ $concat: ['foo', new Date()] })).to.equal(null);
            expect(evalExpr({ $concat: ['foo', 4] })).to.equal(null);
            expect(evalExpr({ $concat: ['foo', true] })).to.equal(null);

            expect(evalExpr({
                $concat: ['foo', '$s']
            }, { s: null })).to.equal(null);

            expect(evalExpr({
                $concat: ['foo', { $add: [3, 2] }]
            })).to.equal(null);

            expect(evalExpr({
                $concat: ['foo', { $literal: 10 }]
            })).to.equal(null);

            expect(evalExpr({
                s: { $concat: ['foo', null] }
            })).to.deep.equal({ s: null });
        });
    });

    describe('$toLower', function () {
        it('should report refs', function () {
            expect(build({ $toLower: '$x' }).has_refs).to.be.true;
            expect(build({ $toLower: 'foo' }).has_refs).to.be.false;
            expect(build({ y: { $toLower: '$x' } }).has_refs).to.be.true;
            expect(build({ y: { $toLower: 'foo' } }).has_refs).to.be.false;
        });

        it('it should convert string to lowercase', function () {
            expect(evalExpr({ $toLower: 'FoO' })).to.equal('foo');

            expect(evalExpr({
                $toLower: '$s'
            }, { s: 'FoO' })).to.equal('foo');
        });
    });

    describe('$toUpper', function () {
        it('should report refs', function () {
            expect(build({ $toUpper: '$x' }).has_refs).to.be.true;
            expect(build({ $toUpper: 'foo' }).has_refs).to.be.false;
            expect(build({ y: { $toUpper: '$x' } }).has_refs).to.be.true;
            expect(build({ y: { $toUpper: 'foo' } }).has_refs).to.be.false;
        });

        it('should convert string to uppercase', function () {
            expect(evalExpr({ $toUpper: 'FoO' })).to.equal('FOO');

            expect(evalExpr({
                $toUpper: '$s'
            }, { s: 'FoO' })).to.equal('FOO');
        });
    });

    it('should return an empty string for non-strings (non-$concat)', function () {
        expect(evalExpr({ $toLower: null })).to.equal('');
        expect(evalExpr({ $toLower: undefined })).to.equal('');
        expect(evalExpr({ $toLower: {} })).to.equal('');
        expect(evalExpr({ $toLower: [[]] })).to.equal('');
        expect(evalExpr({ $toLower: new Set() })).to.equal('');
        expect(evalExpr({ $toLower: new Date() })).to.equal('');
        expect(evalExpr({ $toLower: 4 })).to.equal('');
        expect(evalExpr({ $toLower: true })).to.equal('');
        expect(evalExpr({ $toLower: '$s' }, { s: null })).to.equal('');
        expect(evalExpr({ $toLower: { $add: [3, 2] } })).to.equal('');
        expect(evalExpr({ $toLower: { $literal: 10 } })).to.equal('');
        expect(evalExpr({ s: { $toLower: 4 } })).to.deep.equal({ s: '' });
    });
});

describe('array', function () {
    describe('$concatArrays', function () {
        it('should report refs', function () {
            expect(build({ $concatArrays: ['$x'] }).has_refs).to.be.true;
            expect(build({ $concatArrays: [[]] }).has_refs).to.be.false;

            expect(build({
                y: { $concatArrays: ['$x'] }
            }).has_refs).to.be.true;

            expect(build({
                y: { $concatArrays: [[]] }
            }).has_refs).to.be.false;
        });

        it('should concatenate arrays', function () {
            expect(evalExpr({
                $concatArrays: [['hello', ' '], ['world']]
            })).to.deep.equal(['hello', ' ', 'world']);

            expect(evalExpr({
                $concatArrays: ['$a', '$b']
            }, {
                a: ['hello', ' '],
                b: [['world'], 'again']
            })).to.deep.equal(['hello', ' ', ['world'], 'again']);
        });
    });
});

describe('date', function () {
    var date = new Date('2014-01-01T08:15:39.736Z');

    describe('$dayOfMonth', function () {
        it('should report refs', function () {
            expect(build({ $dayOfMonth: '$x' }).has_refs).to.be.true;
            expect(build({ $dayOfMonth: date }).has_refs).to.be.false;
            expect(build({ d: { $dayOfMonth: '$x' } }).has_refs).to.be.true;
            expect(build({ d: { $dayOfMonth: date } }).has_refs).to.be.false;
        });

        it('should return day of month of a date', function () {
            expect(evalExpr({ $dayOfMonth: date })).to.equal(1);
            expect(evalExpr({ $dayOfMonth: '$date' }, { date: date })).to.equal(1);
        });
    });

    describe('$year', function () {
        it('should report refs', function () {
            expect(build({ $year: '$x' }).has_refs).to.be.true;
            expect(build({ $year: date }).has_refs).to.be.false;
            expect(build({ d: { $year: '$x' } }).has_refs).to.be.true;
            expect(build({ d: { $year: date } }).has_refs).to.be.false;
        });

        it('should return year of a date', function () {
            expect(evalExpr({ $year: date })).to.equal(2014);
            expect(evalExpr({ $year: '$date' }, { date: date })).to.equal(2014);
        });
    });

    describe('$month', function () {
        it('should report refs', function () {
            expect(build({ $month: '$x' }).has_refs).to.be.true;
            expect(build({ $month: date }).has_refs).to.be.false;
            expect(build({ d: { $month: '$x' } }).has_refs).to.be.true;
            expect(build({ d: { $month: date } }).has_refs).to.be.false;
        });

        it('should return month of a date', function () {
            expect(evalExpr({ $month: date })).to.equal(1);
            expect(evalExpr({ $month: '$date' }, { date: date })).to.equal(1);
        });
    });

    describe('$hour', function () {
        it('should report refs', function () {
            expect(build({ $hour: '$x' }).has_refs).to.be.true;
            expect(build({ $hour: date }).has_refs).to.be.false;
            expect(build({ d: { $hour: '$x' } }).has_refs).to.be.true;
            expect(build({ d: { $hour: date } }).has_refs).to.be.false;
        });

        it('should return hour of a date', function () {
            expect(evalExpr({ $hour: date })).to.equal(8);
            expect(evalExpr({ $hour: '$date' }, { date: date })).to.equal(8);
        });
    });

    describe('$minute', function () {
        it('should report refs', function () {
            expect(build({ $minute: '$x' }).has_refs).to.be.true;
            expect(build({ $minute: date }).has_refs).to.be.false;
            expect(build({ d: { $minute: '$x' } }).has_refs).to.be.true;
            expect(build({ d: { $minute: date } }).has_refs).to.be.false;
        });

        it('should return minutes of a date', function () {
            expect(evalExpr({ $minute: date })).to.equal(15);
            expect(evalExpr({ $minute: '$date' }, { date: date })).to.equal(15);
        });
    });

    describe('$second', function () {
        it('should report refs', function () {
            expect(build({ $second: '$x' }).has_refs).to.be.true;
            expect(build({ $second: date }).has_refs).to.be.false;
            expect(build({ d: { $second: '$x' } }).has_refs).to.be.true;
            expect(build({ d: { $second: date } }).has_refs).to.be.false;
        });

        it('should return seconds of a date', function () {
            expect(evalExpr({ $second: date })).to.equal(39);
            expect(evalExpr({ $second: '$date' }, { date: date })).to.equal(39);
        });
    });

    describe('$millisecond', function () {
        it('should report refs', function () {
            expect(build({ $millisecond: '$x' }).has_refs).to.be.true;
            expect(build({ $millisecond: date }).has_refs).to.be.false;
            expect(build({ d: { $millisecond: '$x' } }).has_refs).to.be.true;
            expect(build({ d: { $millisecond: date } }).has_refs).to.be.false;
        });

        it('should return milliseconds of a date', function () {
            expect(evalExpr({ $millisecond: date })).to.equal(736);
            expect(evalExpr({ $millisecond: '$date' }, { date: date })).to.equal(736);
        });
    });

    it('should return null for non-dates', function () {
        expect(evalExpr({ $year: null })).to.equal(null);
        expect(evalExpr({ $year: undefined })).to.equal(null);
        expect(evalExpr({ $year: {} })).to.equal(null);
        expect(evalExpr({ $year: [[]] })).to.equal(null);
        expect(evalExpr({ $year: new Set() })).to.equal(null);
        expect(evalExpr({ $year: 4 })).to.equal(null);
        expect(evalExpr({ $year: '$s' }, { s: null })).to.equal(null);
        expect(evalExpr({ $year: true })).to.equal(null);
        expect(evalExpr({ $year: { $add: [3, 2] } })).to.equal(null);
        expect(evalExpr({ $year: { $literal: 10 } })).to.equal(null);
        expect(evalExpr({ d: { $year: 4 } })).to.deep.equal({ d: null });
    });
});
},{"../../src/lang/expression.js":9,"../../src/lang/fields.js":10,"chai":42}],28:[function(require,module,exports){
'use strict';

var _require = require('chai'),
    expect = _require.expect;

var _require2 = require('../../src/lang/filter.js'),
    build = _require2.build;

var Fields = require('../../src/lang/fields.js');

var evalExpr = function evalExpr(expr, doc) {
    var pred = build(expr);
    if (pred === false) {
        return false;
    }

    return pred.run(new Fields(doc));
};

var getClauses = function getClauses(expr) {
    return build(expr).getClauses();
};

describe('equality (without $eq)', function () {
    it('should find clauses for index and be matchable', function () {
        expect(getClauses({ x: 4 })).to.have.lengthOf(1);
    });

    it('should test for equality', function () {
        expect(evalExpr({ x: 4 }, { x: 9 })).to.be.false;
        expect(evalExpr({ x: 4 }, { x: 4 })).to.be.true;
        expect(evalExpr({ x: undefined }, { x: 4 })).to.be.false;
        expect(evalExpr({ x: undefined }, { g: 8 })).to.be.false;
        expect(evalExpr({ x: undefined }, { x: undefined })).to.be.true;
        expect(evalExpr({ x: null }, { x: 4 })).to.be.false;
        expect(evalExpr({ x: null }, { g: 8 })).to.be.false;
        expect(evalExpr({ x: null }, { x: null })).to.be.true;
    });
});

describe('$eq', function () {
    it('should find clauses for index', function () {
        var clauses1 = getClauses({ x: { $eq: undefined } });
        expect(clauses1).to.have.lengthOf(0);

        var clauses2 = getClauses({ x: { $eq: null } });
        expect(clauses2).to.have.lengthOf(0);

        var clauses3 = getClauses({ x: { $eq: 4 } });
        expect(clauses3).to.have.lengthOf(1);

        var clauses4 = getClauses({ x: { $eq: 'foo' } });
        expect(clauses4).to.have.lengthOf(1);

        var clauses5 = getClauses({ x: { $eq: true } });
        expect(clauses5).to.have.lengthOf(1);

        var clauses6 = getClauses({ x: { $eq: { g: 3 } } });
        expect(clauses6).to.have.lengthOf(0);

        var clauses7 = getClauses({ x: { $eq: [] } });
        expect(clauses7).to.have.lengthOf(1);
    });

    it('should test for equality', function () {
        expect(evalExpr({ x: { $eq: 4 } }, { x: 9 })).to.be.false;
        expect(evalExpr({ x: { $eq: 4 } }, { x: 4 })).to.be.true;
    });
});

describe('$ne', function () {
    it("shouldn't find clauses for index", function () {
        expect(getClauses({ x: { $ne: 4 } })).to.have.lengthOf(0);
    });

    it('should test for inequality', function () {
        expect(evalExpr({ x: { $ne: 4 } }, { x: 4 })).to.be.false;
        expect(evalExpr({ x: { $ne: 4 } }, { x: 9 })).to.be.true;
    });
});

describe('conjunction without $and', function () {
    it('should find clauses for index', function () {
        expect(getClauses({ x: 4, k: 3 })).to.have.lengthOf(2);
    });

    it('should perform conjunction', function () {
        expect(evalExpr({ x: 2, g: 3 }, { x: 2, g: 8 })).to.be.false;
        expect(evalExpr({ x: 2, g: 3 }, { x: 2, g: 3 })).to.be.true;
    });
});

describe('$and', function () {
    it('should find clauses for index', function () {
        expect(getClauses({ $and: [{ x: 4 }] })).to.have.lengthOf(1);

        var clauses1 = getClauses({ $and: [{ x: 4 }, { k: 3 }] });
        expect(clauses1).to.have.lengthOf(2);

        var clauses2 = getClauses({
            $and: [{ $and: [{ x: 4 }, { z: 3 }] }, { k: 3 }]
        });

        expect(clauses2).to.have.lengthOf(3);
    });

    it('should perform conjunction', function () {
        expect(evalExpr({
            $and: [{ x: 2 }, { g: 3 }]
        }, { x: 2, g: 8 })).to.be.false;

        expect(evalExpr({
            $and: [{ x: 2 }, { g: 3 }]
        }, { x: 2, g: 3 })).to.be.true;

        expect(evalExpr({
            $and: [{ $and: [{ x: 2 }, { g: 3 }] }, { z: 8 }]
        }, { x: 2, g: 8, z: 10 })).to.be.false;

        expect(evalExpr({
            $and: [{ $and: [{ x: 2 }, { g: 3 }] }, { z: 8 }]
        }, { x: 2, g: 8, z: 8 })).to.be.false;
    });
});

describe('$or', function () {
    it("shouldn't find clauses for index except when only one argument", function () {
        expect(getClauses({ $or: [{ x: 4 }] })).to.have.lengthOf(1);

        expect(getClauses({
            $or: [{ x: 4 }, { k: 3 }]
        })).to.have.lengthOf(0);

        expect(getClauses({
            $or: [{ $or: [{ x: 4 }, { z: 3 }] }, { k: 3 }]
        })).to.have.lengthOf(0);
    });

    it('should perform disjunction', function () {
        expect(evalExpr({
            $or: [{ x: 6 }, { g: 3 }]
        }, { x: 2, g: 8 })).to.be.false;

        expect(evalExpr({
            $or: [{ x: 2 }, { g: 3 }]
        }, { x: 2, g: 8 })).to.be.true;

        expect(evalExpr({
            $or: [{ x: 2 }, { g: 3 }]
        }, { x: 2, g: 3 })).to.be.true;

        expect(evalExpr({
            $or: [{ $or: [{ x: 2 }, { g: 3 }] }, { z: 8 }]
        }, { x: 4, g: 8, z: 10 })).to.be.false;

        expect(evalExpr({
            $or: [{ $or: [{ x: 2 }, { g: 3 }] }, { z: 8 }]
        }, { x: 2, g: 8, z: 10 })).to.be.true;

        expect(evalExpr({
            $or: [{ $or: [{ x: 2 }, { g: 3 }] }, { z: 8 }]
        }, { x: 2, g: 8, z: 8 })).to.be.true;
    });
});

describe('$not', function () {
    it("shouldn't find clauses for index", function () {
        expect(getClauses({ $not: [{ x: 4 }] })).to.have.lengthOf(0);

        expect(getClauses({
            $not: [{ x: 4 }, { k: 3 }]
        })).to.have.lengthOf(0);

        expect(getClauses({
            $not: [{ $not: [{ x: 4 }, { z: 3 }] }, { k: 3 }]
        })).to.have.lengthOf(0);
    });

    it('should perform negation', function () {
        expect(evalExpr({ $not: { x: 4 } }, { x: 4 })).to.be.false;
        expect(evalExpr({ $not: { x: 4 } }, { x: 8 })).to.be.true;
        expect(evalExpr({ $not: { $not: { x: 8 } } }, { x: 4 })).to.be.false;
        expect(evalExpr({ $not: { $not: { x: 4 } } }, { x: 4 })).to.be.true;
    });
});

describe('$gt', function () {
    it('should find clauses for index', function () {
        expect(getClauses({ x: { $gt: 4 } })).to.have.lengthOf(1);
    });

    it('should perform greater than comparison', function () {
        expect(evalExpr({ x: { $gt: 8 } }, { x: 4 })).to.be.false;
        expect(evalExpr({ x: { $gt: 3 } }, { x: 6 })).to.be.true;
    });
});

describe('$gte', function () {
    it('should find clauses for index', function () {
        expect(getClauses({ x: { $gte: 4 } })).to.have.lengthOf(1);
    });

    it('should perform greater than or equal comparison', function () {
        expect(evalExpr({ x: { $gte: 8 } }, { x: 4 })).to.be.false;
        expect(evalExpr({ x: { $gte: 3 } }, { x: 6 })).to.be.true;
        expect(evalExpr({ x: { $gte: 6 } }, { x: 6 })).to.be.true;
    });
});

describe('$lt', function () {
    it('should find clauses for index', function () {
        expect(getClauses({ x: { $lt: 4 } })).to.have.lengthOf(1);
    });

    it('should perform less than comparison', function () {
        expect(evalExpr({ x: { $lt: 3 } }, { x: 6 })).to.be.false;
        expect(evalExpr({ x: { $lt: null } }, {})).to.be.false;
        expect(evalExpr({ x: { $lt: 8 } }, { x: 4 })).to.be.true;
    });
});

describe('$lte', function () {
    it('should find clauses for index', function () {
        expect(getClauses({ x: { $lte: 4 } })).to.have.lengthOf(1);
    });

    it('should perform less than or equal comparison', function () {
        expect(evalExpr({ x: { $lte: 3 } }, { x: 6 })).to.be.false;
        expect(evalExpr({ x: { $lte: null } }, {})).to.be.false;
        expect(evalExpr({ x: { $lte: 8 } }, { x: 4 })).to.be.true;
        expect(evalExpr({ x: { $lte: 6 } }, { x: 6 })).to.be.true;
    });
});

describe('$gt and $lt', function () {
    it('should find clauses for index', function () {
        expect(getClauses({ x: { $gt: 4, $lt: 8 } })).to.have.lengthOf(1);
    });

    it('should perform gt and lt comparison', function () {
        expect(evalExpr({ x: { $gt: 8, $lt: 10 } }, { x: 6 })).to.be.false;
        expect(evalExpr({ x: { $gt: 8, $lt: 10 } }, { x: 11 })).to.be.false;
        expect(evalExpr({ x: { $gt: null } }, {})).to.be.false;
        expect(evalExpr({ x: { $gt: 3, $lt: 8 } }, { x: 6 })).to.be.true;
    });
});

describe('$gte and $lt', function () {
    it('should find clauses for index', function () {
        expect(getClauses({ x: { $gte: 4, $lt: 8 } })).to.have.lengthOf(1);
    });

    it('should perform gte and lt comparison', function () {
        expect(evalExpr({ x: { $gte: 8, $lt: 10 } }, { x: 4 })).to.be.false;
        expect(evalExpr({ x: { $gte: 3, $lt: 10 } }, { x: 11 })).to.be.false;
        expect(evalExpr({ x: { $gte: null } }, {})).to.be.false;
        expect(evalExpr({ x: { $gte: 3, $lt: 8 } }, { x: 6 })).to.be.true;
        expect(evalExpr({ x: { $gte: 3, $lt: 8 } }, { x: 3 })).to.be.true;
    });
});

describe('$gt and $lte', function () {
    it('should find clauses for index', function () {
        expect(getClauses({ x: { $gt: 4, $lte: 8 } })).to.have.lengthOf(1);
    });

    it('should perform gt and lte comparison', function () {
        expect(evalExpr({ x: { $gt: 8, $lte: 10 } }, { x: 4 })).to.be.false;
        expect(evalExpr({ x: { $gt: 3, $lte: 10 } }, { x: 11 })).to.be.false;
        expect(evalExpr({ x: { $gt: 3, $lte: null } }, {})).to.be.false;
        expect(evalExpr({ x: { $gt: 3, $lte: 8 } }, { x: 4 })).to.be.true;
        expect(evalExpr({ x: { $gt: 3, $lte: 8 } }, { x: 8 })).to.be.true;
    });
});

describe('$gte and $lte', function () {
    it('should find clauses for index', function () {
        expect(getClauses({ x: { $gte: 4, $lte: 8 } })).to.have.lengthOf(1);
    });

    it('should perform gte and lte comparison', function () {
        expect(evalExpr({ x: { $gte: 8, $lte: 10 } }, { x: 4 })).to.be.false;
        expect(evalExpr({ x: { $gte: 3, $lte: 10 } }, { x: 11 })).to.be.false;
        expect(evalExpr({ x: { $gte: 3, $lte: null } }, {})).to.be.false;
        expect(evalExpr({ x: { $gte: 3, $lte: 8 } }, { x: 4 })).to.be.true;
        expect(evalExpr({ x: { $gte: 3, $lte: 8 } }, { x: 3 })).to.be.true;
        expect(evalExpr({ x: { $gte: 3, $lte: 8 } }, { x: 8 })).to.be.true;
    });
});

describe('$in', function () {
    it('should find clauses for index', function () {
        expect(getClauses({ x: { $in: [3] } })).to.have.lengthOf(1);
        expect(getClauses({ x: { $in: [3, 4] } })).to.have.lengthOf(0);
    });

    it('should perform disjunction equality test', function () {
        expect(evalExpr({ x: { $in: [3, 4] } }, { x: 8 })).to.be.false;
        expect(evalExpr({ x: { $in: [3, 4] } }, { x: 4 })).to.be.true;
    });
});

describe('$nin', function () {
    it("shouldn't find clauses for index", function () {
        expect(getClauses({ x: { $nin: [3] } })).to.have.lengthOf(0);
        expect(getClauses({ x: { $nin: [3, 4] } })).to.have.lengthOf(0);
    });

    it('should perform conjunction inequality test', function () {
        expect(evalExpr({ x: { $nin: [3, 4] } }, { x: 4 })).to.be.false;
        expect(evalExpr({ x: { $nin: [3, 4] } }, { x: 8 })).to.be.true;
    });
});

describe('$elemMatch', function () {
    it("shouldn't find clauses for index", function () {
        expect(getClauses({
            elements: { $elemMatch: { x: 2 } }
        })).to.have.lengthOf(0);
    });

    it('should test if any iterable elements satisify a predicate', function () {
        expect(evalExpr({
            elements: { $elemMatch: { x: 2 } }
        }, {
            elements: [4, 'string', { k: 3 }, [3]]
        })).to.be.false;

        expect(evalExpr({
            elements: { $elemMatch: { x: 2 } }
        }, {
            elements: [4, 'string', { x: 2 }, [3]]
        })).to.be.true;
    });
});

describe('$exists', function () {
    it('should find clauses for index when exists is true', function () {
        expect(getClauses({
            x: { $exists: 1 }
        })).to.have.lengthOf(1);
    });

    it("shouldn't find clauses for index when exists is false", function () {
        expect(getClauses({
            x: { $exists: 0 }
        })).to.have.lengthOf(0);
    });

    it('should test if document contains a field', function () {
        expect(evalExpr({ x: { $exists: 1 } }, { k: 4 })).to.be.false;
        expect(evalExpr({ x: { $exists: 1 } }, { x: 4 })).to.be.true;
    });

    it("should test if document doesn't contain a field", function () {
        expect(evalExpr({ x: { $exists: 0 } }, { x: 4 })).to.be.false;
        expect(evalExpr({ x: { $exists: 0 } }, { k: 4 })).to.be.true;
    });
});
},{"../../src/lang/fields.js":10,"../../src/lang/filter.js":11,"chai":42}],29:[function(require,module,exports){
'use strict';

var _require = require('chai'),
    expect = _require.expect;

var db = new zango.Db(Math.random(), ['col']);
var col = db.collection('col');

var docs = [{ x: 4, k: 3 }, { x: 2, k: 9 }, { x: 3, k: 8 }];

before(function () {
    return col.insert(docs);
});
after(function () {
    return db.drop();
});

it('should limit the number of documents', function (done) {
    col.find().limit(2).toArray(function (error, docs) {
        if (error) {
            throw error;
        }

        expect(docs).to.have.lengthOf(2);

        done();
    });
});
},{"chai":42}],30:[function(require,module,exports){
'use strict';

var _require = require('chai'),
    expect = _require.expect;

var waterfall = require('./waterfall.js');

var db = new zango.Db(Math.random(), ['col']);
var col = db.collection('col');

var doc = {
    _id: 1,
    x: 4,
    k: { g: 3, z: 8 },
    a: [3, 6, 4],
    str: 'FoO'
};

before(function () {
    return col.insert(doc);
});
after(function () {
    return db.drop();
});

var project = function project(spec, expected_doc, done) {
    var cur = col.find({}, spec);

    cur.toArray(function (error, docs) {
        if (error) {
            throw error;
        }

        expect(docs).to.have.lengthOf(1);
        expect(docs[0]).to.deep.equal(expected_doc);

        done();
    });
};

it('should support inclusion of pre-existing fields', function (done) {
    project({ x: 1, str: 1 }, { _id: 1, x: 4, str: 'FoO' }, done);
});

it('should support inclusion of pre-existing sub fields', function (done) {
    project({
        'k.g': 1,
        'a.1': 1
    }, {
        _id: 1,
        k: { g: 3 },
        a: [, 6]
    }, done);
});

it('should support exclusion of pre-existing fields', function (done) {
    project({ k: 0, a: 0 }, { _id: 1, x: 4, str: 'FoO' }, done);
});

it('should support exclusion of pre-existing sub fields', function (done) {
    project({
        'k.g': 0,
        'a.1': 0
    }, {
        _id: 1,
        x: 4,
        k: { z: 8 },
        a: [3,, 4],
        str: 'FoO'
    }, done);
});

it("should support inclusion of '_id' field", function (done) {
    waterfall([function (next) {
        project({
            _id: 1,
            k: 0,
            a: 0
        }, {
            _id: 1,
            x: 4,
            str: 'FoO'
        }, next);
    }, function (next) {
        project({
            _id: 0,
            k: 0,
            a: 0
        }, {
            x: 4,
            str: 'FoO'
        }, next);
    }], done);
});

it("should support exclusion of '_id' field", function (done) {
    waterfall([function (next) {
        project({
            _id: 0,
            x: 1,
            str: 1
        }, {
            x: 4,
            str: 'FoO'
        }, next);
    }, function (next) {
        project({
            _id: 1,
            x: 1,
            str: 1
        }, {
            _id: 1,
            x: 4,
            str: 'FoO'
        }, next);
    }], done);
});

it('should support addition of new computed fields', function (done) {
    var expected_doc = Object.assign({ s: 'FOO' }, doc);

    project({ s: { $toUpper: '$str' } }, expected_doc, done);
});

it('should support addition of new literal fields', function (done) {
    var expected_doc = Object.assign({ t: 8 }, doc);

    project({ t: { $literal: 8 } }, expected_doc, done);
});
},{"./waterfall.js":36,"chai":42}],31:[function(require,module,exports){
'use strict';

var _require = require('chai'),
    expect = _require.expect;

var db = new zango.Db(Math.random(), { col: ['x'] });
var col = db.collection('col');

var docs = [{ x: 4, k: 3 }, { x: 2, k: 9 }, { x: 3, k: 8 }];

before(function () {
    return col.insert(docs);
});
after(function () {
    return db.drop();
});

it('should delete documents', function (done) {
    col.remove({ x: 4 }, function (error) {
        if (error) {
            throw error;
        }

        col.find().toArray(function (error, docs) {
            if (error) {
                throw error;
            }

            expect(docs).to.have.lengthOf(2);
            expect(docs).to.not.deep.include({ _id: 1, x: 4, k: 3 });

            done();
        });
    });
});
},{"chai":42}],32:[function(require,module,exports){
'use strict';

var _require = require('chai'),
    expect = _require.expect;

var db = new zango.Db(Math.random(), ['col']);
var col = db.collection('col');

var docs = [{ x: 4, k: 3 }, { x: 2, k: 9 }, { x: 3, k: 8 }];

before(function () {
    return col.insert(docs);
});
after(function () {
    return db.drop();
});

it('should skip a specified number of documents', function (done) {
    col.find().skip(2).toArray(function (error, docs) {
        if (error) {
            throw error;
        }

        expect(docs).to.have.lengthOf(1);

        done();
    });
});
},{"chai":42}],33:[function(require,module,exports){
'use strict';

var _require = require('chai'),
    expect = _require.expect;

var db = new zango.Db(Math.random(), { col: ['x'] });
var col = db.collection('col');

var docs = [{ x: 4, k: 3 }, { x: 2, k: 9 }, { x: 3, k: 8 }];

before(function () {
    return col.insert(docs);
});
after(function () {
    return db.drop();
});

var _sort = function _sort(spec) {
    return col.find().sort(spec);
};

var sort = function sort(cur, expected_docs, done) {
    cur.toArray(function (error, docs) {
        if (error) {
            throw error;
        }

        expect(docs).to.have.lengthOf(expected_docs.length);

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = docs[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var doc = _step.value;

                delete doc._id;

                expect(expected_docs).to.deep.include(doc);
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

        done();
    });
};

var sortWithIndex = function sortWithIndex(spec) {
    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
    }

    sort.apply(undefined, [_sort(spec).hint('x')].concat(args));
};

var sortWithoutIndex = function sortWithoutIndex(spec) {
    for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
    }

    sort.apply(undefined, [_sort(spec)].concat(args));
};

it('should sort by ascending using index', function (done) {
    sortWithIndex({
        x: 1
    }, [{ x: 2, k: 9 }, { x: 3, k: 8 }, { x: 4, k: 3 }], done);
});

it('should sort by ascending without index', function (done) {
    sortWithoutIndex({
        k: 1
    }, [{ x: 4, k: 3 }, { x: 3, k: 8 }, { x: 2, k: 9 }], done);
});

it('should sort by descending using index', function (done) {
    sortWithIndex({
        x: -1
    }, [{ x: 4, k: 3 }, { x: 3, k: 8 }, { x: 2, k: 9 }], done);
});

it('should sort by descending without index', function (done) {
    sortWithoutIndex({
        k: -1
    }, [{ x: 2, k: 9 }, { x: 3, k: 8 }, { x: 4, k: 3 }], done);
});
},{"chai":42}],34:[function(require,module,exports){
'use strict';

var _require = require('chai'),
    expect = _require.expect;

var db = new zango.Db(Math.random(), ['col']);
var col = db.collection('col');

var doc = { elements: [1, 3, 3] };

before(function () {
    return col.insert(doc);
});
after(function () {
    return db.drop();
});

it('should unwind an iterable', function (done) {
    var expected_docs = [{ elements: 1 }, { elements: 3 }, { elements: 3 }];

    col.aggregate([{ $unwind: '$elements' }]).toArray(function (error, docs) {
        if (error) {
            throw error;
        }

        expect(docs).to.have.lengthOf(expected_docs.length);

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = docs[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var _doc = _step.value;

                delete _doc._id;

                expect(expected_docs).to.deep.include(_doc);
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

        done();
    });
});
},{"chai":42}],35:[function(require,module,exports){
'use strict';

var _require = require('chai'),
    expect = _require.expect;

var db = new zango.Db(Math.random(), ['col']);
var col = db.collection('col');

var doc = {
    k: 3,
    t: 4,
    a: [3, 4],
    n: [8, 2],
    m: { x: 80 }
};

after(function () {
    return db.drop();
});

var _id = 0;

var update = function update(spec, expected_doc, done) {
    ++_id;

    var new_doc = Object.assign({ _id: _id }, doc);

    col.insert(new_doc).then(function () {
        return col.update({ _id: _id }, spec);
    }).then(function () {
        return col.find({ _id: _id }).toArray();
    }).then(function (docs) {
        expect(docs).to.have.lengthOf(1);

        var doc = docs[0];
        delete doc._id;

        expect(doc).to.deep.equal(expected_doc);

        done();
    }).fail(done);
};

it('should set the value of a field without $set', function (done) {
    update({
        x: 10
    }, {
        x: 10,
        k: 3,
        t: 4,
        a: [3, 4],
        n: [8, 2],
        m: { x: 80 }
    }, done);
});

describe('$set', function () {
    it('should set the value of a field', function (done) {
        update({
            $set: { x: 30 }
        }, {
            x: 30,
            k: 3,
            t: 4,
            a: [3, 4],
            n: [8, 2],
            m: { x: 80 }
        }, done);
    });

    it('should set the value of a sub-field', function (done) {
        update({
            $set: { 'm.x': 30 }
        }, {
            k: 3,
            t: 4,
            a: [3, 4],
            n: [8, 2],
            m: { x: 30 }
        }, done);
    });
});

describe('$unset', function () {
    it('should support the removal of fields', function (done) {
        update({
            $unset: { k: 1 }
        }, {
            t: 4,
            a: [3, 4],
            n: [8, 2],
            m: { x: 80 }
        }, done);
    });

    it('should support the removal of sub-fields', function (done) {
        update({
            $unset: { 'm.x': 1 }
        }, {
            k: 3,
            t: 4,
            a: [3, 4],
            n: [8, 2],
            m: {}
        }, done);
    });
});

describe('$rename', function () {
    it('should supporting renaming of fields', function (done) {
        update({
            $rename: { k: 'g' }
        }, {
            g: 3,
            t: 4,
            a: [3, 4],
            n: [8, 2],
            m: { x: 80 }
        }, done);
    });

    it('should supporting renaming of sub-fields', function (done) {
        update({
            $rename: { 'm.x': 'g' }
        }, {
            k: 3,
            t: 4,
            a: [3, 4],
            n: [8, 2],
            m: { g: 80 }
        }, done);
    });
});

describe('$inc', function () {
    it('should support incrementing the value of a field', function (done) {
        update({
            $inc: { k: 2 }
        }, {
            k: 5,
            t: 4,
            a: [3, 4],
            n: [8, 2],
            m: { x: 80 }
        }, done);
    });

    it('should support incrementing the value of a sub-field', function (done) {
        update({
            $inc: { 'm.x': 2 }
        }, {
            k: 3,
            t: 4,
            a: [3, 4],
            n: [8, 2],
            m: { x: 82 }
        }, done);
    });
});

describe('$mul', function () {
    it('should support multiplying the value of a field', function (done) {
        update({
            $mul: { k: 2 }
        }, {
            k: 6,
            t: 4,
            a: [3, 4],
            n: [8, 2],
            m: { x: 80 }
        }, done);
    });

    it('should support multiplying the value of a sub-field', function (done) {
        update({
            $mul: { 'm.x': 2 }
        }, {
            k: 3,
            t: 4,
            a: [3, 4],
            n: [8, 2],
            m: { x: 160 }
        }, done);
    });
});

describe('$min', function () {
    it('should update to the minimum value', function (done) {
        update({
            $min: { k: 3, t: 1 }
        }, {
            k: 3,
            t: 1,
            a: [3, 4],
            n: [8, 2],
            m: { x: 80 }
        }, done);
    });
});

describe('$max', function () {
    it('should update to the maximum value', function (done) {
        update({
            $max: { k: 3, t: 10 }
        }, {
            k: 3,
            t: 10,
            a: [3, 4],
            n: [8, 2],
            m: { x: 80 }
        }, done);
    });
});

describe('$push', function () {
    it('should push a value to an array', function (done) {
        update({
            $push: { a: 9 }
        }, {
            k: 3,
            t: 4,
            a: [3, 4, 9],
            n: [8, 2],
            m: { x: 80 }
        }, done);
    });
});

describe('$pop', function () {
    it('should remove a value of an array', function (done) {
        update({
            $pop: { a: 1, n: -1 }
        }, {
            k: 3,
            t: 4,
            a: [3],
            n: [2],
            m: { x: 80 }
        }, done);
    });
});
},{"chai":42}],36:[function(require,module,exports){
"use strict";

module.exports = function (fns, cb) {
    var last = fns.pop();

    (function next() {
        var fn = fns.shift();

        if (fn) {
            fn(next);
        }
    })();

    last(cb);
};
},{}],37:[function(require,module,exports){
// Array.prototype.find - MIT License (c) 2013 Paul Miller <http://paulmillr.com>
// For all details and docs: https://github.com/paulmillr/array.prototype.find
// Fixes and tests supplied by Duncan Hall <http://duncanhall.net> 
(function(globals){
  if (Array.prototype.find) return;

  var find = function(predicate) {
    var list = Object(this);
    var length = list.length < 0 ? 0 : list.length >>> 0; // ES.ToUint32;
    if (length === 0) return undefined;
    if (typeof predicate !== 'function' || Object.prototype.toString.call(predicate) !== '[object Function]') {
      throw new TypeError('Array#find: predicate must be a function');
    }
    var thisArg = arguments[1];
    for (var i = 0, value; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) return value;
    }
    return undefined;
  };

  if (Object.defineProperty) {
    try {
      Object.defineProperty(Array.prototype, 'find', {
        value: find, configurable: true, enumerable: false, writable: true
      });
    } catch(e) {}
  }

  if (!Array.prototype.find) {
    Array.prototype.find = find;
  }
})(this);

},{}],38:[function(require,module,exports){
// Array.prototype.findIndex - MIT License (c) 2013 Paul Miller <http://paulmillr.com>
// For all details and docs: <https://github.com/paulmillr/Array.prototype.findIndex>
(function (globals) {
  if (Array.prototype.findIndex) return;

  var findIndex = function(predicate) {
    var list = Object(this);
    var length = Math.max(0, list.length) >>> 0; // ES.ToUint32;
    if (length === 0) return -1;
    if (typeof predicate !== 'function' || Object.prototype.toString.call(predicate) !== '[object Function]') {
      throw new TypeError('Array#findIndex: predicate must be a function');
    }
    var thisArg = arguments.length > 1 ? arguments[1] : undefined;
    for (var i = 0; i < length; i++) {
      if (predicate.call(thisArg, list[i], i, list)) return i;
    }
    return -1;
  };

  if (Object.defineProperty) {
    try {
      Object.defineProperty(Array.prototype, 'findIndex', {
        value: findIndex, configurable: true, writable: true
      });
    } catch(e) {}
  }

  if (!Array.prototype.findIndex) {
    Array.prototype.findIndex = findIndex;
  }
}(this));

},{}],39:[function(require,module,exports){
/*!
 * assertion-error
 * Copyright(c) 2013 Jake Luer <jake@qualiancy.com>
 * MIT Licensed
 */

/*!
 * Return a function that will copy properties from
 * one object to another excluding any originally
 * listed. Returned function will create a new `{}`.
 *
 * @param {String} excluded properties ...
 * @return {Function}
 */

function exclude () {
  var excludes = [].slice.call(arguments);

  function excludeProps (res, obj) {
    Object.keys(obj).forEach(function (key) {
      if (!~excludes.indexOf(key)) res[key] = obj[key];
    });
  }

  return function extendExclude () {
    var args = [].slice.call(arguments)
      , i = 0
      , res = {};

    for (; i < args.length; i++) {
      excludeProps(res, args[i]);
    }

    return res;
  };
};

/*!
 * Primary Exports
 */

module.exports = AssertionError;

/**
 * ### AssertionError
 *
 * An extension of the JavaScript `Error` constructor for
 * assertion and validation scenarios.
 *
 * @param {String} message
 * @param {Object} properties to include (optional)
 * @param {callee} start stack function (optional)
 */

function AssertionError (message, _props, ssf) {
  var extend = exclude('name', 'message', 'stack', 'constructor', 'toJSON')
    , props = extend(_props || {});

  // default values
  this.message = message || 'Unspecified AssertionError';
  this.showDiff = false;

  // copy from properties
  for (var key in props) {
    this[key] = props[key];
  }

  // capture stack trace
  ssf = ssf || arguments.callee;
  if (ssf && Error.captureStackTrace) {
    Error.captureStackTrace(this, ssf);
  } else {
    try {
      throw new Error();
    } catch(e) {
      this.stack = e.stack;
    }
  }
}

/*!
 * Inherit from Error.prototype
 */

AssertionError.prototype = Object.create(Error.prototype);

/*!
 * Statically set name
 */

AssertionError.prototype.name = 'AssertionError';

/*!
 * Ensure correct constructor
 */

AssertionError.prototype.constructor = AssertionError;

/**
 * Allow errors to be converted to JSON for static transfer.
 *
 * @param {Boolean} include stack (default: `true`)
 * @return {Object} object that can be `JSON.stringify`
 */

AssertionError.prototype.toJSON = function (stack) {
  var extend = exclude('constructor', 'toJSON', 'stack')
    , props = extend({ name: this.name }, this);

  // include stack if exists and not turned off
  if (false !== stack && this.stack) {
    props.stack = this.stack;
  }

  return props;
};

},{}],40:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return b64.length * 3 / 4 - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],41:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('Invalid typed array length')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (value instanceof ArrayBuffer) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  return fromObject(value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj) {
    if (isArrayBufferView(obj) || 'length' in obj) {
      if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
        return createBuffer(0)
      }
      return fromArrayLike(obj)
    }

    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return fromArrayLike(obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (isArrayBufferView(string) || string instanceof ArrayBuffer) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : new Buffer(val, encoding)
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// Node 0.10 supports `ArrayBuffer` but lacks `ArrayBuffer.isView`
function isArrayBufferView (obj) {
  return (typeof ArrayBuffer.isView === 'function') && ArrayBuffer.isView(obj)
}

function numberIsNaN (obj) {
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":40,"ieee754":152}],42:[function(require,module,exports){
module.exports = require('./lib/chai');

},{"./lib/chai":43}],43:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

var used = []
  , exports = module.exports = {};

/*!
 * Chai version
 */

exports.version = '3.5.0';

/*!
 * Assertion Error
 */

exports.AssertionError = require('assertion-error');

/*!
 * Utils for plugins (not exported)
 */

var util = require('./chai/utils');

/**
 * # .use(function)
 *
 * Provides a way to extend the internals of Chai
 *
 * @param {Function}
 * @returns {this} for chaining
 * @api public
 */

exports.use = function (fn) {
  if (!~used.indexOf(fn)) {
    fn(this, util);
    used.push(fn);
  }

  return this;
};

/*!
 * Utility Functions
 */

exports.util = util;

/*!
 * Configuration
 */

var config = require('./chai/config');
exports.config = config;

/*!
 * Primary `Assertion` prototype
 */

var assertion = require('./chai/assertion');
exports.use(assertion);

/*!
 * Core Assertions
 */

var core = require('./chai/core/assertions');
exports.use(core);

/*!
 * Expect interface
 */

var expect = require('./chai/interface/expect');
exports.use(expect);

/*!
 * Should interface
 */

var should = require('./chai/interface/should');
exports.use(should);

/*!
 * Assert interface
 */

var assert = require('./chai/interface/assert');
exports.use(assert);

},{"./chai/assertion":44,"./chai/config":45,"./chai/core/assertions":46,"./chai/interface/assert":47,"./chai/interface/expect":48,"./chai/interface/should":49,"./chai/utils":63,"assertion-error":39}],44:[function(require,module,exports){
/*!
 * chai
 * http://chaijs.com
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

var config = require('./config');

module.exports = function (_chai, util) {
  /*!
   * Module dependencies.
   */

  var AssertionError = _chai.AssertionError
    , flag = util.flag;

  /*!
   * Module export.
   */

  _chai.Assertion = Assertion;

  /*!
   * Assertion Constructor
   *
   * Creates object for chaining.
   *
   * @api private
   */

  function Assertion (obj, msg, stack) {
    flag(this, 'ssfi', stack || arguments.callee);
    flag(this, 'object', obj);
    flag(this, 'message', msg);
  }

  Object.defineProperty(Assertion, 'includeStack', {
    get: function() {
      console.warn('Assertion.includeStack is deprecated, use chai.config.includeStack instead.');
      return config.includeStack;
    },
    set: function(value) {
      console.warn('Assertion.includeStack is deprecated, use chai.config.includeStack instead.');
      config.includeStack = value;
    }
  });

  Object.defineProperty(Assertion, 'showDiff', {
    get: function() {
      console.warn('Assertion.showDiff is deprecated, use chai.config.showDiff instead.');
      return config.showDiff;
    },
    set: function(value) {
      console.warn('Assertion.showDiff is deprecated, use chai.config.showDiff instead.');
      config.showDiff = value;
    }
  });

  Assertion.addProperty = function (name, fn) {
    util.addProperty(this.prototype, name, fn);
  };

  Assertion.addMethod = function (name, fn) {
    util.addMethod(this.prototype, name, fn);
  };

  Assertion.addChainableMethod = function (name, fn, chainingBehavior) {
    util.addChainableMethod(this.prototype, name, fn, chainingBehavior);
  };

  Assertion.overwriteProperty = function (name, fn) {
    util.overwriteProperty(this.prototype, name, fn);
  };

  Assertion.overwriteMethod = function (name, fn) {
    util.overwriteMethod(this.prototype, name, fn);
  };

  Assertion.overwriteChainableMethod = function (name, fn, chainingBehavior) {
    util.overwriteChainableMethod(this.prototype, name, fn, chainingBehavior);
  };

  /**
   * ### .assert(expression, message, negateMessage, expected, actual, showDiff)
   *
   * Executes an expression and check expectations. Throws AssertionError for reporting if test doesn't pass.
   *
   * @name assert
   * @param {Philosophical} expression to be tested
   * @param {String|Function} message or function that returns message to display if expression fails
   * @param {String|Function} negatedMessage or function that returns negatedMessage to display if negated expression fails
   * @param {Mixed} expected value (remember to check for negation)
   * @param {Mixed} actual (optional) will default to `this.obj`
   * @param {Boolean} showDiff (optional) when set to `true`, assert will display a diff in addition to the message if expression fails
   * @api private
   */

  Assertion.prototype.assert = function (expr, msg, negateMsg, expected, _actual, showDiff) {
    var ok = util.test(this, arguments);
    if (true !== showDiff) showDiff = false;
    if (true !== config.showDiff) showDiff = false;

    if (!ok) {
      var msg = util.getMessage(this, arguments)
        , actual = util.getActual(this, arguments);
      throw new AssertionError(msg, {
          actual: actual
        , expected: expected
        , showDiff: showDiff
      }, (config.includeStack) ? this.assert : flag(this, 'ssfi'));
    }
  };

  /*!
   * ### ._obj
   *
   * Quick reference to stored `actual` value for plugin developers.
   *
   * @api private
   */

  Object.defineProperty(Assertion.prototype, '_obj',
    { get: function () {
        return flag(this, 'object');
      }
    , set: function (val) {
        flag(this, 'object', val);
      }
  });
};

},{"./config":45}],45:[function(require,module,exports){
module.exports = {

  /**
   * ### config.includeStack
   *
   * User configurable property, influences whether stack trace
   * is included in Assertion error message. Default of false
   * suppresses stack trace in the error message.
   *
   *     chai.config.includeStack = true;  // enable stack on error
   *
   * @param {Boolean}
   * @api public
   */

   includeStack: false,

  /**
   * ### config.showDiff
   *
   * User configurable property, influences whether or not
   * the `showDiff` flag should be included in the thrown
   * AssertionErrors. `false` will always be `false`; `true`
   * will be true when the assertion has requested a diff
   * be shown.
   *
   * @param {Boolean}
   * @api public
   */

  showDiff: true,

  /**
   * ### config.truncateThreshold
   *
   * User configurable property, sets length threshold for actual and
   * expected values in assertion errors. If this threshold is exceeded, for
   * example for large data structures, the value is replaced with something
   * like `[ Array(3) ]` or `{ Object (prop1, prop2) }`.
   *
   * Set it to zero if you want to disable truncating altogether.
   *
   * This is especially userful when doing assertions on arrays: having this
   * set to a reasonable large value makes the failure messages readily
   * inspectable.
   *
   *     chai.config.truncateThreshold = 0;  // disable truncating
   *
   * @param {Number}
   * @api public
   */

  truncateThreshold: 40

};

},{}],46:[function(require,module,exports){
/*!
 * chai
 * http://chaijs.com
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

module.exports = function (chai, _) {
  var Assertion = chai.Assertion
    , toString = Object.prototype.toString
    , flag = _.flag;

  /**
   * ### Language Chains
   *
   * The following are provided as chainable getters to
   * improve the readability of your assertions. They
   * do not provide testing capabilities unless they
   * have been overwritten by a plugin.
   *
   * **Chains**
   *
   * - to
   * - be
   * - been
   * - is
   * - that
   * - which
   * - and
   * - has
   * - have
   * - with
   * - at
   * - of
   * - same
   *
   * @name language chains
   * @namespace BDD
   * @api public
   */

  [ 'to', 'be', 'been'
  , 'is', 'and', 'has', 'have'
  , 'with', 'that', 'which', 'at'
  , 'of', 'same' ].forEach(function (chain) {
    Assertion.addProperty(chain, function () {
      return this;
    });
  });

  /**
   * ### .not
   *
   * Negates any of assertions following in the chain.
   *
   *     expect(foo).to.not.equal('bar');
   *     expect(goodFn).to.not.throw(Error);
   *     expect({ foo: 'baz' }).to.have.property('foo')
   *       .and.not.equal('bar');
   *
   * @name not
   * @namespace BDD
   * @api public
   */

  Assertion.addProperty('not', function () {
    flag(this, 'negate', true);
  });

  /**
   * ### .deep
   *
   * Sets the `deep` flag, later used by the `equal` and
   * `property` assertions.
   *
   *     expect(foo).to.deep.equal({ bar: 'baz' });
   *     expect({ foo: { bar: { baz: 'quux' } } })
   *       .to.have.deep.property('foo.bar.baz', 'quux');
   *
   * `.deep.property` special characters can be escaped
   * by adding two slashes before the `.` or `[]`.
   *
   *     var deepCss = { '.link': { '[target]': 42 }};
   *     expect(deepCss).to.have.deep.property('\\.link.\\[target\\]', 42);
   *
   * @name deep
   * @namespace BDD
   * @api public
   */

  Assertion.addProperty('deep', function () {
    flag(this, 'deep', true);
  });

  /**
   * ### .any
   *
   * Sets the `any` flag, (opposite of the `all` flag)
   * later used in the `keys` assertion.
   *
   *     expect(foo).to.have.any.keys('bar', 'baz');
   *
   * @name any
   * @namespace BDD
   * @api public
   */

  Assertion.addProperty('any', function () {
    flag(this, 'any', true);
    flag(this, 'all', false)
  });


  /**
   * ### .all
   *
   * Sets the `all` flag (opposite of the `any` flag)
   * later used by the `keys` assertion.
   *
   *     expect(foo).to.have.all.keys('bar', 'baz');
   *
   * @name all
   * @namespace BDD
   * @api public
   */

  Assertion.addProperty('all', function () {
    flag(this, 'all', true);
    flag(this, 'any', false);
  });

  /**
   * ### .a(type)
   *
   * The `a` and `an` assertions are aliases that can be
   * used either as language chains or to assert a value's
   * type.
   *
   *     // typeof
   *     expect('test').to.be.a('string');
   *     expect({ foo: 'bar' }).to.be.an('object');
   *     expect(null).to.be.a('null');
   *     expect(undefined).to.be.an('undefined');
   *     expect(new Error).to.be.an('error');
   *     expect(new Promise).to.be.a('promise');
   *     expect(new Float32Array()).to.be.a('float32array');
   *     expect(Symbol()).to.be.a('symbol');
   *
   *     // es6 overrides
   *     expect({[Symbol.toStringTag]:()=>'foo'}).to.be.a('foo');
   *
   *     // language chain
   *     expect(foo).to.be.an.instanceof(Foo);
   *
   * @name a
   * @alias an
   * @param {String} type
   * @param {String} message _optional_
   * @namespace BDD
   * @api public
   */

  function an (type, msg) {
    if (msg) flag(this, 'message', msg);
    type = type.toLowerCase();
    var obj = flag(this, 'object')
      , article = ~[ 'a', 'e', 'i', 'o', 'u' ].indexOf(type.charAt(0)) ? 'an ' : 'a ';

    this.assert(
        type === _.type(obj)
      , 'expected #{this} to be ' + article + type
      , 'expected #{this} not to be ' + article + type
    );
  }

  Assertion.addChainableMethod('an', an);
  Assertion.addChainableMethod('a', an);

  /**
   * ### .include(value)
   *
   * The `include` and `contain` assertions can be used as either property
   * based language chains or as methods to assert the inclusion of an object
   * in an array or a substring in a string. When used as language chains,
   * they toggle the `contains` flag for the `keys` assertion.
   *
   *     expect([1,2,3]).to.include(2);
   *     expect('foobar').to.contain('foo');
   *     expect({ foo: 'bar', hello: 'universe' }).to.include.keys('foo');
   *
   * @name include
   * @alias contain
   * @alias includes
   * @alias contains
   * @param {Object|String|Number} obj
   * @param {String} message _optional_
   * @namespace BDD
   * @api public
   */

  function includeChainingBehavior () {
    flag(this, 'contains', true);
  }

  function include (val, msg) {
    _.expectTypes(this, ['array', 'object', 'string']);

    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    var expected = false;

    if (_.type(obj) === 'array' && _.type(val) === 'object') {
      for (var i in obj) {
        if (_.eql(obj[i], val)) {
          expected = true;
          break;
        }
      }
    } else if (_.type(val) === 'object') {
      if (!flag(this, 'negate')) {
        for (var k in val) new Assertion(obj).property(k, val[k]);
        return;
      }
      var subset = {};
      for (var k in val) subset[k] = obj[k];
      expected = _.eql(subset, val);
    } else {
      expected = (obj != undefined) && ~obj.indexOf(val);
    }
    this.assert(
        expected
      , 'expected #{this} to include ' + _.inspect(val)
      , 'expected #{this} to not include ' + _.inspect(val));
  }

  Assertion.addChainableMethod('include', include, includeChainingBehavior);
  Assertion.addChainableMethod('contain', include, includeChainingBehavior);
  Assertion.addChainableMethod('contains', include, includeChainingBehavior);
  Assertion.addChainableMethod('includes', include, includeChainingBehavior);

  /**
   * ### .ok
   *
   * Asserts that the target is truthy.
   *
   *     expect('everything').to.be.ok;
   *     expect(1).to.be.ok;
   *     expect(false).to.not.be.ok;
   *     expect(undefined).to.not.be.ok;
   *     expect(null).to.not.be.ok;
   *
   * @name ok
   * @namespace BDD
   * @api public
   */

  Assertion.addProperty('ok', function () {
    this.assert(
        flag(this, 'object')
      , 'expected #{this} to be truthy'
      , 'expected #{this} to be falsy');
  });

  /**
   * ### .true
   *
   * Asserts that the target is `true`.
   *
   *     expect(true).to.be.true;
   *     expect(1).to.not.be.true;
   *
   * @name true
   * @namespace BDD
   * @api public
   */

  Assertion.addProperty('true', function () {
    this.assert(
        true === flag(this, 'object')
      , 'expected #{this} to be true'
      , 'expected #{this} to be false'
      , this.negate ? false : true
    );
  });

  /**
   * ### .false
   *
   * Asserts that the target is `false`.
   *
   *     expect(false).to.be.false;
   *     expect(0).to.not.be.false;
   *
   * @name false
   * @namespace BDD
   * @api public
   */

  Assertion.addProperty('false', function () {
    this.assert(
        false === flag(this, 'object')
      , 'expected #{this} to be false'
      , 'expected #{this} to be true'
      , this.negate ? true : false
    );
  });

  /**
   * ### .null
   *
   * Asserts that the target is `null`.
   *
   *     expect(null).to.be.null;
   *     expect(undefined).to.not.be.null;
   *
   * @name null
   * @namespace BDD
   * @api public
   */

  Assertion.addProperty('null', function () {
    this.assert(
        null === flag(this, 'object')
      , 'expected #{this} to be null'
      , 'expected #{this} not to be null'
    );
  });

  /**
   * ### .undefined
   *
   * Asserts that the target is `undefined`.
   *
   *     expect(undefined).to.be.undefined;
   *     expect(null).to.not.be.undefined;
   *
   * @name undefined
   * @namespace BDD
   * @api public
   */

  Assertion.addProperty('undefined', function () {
    this.assert(
        undefined === flag(this, 'object')
      , 'expected #{this} to be undefined'
      , 'expected #{this} not to be undefined'
    );
  });

  /**
   * ### .NaN
   * Asserts that the target is `NaN`.
   *
   *     expect('foo').to.be.NaN;
   *     expect(4).not.to.be.NaN;
   *
   * @name NaN
   * @namespace BDD
   * @api public
   */

  Assertion.addProperty('NaN', function () {
    this.assert(
        isNaN(flag(this, 'object'))
        , 'expected #{this} to be NaN'
        , 'expected #{this} not to be NaN'
    );
  });

  /**
   * ### .exist
   *
   * Asserts that the target is neither `null` nor `undefined`.
   *
   *     var foo = 'hi'
   *       , bar = null
   *       , baz;
   *
   *     expect(foo).to.exist;
   *     expect(bar).to.not.exist;
   *     expect(baz).to.not.exist;
   *
   * @name exist
   * @namespace BDD
   * @api public
   */

  Assertion.addProperty('exist', function () {
    this.assert(
        null != flag(this, 'object')
      , 'expected #{this} to exist'
      , 'expected #{this} to not exist'
    );
  });


  /**
   * ### .empty
   *
   * Asserts that the target's length is `0`. For arrays and strings, it checks
   * the `length` property. For objects, it gets the count of
   * enumerable keys.
   *
   *     expect([]).to.be.empty;
   *     expect('').to.be.empty;
   *     expect({}).to.be.empty;
   *
   * @name empty
   * @namespace BDD
   * @api public
   */

  Assertion.addProperty('empty', function () {
    var obj = flag(this, 'object')
      , expected = obj;

    if (Array.isArray(obj) || 'string' === typeof object) {
      expected = obj.length;
    } else if (typeof obj === 'object') {
      expected = Object.keys(obj).length;
    }

    this.assert(
        !expected
      , 'expected #{this} to be empty'
      , 'expected #{this} not to be empty'
    );
  });

  /**
   * ### .arguments
   *
   * Asserts that the target is an arguments object.
   *
   *     function test () {
   *       expect(arguments).to.be.arguments;
   *     }
   *
   * @name arguments
   * @alias Arguments
   * @namespace BDD
   * @api public
   */

  function checkArguments () {
    var obj = flag(this, 'object')
      , type = Object.prototype.toString.call(obj);
    this.assert(
        '[object Arguments]' === type
      , 'expected #{this} to be arguments but got ' + type
      , 'expected #{this} to not be arguments'
    );
  }

  Assertion.addProperty('arguments', checkArguments);
  Assertion.addProperty('Arguments', checkArguments);

  /**
   * ### .equal(value)
   *
   * Asserts that the target is strictly equal (`===`) to `value`.
   * Alternately, if the `deep` flag is set, asserts that
   * the target is deeply equal to `value`.
   *
   *     expect('hello').to.equal('hello');
   *     expect(42).to.equal(42);
   *     expect(1).to.not.equal(true);
   *     expect({ foo: 'bar' }).to.not.equal({ foo: 'bar' });
   *     expect({ foo: 'bar' }).to.deep.equal({ foo: 'bar' });
   *
   * @name equal
   * @alias equals
   * @alias eq
   * @alias deep.equal
   * @param {Mixed} value
   * @param {String} message _optional_
   * @namespace BDD
   * @api public
   */

  function assertEqual (val, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'deep')) {
      return this.eql(val);
    } else {
      this.assert(
          val === obj
        , 'expected #{this} to equal #{exp}'
        , 'expected #{this} to not equal #{exp}'
        , val
        , this._obj
        , true
      );
    }
  }

  Assertion.addMethod('equal', assertEqual);
  Assertion.addMethod('equals', assertEqual);
  Assertion.addMethod('eq', assertEqual);

  /**
   * ### .eql(value)
   *
   * Asserts that the target is deeply equal to `value`.
   *
   *     expect({ foo: 'bar' }).to.eql({ foo: 'bar' });
   *     expect([ 1, 2, 3 ]).to.eql([ 1, 2, 3 ]);
   *
   * @name eql
   * @alias eqls
   * @param {Mixed} value
   * @param {String} message _optional_
   * @namespace BDD
   * @api public
   */

  function assertEql(obj, msg) {
    if (msg) flag(this, 'message', msg);
    this.assert(
        _.eql(obj, flag(this, 'object'))
      , 'expected #{this} to deeply equal #{exp}'
      , 'expected #{this} to not deeply equal #{exp}'
      , obj
      , this._obj
      , true
    );
  }

  Assertion.addMethod('eql', assertEql);
  Assertion.addMethod('eqls', assertEql);

  /**
   * ### .above(value)
   *
   * Asserts that the target is greater than `value`.
   *
   *     expect(10).to.be.above(5);
   *
   * Can also be used in conjunction with `length` to
   * assert a minimum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.above(2);
   *     expect([ 1, 2, 3 ]).to.have.length.above(2);
   *
   * @name above
   * @alias gt
   * @alias greaterThan
   * @param {Number} value
   * @param {String} message _optional_
   * @namespace BDD
   * @api public
   */

  function assertAbove (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len > n
        , 'expected #{this} to have a length above #{exp} but got #{act}'
        , 'expected #{this} to not have a length above #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj > n
        , 'expected #{this} to be above ' + n
        , 'expected #{this} to be at most ' + n
      );
    }
  }

  Assertion.addMethod('above', assertAbove);
  Assertion.addMethod('gt', assertAbove);
  Assertion.addMethod('greaterThan', assertAbove);

  /**
   * ### .least(value)
   *
   * Asserts that the target is greater than or equal to `value`.
   *
   *     expect(10).to.be.at.least(10);
   *
   * Can also be used in conjunction with `length` to
   * assert a minimum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.of.at.least(2);
   *     expect([ 1, 2, 3 ]).to.have.length.of.at.least(3);
   *
   * @name least
   * @alias gte
   * @param {Number} value
   * @param {String} message _optional_
   * @namespace BDD
   * @api public
   */

  function assertLeast (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len >= n
        , 'expected #{this} to have a length at least #{exp} but got #{act}'
        , 'expected #{this} to have a length below #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj >= n
        , 'expected #{this} to be at least ' + n
        , 'expected #{this} to be below ' + n
      );
    }
  }

  Assertion.addMethod('least', assertLeast);
  Assertion.addMethod('gte', assertLeast);

  /**
   * ### .below(value)
   *
   * Asserts that the target is less than `value`.
   *
   *     expect(5).to.be.below(10);
   *
   * Can also be used in conjunction with `length` to
   * assert a maximum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.below(4);
   *     expect([ 1, 2, 3 ]).to.have.length.below(4);
   *
   * @name below
   * @alias lt
   * @alias lessThan
   * @param {Number} value
   * @param {String} message _optional_
   * @namespace BDD
   * @api public
   */

  function assertBelow (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len < n
        , 'expected #{this} to have a length below #{exp} but got #{act}'
        , 'expected #{this} to not have a length below #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj < n
        , 'expected #{this} to be below ' + n
        , 'expected #{this} to be at least ' + n
      );
    }
  }

  Assertion.addMethod('below', assertBelow);
  Assertion.addMethod('lt', assertBelow);
  Assertion.addMethod('lessThan', assertBelow);

  /**
   * ### .most(value)
   *
   * Asserts that the target is less than or equal to `value`.
   *
   *     expect(5).to.be.at.most(5);
   *
   * Can also be used in conjunction with `length` to
   * assert a maximum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.of.at.most(4);
   *     expect([ 1, 2, 3 ]).to.have.length.of.at.most(3);
   *
   * @name most
   * @alias lte
   * @param {Number} value
   * @param {String} message _optional_
   * @namespace BDD
   * @api public
   */

  function assertMost (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len <= n
        , 'expected #{this} to have a length at most #{exp} but got #{act}'
        , 'expected #{this} to have a length above #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj <= n
        , 'expected #{this} to be at most ' + n
        , 'expected #{this} to be above ' + n
      );
    }
  }

  Assertion.addMethod('most', assertMost);
  Assertion.addMethod('lte', assertMost);

  /**
   * ### .within(start, finish)
   *
   * Asserts that the target is within a range.
   *
   *     expect(7).to.be.within(5,10);
   *
   * Can also be used in conjunction with `length` to
   * assert a length range. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.within(2,4);
   *     expect([ 1, 2, 3 ]).to.have.length.within(2,4);
   *
   * @name within
   * @param {Number} start lowerbound inclusive
   * @param {Number} finish upperbound inclusive
   * @param {String} message _optional_
   * @namespace BDD
   * @api public
   */

  Assertion.addMethod('within', function (start, finish, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object')
      , range = start + '..' + finish;
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len >= start && len <= finish
        , 'expected #{this} to have a length within ' + range
        , 'expected #{this} to not have a length within ' + range
      );
    } else {
      this.assert(
          obj >= start && obj <= finish
        , 'expected #{this} to be within ' + range
        , 'expected #{this} to not be within ' + range
      );
    }
  });

  /**
   * ### .instanceof(constructor)
   *
   * Asserts that the target is an instance of `constructor`.
   *
   *     var Tea = function (name) { this.name = name; }
   *       , Chai = new Tea('chai');
   *
   *     expect(Chai).to.be.an.instanceof(Tea);
   *     expect([ 1, 2, 3 ]).to.be.instanceof(Array);
   *
   * @name instanceof
   * @param {Constructor} constructor
   * @param {String} message _optional_
   * @alias instanceOf
   * @namespace BDD
   * @api public
   */

  function assertInstanceOf (constructor, msg) {
    if (msg) flag(this, 'message', msg);
    var name = _.getName(constructor);
    this.assert(
        flag(this, 'object') instanceof constructor
      , 'expected #{this} to be an instance of ' + name
      , 'expected #{this} to not be an instance of ' + name
    );
  };

  Assertion.addMethod('instanceof', assertInstanceOf);
  Assertion.addMethod('instanceOf', assertInstanceOf);

  /**
   * ### .property(name, [value])
   *
   * Asserts that the target has a property `name`, optionally asserting that
   * the value of that property is strictly equal to  `value`.
   * If the `deep` flag is set, you can use dot- and bracket-notation for deep
   * references into objects and arrays.
   *
   *     // simple referencing
   *     var obj = { foo: 'bar' };
   *     expect(obj).to.have.property('foo');
   *     expect(obj).to.have.property('foo', 'bar');
   *
   *     // deep referencing
   *     var deepObj = {
   *         green: { tea: 'matcha' }
   *       , teas: [ 'chai', 'matcha', { tea: 'konacha' } ]
   *     };
   *
   *     expect(deepObj).to.have.deep.property('green.tea', 'matcha');
   *     expect(deepObj).to.have.deep.property('teas[1]', 'matcha');
   *     expect(deepObj).to.have.deep.property('teas[2].tea', 'konacha');
   *
   * You can also use an array as the starting point of a `deep.property`
   * assertion, or traverse nested arrays.
   *
   *     var arr = [
   *         [ 'chai', 'matcha', 'konacha' ]
   *       , [ { tea: 'chai' }
   *         , { tea: 'matcha' }
   *         , { tea: 'konacha' } ]
   *     ];
   *
   *     expect(arr).to.have.deep.property('[0][1]', 'matcha');
   *     expect(arr).to.have.deep.property('[1][2].tea', 'konacha');
   *
   * Furthermore, `property` changes the subject of the assertion
   * to be the value of that property from the original object. This
   * permits for further chainable assertions on that property.
   *
   *     expect(obj).to.have.property('foo')
   *       .that.is.a('string');
   *     expect(deepObj).to.have.property('green')
   *       .that.is.an('object')
   *       .that.deep.equals({ tea: 'matcha' });
   *     expect(deepObj).to.have.property('teas')
   *       .that.is.an('array')
   *       .with.deep.property('[2]')
   *         .that.deep.equals({ tea: 'konacha' });
   *
   * Note that dots and bracket in `name` must be backslash-escaped when
   * the `deep` flag is set, while they must NOT be escaped when the `deep`
   * flag is not set.
   *
   *     // simple referencing
   *     var css = { '.link[target]': 42 };
   *     expect(css).to.have.property('.link[target]', 42);
   *
   *     // deep referencing
   *     var deepCss = { '.link': { '[target]': 42 }};
   *     expect(deepCss).to.have.deep.property('\\.link.\\[target\\]', 42);
   *
   * @name property
   * @alias deep.property
   * @param {String} name
   * @param {Mixed} value (optional)
   * @param {String} message _optional_
   * @returns value of property for chaining
   * @namespace BDD
   * @api public
   */

  Assertion.addMethod('property', function (name, val, msg) {
    if (msg) flag(this, 'message', msg);

    var isDeep = !!flag(this, 'deep')
      , descriptor = isDeep ? 'deep property ' : 'property '
      , negate = flag(this, 'negate')
      , obj = flag(this, 'object')
      , pathInfo = isDeep ? _.getPathInfo(name, obj) : null
      , hasProperty = isDeep
        ? pathInfo.exists
        : _.hasProperty(name, obj)
      , value = isDeep
        ? pathInfo.value
        : obj[name];

    if (negate && arguments.length > 1) {
      if (undefined === value) {
        msg = (msg != null) ? msg + ': ' : '';
        throw new Error(msg + _.inspect(obj) + ' has no ' + descriptor + _.inspect(name));
      }
    } else {
      this.assert(
          hasProperty
        , 'expected #{this} to have a ' + descriptor + _.inspect(name)
        , 'expected #{this} to not have ' + descriptor + _.inspect(name));
    }

    if (arguments.length > 1) {
      this.assert(
          val === value
        , 'expected #{this} to have a ' + descriptor + _.inspect(name) + ' of #{exp}, but got #{act}'
        , 'expected #{this} to not have a ' + descriptor + _.inspect(name) + ' of #{act}'
        , val
        , value
      );
    }

    flag(this, 'object', value);
  });


  /**
   * ### .ownProperty(name)
   *
   * Asserts that the target has an own property `name`.
   *
   *     expect('test').to.have.ownProperty('length');
   *
   * @name ownProperty
   * @alias haveOwnProperty
   * @param {String} name
   * @param {String} message _optional_
   * @namespace BDD
   * @api public
   */

  function assertOwnProperty (name, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    this.assert(
        obj.hasOwnProperty(name)
      , 'expected #{this} to have own property ' + _.inspect(name)
      , 'expected #{this} to not have own property ' + _.inspect(name)
    );
  }

  Assertion.addMethod('ownProperty', assertOwnProperty);
  Assertion.addMethod('haveOwnProperty', assertOwnProperty);

  /**
   * ### .ownPropertyDescriptor(name[, descriptor[, message]])
   *
   * Asserts that the target has an own property descriptor `name`, that optionally matches `descriptor`.
   *
   *     expect('test').to.have.ownPropertyDescriptor('length');
   *     expect('test').to.have.ownPropertyDescriptor('length', { enumerable: false, configurable: false, writable: false, value: 4 });
   *     expect('test').not.to.have.ownPropertyDescriptor('length', { enumerable: false, configurable: false, writable: false, value: 3 });
   *     expect('test').ownPropertyDescriptor('length').to.have.property('enumerable', false);
   *     expect('test').ownPropertyDescriptor('length').to.have.keys('value');
   *
   * @name ownPropertyDescriptor
   * @alias haveOwnPropertyDescriptor
   * @param {String} name
   * @param {Object} descriptor _optional_
   * @param {String} message _optional_
   * @namespace BDD
   * @api public
   */

  function assertOwnPropertyDescriptor (name, descriptor, msg) {
    if (typeof descriptor === 'string') {
      msg = descriptor;
      descriptor = null;
    }
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    var actualDescriptor = Object.getOwnPropertyDescriptor(Object(obj), name);
    if (actualDescriptor && descriptor) {
      this.assert(
          _.eql(descriptor, actualDescriptor)
        , 'expected the own property descriptor for ' + _.inspect(name) + ' on #{this} to match ' + _.inspect(descriptor) + ', got ' + _.inspect(actualDescriptor)
        , 'expected the own property descriptor for ' + _.inspect(name) + ' on #{this} to not match ' + _.inspect(descriptor)
        , descriptor
        , actualDescriptor
        , true
      );
    } else {
      this.assert(
          actualDescriptor
        , 'expected #{this} to have an own property descriptor for ' + _.inspect(name)
        , 'expected #{this} to not have an own property descriptor for ' + _.inspect(name)
      );
    }
    flag(this, 'object', actualDescriptor);
  }

  Assertion.addMethod('ownPropertyDescriptor', assertOwnPropertyDescriptor);
  Assertion.addMethod('haveOwnPropertyDescriptor', assertOwnPropertyDescriptor);

  /**
   * ### .length
   *
   * Sets the `doLength` flag later used as a chain precursor to a value
   * comparison for the `length` property.
   *
   *     expect('foo').to.have.length.above(2);
   *     expect([ 1, 2, 3 ]).to.have.length.above(2);
   *     expect('foo').to.have.length.below(4);
   *     expect([ 1, 2, 3 ]).to.have.length.below(4);
   *     expect('foo').to.have.length.within(2,4);
   *     expect([ 1, 2, 3 ]).to.have.length.within(2,4);
   *
   * *Deprecation notice:* Using `length` as an assertion will be deprecated
   * in version 2.4.0 and removed in 3.0.0. Code using the old style of
   * asserting for `length` property value using `length(value)` should be
   * switched to use `lengthOf(value)` instead.
   *
   * @name length
   * @namespace BDD
   * @api public
   */

  /**
   * ### .lengthOf(value[, message])
   *
   * Asserts that the target's `length` property has
   * the expected value.
   *
   *     expect([ 1, 2, 3]).to.have.lengthOf(3);
   *     expect('foobar').to.have.lengthOf(6);
   *
   * @name lengthOf
   * @param {Number} length
   * @param {String} message _optional_
   * @namespace BDD
   * @api public
   */

  function assertLengthChain () {
    flag(this, 'doLength', true);
  }

  function assertLength (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    new Assertion(obj, msg).to.have.property('length');
    var len = obj.length;

    this.assert(
        len == n
      , 'expected #{this} to have a length of #{exp} but got #{act}'
      , 'expected #{this} to not have a length of #{act}'
      , n
      , len
    );
  }

  Assertion.addChainableMethod('length', assertLength, assertLengthChain);
  Assertion.addMethod('lengthOf', assertLength);

  /**
   * ### .match(regexp)
   *
   * Asserts that the target matches a regular expression.
   *
   *     expect('foobar').to.match(/^foo/);
   *
   * @name match
   * @alias matches
   * @param {RegExp} RegularExpression
   * @param {String} message _optional_
   * @namespace BDD
   * @api public
   */
  function assertMatch(re, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    this.assert(
        re.exec(obj)
      , 'expected #{this} to match ' + re
      , 'expected #{this} not to match ' + re
    );
  }

  Assertion.addMethod('match', assertMatch);
  Assertion.addMethod('matches', assertMatch);

  /**
   * ### .string(string)
   *
   * Asserts that the string target contains another string.
   *
   *     expect('foobar').to.have.string('bar');
   *
   * @name string
   * @param {String} string
   * @param {String} message _optional_
   * @namespace BDD
   * @api public
   */

  Assertion.addMethod('string', function (str, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    new Assertion(obj, msg).is.a('string');

    this.assert(
        ~obj.indexOf(str)
      , 'expected #{this} to contain ' + _.inspect(str)
      , 'expected #{this} to not contain ' + _.inspect(str)
    );
  });


  /**
   * ### .keys(key1, [key2], [...])
   *
   * Asserts that the target contains any or all of the passed-in keys.
   * Use in combination with `any`, `all`, `contains`, or `have` will affect
   * what will pass.
   *
   * When used in conjunction with `any`, at least one key that is passed
   * in must exist in the target object. This is regardless whether or not
   * the `have` or `contain` qualifiers are used. Note, either `any` or `all`
   * should be used in the assertion. If neither are used, the assertion is
   * defaulted to `all`.
   *
   * When both `all` and `contain` are used, the target object must have at
   * least all of the passed-in keys but may have more keys not listed.
   *
   * When both `all` and `have` are used, the target object must both contain
   * all of the passed-in keys AND the number of keys in the target object must
   * match the number of keys passed in (in other words, a target object must
   * have all and only all of the passed-in keys).
   *
   *     expect({ foo: 1, bar: 2 }).to.have.any.keys('foo', 'baz');
   *     expect({ foo: 1, bar: 2 }).to.have.any.keys('foo');
   *     expect({ foo: 1, bar: 2 }).to.contain.any.keys('bar', 'baz');
   *     expect({ foo: 1, bar: 2 }).to.contain.any.keys(['foo']);
   *     expect({ foo: 1, bar: 2 }).to.contain.any.keys({'foo': 6});
   *     expect({ foo: 1, bar: 2 }).to.have.all.keys(['bar', 'foo']);
   *     expect({ foo: 1, bar: 2 }).to.have.all.keys({'bar': 6, 'foo': 7});
   *     expect({ foo: 1, bar: 2, baz: 3 }).to.contain.all.keys(['bar', 'foo']);
   *     expect({ foo: 1, bar: 2, baz: 3 }).to.contain.all.keys({'bar': 6});
   *
   *
   * @name keys
   * @alias key
   * @param {...String|Array|Object} keys
   * @namespace BDD
   * @api public
   */

  function assertKeys (keys) {
    var obj = flag(this, 'object')
      , str
      , ok = true
      , mixedArgsMsg = 'keys must be given single argument of Array|Object|String, or multiple String arguments';

    switch (_.type(keys)) {
      case "array":
        if (arguments.length > 1) throw (new Error(mixedArgsMsg));
        break;
      case "object":
        if (arguments.length > 1) throw (new Error(mixedArgsMsg));
        keys = Object.keys(keys);
        break;
      default:
        keys = Array.prototype.slice.call(arguments);
    }

    if (!keys.length) throw new Error('keys required');

    var actual = Object.keys(obj)
      , expected = keys
      , len = keys.length
      , any = flag(this, 'any')
      , all = flag(this, 'all');

    if (!any && !all) {
      all = true;
    }

    // Has any
    if (any) {
      var intersection = expected.filter(function(key) {
        return ~actual.indexOf(key);
      });
      ok = intersection.length > 0;
    }

    // Has all
    if (all) {
      ok = keys.every(function(key){
        return ~actual.indexOf(key);
      });
      if (!flag(this, 'negate') && !flag(this, 'contains')) {
        ok = ok && keys.length == actual.length;
      }
    }

    // Key string
    if (len > 1) {
      keys = keys.map(function(key){
        return _.inspect(key);
      });
      var last = keys.pop();
      if (all) {
        str = keys.join(', ') + ', and ' + last;
      }
      if (any) {
        str = keys.join(', ') + ', or ' + last;
      }
    } else {
      str = _.inspect(keys[0]);
    }

    // Form
    str = (len > 1 ? 'keys ' : 'key ') + str;

    // Have / include
    str = (flag(this, 'contains') ? 'contain ' : 'have ') + str;

    // Assertion
    this.assert(
        ok
      , 'expected #{this} to ' + str
      , 'expected #{this} to not ' + str
      , expected.slice(0).sort()
      , actual.sort()
      , true
    );
  }

  Assertion.addMethod('keys', assertKeys);
  Assertion.addMethod('key', assertKeys);

  /**
   * ### .throw(constructor)
   *
   * Asserts that the function target will throw a specific error, or specific type of error
   * (as determined using `instanceof`), optionally with a RegExp or string inclusion test
   * for the error's message.
   *
   *     var err = new ReferenceError('This is a bad function.');
   *     var fn = function () { throw err; }
   *     expect(fn).to.throw(ReferenceError);
   *     expect(fn).to.throw(Error);
   *     expect(fn).to.throw(/bad function/);
   *     expect(fn).to.not.throw('good function');
   *     expect(fn).to.throw(ReferenceError, /bad function/);
   *     expect(fn).to.throw(err);
   *
   * Please note that when a throw expectation is negated, it will check each
   * parameter independently, starting with error constructor type. The appropriate way
   * to check for the existence of a type of error but for a message that does not match
   * is to use `and`.
   *
   *     expect(fn).to.throw(ReferenceError)
   *        .and.not.throw(/good function/);
   *
   * @name throw
   * @alias throws
   * @alias Throw
   * @param {ErrorConstructor} constructor
   * @param {String|RegExp} expected error message
   * @param {String} message _optional_
   * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
   * @returns error for chaining (null if no error)
   * @namespace BDD
   * @api public
   */

  function assertThrows (constructor, errMsg, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    new Assertion(obj, msg).is.a('function');

    var thrown = false
      , desiredError = null
      , name = null
      , thrownError = null;

    if (arguments.length === 0) {
      errMsg = null;
      constructor = null;
    } else if (constructor && (constructor instanceof RegExp || 'string' === typeof constructor)) {
      errMsg = constructor;
      constructor = null;
    } else if (constructor && constructor instanceof Error) {
      desiredError = constructor;
      constructor = null;
      errMsg = null;
    } else if (typeof constructor === 'function') {
      name = constructor.prototype.name;
      if (!name || (name === 'Error' && constructor !== Error)) {
        name = constructor.name || (new constructor()).name;
      }
    } else {
      constructor = null;
    }

    try {
      obj();
    } catch (err) {
      // first, check desired error
      if (desiredError) {
        this.assert(
            err === desiredError
          , 'expected #{this} to throw #{exp} but #{act} was thrown'
          , 'expected #{this} to not throw #{exp}'
          , (desiredError instanceof Error ? desiredError.toString() : desiredError)
          , (err instanceof Error ? err.toString() : err)
        );

        flag(this, 'object', err);
        return this;
      }

      // next, check constructor
      if (constructor) {
        this.assert(
            err instanceof constructor
          , 'expected #{this} to throw #{exp} but #{act} was thrown'
          , 'expected #{this} to not throw #{exp} but #{act} was thrown'
          , name
          , (err instanceof Error ? err.toString() : err)
        );

        if (!errMsg) {
          flag(this, 'object', err);
          return this;
        }
      }

      // next, check message
      var message = 'error' === _.type(err) && "message" in err
        ? err.message
        : '' + err;

      if ((message != null) && errMsg && errMsg instanceof RegExp) {
        this.assert(
            errMsg.exec(message)
          , 'expected #{this} to throw error matching #{exp} but got #{act}'
          , 'expected #{this} to throw error not matching #{exp}'
          , errMsg
          , message
        );

        flag(this, 'object', err);
        return this;
      } else if ((message != null) && errMsg && 'string' === typeof errMsg) {
        this.assert(
            ~message.indexOf(errMsg)
          , 'expected #{this} to throw error including #{exp} but got #{act}'
          , 'expected #{this} to throw error not including #{act}'
          , errMsg
          , message
        );

        flag(this, 'object', err);
        return this;
      } else {
        thrown = true;
        thrownError = err;
      }
    }

    var actuallyGot = ''
      , expectedThrown = name !== null
        ? name
        : desiredError
          ? '#{exp}' //_.inspect(desiredError)
          : 'an error';

    if (thrown) {
      actuallyGot = ' but #{act} was thrown'
    }

    this.assert(
        thrown === true
      , 'expected #{this} to throw ' + expectedThrown + actuallyGot
      , 'expected #{this} to not throw ' + expectedThrown + actuallyGot
      , (desiredError instanceof Error ? desiredError.toString() : desiredError)
      , (thrownError instanceof Error ? thrownError.toString() : thrownError)
    );

    flag(this, 'object', thrownError);
  };

  Assertion.addMethod('throw', assertThrows);
  Assertion.addMethod('throws', assertThrows);
  Assertion.addMethod('Throw', assertThrows);

  /**
   * ### .respondTo(method)
   *
   * Asserts that the object or class target will respond to a method.
   *
   *     Klass.prototype.bar = function(){};
   *     expect(Klass).to.respondTo('bar');
   *     expect(obj).to.respondTo('bar');
   *
   * To check if a constructor will respond to a static function,
   * set the `itself` flag.
   *
   *     Klass.baz = function(){};
   *     expect(Klass).itself.to.respondTo('baz');
   *
   * @name respondTo
   * @alias respondsTo
   * @param {String} method
   * @param {String} message _optional_
   * @namespace BDD
   * @api public
   */

  function respondTo (method, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object')
      , itself = flag(this, 'itself')
      , context = ('function' === _.type(obj) && !itself)
        ? obj.prototype[method]
        : obj[method];

    this.assert(
        'function' === typeof context
      , 'expected #{this} to respond to ' + _.inspect(method)
      , 'expected #{this} to not respond to ' + _.inspect(method)
    );
  }

  Assertion.addMethod('respondTo', respondTo);
  Assertion.addMethod('respondsTo', respondTo);

  /**
   * ### .itself
   *
   * Sets the `itself` flag, later used by the `respondTo` assertion.
   *
   *     function Foo() {}
   *     Foo.bar = function() {}
   *     Foo.prototype.baz = function() {}
   *
   *     expect(Foo).itself.to.respondTo('bar');
   *     expect(Foo).itself.not.to.respondTo('baz');
   *
   * @name itself
   * @namespace BDD
   * @api public
   */

  Assertion.addProperty('itself', function () {
    flag(this, 'itself', true);
  });

  /**
   * ### .satisfy(method)
   *
   * Asserts that the target passes a given truth test.
   *
   *     expect(1).to.satisfy(function(num) { return num > 0; });
   *
   * @name satisfy
   * @alias satisfies
   * @param {Function} matcher
   * @param {String} message _optional_
   * @namespace BDD
   * @api public
   */

  function satisfy (matcher, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    var result = matcher(obj);
    this.assert(
        result
      , 'expected #{this} to satisfy ' + _.objDisplay(matcher)
      , 'expected #{this} to not satisfy' + _.objDisplay(matcher)
      , this.negate ? false : true
      , result
    );
  }

  Assertion.addMethod('satisfy', satisfy);
  Assertion.addMethod('satisfies', satisfy);

  /**
   * ### .closeTo(expected, delta)
   *
   * Asserts that the target is equal `expected`, to within a +/- `delta` range.
   *
   *     expect(1.5).to.be.closeTo(1, 0.5);
   *
   * @name closeTo
   * @alias approximately
   * @param {Number} expected
   * @param {Number} delta
   * @param {String} message _optional_
   * @namespace BDD
   * @api public
   */

  function closeTo(expected, delta, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');

    new Assertion(obj, msg).is.a('number');
    if (_.type(expected) !== 'number' || _.type(delta) !== 'number') {
      throw new Error('the arguments to closeTo or approximately must be numbers');
    }

    this.assert(
        Math.abs(obj - expected) <= delta
      , 'expected #{this} to be close to ' + expected + ' +/- ' + delta
      , 'expected #{this} not to be close to ' + expected + ' +/- ' + delta
    );
  }

  Assertion.addMethod('closeTo', closeTo);
  Assertion.addMethod('approximately', closeTo);

  function isSubsetOf(subset, superset, cmp) {
    return subset.every(function(elem) {
      if (!cmp) return superset.indexOf(elem) !== -1;

      return superset.some(function(elem2) {
        return cmp(elem, elem2);
      });
    })
  }

  /**
   * ### .members(set)
   *
   * Asserts that the target is a superset of `set`,
   * or that the target and `set` have the same strictly-equal (===) members.
   * Alternately, if the `deep` flag is set, set members are compared for deep
   * equality.
   *
   *     expect([1, 2, 3]).to.include.members([3, 2]);
   *     expect([1, 2, 3]).to.not.include.members([3, 2, 8]);
   *
   *     expect([4, 2]).to.have.members([2, 4]);
   *     expect([5, 2]).to.not.have.members([5, 2, 1]);
   *
   *     expect([{ id: 1 }]).to.deep.include.members([{ id: 1 }]);
   *
   * @name members
   * @param {Array} set
   * @param {String} message _optional_
   * @namespace BDD
   * @api public
   */

  Assertion.addMethod('members', function (subset, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');

    new Assertion(obj).to.be.an('array');
    new Assertion(subset).to.be.an('array');

    var cmp = flag(this, 'deep') ? _.eql : undefined;

    if (flag(this, 'contains')) {
      return this.assert(
          isSubsetOf(subset, obj, cmp)
        , 'expected #{this} to be a superset of #{act}'
        , 'expected #{this} to not be a superset of #{act}'
        , obj
        , subset
      );
    }

    this.assert(
        isSubsetOf(obj, subset, cmp) && isSubsetOf(subset, obj, cmp)
        , 'expected #{this} to have the same members as #{act}'
        , 'expected #{this} to not have the same members as #{act}'
        , obj
        , subset
    );
  });

  /**
   * ### .oneOf(list)
   *
   * Assert that a value appears somewhere in the top level of array `list`.
   *
   *     expect('a').to.be.oneOf(['a', 'b', 'c']);
   *     expect(9).to.not.be.oneOf(['z']);
   *     expect([3]).to.not.be.oneOf([1, 2, [3]]);
   *
   *     var three = [3];
   *     // for object-types, contents are not compared
   *     expect(three).to.not.be.oneOf([1, 2, [3]]);
   *     // comparing references works
   *     expect(three).to.be.oneOf([1, 2, three]);
   *
   * @name oneOf
   * @param {Array<*>} list
   * @param {String} message _optional_
   * @namespace BDD
   * @api public
   */

  function oneOf (list, msg) {
    if (msg) flag(this, 'message', msg);
    var expected = flag(this, 'object');
    new Assertion(list).to.be.an('array');

    this.assert(
        list.indexOf(expected) > -1
      , 'expected #{this} to be one of #{exp}'
      , 'expected #{this} to not be one of #{exp}'
      , list
      , expected
    );
  }

  Assertion.addMethod('oneOf', oneOf);


  /**
   * ### .change(function)
   *
   * Asserts that a function changes an object property
   *
   *     var obj = { val: 10 };
   *     var fn = function() { obj.val += 3 };
   *     var noChangeFn = function() { return 'foo' + 'bar'; }
   *     expect(fn).to.change(obj, 'val');
   *     expect(noChangeFn).to.not.change(obj, 'val')
   *
   * @name change
   * @alias changes
   * @alias Change
   * @param {String} object
   * @param {String} property name
   * @param {String} message _optional_
   * @namespace BDD
   * @api public
   */

  function assertChanges (object, prop, msg) {
    if (msg) flag(this, 'message', msg);
    var fn = flag(this, 'object');
    new Assertion(object, msg).to.have.property(prop);
    new Assertion(fn).is.a('function');

    var initial = object[prop];
    fn();

    this.assert(
      initial !== object[prop]
      , 'expected .' + prop + ' to change'
      , 'expected .' + prop + ' to not change'
    );
  }

  Assertion.addChainableMethod('change', assertChanges);
  Assertion.addChainableMethod('changes', assertChanges);

  /**
   * ### .increase(function)
   *
   * Asserts that a function increases an object property
   *
   *     var obj = { val: 10 };
   *     var fn = function() { obj.val = 15 };
   *     expect(fn).to.increase(obj, 'val');
   *
   * @name increase
   * @alias increases
   * @alias Increase
   * @param {String} object
   * @param {String} property name
   * @param {String} message _optional_
   * @namespace BDD
   * @api public
   */

  function assertIncreases (object, prop, msg) {
    if (msg) flag(this, 'message', msg);
    var fn = flag(this, 'object');
    new Assertion(object, msg).to.have.property(prop);
    new Assertion(fn).is.a('function');

    var initial = object[prop];
    fn();

    this.assert(
      object[prop] - initial > 0
      , 'expected .' + prop + ' to increase'
      , 'expected .' + prop + ' to not increase'
    );
  }

  Assertion.addChainableMethod('increase', assertIncreases);
  Assertion.addChainableMethod('increases', assertIncreases);

  /**
   * ### .decrease(function)
   *
   * Asserts that a function decreases an object property
   *
   *     var obj = { val: 10 };
   *     var fn = function() { obj.val = 5 };
   *     expect(fn).to.decrease(obj, 'val');
   *
   * @name decrease
   * @alias decreases
   * @alias Decrease
   * @param {String} object
   * @param {String} property name
   * @param {String} message _optional_
   * @namespace BDD
   * @api public
   */

  function assertDecreases (object, prop, msg) {
    if (msg) flag(this, 'message', msg);
    var fn = flag(this, 'object');
    new Assertion(object, msg).to.have.property(prop);
    new Assertion(fn).is.a('function');

    var initial = object[prop];
    fn();

    this.assert(
      object[prop] - initial < 0
      , 'expected .' + prop + ' to decrease'
      , 'expected .' + prop + ' to not decrease'
    );
  }

  Assertion.addChainableMethod('decrease', assertDecreases);
  Assertion.addChainableMethod('decreases', assertDecreases);

  /**
   * ### .extensible
   *
   * Asserts that the target is extensible (can have new properties added to
   * it).
   *
   *     var nonExtensibleObject = Object.preventExtensions({});
   *     var sealedObject = Object.seal({});
   *     var frozenObject = Object.freeze({});
   *
   *     expect({}).to.be.extensible;
   *     expect(nonExtensibleObject).to.not.be.extensible;
   *     expect(sealedObject).to.not.be.extensible;
   *     expect(frozenObject).to.not.be.extensible;
   *
   * @name extensible
   * @namespace BDD
   * @api public
   */

  Assertion.addProperty('extensible', function() {
    var obj = flag(this, 'object');

    // In ES5, if the argument to this method is not an object (a primitive), then it will cause a TypeError.
    // In ES6, a non-object argument will be treated as if it was a non-extensible ordinary object, simply return false.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/isExtensible
    // The following provides ES6 behavior when a TypeError is thrown under ES5.

    var isExtensible;

    try {
      isExtensible = Object.isExtensible(obj);
    } catch (err) {
      if (err instanceof TypeError) isExtensible = false;
      else throw err;
    }

    this.assert(
      isExtensible
      , 'expected #{this} to be extensible'
      , 'expected #{this} to not be extensible'
    );
  });

  /**
   * ### .sealed
   *
   * Asserts that the target is sealed (cannot have new properties added to it
   * and its existing properties cannot be removed).
   *
   *     var sealedObject = Object.seal({});
   *     var frozenObject = Object.freeze({});
   *
   *     expect(sealedObject).to.be.sealed;
   *     expect(frozenObject).to.be.sealed;
   *     expect({}).to.not.be.sealed;
   *
   * @name sealed
   * @namespace BDD
   * @api public
   */

  Assertion.addProperty('sealed', function() {
    var obj = flag(this, 'object');

    // In ES5, if the argument to this method is not an object (a primitive), then it will cause a TypeError.
    // In ES6, a non-object argument will be treated as if it was a sealed ordinary object, simply return true.
    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/isSealed
    // The following provides ES6 behavior when a TypeError is thrown under ES5.

    var isSealed;

    try {
      isSealed = Object.isSealed(obj);
    } catch (err) {
      if (err instanceof TypeError) isSealed = true;
      else throw err;
    }

    this.assert(
      isSealed
      , 'expected #{this} to be sealed'
      , 'expected #{this} to not be sealed'
    );
  });

  /**
   * ### .frozen
   *
   * Asserts that the target is frozen (cannot have new properties added to it
   * and its existing properties cannot be modified).
   *
   *     var frozenObject = Object.freeze({});
   *
   *     expect(frozenObject).to.be.frozen;
   *     expect({}).to.not.be.frozen;
   *
   * @name frozen
   * @namespace BDD
   * @api public
   */

  Assertion.addProperty('frozen', function() {
    var obj = flag(this, 'object');

    // In ES5, if the argument to this method is not an object (a primitive), then it will cause a TypeError.
    // In ES6, a non-object argument will be treated as if it was a frozen ordinary object, simply return true.
    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/isFrozen
    // The following provides ES6 behavior when a TypeError is thrown under ES5.

    var isFrozen;

    try {
      isFrozen = Object.isFrozen(obj);
    } catch (err) {
      if (err instanceof TypeError) isFrozen = true;
      else throw err;
    }

    this.assert(
      isFrozen
      , 'expected #{this} to be frozen'
      , 'expected #{this} to not be frozen'
    );
  });
};

},{}],47:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */


module.exports = function (chai, util) {

  /*!
   * Chai dependencies.
   */

  var Assertion = chai.Assertion
    , flag = util.flag;

  /*!
   * Module export.
   */

  /**
   * ### assert(expression, message)
   *
   * Write your own test expressions.
   *
   *     assert('foo' !== 'bar', 'foo is not bar');
   *     assert(Array.isArray([]), 'empty arrays are arrays');
   *
   * @param {Mixed} expression to test for truthiness
   * @param {String} message to display on error
   * @name assert
   * @namespace Assert
   * @api public
   */

  var assert = chai.assert = function (express, errmsg) {
    var test = new Assertion(null, null, chai.assert);
    test.assert(
        express
      , errmsg
      , '[ negation message unavailable ]'
    );
  };

  /**
   * ### .fail(actual, expected, [message], [operator])
   *
   * Throw a failure. Node.js `assert` module-compatible.
   *
   * @name fail
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @param {String} operator
   * @namespace Assert
   * @api public
   */

  assert.fail = function (actual, expected, message, operator) {
    message = message || 'assert.fail()';
    throw new chai.AssertionError(message, {
        actual: actual
      , expected: expected
      , operator: operator
    }, assert.fail);
  };

  /**
   * ### .isOk(object, [message])
   *
   * Asserts that `object` is truthy.
   *
   *     assert.isOk('everything', 'everything is ok');
   *     assert.isOk(false, 'this will fail');
   *
   * @name isOk
   * @alias ok
   * @param {Mixed} object to test
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isOk = function (val, msg) {
    new Assertion(val, msg).is.ok;
  };

  /**
   * ### .isNotOk(object, [message])
   *
   * Asserts that `object` is falsy.
   *
   *     assert.isNotOk('everything', 'this will fail');
   *     assert.isNotOk(false, 'this will pass');
   *
   * @name isNotOk
   * @alias notOk
   * @param {Mixed} object to test
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isNotOk = function (val, msg) {
    new Assertion(val, msg).is.not.ok;
  };

  /**
   * ### .equal(actual, expected, [message])
   *
   * Asserts non-strict equality (`==`) of `actual` and `expected`.
   *
   *     assert.equal(3, '3', '== coerces values to strings');
   *
   * @name equal
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.equal = function (act, exp, msg) {
    var test = new Assertion(act, msg, assert.equal);

    test.assert(
        exp == flag(test, 'object')
      , 'expected #{this} to equal #{exp}'
      , 'expected #{this} to not equal #{act}'
      , exp
      , act
    );
  };

  /**
   * ### .notEqual(actual, expected, [message])
   *
   * Asserts non-strict inequality (`!=`) of `actual` and `expected`.
   *
   *     assert.notEqual(3, 4, 'these numbers are not equal');
   *
   * @name notEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.notEqual = function (act, exp, msg) {
    var test = new Assertion(act, msg, assert.notEqual);

    test.assert(
        exp != flag(test, 'object')
      , 'expected #{this} to not equal #{exp}'
      , 'expected #{this} to equal #{act}'
      , exp
      , act
    );
  };

  /**
   * ### .strictEqual(actual, expected, [message])
   *
   * Asserts strict equality (`===`) of `actual` and `expected`.
   *
   *     assert.strictEqual(true, true, 'these booleans are strictly equal');
   *
   * @name strictEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.strictEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.equal(exp);
  };

  /**
   * ### .notStrictEqual(actual, expected, [message])
   *
   * Asserts strict inequality (`!==`) of `actual` and `expected`.
   *
   *     assert.notStrictEqual(3, '3', 'no coercion for strict equality');
   *
   * @name notStrictEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.notStrictEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.not.equal(exp);
  };

  /**
   * ### .deepEqual(actual, expected, [message])
   *
   * Asserts that `actual` is deeply equal to `expected`.
   *
   *     assert.deepEqual({ tea: 'green' }, { tea: 'green' });
   *
   * @name deepEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.deepEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.eql(exp);
  };

  /**
   * ### .notDeepEqual(actual, expected, [message])
   *
   * Assert that `actual` is not deeply equal to `expected`.
   *
   *     assert.notDeepEqual({ tea: 'green' }, { tea: 'jasmine' });
   *
   * @name notDeepEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.notDeepEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.not.eql(exp);
  };

   /**
   * ### .isAbove(valueToCheck, valueToBeAbove, [message])
   *
   * Asserts `valueToCheck` is strictly greater than (>) `valueToBeAbove`
   *
   *     assert.isAbove(5, 2, '5 is strictly greater than 2');
   *
   * @name isAbove
   * @param {Mixed} valueToCheck
   * @param {Mixed} valueToBeAbove
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isAbove = function (val, abv, msg) {
    new Assertion(val, msg).to.be.above(abv);
  };

   /**
   * ### .isAtLeast(valueToCheck, valueToBeAtLeast, [message])
   *
   * Asserts `valueToCheck` is greater than or equal to (>=) `valueToBeAtLeast`
   *
   *     assert.isAtLeast(5, 2, '5 is greater or equal to 2');
   *     assert.isAtLeast(3, 3, '3 is greater or equal to 3');
   *
   * @name isAtLeast
   * @param {Mixed} valueToCheck
   * @param {Mixed} valueToBeAtLeast
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isAtLeast = function (val, atlst, msg) {
    new Assertion(val, msg).to.be.least(atlst);
  };

   /**
   * ### .isBelow(valueToCheck, valueToBeBelow, [message])
   *
   * Asserts `valueToCheck` is strictly less than (<) `valueToBeBelow`
   *
   *     assert.isBelow(3, 6, '3 is strictly less than 6');
   *
   * @name isBelow
   * @param {Mixed} valueToCheck
   * @param {Mixed} valueToBeBelow
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isBelow = function (val, blw, msg) {
    new Assertion(val, msg).to.be.below(blw);
  };

   /**
   * ### .isAtMost(valueToCheck, valueToBeAtMost, [message])
   *
   * Asserts `valueToCheck` is less than or equal to (<=) `valueToBeAtMost`
   *
   *     assert.isAtMost(3, 6, '3 is less than or equal to 6');
   *     assert.isAtMost(4, 4, '4 is less than or equal to 4');
   *
   * @name isAtMost
   * @param {Mixed} valueToCheck
   * @param {Mixed} valueToBeAtMost
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isAtMost = function (val, atmst, msg) {
    new Assertion(val, msg).to.be.most(atmst);
  };

  /**
   * ### .isTrue(value, [message])
   *
   * Asserts that `value` is true.
   *
   *     var teaServed = true;
   *     assert.isTrue(teaServed, 'the tea has been served');
   *
   * @name isTrue
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isTrue = function (val, msg) {
    new Assertion(val, msg).is['true'];
  };

  /**
   * ### .isNotTrue(value, [message])
   *
   * Asserts that `value` is not true.
   *
   *     var tea = 'tasty chai';
   *     assert.isNotTrue(tea, 'great, time for tea!');
   *
   * @name isNotTrue
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isNotTrue = function (val, msg) {
    new Assertion(val, msg).to.not.equal(true);
  };

  /**
   * ### .isFalse(value, [message])
   *
   * Asserts that `value` is false.
   *
   *     var teaServed = false;
   *     assert.isFalse(teaServed, 'no tea yet? hmm...');
   *
   * @name isFalse
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isFalse = function (val, msg) {
    new Assertion(val, msg).is['false'];
  };

  /**
   * ### .isNotFalse(value, [message])
   *
   * Asserts that `value` is not false.
   *
   *     var tea = 'tasty chai';
   *     assert.isNotFalse(tea, 'great, time for tea!');
   *
   * @name isNotFalse
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isNotFalse = function (val, msg) {
    new Assertion(val, msg).to.not.equal(false);
  };

  /**
   * ### .isNull(value, [message])
   *
   * Asserts that `value` is null.
   *
   *     assert.isNull(err, 'there was no error');
   *
   * @name isNull
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isNull = function (val, msg) {
    new Assertion(val, msg).to.equal(null);
  };

  /**
   * ### .isNotNull(value, [message])
   *
   * Asserts that `value` is not null.
   *
   *     var tea = 'tasty chai';
   *     assert.isNotNull(tea, 'great, time for tea!');
   *
   * @name isNotNull
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isNotNull = function (val, msg) {
    new Assertion(val, msg).to.not.equal(null);
  };

  /**
   * ### .isNaN
   * Asserts that value is NaN
   *
   *    assert.isNaN('foo', 'foo is NaN');
   *
   * @name isNaN
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isNaN = function (val, msg) {
    new Assertion(val, msg).to.be.NaN;
  };

  /**
   * ### .isNotNaN
   * Asserts that value is not NaN
   *
   *    assert.isNotNaN(4, '4 is not NaN');
   *
   * @name isNotNaN
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */
  assert.isNotNaN = function (val, msg) {
    new Assertion(val, msg).not.to.be.NaN;
  };

  /**
   * ### .isUndefined(value, [message])
   *
   * Asserts that `value` is `undefined`.
   *
   *     var tea;
   *     assert.isUndefined(tea, 'no tea defined');
   *
   * @name isUndefined
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isUndefined = function (val, msg) {
    new Assertion(val, msg).to.equal(undefined);
  };

  /**
   * ### .isDefined(value, [message])
   *
   * Asserts that `value` is not `undefined`.
   *
   *     var tea = 'cup of chai';
   *     assert.isDefined(tea, 'tea has been defined');
   *
   * @name isDefined
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isDefined = function (val, msg) {
    new Assertion(val, msg).to.not.equal(undefined);
  };

  /**
   * ### .isFunction(value, [message])
   *
   * Asserts that `value` is a function.
   *
   *     function serveTea() { return 'cup of tea'; };
   *     assert.isFunction(serveTea, 'great, we can have tea now');
   *
   * @name isFunction
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isFunction = function (val, msg) {
    new Assertion(val, msg).to.be.a('function');
  };

  /**
   * ### .isNotFunction(value, [message])
   *
   * Asserts that `value` is _not_ a function.
   *
   *     var serveTea = [ 'heat', 'pour', 'sip' ];
   *     assert.isNotFunction(serveTea, 'great, we have listed the steps');
   *
   * @name isNotFunction
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isNotFunction = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('function');
  };

  /**
   * ### .isObject(value, [message])
   *
   * Asserts that `value` is an object of type 'Object' (as revealed by `Object.prototype.toString`).
   * _The assertion does not match subclassed objects._
   *
   *     var selection = { name: 'Chai', serve: 'with spices' };
   *     assert.isObject(selection, 'tea selection is an object');
   *
   * @name isObject
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isObject = function (val, msg) {
    new Assertion(val, msg).to.be.a('object');
  };

  /**
   * ### .isNotObject(value, [message])
   *
   * Asserts that `value` is _not_ an object of type 'Object' (as revealed by `Object.prototype.toString`).
   *
   *     var selection = 'chai'
   *     assert.isNotObject(selection, 'tea selection is not an object');
   *     assert.isNotObject(null, 'null is not an object');
   *
   * @name isNotObject
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isNotObject = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('object');
  };

  /**
   * ### .isArray(value, [message])
   *
   * Asserts that `value` is an array.
   *
   *     var menu = [ 'green', 'chai', 'oolong' ];
   *     assert.isArray(menu, 'what kind of tea do we want?');
   *
   * @name isArray
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isArray = function (val, msg) {
    new Assertion(val, msg).to.be.an('array');
  };

  /**
   * ### .isNotArray(value, [message])
   *
   * Asserts that `value` is _not_ an array.
   *
   *     var menu = 'green|chai|oolong';
   *     assert.isNotArray(menu, 'what kind of tea do we want?');
   *
   * @name isNotArray
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isNotArray = function (val, msg) {
    new Assertion(val, msg).to.not.be.an('array');
  };

  /**
   * ### .isString(value, [message])
   *
   * Asserts that `value` is a string.
   *
   *     var teaOrder = 'chai';
   *     assert.isString(teaOrder, 'order placed');
   *
   * @name isString
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isString = function (val, msg) {
    new Assertion(val, msg).to.be.a('string');
  };

  /**
   * ### .isNotString(value, [message])
   *
   * Asserts that `value` is _not_ a string.
   *
   *     var teaOrder = 4;
   *     assert.isNotString(teaOrder, 'order placed');
   *
   * @name isNotString
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isNotString = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('string');
  };

  /**
   * ### .isNumber(value, [message])
   *
   * Asserts that `value` is a number.
   *
   *     var cups = 2;
   *     assert.isNumber(cups, 'how many cups');
   *
   * @name isNumber
   * @param {Number} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isNumber = function (val, msg) {
    new Assertion(val, msg).to.be.a('number');
  };

  /**
   * ### .isNotNumber(value, [message])
   *
   * Asserts that `value` is _not_ a number.
   *
   *     var cups = '2 cups please';
   *     assert.isNotNumber(cups, 'how many cups');
   *
   * @name isNotNumber
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isNotNumber = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('number');
  };

  /**
   * ### .isBoolean(value, [message])
   *
   * Asserts that `value` is a boolean.
   *
   *     var teaReady = true
   *       , teaServed = false;
   *
   *     assert.isBoolean(teaReady, 'is the tea ready');
   *     assert.isBoolean(teaServed, 'has tea been served');
   *
   * @name isBoolean
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isBoolean = function (val, msg) {
    new Assertion(val, msg).to.be.a('boolean');
  };

  /**
   * ### .isNotBoolean(value, [message])
   *
   * Asserts that `value` is _not_ a boolean.
   *
   *     var teaReady = 'yep'
   *       , teaServed = 'nope';
   *
   *     assert.isNotBoolean(teaReady, 'is the tea ready');
   *     assert.isNotBoolean(teaServed, 'has tea been served');
   *
   * @name isNotBoolean
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.isNotBoolean = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('boolean');
  };

  /**
   * ### .typeOf(value, name, [message])
   *
   * Asserts that `value`'s type is `name`, as determined by
   * `Object.prototype.toString`.
   *
   *     assert.typeOf({ tea: 'chai' }, 'object', 'we have an object');
   *     assert.typeOf(['chai', 'jasmine'], 'array', 'we have an array');
   *     assert.typeOf('tea', 'string', 'we have a string');
   *     assert.typeOf(/tea/, 'regexp', 'we have a regular expression');
   *     assert.typeOf(null, 'null', 'we have a null');
   *     assert.typeOf(undefined, 'undefined', 'we have an undefined');
   *
   * @name typeOf
   * @param {Mixed} value
   * @param {String} name
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.typeOf = function (val, type, msg) {
    new Assertion(val, msg).to.be.a(type);
  };

  /**
   * ### .notTypeOf(value, name, [message])
   *
   * Asserts that `value`'s type is _not_ `name`, as determined by
   * `Object.prototype.toString`.
   *
   *     assert.notTypeOf('tea', 'number', 'strings are not numbers');
   *
   * @name notTypeOf
   * @param {Mixed} value
   * @param {String} typeof name
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.notTypeOf = function (val, type, msg) {
    new Assertion(val, msg).to.not.be.a(type);
  };

  /**
   * ### .instanceOf(object, constructor, [message])
   *
   * Asserts that `value` is an instance of `constructor`.
   *
   *     var Tea = function (name) { this.name = name; }
   *       , chai = new Tea('chai');
   *
   *     assert.instanceOf(chai, Tea, 'chai is an instance of tea');
   *
   * @name instanceOf
   * @param {Object} object
   * @param {Constructor} constructor
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.instanceOf = function (val, type, msg) {
    new Assertion(val, msg).to.be.instanceOf(type);
  };

  /**
   * ### .notInstanceOf(object, constructor, [message])
   *
   * Asserts `value` is not an instance of `constructor`.
   *
   *     var Tea = function (name) { this.name = name; }
   *       , chai = new String('chai');
   *
   *     assert.notInstanceOf(chai, Tea, 'chai is not an instance of tea');
   *
   * @name notInstanceOf
   * @param {Object} object
   * @param {Constructor} constructor
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.notInstanceOf = function (val, type, msg) {
    new Assertion(val, msg).to.not.be.instanceOf(type);
  };

  /**
   * ### .include(haystack, needle, [message])
   *
   * Asserts that `haystack` includes `needle`. Works
   * for strings and arrays.
   *
   *     assert.include('foobar', 'bar', 'foobar contains string "bar"');
   *     assert.include([ 1, 2, 3 ], 3, 'array contains value');
   *
   * @name include
   * @param {Array|String} haystack
   * @param {Mixed} needle
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.include = function (exp, inc, msg) {
    new Assertion(exp, msg, assert.include).include(inc);
  };

  /**
   * ### .notInclude(haystack, needle, [message])
   *
   * Asserts that `haystack` does not include `needle`. Works
   * for strings and arrays.
   *
   *     assert.notInclude('foobar', 'baz', 'string not include substring');
   *     assert.notInclude([ 1, 2, 3 ], 4, 'array not include contain value');
   *
   * @name notInclude
   * @param {Array|String} haystack
   * @param {Mixed} needle
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.notInclude = function (exp, inc, msg) {
    new Assertion(exp, msg, assert.notInclude).not.include(inc);
  };

  /**
   * ### .match(value, regexp, [message])
   *
   * Asserts that `value` matches the regular expression `regexp`.
   *
   *     assert.match('foobar', /^foo/, 'regexp matches');
   *
   * @name match
   * @param {Mixed} value
   * @param {RegExp} regexp
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.match = function (exp, re, msg) {
    new Assertion(exp, msg).to.match(re);
  };

  /**
   * ### .notMatch(value, regexp, [message])
   *
   * Asserts that `value` does not match the regular expression `regexp`.
   *
   *     assert.notMatch('foobar', /^foo/, 'regexp does not match');
   *
   * @name notMatch
   * @param {Mixed} value
   * @param {RegExp} regexp
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.notMatch = function (exp, re, msg) {
    new Assertion(exp, msg).to.not.match(re);
  };

  /**
   * ### .property(object, property, [message])
   *
   * Asserts that `object` has a property named by `property`.
   *
   *     assert.property({ tea: { green: 'matcha' }}, 'tea');
   *
   * @name property
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.property = function (obj, prop, msg) {
    new Assertion(obj, msg).to.have.property(prop);
  };

  /**
   * ### .notProperty(object, property, [message])
   *
   * Asserts that `object` does _not_ have a property named by `property`.
   *
   *     assert.notProperty({ tea: { green: 'matcha' }}, 'coffee');
   *
   * @name notProperty
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.notProperty = function (obj, prop, msg) {
    new Assertion(obj, msg).to.not.have.property(prop);
  };

  /**
   * ### .deepProperty(object, property, [message])
   *
   * Asserts that `object` has a property named by `property`, which can be a
   * string using dot- and bracket-notation for deep reference.
   *
   *     assert.deepProperty({ tea: { green: 'matcha' }}, 'tea.green');
   *
   * @name deepProperty
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.deepProperty = function (obj, prop, msg) {
    new Assertion(obj, msg).to.have.deep.property(prop);
  };

  /**
   * ### .notDeepProperty(object, property, [message])
   *
   * Asserts that `object` does _not_ have a property named by `property`, which
   * can be a string using dot- and bracket-notation for deep reference.
   *
   *     assert.notDeepProperty({ tea: { green: 'matcha' }}, 'tea.oolong');
   *
   * @name notDeepProperty
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.notDeepProperty = function (obj, prop, msg) {
    new Assertion(obj, msg).to.not.have.deep.property(prop);
  };

  /**
   * ### .propertyVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property` with value given
   * by `value`.
   *
   *     assert.propertyVal({ tea: 'is good' }, 'tea', 'is good');
   *
   * @name propertyVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.propertyVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.have.property(prop, val);
  };

  /**
   * ### .propertyNotVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property`, but with a value
   * different from that given by `value`.
   *
   *     assert.propertyNotVal({ tea: 'is good' }, 'tea', 'is bad');
   *
   * @name propertyNotVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.propertyNotVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.not.have.property(prop, val);
  };

  /**
   * ### .deepPropertyVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property` with value given
   * by `value`. `property` can use dot- and bracket-notation for deep
   * reference.
   *
   *     assert.deepPropertyVal({ tea: { green: 'matcha' }}, 'tea.green', 'matcha');
   *
   * @name deepPropertyVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.deepPropertyVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.have.deep.property(prop, val);
  };

  /**
   * ### .deepPropertyNotVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property`, but with a value
   * different from that given by `value`. `property` can use dot- and
   * bracket-notation for deep reference.
   *
   *     assert.deepPropertyNotVal({ tea: { green: 'matcha' }}, 'tea.green', 'konacha');
   *
   * @name deepPropertyNotVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.deepPropertyNotVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.not.have.deep.property(prop, val);
  };

  /**
   * ### .lengthOf(object, length, [message])
   *
   * Asserts that `object` has a `length` property with the expected value.
   *
   *     assert.lengthOf([1,2,3], 3, 'array has length of 3');
   *     assert.lengthOf('foobar', 6, 'string has length of 6');
   *
   * @name lengthOf
   * @param {Mixed} object
   * @param {Number} length
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.lengthOf = function (exp, len, msg) {
    new Assertion(exp, msg).to.have.length(len);
  };

  /**
   * ### .throws(function, [constructor/string/regexp], [string/regexp], [message])
   *
   * Asserts that `function` will throw an error that is an instance of
   * `constructor`, or alternately that it will throw an error with message
   * matching `regexp`.
   *
   *     assert.throws(fn, 'function throws a reference error');
   *     assert.throws(fn, /function throws a reference error/);
   *     assert.throws(fn, ReferenceError);
   *     assert.throws(fn, ReferenceError, 'function throws a reference error');
   *     assert.throws(fn, ReferenceError, /function throws a reference error/);
   *
   * @name throws
   * @alias throw
   * @alias Throw
   * @param {Function} function
   * @param {ErrorConstructor} constructor
   * @param {RegExp} regexp
   * @param {String} message
   * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
   * @namespace Assert
   * @api public
   */

  assert.throws = function (fn, errt, errs, msg) {
    if ('string' === typeof errt || errt instanceof RegExp) {
      errs = errt;
      errt = null;
    }

    var assertErr = new Assertion(fn, msg).to.throw(errt, errs);
    return flag(assertErr, 'object');
  };

  /**
   * ### .doesNotThrow(function, [constructor/regexp], [message])
   *
   * Asserts that `function` will _not_ throw an error that is an instance of
   * `constructor`, or alternately that it will not throw an error with message
   * matching `regexp`.
   *
   *     assert.doesNotThrow(fn, Error, 'function does not throw');
   *
   * @name doesNotThrow
   * @param {Function} function
   * @param {ErrorConstructor} constructor
   * @param {RegExp} regexp
   * @param {String} message
   * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
   * @namespace Assert
   * @api public
   */

  assert.doesNotThrow = function (fn, type, msg) {
    if ('string' === typeof type) {
      msg = type;
      type = null;
    }

    new Assertion(fn, msg).to.not.Throw(type);
  };

  /**
   * ### .operator(val1, operator, val2, [message])
   *
   * Compares two values using `operator`.
   *
   *     assert.operator(1, '<', 2, 'everything is ok');
   *     assert.operator(1, '>', 2, 'this will fail');
   *
   * @name operator
   * @param {Mixed} val1
   * @param {String} operator
   * @param {Mixed} val2
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.operator = function (val, operator, val2, msg) {
    var ok;
    switch(operator) {
      case '==':
        ok = val == val2;
        break;
      case '===':
        ok = val === val2;
        break;
      case '>':
        ok = val > val2;
        break;
      case '>=':
        ok = val >= val2;
        break;
      case '<':
        ok = val < val2;
        break;
      case '<=':
        ok = val <= val2;
        break;
      case '!=':
        ok = val != val2;
        break;
      case '!==':
        ok = val !== val2;
        break;
      default:
        throw new Error('Invalid operator "' + operator + '"');
    }
    var test = new Assertion(ok, msg);
    test.assert(
        true === flag(test, 'object')
      , 'expected ' + util.inspect(val) + ' to be ' + operator + ' ' + util.inspect(val2)
      , 'expected ' + util.inspect(val) + ' to not be ' + operator + ' ' + util.inspect(val2) );
  };

  /**
   * ### .closeTo(actual, expected, delta, [message])
   *
   * Asserts that the target is equal `expected`, to within a +/- `delta` range.
   *
   *     assert.closeTo(1.5, 1, 0.5, 'numbers are close');
   *
   * @name closeTo
   * @param {Number} actual
   * @param {Number} expected
   * @param {Number} delta
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.closeTo = function (act, exp, delta, msg) {
    new Assertion(act, msg).to.be.closeTo(exp, delta);
  };

  /**
   * ### .approximately(actual, expected, delta, [message])
   *
   * Asserts that the target is equal `expected`, to within a +/- `delta` range.
   *
   *     assert.approximately(1.5, 1, 0.5, 'numbers are close');
   *
   * @name approximately
   * @param {Number} actual
   * @param {Number} expected
   * @param {Number} delta
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.approximately = function (act, exp, delta, msg) {
    new Assertion(act, msg).to.be.approximately(exp, delta);
  };

  /**
   * ### .sameMembers(set1, set2, [message])
   *
   * Asserts that `set1` and `set2` have the same members.
   * Order is not taken into account.
   *
   *     assert.sameMembers([ 1, 2, 3 ], [ 2, 1, 3 ], 'same members');
   *
   * @name sameMembers
   * @param {Array} set1
   * @param {Array} set2
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.sameMembers = function (set1, set2, msg) {
    new Assertion(set1, msg).to.have.same.members(set2);
  }

  /**
   * ### .sameDeepMembers(set1, set2, [message])
   *
   * Asserts that `set1` and `set2` have the same members - using a deep equality checking.
   * Order is not taken into account.
   *
   *     assert.sameDeepMembers([ {b: 3}, {a: 2}, {c: 5} ], [ {c: 5}, {b: 3}, {a: 2} ], 'same deep members');
   *
   * @name sameDeepMembers
   * @param {Array} set1
   * @param {Array} set2
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.sameDeepMembers = function (set1, set2, msg) {
    new Assertion(set1, msg).to.have.same.deep.members(set2);
  }

  /**
   * ### .includeMembers(superset, subset, [message])
   *
   * Asserts that `subset` is included in `superset`.
   * Order is not taken into account.
   *
   *     assert.includeMembers([ 1, 2, 3 ], [ 2, 1 ], 'include members');
   *
   * @name includeMembers
   * @param {Array} superset
   * @param {Array} subset
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.includeMembers = function (superset, subset, msg) {
    new Assertion(superset, msg).to.include.members(subset);
  }

  /**
   * ### .includeDeepMembers(superset, subset, [message])
   *
   * Asserts that `subset` is included in `superset` - using deep equality checking.
   * Order is not taken into account.
   * Duplicates are ignored.
   *
   *     assert.includeDeepMembers([ {a: 1}, {b: 2}, {c: 3} ], [ {b: 2}, {a: 1}, {b: 2} ], 'include deep members');
   *
   * @name includeDeepMembers
   * @param {Array} superset
   * @param {Array} subset
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.includeDeepMembers = function (superset, subset, msg) {
    new Assertion(superset, msg).to.include.deep.members(subset);
  }

  /**
   * ### .oneOf(inList, list, [message])
   *
   * Asserts that non-object, non-array value `inList` appears in the flat array `list`.
   *
   *     assert.oneOf(1, [ 2, 1 ], 'Not found in list');
   *
   * @name oneOf
   * @param {*} inList
   * @param {Array<*>} list
   * @param {String} message
   * @namespace Assert
   * @api public
   */

  assert.oneOf = function (inList, list, msg) {
    new Assertion(inList, msg).to.be.oneOf(list);
  }

   /**
   * ### .changes(function, object, property)
   *
   * Asserts that a function changes the value of a property
   *
   *     var obj = { val: 10 };
   *     var fn = function() { obj.val = 22 };
   *     assert.changes(fn, obj, 'val');
   *
   * @name changes
   * @param {Function} modifier function
   * @param {Object} object
   * @param {String} property name
   * @param {String} message _optional_
   * @namespace Assert
   * @api public
   */

  assert.changes = function (fn, obj, prop) {
    new Assertion(fn).to.change(obj, prop);
  }

   /**
   * ### .doesNotChange(function, object, property)
   *
   * Asserts that a function does not changes the value of a property
   *
   *     var obj = { val: 10 };
   *     var fn = function() { console.log('foo'); };
   *     assert.doesNotChange(fn, obj, 'val');
   *
   * @name doesNotChange
   * @param {Function} modifier function
   * @param {Object} object
   * @param {String} property name
   * @param {String} message _optional_
   * @namespace Assert
   * @api public
   */

  assert.doesNotChange = function (fn, obj, prop) {
    new Assertion(fn).to.not.change(obj, prop);
  }

   /**
   * ### .increases(function, object, property)
   *
   * Asserts that a function increases an object property
   *
   *     var obj = { val: 10 };
   *     var fn = function() { obj.val = 13 };
   *     assert.increases(fn, obj, 'val');
   *
   * @name increases
   * @param {Function} modifier function
   * @param {Object} object
   * @param {String} property name
   * @param {String} message _optional_
   * @namespace Assert
   * @api public
   */

  assert.increases = function (fn, obj, prop) {
    new Assertion(fn).to.increase(obj, prop);
  }

   /**
   * ### .doesNotIncrease(function, object, property)
   *
   * Asserts that a function does not increase object property
   *
   *     var obj = { val: 10 };
   *     var fn = function() { obj.val = 8 };
   *     assert.doesNotIncrease(fn, obj, 'val');
   *
   * @name doesNotIncrease
   * @param {Function} modifier function
   * @param {Object} object
   * @param {String} property name
   * @param {String} message _optional_
   * @namespace Assert
   * @api public
   */

  assert.doesNotIncrease = function (fn, obj, prop) {
    new Assertion(fn).to.not.increase(obj, prop);
  }

   /**
   * ### .decreases(function, object, property)
   *
   * Asserts that a function decreases an object property
   *
   *     var obj = { val: 10 };
   *     var fn = function() { obj.val = 5 };
   *     assert.decreases(fn, obj, 'val');
   *
   * @name decreases
   * @param {Function} modifier function
   * @param {Object} object
   * @param {String} property name
   * @param {String} message _optional_
   * @namespace Assert
   * @api public
   */

  assert.decreases = function (fn, obj, prop) {
    new Assertion(fn).to.decrease(obj, prop);
  }

   /**
   * ### .doesNotDecrease(function, object, property)
   *
   * Asserts that a function does not decreases an object property
   *
   *     var obj = { val: 10 };
   *     var fn = function() { obj.val = 15 };
   *     assert.doesNotDecrease(fn, obj, 'val');
   *
   * @name doesNotDecrease
   * @param {Function} modifier function
   * @param {Object} object
   * @param {String} property name
   * @param {String} message _optional_
   * @namespace Assert
   * @api public
   */

  assert.doesNotDecrease = function (fn, obj, prop) {
    new Assertion(fn).to.not.decrease(obj, prop);
  }

  /*!
   * ### .ifError(object)
   *
   * Asserts if value is not a false value, and throws if it is a true value.
   * This is added to allow for chai to be a drop-in replacement for Node's
   * assert class.
   *
   *     var err = new Error('I am a custom error');
   *     assert.ifError(err); // Rethrows err!
   *
   * @name ifError
   * @param {Object} object
   * @namespace Assert
   * @api public
   */

  assert.ifError = function (val) {
    if (val) {
      throw(val);
    }
  };

  /**
   * ### .isExtensible(object)
   *
   * Asserts that `object` is extensible (can have new properties added to it).
   *
   *     assert.isExtensible({});
   *
   * @name isExtensible
   * @alias extensible
   * @param {Object} object
   * @param {String} message _optional_
   * @namespace Assert
   * @api public
   */

  assert.isExtensible = function (obj, msg) {
    new Assertion(obj, msg).to.be.extensible;
  };

  /**
   * ### .isNotExtensible(object)
   *
   * Asserts that `object` is _not_ extensible.
   *
   *     var nonExtensibleObject = Object.preventExtensions({});
   *     var sealedObject = Object.seal({});
   *     var frozenObject = Object.freese({});
   *
   *     assert.isNotExtensible(nonExtensibleObject);
   *     assert.isNotExtensible(sealedObject);
   *     assert.isNotExtensible(frozenObject);
   *
   * @name isNotExtensible
   * @alias notExtensible
   * @param {Object} object
   * @param {String} message _optional_
   * @namespace Assert
   * @api public
   */

  assert.isNotExtensible = function (obj, msg) {
    new Assertion(obj, msg).to.not.be.extensible;
  };

  /**
   * ### .isSealed(object)
   *
   * Asserts that `object` is sealed (cannot have new properties added to it
   * and its existing properties cannot be removed).
   *
   *     var sealedObject = Object.seal({});
   *     var frozenObject = Object.seal({});
   *
   *     assert.isSealed(sealedObject);
   *     assert.isSealed(frozenObject);
   *
   * @name isSealed
   * @alias sealed
   * @param {Object} object
   * @param {String} message _optional_
   * @namespace Assert
   * @api public
   */

  assert.isSealed = function (obj, msg) {
    new Assertion(obj, msg).to.be.sealed;
  };

  /**
   * ### .isNotSealed(object)
   *
   * Asserts that `object` is _not_ sealed.
   *
   *     assert.isNotSealed({});
   *
   * @name isNotSealed
   * @alias notSealed
   * @param {Object} object
   * @param {String} message _optional_
   * @namespace Assert
   * @api public
   */

  assert.isNotSealed = function (obj, msg) {
    new Assertion(obj, msg).to.not.be.sealed;
  };

  /**
   * ### .isFrozen(object)
   *
   * Asserts that `object` is frozen (cannot have new properties added to it
   * and its existing properties cannot be modified).
   *
   *     var frozenObject = Object.freeze({});
   *     assert.frozen(frozenObject);
   *
   * @name isFrozen
   * @alias frozen
   * @param {Object} object
   * @param {String} message _optional_
   * @namespace Assert
   * @api public
   */

  assert.isFrozen = function (obj, msg) {
    new Assertion(obj, msg).to.be.frozen;
  };

  /**
   * ### .isNotFrozen(object)
   *
   * Asserts that `object` is _not_ frozen.
   *
   *     assert.isNotFrozen({});
   *
   * @name isNotFrozen
   * @alias notFrozen
   * @param {Object} object
   * @param {String} message _optional_
   * @namespace Assert
   * @api public
   */

  assert.isNotFrozen = function (obj, msg) {
    new Assertion(obj, msg).to.not.be.frozen;
  };

  /*!
   * Aliases.
   */

  (function alias(name, as){
    assert[as] = assert[name];
    return alias;
  })
  ('isOk', 'ok')
  ('isNotOk', 'notOk')
  ('throws', 'throw')
  ('throws', 'Throw')
  ('isExtensible', 'extensible')
  ('isNotExtensible', 'notExtensible')
  ('isSealed', 'sealed')
  ('isNotSealed', 'notSealed')
  ('isFrozen', 'frozen')
  ('isNotFrozen', 'notFrozen');
};

},{}],48:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

module.exports = function (chai, util) {
  chai.expect = function (val, message) {
    return new chai.Assertion(val, message);
  };

  /**
   * ### .fail(actual, expected, [message], [operator])
   *
   * Throw a failure.
   *
   * @name fail
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @param {String} operator
   * @namespace Expect
   * @api public
   */

  chai.expect.fail = function (actual, expected, message, operator) {
    message = message || 'expect.fail()';
    throw new chai.AssertionError(message, {
        actual: actual
      , expected: expected
      , operator: operator
    }, chai.expect.fail);
  };
};

},{}],49:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

module.exports = function (chai, util) {
  var Assertion = chai.Assertion;

  function loadShould () {
    // explicitly define this method as function as to have it's name to include as `ssfi`
    function shouldGetter() {
      if (this instanceof String || this instanceof Number || this instanceof Boolean ) {
        return new Assertion(this.valueOf(), null, shouldGetter);
      }
      return new Assertion(this, null, shouldGetter);
    }
    function shouldSetter(value) {
      // See https://github.com/chaijs/chai/issues/86: this makes
      // `whatever.should = someValue` actually set `someValue`, which is
      // especially useful for `global.should = require('chai').should()`.
      //
      // Note that we have to use [[DefineProperty]] instead of [[Put]]
      // since otherwise we would trigger this very setter!
      Object.defineProperty(this, 'should', {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    // modify Object.prototype to have `should`
    Object.defineProperty(Object.prototype, 'should', {
      set: shouldSetter
      , get: shouldGetter
      , configurable: true
    });

    var should = {};

    /**
     * ### .fail(actual, expected, [message], [operator])
     *
     * Throw a failure.
     *
     * @name fail
     * @param {Mixed} actual
     * @param {Mixed} expected
     * @param {String} message
     * @param {String} operator
     * @namespace Should
     * @api public
     */

    should.fail = function (actual, expected, message, operator) {
      message = message || 'should.fail()';
      throw new chai.AssertionError(message, {
          actual: actual
        , expected: expected
        , operator: operator
      }, should.fail);
    };

    /**
     * ### .equal(actual, expected, [message])
     *
     * Asserts non-strict equality (`==`) of `actual` and `expected`.
     *
     *     should.equal(3, '3', '== coerces values to strings');
     *
     * @name equal
     * @param {Mixed} actual
     * @param {Mixed} expected
     * @param {String} message
     * @namespace Should
     * @api public
     */

    should.equal = function (val1, val2, msg) {
      new Assertion(val1, msg).to.equal(val2);
    };

    /**
     * ### .throw(function, [constructor/string/regexp], [string/regexp], [message])
     *
     * Asserts that `function` will throw an error that is an instance of
     * `constructor`, or alternately that it will throw an error with message
     * matching `regexp`.
     *
     *     should.throw(fn, 'function throws a reference error');
     *     should.throw(fn, /function throws a reference error/);
     *     should.throw(fn, ReferenceError);
     *     should.throw(fn, ReferenceError, 'function throws a reference error');
     *     should.throw(fn, ReferenceError, /function throws a reference error/);
     *
     * @name throw
     * @alias Throw
     * @param {Function} function
     * @param {ErrorConstructor} constructor
     * @param {RegExp} regexp
     * @param {String} message
     * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
     * @namespace Should
     * @api public
     */

    should.Throw = function (fn, errt, errs, msg) {
      new Assertion(fn, msg).to.Throw(errt, errs);
    };

    /**
     * ### .exist
     *
     * Asserts that the target is neither `null` nor `undefined`.
     *
     *     var foo = 'hi';
     *
     *     should.exist(foo, 'foo exists');
     *
     * @name exist
     * @namespace Should
     * @api public
     */

    should.exist = function (val, msg) {
      new Assertion(val, msg).to.exist;
    }

    // negation
    should.not = {}

    /**
     * ### .not.equal(actual, expected, [message])
     *
     * Asserts non-strict inequality (`!=`) of `actual` and `expected`.
     *
     *     should.not.equal(3, 4, 'these numbers are not equal');
     *
     * @name not.equal
     * @param {Mixed} actual
     * @param {Mixed} expected
     * @param {String} message
     * @namespace Should
     * @api public
     */

    should.not.equal = function (val1, val2, msg) {
      new Assertion(val1, msg).to.not.equal(val2);
    };

    /**
     * ### .throw(function, [constructor/regexp], [message])
     *
     * Asserts that `function` will _not_ throw an error that is an instance of
     * `constructor`, or alternately that it will not throw an error with message
     * matching `regexp`.
     *
     *     should.not.throw(fn, Error, 'function does not throw');
     *
     * @name not.throw
     * @alias not.Throw
     * @param {Function} function
     * @param {ErrorConstructor} constructor
     * @param {RegExp} regexp
     * @param {String} message
     * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
     * @namespace Should
     * @api public
     */

    should.not.Throw = function (fn, errt, errs, msg) {
      new Assertion(fn, msg).to.not.Throw(errt, errs);
    };

    /**
     * ### .not.exist
     *
     * Asserts that the target is neither `null` nor `undefined`.
     *
     *     var bar = null;
     *
     *     should.not.exist(bar, 'bar does not exist');
     *
     * @name not.exist
     * @namespace Should
     * @api public
     */

    should.not.exist = function (val, msg) {
      new Assertion(val, msg).to.not.exist;
    }

    should['throw'] = should['Throw'];
    should.not['throw'] = should.not['Throw'];

    return should;
  };

  chai.should = loadShould;
  chai.Should = loadShould;
};

},{}],50:[function(require,module,exports){
/*!
 * Chai - addChainingMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependencies
 */

var transferFlags = require('./transferFlags');
var flag = require('./flag');
var config = require('../config');

/*!
 * Module variables
 */

// Check whether `__proto__` is supported
var hasProtoSupport = '__proto__' in Object;

// Without `__proto__` support, this module will need to add properties to a function.
// However, some Function.prototype methods cannot be overwritten,
// and there seems no easy cross-platform way to detect them (@see chaijs/chai/issues/69).
var excludeNames = /^(?:length|name|arguments|caller)$/;

// Cache `Function` properties
var call  = Function.prototype.call,
    apply = Function.prototype.apply;

/**
 * ### addChainableMethod (ctx, name, method, chainingBehavior)
 *
 * Adds a method to an object, such that the method can also be chained.
 *
 *     utils.addChainableMethod(chai.Assertion.prototype, 'foo', function (str) {
 *       var obj = utils.flag(this, 'object');
 *       new chai.Assertion(obj).to.be.equal(str);
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.addChainableMethod('foo', fn, chainingBehavior);
 *
 * The result can then be used as both a method assertion, executing both `method` and
 * `chainingBehavior`, or as a language chain, which only executes `chainingBehavior`.
 *
 *     expect(fooStr).to.be.foo('bar');
 *     expect(fooStr).to.be.foo.equal('foo');
 *
 * @param {Object} ctx object to which the method is added
 * @param {String} name of method to add
 * @param {Function} method function to be used for `name`, when called
 * @param {Function} chainingBehavior function to be called every time the property is accessed
 * @namespace Utils
 * @name addChainableMethod
 * @api public
 */

module.exports = function (ctx, name, method, chainingBehavior) {
  if (typeof chainingBehavior !== 'function') {
    chainingBehavior = function () { };
  }

  var chainableBehavior = {
      method: method
    , chainingBehavior: chainingBehavior
  };

  // save the methods so we can overwrite them later, if we need to.
  if (!ctx.__methods) {
    ctx.__methods = {};
  }
  ctx.__methods[name] = chainableBehavior;

  Object.defineProperty(ctx, name,
    { get: function () {
        chainableBehavior.chainingBehavior.call(this);

        var assert = function assert() {
          var old_ssfi = flag(this, 'ssfi');
          if (old_ssfi && config.includeStack === false)
            flag(this, 'ssfi', assert);
          var result = chainableBehavior.method.apply(this, arguments);
          return result === undefined ? this : result;
        };

        // Use `__proto__` if available
        if (hasProtoSupport) {
          // Inherit all properties from the object by replacing the `Function` prototype
          var prototype = assert.__proto__ = Object.create(this);
          // Restore the `call` and `apply` methods from `Function`
          prototype.call = call;
          prototype.apply = apply;
        }
        // Otherwise, redefine all properties (slow!)
        else {
          var asserterNames = Object.getOwnPropertyNames(ctx);
          asserterNames.forEach(function (asserterName) {
            if (!excludeNames.test(asserterName)) {
              var pd = Object.getOwnPropertyDescriptor(ctx, asserterName);
              Object.defineProperty(assert, asserterName, pd);
            }
          });
        }

        transferFlags(this, assert);
        return assert;
      }
    , configurable: true
  });
};

},{"../config":45,"./flag":54,"./transferFlags":70}],51:[function(require,module,exports){
/*!
 * Chai - addMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

var config = require('../config');

/**
 * ### .addMethod (ctx, name, method)
 *
 * Adds a method to the prototype of an object.
 *
 *     utils.addMethod(chai.Assertion.prototype, 'foo', function (str) {
 *       var obj = utils.flag(this, 'object');
 *       new chai.Assertion(obj).to.be.equal(str);
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.addMethod('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(fooStr).to.be.foo('bar');
 *
 * @param {Object} ctx object to which the method is added
 * @param {String} name of method to add
 * @param {Function} method function to be used for name
 * @namespace Utils
 * @name addMethod
 * @api public
 */
var flag = require('./flag');

module.exports = function (ctx, name, method) {
  ctx[name] = function () {
    var old_ssfi = flag(this, 'ssfi');
    if (old_ssfi && config.includeStack === false)
      flag(this, 'ssfi', ctx[name]);
    var result = method.apply(this, arguments);
    return result === undefined ? this : result;
  };
};

},{"../config":45,"./flag":54}],52:[function(require,module,exports){
/*!
 * Chai - addProperty utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

var config = require('../config');
var flag = require('./flag');

/**
 * ### addProperty (ctx, name, getter)
 *
 * Adds a property to the prototype of an object.
 *
 *     utils.addProperty(chai.Assertion.prototype, 'foo', function () {
 *       var obj = utils.flag(this, 'object');
 *       new chai.Assertion(obj).to.be.instanceof(Foo);
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.addProperty('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.be.foo;
 *
 * @param {Object} ctx object to which the property is added
 * @param {String} name of property to add
 * @param {Function} getter function to be used for name
 * @namespace Utils
 * @name addProperty
 * @api public
 */

module.exports = function (ctx, name, getter) {
  Object.defineProperty(ctx, name,
    { get: function addProperty() {
        var old_ssfi = flag(this, 'ssfi');
        if (old_ssfi && config.includeStack === false)
          flag(this, 'ssfi', addProperty);

        var result = getter.call(this);
        return result === undefined ? this : result;
      }
    , configurable: true
  });
};

},{"../config":45,"./flag":54}],53:[function(require,module,exports){
/*!
 * Chai - expectTypes utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### expectTypes(obj, types)
 *
 * Ensures that the object being tested against is of a valid type.
 *
 *     utils.expectTypes(this, ['array', 'object', 'string']);
 *
 * @param {Mixed} obj constructed Assertion
 * @param {Array} type A list of allowed types for this assertion
 * @namespace Utils
 * @name expectTypes
 * @api public
 */

var AssertionError = require('assertion-error');
var flag = require('./flag');
var type = require('type-detect');

module.exports = function (obj, types) {
  var obj = flag(obj, 'object');
  types = types.map(function (t) { return t.toLowerCase(); });
  types.sort();

  // Transforms ['lorem', 'ipsum'] into 'a lirum, or an ipsum'
  var str = types.map(function (t, index) {
    var art = ~[ 'a', 'e', 'i', 'o', 'u' ].indexOf(t.charAt(0)) ? 'an' : 'a';
    var or = types.length > 1 && index === types.length - 1 ? 'or ' : '';
    return or + art + ' ' + t;
  }).join(', ');

  if (!types.some(function (expected) { return type(obj) === expected; })) {
    throw new AssertionError(
      'object tested must be ' + str + ', but ' + type(obj) + ' given'
    );
  }
};

},{"./flag":54,"assertion-error":39,"type-detect":186}],54:[function(require,module,exports){
/*!
 * Chai - flag utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### flag(object, key, [value])
 *
 * Get or set a flag value on an object. If a
 * value is provided it will be set, else it will
 * return the currently set value or `undefined` if
 * the value is not set.
 *
 *     utils.flag(this, 'foo', 'bar'); // setter
 *     utils.flag(this, 'foo'); // getter, returns `bar`
 *
 * @param {Object} object constructed Assertion
 * @param {String} key
 * @param {Mixed} value (optional)
 * @namespace Utils
 * @name flag
 * @api private
 */

module.exports = function (obj, key, value) {
  var flags = obj.__flags || (obj.__flags = Object.create(null));
  if (arguments.length === 3) {
    flags[key] = value;
  } else {
    return flags[key];
  }
};

},{}],55:[function(require,module,exports){
/*!
 * Chai - getActual utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * # getActual(object, [actual])
 *
 * Returns the `actual` value for an Assertion
 *
 * @param {Object} object (constructed Assertion)
 * @param {Arguments} chai.Assertion.prototype.assert arguments
 * @namespace Utils
 * @name getActual
 */

module.exports = function (obj, args) {
  return args.length > 4 ? args[4] : obj._obj;
};

},{}],56:[function(require,module,exports){
/*!
 * Chai - getEnumerableProperties utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### .getEnumerableProperties(object)
 *
 * This allows the retrieval of enumerable property names of an object,
 * inherited or not.
 *
 * @param {Object} object
 * @returns {Array}
 * @namespace Utils
 * @name getEnumerableProperties
 * @api public
 */

module.exports = function getEnumerableProperties(object) {
  var result = [];
  for (var name in object) {
    result.push(name);
  }
  return result;
};

},{}],57:[function(require,module,exports){
/*!
 * Chai - message composition utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependancies
 */

var flag = require('./flag')
  , getActual = require('./getActual')
  , inspect = require('./inspect')
  , objDisplay = require('./objDisplay');

/**
 * ### .getMessage(object, message, negateMessage)
 *
 * Construct the error message based on flags
 * and template tags. Template tags will return
 * a stringified inspection of the object referenced.
 *
 * Message template tags:
 * - `#{this}` current asserted object
 * - `#{act}` actual value
 * - `#{exp}` expected value
 *
 * @param {Object} object (constructed Assertion)
 * @param {Arguments} chai.Assertion.prototype.assert arguments
 * @namespace Utils
 * @name getMessage
 * @api public
 */

module.exports = function (obj, args) {
  var negate = flag(obj, 'negate')
    , val = flag(obj, 'object')
    , expected = args[3]
    , actual = getActual(obj, args)
    , msg = negate ? args[2] : args[1]
    , flagMsg = flag(obj, 'message');

  if(typeof msg === "function") msg = msg();
  msg = msg || '';
  msg = msg
    .replace(/#\{this\}/g, function () { return objDisplay(val); })
    .replace(/#\{act\}/g, function () { return objDisplay(actual); })
    .replace(/#\{exp\}/g, function () { return objDisplay(expected); });

  return flagMsg ? flagMsg + ': ' + msg : msg;
};

},{"./flag":54,"./getActual":55,"./inspect":64,"./objDisplay":65}],58:[function(require,module,exports){
/*!
 * Chai - getName utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * # getName(func)
 *
 * Gets the name of a function, in a cross-browser way.
 *
 * @param {Function} a function (usually a constructor)
 * @namespace Utils
 * @name getName
 */

module.exports = function (func) {
  if (func.name) return func.name;

  var match = /^\s?function ([^(]*)\(/.exec(func);
  return match && match[1] ? match[1] : "";
};

},{}],59:[function(require,module,exports){
/*!
 * Chai - getPathInfo utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

var hasProperty = require('./hasProperty');

/**
 * ### .getPathInfo(path, object)
 *
 * This allows the retrieval of property info in an
 * object given a string path.
 *
 * The path info consists of an object with the
 * following properties:
 *
 * * parent - The parent object of the property referenced by `path`
 * * name - The name of the final property, a number if it was an array indexer
 * * value - The value of the property, if it exists, otherwise `undefined`
 * * exists - Whether the property exists or not
 *
 * @param {String} path
 * @param {Object} object
 * @returns {Object} info
 * @namespace Utils
 * @name getPathInfo
 * @api public
 */

module.exports = function getPathInfo(path, obj) {
  var parsed = parsePath(path),
      last = parsed[parsed.length - 1];

  var info = {
    parent: parsed.length > 1 ? _getPathValue(parsed, obj, parsed.length - 1) : obj,
    name: last.p || last.i,
    value: _getPathValue(parsed, obj)
  };
  info.exists = hasProperty(info.name, info.parent);

  return info;
};


/*!
 * ## parsePath(path)
 *
 * Helper function used to parse string object
 * paths. Use in conjunction with `_getPathValue`.
 *
 *      var parsed = parsePath('myobject.property.subprop');
 *
 * ### Paths:
 *
 * * Can be as near infinitely deep and nested
 * * Arrays are also valid using the formal `myobject.document[3].property`.
 * * Literal dots and brackets (not delimiter) must be backslash-escaped.
 *
 * @param {String} path
 * @returns {Object} parsed
 * @api private
 */

function parsePath (path) {
  var str = path.replace(/([^\\])\[/g, '$1.[')
    , parts = str.match(/(\\\.|[^.]+?)+/g);
  return parts.map(function (value) {
    var re = /^\[(\d+)\]$/
      , mArr = re.exec(value);
    if (mArr) return { i: parseFloat(mArr[1]) };
    else return { p: value.replace(/\\([.\[\]])/g, '$1') };
  });
}


/*!
 * ## _getPathValue(parsed, obj)
 *
 * Helper companion function for `.parsePath` that returns
 * the value located at the parsed address.
 *
 *      var value = getPathValue(parsed, obj);
 *
 * @param {Object} parsed definition from `parsePath`.
 * @param {Object} object to search against
 * @param {Number} object to search against
 * @returns {Object|Undefined} value
 * @api private
 */

function _getPathValue (parsed, obj, index) {
  var tmp = obj
    , res;

  index = (index === undefined ? parsed.length : index);

  for (var i = 0, l = index; i < l; i++) {
    var part = parsed[i];
    if (tmp) {
      if ('undefined' !== typeof part.p)
        tmp = tmp[part.p];
      else if ('undefined' !== typeof part.i)
        tmp = tmp[part.i];
      if (i == (l - 1)) res = tmp;
    } else {
      res = undefined;
    }
  }
  return res;
}

},{"./hasProperty":62}],60:[function(require,module,exports){
/*!
 * Chai - getPathValue utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * @see https://github.com/logicalparadox/filtr
 * MIT Licensed
 */

var getPathInfo = require('./getPathInfo');

/**
 * ### .getPathValue(path, object)
 *
 * This allows the retrieval of values in an
 * object given a string path.
 *
 *     var obj = {
 *         prop1: {
 *             arr: ['a', 'b', 'c']
 *           , str: 'Hello'
 *         }
 *       , prop2: {
 *             arr: [ { nested: 'Universe' } ]
 *           , str: 'Hello again!'
 *         }
 *     }
 *
 * The following would be the results.
 *
 *     getPathValue('prop1.str', obj); // Hello
 *     getPathValue('prop1.att[2]', obj); // b
 *     getPathValue('prop2.arr[0].nested', obj); // Universe
 *
 * @param {String} path
 * @param {Object} object
 * @returns {Object} value or `undefined`
 * @namespace Utils
 * @name getPathValue
 * @api public
 */
module.exports = function(path, obj) {
  var info = getPathInfo(path, obj);
  return info.value;
};

},{"./getPathInfo":59}],61:[function(require,module,exports){
/*!
 * Chai - getProperties utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### .getProperties(object)
 *
 * This allows the retrieval of property names of an object, enumerable or not,
 * inherited or not.
 *
 * @param {Object} object
 * @returns {Array}
 * @namespace Utils
 * @name getProperties
 * @api public
 */

module.exports = function getProperties(object) {
  var result = Object.getOwnPropertyNames(object);

  function addProperty(property) {
    if (result.indexOf(property) === -1) {
      result.push(property);
    }
  }

  var proto = Object.getPrototypeOf(object);
  while (proto !== null) {
    Object.getOwnPropertyNames(proto).forEach(addProperty);
    proto = Object.getPrototypeOf(proto);
  }

  return result;
};

},{}],62:[function(require,module,exports){
/*!
 * Chai - hasProperty utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

var type = require('type-detect');

/**
 * ### .hasProperty(object, name)
 *
 * This allows checking whether an object has
 * named property or numeric array index.
 *
 * Basically does the same thing as the `in`
 * operator but works properly with natives
 * and null/undefined values.
 *
 *     var obj = {
 *         arr: ['a', 'b', 'c']
 *       , str: 'Hello'
 *     }
 *
 * The following would be the results.
 *
 *     hasProperty('str', obj);  // true
 *     hasProperty('constructor', obj);  // true
 *     hasProperty('bar', obj);  // false
 *
 *     hasProperty('length', obj.str); // true
 *     hasProperty(1, obj.str);  // true
 *     hasProperty(5, obj.str);  // false
 *
 *     hasProperty('length', obj.arr);  // true
 *     hasProperty(2, obj.arr);  // true
 *     hasProperty(3, obj.arr);  // false
 *
 * @param {Objuect} object
 * @param {String|Number} name
 * @returns {Boolean} whether it exists
 * @namespace Utils
 * @name getPathInfo
 * @api public
 */

var literals = {
    'number': Number
  , 'string': String
};

module.exports = function hasProperty(name, obj) {
  var ot = type(obj);

  // Bad Object, obviously no props at all
  if(ot === 'null' || ot === 'undefined')
    return false;

  // The `in` operator does not work with certain literals
  // box these before the check
  if(literals[ot] && typeof obj !== 'object')
    obj = new literals[ot](obj);

  return name in obj;
};

},{"type-detect":186}],63:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Main exports
 */

var exports = module.exports = {};

/*!
 * test utility
 */

exports.test = require('./test');

/*!
 * type utility
 */

exports.type = require('type-detect');

/*!
 * expectTypes utility
 */
exports.expectTypes = require('./expectTypes');

/*!
 * message utility
 */

exports.getMessage = require('./getMessage');

/*!
 * actual utility
 */

exports.getActual = require('./getActual');

/*!
 * Inspect util
 */

exports.inspect = require('./inspect');

/*!
 * Object Display util
 */

exports.objDisplay = require('./objDisplay');

/*!
 * Flag utility
 */

exports.flag = require('./flag');

/*!
 * Flag transferring utility
 */

exports.transferFlags = require('./transferFlags');

/*!
 * Deep equal utility
 */

exports.eql = require('deep-eql');

/*!
 * Deep path value
 */

exports.getPathValue = require('./getPathValue');

/*!
 * Deep path info
 */

exports.getPathInfo = require('./getPathInfo');

/*!
 * Check if a property exists
 */

exports.hasProperty = require('./hasProperty');

/*!
 * Function name
 */

exports.getName = require('./getName');

/*!
 * add Property
 */

exports.addProperty = require('./addProperty');

/*!
 * add Method
 */

exports.addMethod = require('./addMethod');

/*!
 * overwrite Property
 */

exports.overwriteProperty = require('./overwriteProperty');

/*!
 * overwrite Method
 */

exports.overwriteMethod = require('./overwriteMethod');

/*!
 * Add a chainable method
 */

exports.addChainableMethod = require('./addChainableMethod');

/*!
 * Overwrite chainable method
 */

exports.overwriteChainableMethod = require('./overwriteChainableMethod');

},{"./addChainableMethod":50,"./addMethod":51,"./addProperty":52,"./expectTypes":53,"./flag":54,"./getActual":55,"./getMessage":57,"./getName":58,"./getPathInfo":59,"./getPathValue":60,"./hasProperty":62,"./inspect":64,"./objDisplay":65,"./overwriteChainableMethod":66,"./overwriteMethod":67,"./overwriteProperty":68,"./test":69,"./transferFlags":70,"deep-eql":73,"type-detect":186}],64:[function(require,module,exports){
// This is (almost) directly from Node.js utils
// https://github.com/joyent/node/blob/f8c335d0caf47f16d31413f89aa28eda3878e3aa/lib/util.js

var getName = require('./getName');
var getProperties = require('./getProperties');
var getEnumerableProperties = require('./getEnumerableProperties');

module.exports = inspect;

/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Boolean} showHidden Flag that shows hidden (not enumerable)
 *    properties of objects.
 * @param {Number} depth Depth in which to descend in object. Default is 2.
 * @param {Boolean} colors Flag to turn on ANSI escape codes to color the
 *    output. Default is false (no coloring).
 * @namespace Utils
 * @name inspect
 */
function inspect(obj, showHidden, depth, colors) {
  var ctx = {
    showHidden: showHidden,
    seen: [],
    stylize: function (str) { return str; }
  };
  return formatValue(ctx, obj, (typeof depth === 'undefined' ? 2 : depth));
}

// Returns true if object is a DOM element.
var isDOMElement = function (object) {
  if (typeof HTMLElement === 'object') {
    return object instanceof HTMLElement;
  } else {
    return object &&
      typeof object === 'object' &&
      object.nodeType === 1 &&
      typeof object.nodeName === 'string';
  }
};

function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (value && typeof value.inspect === 'function' &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes);
    if (typeof ret !== 'string') {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // If this is a DOM element, try to get the outer HTML.
  if (isDOMElement(value)) {
    if ('outerHTML' in value) {
      return value.outerHTML;
      // This value does not have an outerHTML attribute,
      //   it could still be an XML element
    } else {
      // Attempt to serialize it
      try {
        if (document.xmlVersion) {
          var xmlSerializer = new XMLSerializer();
          return xmlSerializer.serializeToString(value);
        } else {
          // Firefox 11- do not support outerHTML
          //   It does, however, support innerHTML
          //   Use the following to render the element
          var ns = "http://www.w3.org/1999/xhtml";
          var container = document.createElementNS(ns, '_');

          container.appendChild(value.cloneNode(false));
          html = container.innerHTML
            .replace('><', '>' + value.innerHTML + '<');
          container.innerHTML = '';
          return html;
        }
      } catch (err) {
        // This could be a non-native DOM implementation,
        //   continue with the normal flow:
        //   printing the element as if it is an object.
      }
    }
  }

  // Look up the keys of the object.
  var visibleKeys = getEnumerableProperties(value);
  var keys = ctx.showHidden ? getProperties(value) : visibleKeys;

  // Some type of object without properties can be shortcutted.
  // In IE, errors have a single `stack` property, or if they are vanilla `Error`,
  // a `stack` plus `description` property; ignore those for consistency.
  if (keys.length === 0 || (isError(value) && (
      (keys.length === 1 && keys[0] === 'stack') ||
      (keys.length === 2 && keys[0] === 'description' && keys[1] === 'stack')
     ))) {
    if (typeof value === 'function') {
      var name = getName(value);
      var nameSuffix = name ? ': ' + name : '';
      return ctx.stylize('[Function' + nameSuffix + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toUTCString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (typeof value === 'function') {
    var name = getName(value);
    var nameSuffix = name ? ': ' + name : '';
    base = ' [Function' + nameSuffix + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    return formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  switch (typeof value) {
    case 'undefined':
      return ctx.stylize('undefined', 'undefined');

    case 'string':
      var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                               .replace(/'/g, "\\'")
                                               .replace(/\\"/g, '"') + '\'';
      return ctx.stylize(simple, 'string');

    case 'number':
      if (value === 0 && (1/value) === -Infinity) {
        return ctx.stylize('-0', 'number');
      }
      return ctx.stylize('' + value, 'number');

    case 'boolean':
      return ctx.stylize('' + value, 'boolean');
  }
  // For some reason typeof null is "object", so special case here.
  if (value === null) {
    return ctx.stylize('null', 'null');
  }
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (Object.prototype.hasOwnProperty.call(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str;
  if (value.__lookupGetter__) {
    if (value.__lookupGetter__(key)) {
      if (value.__lookupSetter__(key)) {
        str = ctx.stylize('[Getter/Setter]', 'special');
      } else {
        str = ctx.stylize('[Getter]', 'special');
      }
    } else {
      if (value.__lookupSetter__(key)) {
        str = ctx.stylize('[Setter]', 'special');
      }
    }
  }
  if (visibleKeys.indexOf(key) < 0) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(value[key]) < 0) {
      if (recurseTimes === null) {
        str = formatValue(ctx, value[key], null);
      } else {
        str = formatValue(ctx, value[key], recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (typeof name === 'undefined') {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}

function isArray(ar) {
  return Array.isArray(ar) ||
         (typeof ar === 'object' && objectToString(ar) === '[object Array]');
}

function isRegExp(re) {
  return typeof re === 'object' && objectToString(re) === '[object RegExp]';
}

function isDate(d) {
  return typeof d === 'object' && objectToString(d) === '[object Date]';
}

function isError(e) {
  return typeof e === 'object' && objectToString(e) === '[object Error]';
}

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

},{"./getEnumerableProperties":56,"./getName":58,"./getProperties":61}],65:[function(require,module,exports){
/*!
 * Chai - flag utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependancies
 */

var inspect = require('./inspect');
var config = require('../config');

/**
 * ### .objDisplay (object)
 *
 * Determines if an object or an array matches
 * criteria to be inspected in-line for error
 * messages or should be truncated.
 *
 * @param {Mixed} javascript object to inspect
 * @name objDisplay
 * @namespace Utils
 * @api public
 */

module.exports = function (obj) {
  var str = inspect(obj)
    , type = Object.prototype.toString.call(obj);

  if (config.truncateThreshold && str.length >= config.truncateThreshold) {
    if (type === '[object Function]') {
      return !obj.name || obj.name === ''
        ? '[Function]'
        : '[Function: ' + obj.name + ']';
    } else if (type === '[object Array]') {
      return '[ Array(' + obj.length + ') ]';
    } else if (type === '[object Object]') {
      var keys = Object.keys(obj)
        , kstr = keys.length > 2
          ? keys.splice(0, 2).join(', ') + ', ...'
          : keys.join(', ');
      return '{ Object (' + kstr + ') }';
    } else {
      return str;
    }
  } else {
    return str;
  }
};

},{"../config":45,"./inspect":64}],66:[function(require,module,exports){
/*!
 * Chai - overwriteChainableMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### overwriteChainableMethod (ctx, name, method, chainingBehavior)
 *
 * Overwites an already existing chainable method
 * and provides access to the previous function or
 * property.  Must return functions to be used for
 * name.
 *
 *     utils.overwriteChainableMethod(chai.Assertion.prototype, 'length',
 *       function (_super) {
 *       }
 *     , function (_super) {
 *       }
 *     );
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.overwriteChainableMethod('foo', fn, fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.have.length(3);
 *     expect(myFoo).to.have.length.above(3);
 *
 * @param {Object} ctx object whose method / property is to be overwritten
 * @param {String} name of method / property to overwrite
 * @param {Function} method function that returns a function to be used for name
 * @param {Function} chainingBehavior function that returns a function to be used for property
 * @namespace Utils
 * @name overwriteChainableMethod
 * @api public
 */

module.exports = function (ctx, name, method, chainingBehavior) {
  var chainableBehavior = ctx.__methods[name];

  var _chainingBehavior = chainableBehavior.chainingBehavior;
  chainableBehavior.chainingBehavior = function () {
    var result = chainingBehavior(_chainingBehavior).call(this);
    return result === undefined ? this : result;
  };

  var _method = chainableBehavior.method;
  chainableBehavior.method = function () {
    var result = method(_method).apply(this, arguments);
    return result === undefined ? this : result;
  };
};

},{}],67:[function(require,module,exports){
/*!
 * Chai - overwriteMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### overwriteMethod (ctx, name, fn)
 *
 * Overwites an already existing method and provides
 * access to previous function. Must return function
 * to be used for name.
 *
 *     utils.overwriteMethod(chai.Assertion.prototype, 'equal', function (_super) {
 *       return function (str) {
 *         var obj = utils.flag(this, 'object');
 *         if (obj instanceof Foo) {
 *           new chai.Assertion(obj.value).to.equal(str);
 *         } else {
 *           _super.apply(this, arguments);
 *         }
 *       }
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.overwriteMethod('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.equal('bar');
 *
 * @param {Object} ctx object whose method is to be overwritten
 * @param {String} name of method to overwrite
 * @param {Function} method function that returns a function to be used for name
 * @namespace Utils
 * @name overwriteMethod
 * @api public
 */

module.exports = function (ctx, name, method) {
  var _method = ctx[name]
    , _super = function () { return this; };

  if (_method && 'function' === typeof _method)
    _super = _method;

  ctx[name] = function () {
    var result = method(_super).apply(this, arguments);
    return result === undefined ? this : result;
  }
};

},{}],68:[function(require,module,exports){
/*!
 * Chai - overwriteProperty utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### overwriteProperty (ctx, name, fn)
 *
 * Overwites an already existing property getter and provides
 * access to previous value. Must return function to use as getter.
 *
 *     utils.overwriteProperty(chai.Assertion.prototype, 'ok', function (_super) {
 *       return function () {
 *         var obj = utils.flag(this, 'object');
 *         if (obj instanceof Foo) {
 *           new chai.Assertion(obj.name).to.equal('bar');
 *         } else {
 *           _super.call(this);
 *         }
 *       }
 *     });
 *
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.overwriteProperty('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.be.ok;
 *
 * @param {Object} ctx object whose property is to be overwritten
 * @param {String} name of property to overwrite
 * @param {Function} getter function that returns a getter function to be used for name
 * @namespace Utils
 * @name overwriteProperty
 * @api public
 */

module.exports = function (ctx, name, getter) {
  var _get = Object.getOwnPropertyDescriptor(ctx, name)
    , _super = function () {};

  if (_get && 'function' === typeof _get.get)
    _super = _get.get

  Object.defineProperty(ctx, name,
    { get: function () {
        var result = getter(_super).call(this);
        return result === undefined ? this : result;
      }
    , configurable: true
  });
};

},{}],69:[function(require,module,exports){
/*!
 * Chai - test utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependancies
 */

var flag = require('./flag');

/**
 * # test(object, expression)
 *
 * Test and object for expression.
 *
 * @param {Object} object (constructed Assertion)
 * @param {Arguments} chai.Assertion.prototype.assert arguments
 * @namespace Utils
 * @name test
 */

module.exports = function (obj, args) {
  var negate = flag(obj, 'negate')
    , expr = args[0];
  return negate ? !expr : expr;
};

},{"./flag":54}],70:[function(require,module,exports){
/*!
 * Chai - transferFlags utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### transferFlags(assertion, object, includeAll = true)
 *
 * Transfer all the flags for `assertion` to `object`. If
 * `includeAll` is set to `false`, then the base Chai
 * assertion flags (namely `object`, `ssfi`, and `message`)
 * will not be transferred.
 *
 *
 *     var newAssertion = new Assertion();
 *     utils.transferFlags(assertion, newAssertion);
 *
 *     var anotherAsseriton = new Assertion(myObj);
 *     utils.transferFlags(assertion, anotherAssertion, false);
 *
 * @param {Assertion} assertion the assertion to transfer the flags from
 * @param {Object} object the object to transfer the flags to; usually a new assertion
 * @param {Boolean} includeAll
 * @namespace Utils
 * @name transferFlags
 * @api private
 */

module.exports = function (assertion, object, includeAll) {
  var flags = assertion.__flags || (assertion.__flags = Object.create(null));

  if (!object.__flags) {
    object.__flags = Object.create(null);
  }

  includeAll = arguments.length === 3 ? includeAll : true;

  for (var flag in flags) {
    if (includeAll ||
        (flag !== 'object' && flag !== 'ssfi' && flag != 'message')) {
      object.__flags[flag] = flags[flag];
    }
  }
};

},{}],71:[function(require,module,exports){
(function (Buffer){
var clone = (function() {
'use strict';

function _instanceof(obj, type) {
  return type != null && obj instanceof type;
}

var nativeMap;
try {
  nativeMap = Map;
} catch(_) {
  // maybe a reference error because no `Map`. Give it a dummy value that no
  // value will ever be an instanceof.
  nativeMap = function() {};
}

var nativeSet;
try {
  nativeSet = Set;
} catch(_) {
  nativeSet = function() {};
}

var nativePromise;
try {
  nativePromise = Promise;
} catch(_) {
  nativePromise = function() {};
}

/**
 * Clones (copies) an Object using deep copying.
 *
 * This function supports circular references by default, but if you are certain
 * there are no circular references in your object, you can save some CPU time
 * by calling clone(obj, false).
 *
 * Caution: if `circular` is false and `parent` contains circular references,
 * your program may enter an infinite loop and crash.
 *
 * @param `parent` - the object to be cloned
 * @param `circular` - set to true if the object to be cloned may contain
 *    circular references. (optional - true by default)
 * @param `depth` - set to a number if the object is only to be cloned to
 *    a particular depth. (optional - defaults to Infinity)
 * @param `prototype` - sets the prototype to be used when cloning an object.
 *    (optional - defaults to parent prototype).
 * @param `includeNonEnumerable` - set to true if the non-enumerable properties
 *    should be cloned as well. Non-enumerable properties on the prototype
 *    chain will be ignored. (optional - false by default)
*/
function clone(parent, circular, depth, prototype, includeNonEnumerable) {
  if (typeof circular === 'object') {
    depth = circular.depth;
    prototype = circular.prototype;
    includeNonEnumerable = circular.includeNonEnumerable;
    circular = circular.circular;
  }
  // maintain two arrays for circular references, where corresponding parents
  // and children have the same index
  var allParents = [];
  var allChildren = [];

  var useBuffer = typeof Buffer != 'undefined';

  if (typeof circular == 'undefined')
    circular = true;

  if (typeof depth == 'undefined')
    depth = Infinity;

  // recurse this function so we don't reset allParents and allChildren
  function _clone(parent, depth) {
    // cloning null always returns null
    if (parent === null)
      return null;

    if (depth === 0)
      return parent;

    var child;
    var proto;
    if (typeof parent != 'object') {
      return parent;
    }

    if (_instanceof(parent, nativeMap)) {
      child = new nativeMap();
    } else if (_instanceof(parent, nativeSet)) {
      child = new nativeSet();
    } else if (_instanceof(parent, nativePromise)) {
      child = new nativePromise(function (resolve, reject) {
        parent.then(function(value) {
          resolve(_clone(value, depth - 1));
        }, function(err) {
          reject(_clone(err, depth - 1));
        });
      });
    } else if (clone.__isArray(parent)) {
      child = [];
    } else if (clone.__isRegExp(parent)) {
      child = new RegExp(parent.source, __getRegExpFlags(parent));
      if (parent.lastIndex) child.lastIndex = parent.lastIndex;
    } else if (clone.__isDate(parent)) {
      child = new Date(parent.getTime());
    } else if (useBuffer && Buffer.isBuffer(parent)) {
      child = new Buffer(parent.length);
      parent.copy(child);
      return child;
    } else if (_instanceof(parent, Error)) {
      child = Object.create(parent);
    } else {
      if (typeof prototype == 'undefined') {
        proto = Object.getPrototypeOf(parent);
        child = Object.create(proto);
      }
      else {
        child = Object.create(prototype);
        proto = prototype;
      }
    }

    if (circular) {
      var index = allParents.indexOf(parent);

      if (index != -1) {
        return allChildren[index];
      }
      allParents.push(parent);
      allChildren.push(child);
    }

    if (_instanceof(parent, nativeMap)) {
      parent.forEach(function(value, key) {
        var keyChild = _clone(key, depth - 1);
        var valueChild = _clone(value, depth - 1);
        child.set(keyChild, valueChild);
      });
    }
    if (_instanceof(parent, nativeSet)) {
      parent.forEach(function(value) {
        var entryChild = _clone(value, depth - 1);
        child.add(entryChild);
      });
    }

    for (var i in parent) {
      var attrs;
      if (proto) {
        attrs = Object.getOwnPropertyDescriptor(proto, i);
      }

      if (attrs && attrs.set == null) {
        continue;
      }
      child[i] = _clone(parent[i], depth - 1);
    }

    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(parent);
      for (var i = 0; i < symbols.length; i++) {
        // Don't need to worry about cloning a symbol because it is a primitive,
        // like a number or string.
        var symbol = symbols[i];
        var descriptor = Object.getOwnPropertyDescriptor(parent, symbol);
        if (descriptor && !descriptor.enumerable && !includeNonEnumerable) {
          continue;
        }
        child[symbol] = _clone(parent[symbol], depth - 1);
        if (!descriptor.enumerable) {
          Object.defineProperty(child, symbol, {
            enumerable: false
          });
        }
      }
    }

    if (includeNonEnumerable) {
      var allPropertyNames = Object.getOwnPropertyNames(parent);
      for (var i = 0; i < allPropertyNames.length; i++) {
        var propertyName = allPropertyNames[i];
        var descriptor = Object.getOwnPropertyDescriptor(parent, propertyName);
        if (descriptor && descriptor.enumerable) {
          continue;
        }
        child[propertyName] = _clone(parent[propertyName], depth - 1);
        Object.defineProperty(child, propertyName, {
          enumerable: false
        });
      }
    }

    return child;
  }

  return _clone(parent, depth);
}

/**
 * Simple flat clone using prototype, accepts only objects, usefull for property
 * override on FLAT configuration object (no nested props).
 *
 * USE WITH CAUTION! This may not behave as you wish if you do not know how this
 * works.
 */
clone.clonePrototype = function clonePrototype(parent) {
  if (parent === null)
    return null;

  var c = function () {};
  c.prototype = parent;
  return new c();
};

// private utility functions

function __objToStr(o) {
  return Object.prototype.toString.call(o);
}
clone.__objToStr = __objToStr;

function __isDate(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Date]';
}
clone.__isDate = __isDate;

function __isArray(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Array]';
}
clone.__isArray = __isArray;

function __isRegExp(o) {
  return typeof o === 'object' && __objToStr(o) === '[object RegExp]';
}
clone.__isRegExp = __isRegExp;

function __getRegExpFlags(re) {
  var flags = '';
  if (re.global) flags += 'g';
  if (re.ignoreCase) flags += 'i';
  if (re.multiline) flags += 'm';
  return flags;
}
clone.__getRegExpFlags = __getRegExpFlags;

return clone;
})();

if (typeof module === 'object' && module.exports) {
  module.exports = clone;
}

}).call(this,require("buffer").Buffer)
},{"buffer":41}],72:[function(require,module,exports){
'use strict';

var assign        = require('es5-ext/object/assign')
  , normalizeOpts = require('es5-ext/object/normalize-options')
  , isCallable    = require('es5-ext/object/is-callable')
  , contains      = require('es5-ext/string/#/contains')

  , d;

d = module.exports = function (dscr, value/*, options*/) {
	var c, e, w, options, desc;
	if ((arguments.length < 2) || (typeof dscr !== 'string')) {
		options = value;
		value = dscr;
		dscr = null;
	} else {
		options = arguments[2];
	}
	if (dscr == null) {
		c = w = true;
		e = false;
	} else {
		c = contains.call(dscr, 'c');
		e = contains.call(dscr, 'e');
		w = contains.call(dscr, 'w');
	}

	desc = { value: value, configurable: c, enumerable: e, writable: w };
	return !options ? desc : assign(normalizeOpts(options), desc);
};

d.gs = function (dscr, get, set/*, options*/) {
	var c, e, options, desc;
	if (typeof dscr !== 'string') {
		options = set;
		set = get;
		get = dscr;
		dscr = null;
	} else {
		options = arguments[3];
	}
	if (get == null) {
		get = undefined;
	} else if (!isCallable(get)) {
		options = get;
		get = set = undefined;
	} else if (set == null) {
		set = undefined;
	} else if (!isCallable(set)) {
		options = set;
		set = undefined;
	}
	if (dscr == null) {
		c = true;
		e = false;
	} else {
		c = contains.call(dscr, 'c');
		e = contains.call(dscr, 'e');
	}

	desc = { get: get, set: set, configurable: c, enumerable: e };
	return !options ? desc : assign(normalizeOpts(options), desc);
};

},{"es5-ext/object/assign":94,"es5-ext/object/is-callable":98,"es5-ext/object/normalize-options":104,"es5-ext/string/#/contains":107}],73:[function(require,module,exports){
module.exports = require('./lib/eql');

},{"./lib/eql":74}],74:[function(require,module,exports){
/*!
 * deep-eql
 * Copyright(c) 2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependencies
 */

var type = require('type-detect');

/*!
 * Buffer.isBuffer browser shim
 */

var Buffer;
try { Buffer = require('buffer').Buffer; }
catch(ex) {
  Buffer = {};
  Buffer.isBuffer = function() { return false; }
}

/*!
 * Primary Export
 */

module.exports = deepEqual;

/**
 * Assert super-strict (egal) equality between
 * two objects of any type.
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @param {Array} memoised (optional)
 * @return {Boolean} equal match
 */

function deepEqual(a, b, m) {
  if (sameValue(a, b)) {
    return true;
  } else if ('date' === type(a)) {
    return dateEqual(a, b);
  } else if ('regexp' === type(a)) {
    return regexpEqual(a, b);
  } else if (Buffer.isBuffer(a)) {
    return bufferEqual(a, b);
  } else if ('arguments' === type(a)) {
    return argumentsEqual(a, b, m);
  } else if (!typeEqual(a, b)) {
    return false;
  } else if (('object' !== type(a) && 'object' !== type(b))
  && ('array' !== type(a) && 'array' !== type(b))) {
    return sameValue(a, b);
  } else {
    return objectEqual(a, b, m);
  }
}

/*!
 * Strict (egal) equality test. Ensures that NaN always
 * equals NaN and `-0` does not equal `+0`.
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @return {Boolean} equal match
 */

function sameValue(a, b) {
  if (a === b) return a !== 0 || 1 / a === 1 / b;
  return a !== a && b !== b;
}

/*!
 * Compare the types of two given objects and
 * return if they are equal. Note that an Array
 * has a type of `array` (not `object`) and arguments
 * have a type of `arguments` (not `array`/`object`).
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @return {Boolean} result
 */

function typeEqual(a, b) {
  return type(a) === type(b);
}

/*!
 * Compare two Date objects by asserting that
 * the time values are equal using `saveValue`.
 *
 * @param {Date} a
 * @param {Date} b
 * @return {Boolean} result
 */

function dateEqual(a, b) {
  if ('date' !== type(b)) return false;
  return sameValue(a.getTime(), b.getTime());
}

/*!
 * Compare two regular expressions by converting them
 * to string and checking for `sameValue`.
 *
 * @param {RegExp} a
 * @param {RegExp} b
 * @return {Boolean} result
 */

function regexpEqual(a, b) {
  if ('regexp' !== type(b)) return false;
  return sameValue(a.toString(), b.toString());
}

/*!
 * Assert deep equality of two `arguments` objects.
 * Unfortunately, these must be sliced to arrays
 * prior to test to ensure no bad behavior.
 *
 * @param {Arguments} a
 * @param {Arguments} b
 * @param {Array} memoize (optional)
 * @return {Boolean} result
 */

function argumentsEqual(a, b, m) {
  if ('arguments' !== type(b)) return false;
  a = [].slice.call(a);
  b = [].slice.call(b);
  return deepEqual(a, b, m);
}

/*!
 * Get enumerable properties of a given object.
 *
 * @param {Object} a
 * @return {Array} property names
 */

function enumerable(a) {
  var res = [];
  for (var key in a) res.push(key);
  return res;
}

/*!
 * Simple equality for flat iterable objects
 * such as Arrays or Node.js buffers.
 *
 * @param {Iterable} a
 * @param {Iterable} b
 * @return {Boolean} result
 */

function iterableEqual(a, b) {
  if (a.length !==  b.length) return false;

  var i = 0;
  var match = true;

  for (; i < a.length; i++) {
    if (a[i] !== b[i]) {
      match = false;
      break;
    }
  }

  return match;
}

/*!
 * Extension to `iterableEqual` specifically
 * for Node.js Buffers.
 *
 * @param {Buffer} a
 * @param {Mixed} b
 * @return {Boolean} result
 */

function bufferEqual(a, b) {
  if (!Buffer.isBuffer(b)) return false;
  return iterableEqual(a, b);
}

/*!
 * Block for `objectEqual` ensuring non-existing
 * values don't get in.
 *
 * @param {Mixed} object
 * @return {Boolean} result
 */

function isValue(a) {
  return a !== null && a !== undefined;
}

/*!
 * Recursively check the equality of two objects.
 * Once basic sameness has been established it will
 * defer to `deepEqual` for each enumerable key
 * in the object.
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @return {Boolean} result
 */

function objectEqual(a, b, m) {
  if (!isValue(a) || !isValue(b)) {
    return false;
  }

  if (a.prototype !== b.prototype) {
    return false;
  }

  var i;
  if (m) {
    for (i = 0; i < m.length; i++) {
      if ((m[i][0] === a && m[i][1] === b)
      ||  (m[i][0] === b && m[i][1] === a)) {
        return true;
      }
    }
  } else {
    m = [];
  }

  try {
    var ka = enumerable(a);
    var kb = enumerable(b);
  } catch (ex) {
    return false;
  }

  ka.sort();
  kb.sort();

  if (!iterableEqual(ka, kb)) {
    return false;
  }

  m.push([ a, b ]);

  var key;
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key], m)) {
      return false;
    }
  }

  return true;
}

},{"buffer":41,"type-detect":75}],75:[function(require,module,exports){
module.exports = require('./lib/type');

},{"./lib/type":76}],76:[function(require,module,exports){
/*!
 * type-detect
 * Copyright(c) 2013 jake luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Primary Exports
 */

var exports = module.exports = getType;

/*!
 * Detectable javascript natives
 */

var natives = {
    '[object Array]': 'array'
  , '[object RegExp]': 'regexp'
  , '[object Function]': 'function'
  , '[object Arguments]': 'arguments'
  , '[object Date]': 'date'
};

/**
 * ### typeOf (obj)
 *
 * Use several different techniques to determine
 * the type of object being tested.
 *
 *
 * @param {Mixed} object
 * @return {String} object type
 * @api public
 */

function getType (obj) {
  var str = Object.prototype.toString.call(obj);
  if (natives[str]) return natives[str];
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (obj === Object(obj)) return 'object';
  return typeof obj;
}

exports.Library = Library;

/**
 * ### Library
 *
 * Create a repository for custom type detection.
 *
 * ```js
 * var lib = new type.Library;
 * ```
 *
 */

function Library () {
  this.tests = {};
}

/**
 * #### .of (obj)
 *
 * Expose replacement `typeof` detection to the library.
 *
 * ```js
 * if ('string' === lib.of('hello world')) {
 *   // ...
 * }
 * ```
 *
 * @param {Mixed} object to test
 * @return {String} type
 */

Library.prototype.of = getType;

/**
 * #### .define (type, test)
 *
 * Add a test to for the `.test()` assertion.
 *
 * Can be defined as a regular expression:
 *
 * ```js
 * lib.define('int', /^[0-9]+$/);
 * ```
 *
 * ... or as a function:
 *
 * ```js
 * lib.define('bln', function (obj) {
 *   if ('boolean' === lib.of(obj)) return true;
 *   var blns = [ 'yes', 'no', 'true', 'false', 1, 0 ];
 *   if ('string' === lib.of(obj)) obj = obj.toLowerCase();
 *   return !! ~blns.indexOf(obj);
 * });
 * ```
 *
 * @param {String} type
 * @param {RegExp|Function} test
 * @api public
 */

Library.prototype.define = function (type, test) {
  if (arguments.length === 1) return this.tests[type];
  this.tests[type] = test;
  return this;
};

/**
 * #### .test (obj, test)
 *
 * Assert that an object is of type. Will first
 * check natives, and if that does not pass it will
 * use the user defined custom tests.
 *
 * ```js
 * assert(lib.test('1', 'int'));
 * assert(lib.test('yes', 'bln'));
 * ```
 *
 * @param {Mixed} object
 * @param {String} type
 * @return {Boolean} result
 * @api public
 */

Library.prototype.test = function (obj, type) {
  if (type === getType(obj)) return true;
  var test = this.tests[type];

  if (test && 'regexp' === getType(test)) {
    return test.test(obj);
  } else if (test && 'function' === getType(test)) {
    return test(obj);
  } else {
    throw new ReferenceError('Type test "' + type + '" not defined or invalid.');
  }
};

},{}],77:[function(require,module,exports){
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.deepmerge = factory();
    }
}(this, function () {

function isMergeableObject(val) {
    var nonNullObject = val && typeof val === 'object'

    return nonNullObject
        && Object.prototype.toString.call(val) !== '[object RegExp]'
        && Object.prototype.toString.call(val) !== '[object Date]'
}

function emptyTarget(val) {
    return Array.isArray(val) ? [] : {}
}

function cloneIfNecessary(value, optionsArgument) {
    var clone = optionsArgument && optionsArgument.clone === true
    return (clone && isMergeableObject(value)) ? deepmerge(emptyTarget(value), value, optionsArgument) : value
}

function defaultArrayMerge(target, source, optionsArgument) {
    var destination = target.slice()
    source.forEach(function(e, i) {
        if (typeof destination[i] === 'undefined') {
            destination[i] = cloneIfNecessary(e, optionsArgument)
        } else if (isMergeableObject(e)) {
            destination[i] = deepmerge(target[i], e, optionsArgument)
        } else if (target.indexOf(e) === -1) {
            destination.push(cloneIfNecessary(e, optionsArgument))
        }
    })
    return destination
}

function mergeObject(target, source, optionsArgument) {
    var destination = {}
    if (isMergeableObject(target)) {
        Object.keys(target).forEach(function (key) {
            destination[key] = cloneIfNecessary(target[key], optionsArgument)
        })
    }
    Object.keys(source).forEach(function (key) {
        if (!isMergeableObject(source[key]) || !target[key]) {
            destination[key] = cloneIfNecessary(source[key], optionsArgument)
        } else {
            destination[key] = deepmerge(target[key], source[key], optionsArgument)
        }
    })
    return destination
}

function deepmerge(target, source, optionsArgument) {
    var array = Array.isArray(source);
    var options = optionsArgument || { arrayMerge: defaultArrayMerge }
    var arrayMerge = options.arrayMerge || defaultArrayMerge

    if (array) {
        return Array.isArray(target) ? arrayMerge(target, source, optionsArgument) : cloneIfNecessary(source, optionsArgument)
    } else {
        return mergeObject(target, source, optionsArgument)
    }
}

deepmerge.all = function deepmergeAll(array, optionsArgument) {
    if (!Array.isArray(array) || array.length < 2) {
        throw new Error('first argument should be an array with at least two elements')
    }

    // we are sure there are at least 2 values, so it is safe to have no initial value
    return array.reduce(function(prev, next) {
        return deepmerge(prev, next, optionsArgument)
    })
}

return deepmerge

}));

},{}],78:[function(require,module,exports){
'use strict';

var toPosInt = require('../../number/to-pos-integer')
  , value    = require('../../object/valid-value')

  , indexOf = Array.prototype.indexOf
  , hasOwnProperty = Object.prototype.hasOwnProperty
  , abs = Math.abs, floor = Math.floor;

module.exports = function (searchElement/*, fromIndex*/) {
	var i, l, fromIndex, val;
	if (searchElement === searchElement) { //jslint: ignore
		return indexOf.apply(this, arguments);
	}

	l = toPosInt(value(this).length);
	fromIndex = arguments[1];
	if (isNaN(fromIndex)) fromIndex = 0;
	else if (fromIndex >= 0) fromIndex = floor(fromIndex);
	else fromIndex = toPosInt(this.length) - floor(abs(fromIndex));

	for (i = fromIndex; i < l; ++i) {
		if (hasOwnProperty.call(this, i)) {
			val = this[i];
			if (val !== val) return i; //jslint: ignore
		}
	}
	return -1;
};

},{"../../number/to-pos-integer":92,"../../object/valid-value":106}],79:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? Array.from
	: require('./shim');

},{"./is-implemented":80,"./shim":81}],80:[function(require,module,exports){
'use strict';

module.exports = function () {
	var from = Array.from, arr, result;
	if (typeof from !== 'function') return false;
	arr = ['raz', 'dwa'];
	result = from(arr);
	return Boolean(result && (result !== arr) && (result[1] === 'dwa'));
};

},{}],81:[function(require,module,exports){
'use strict';

var iteratorSymbol = require('es6-symbol').iterator
  , isArguments    = require('../../function/is-arguments')
  , isFunction     = require('../../function/is-function')
  , toPosInt       = require('../../number/to-pos-integer')
  , callable       = require('../../object/valid-callable')
  , validValue     = require('../../object/valid-value')
  , isString       = require('../../string/is-string')

  , isArray = Array.isArray, call = Function.prototype.call
  , desc = { configurable: true, enumerable: true, writable: true, value: null }
  , defineProperty = Object.defineProperty;

module.exports = function (arrayLike/*, mapFn, thisArg*/) {
	var mapFn = arguments[1], thisArg = arguments[2], Constructor, i, j, arr, l, code, iterator
	  , result, getIterator, value;

	arrayLike = Object(validValue(arrayLike));

	if (mapFn != null) callable(mapFn);
	if (!this || (this === Array) || !isFunction(this)) {
		// Result: Plain array
		if (!mapFn) {
			if (isArguments(arrayLike)) {
				// Source: Arguments
				l = arrayLike.length;
				if (l !== 1) return Array.apply(null, arrayLike);
				arr = new Array(1);
				arr[0] = arrayLike[0];
				return arr;
			}
			if (isArray(arrayLike)) {
				// Source: Array
				arr = new Array(l = arrayLike.length);
				for (i = 0; i < l; ++i) arr[i] = arrayLike[i];
				return arr;
			}
		}
		arr = [];
	} else {
		// Result: Non plain array
		Constructor = this;
	}

	if (!isArray(arrayLike)) {
		if ((getIterator = arrayLike[iteratorSymbol]) !== undefined) {
			// Source: Iterator
			iterator = callable(getIterator).call(arrayLike);
			if (Constructor) arr = new Constructor();
			result = iterator.next();
			i = 0;
			while (!result.done) {
				value = mapFn ? call.call(mapFn, thisArg, result.value, i) : result.value;
				if (!Constructor) {
					arr[i] = value;
				} else {
					desc.value = value;
					defineProperty(arr, i, desc);
				}
				result = iterator.next();
				++i;
			}
			l = i;
		} else if (isString(arrayLike)) {
			// Source: String
			l = arrayLike.length;
			if (Constructor) arr = new Constructor();
			for (i = 0, j = 0; i < l; ++i) {
				value = arrayLike[i];
				if ((i + 1) < l) {
					code = value.charCodeAt(0);
					if ((code >= 0xD800) && (code <= 0xDBFF)) value += arrayLike[++i];
				}
				value = mapFn ? call.call(mapFn, thisArg, value, j) : value;
				if (!Constructor) {
					arr[j] = value;
				} else {
					desc.value = value;
					defineProperty(arr, j, desc);
				}
				++j;
			}
			l = j;
		}
	}
	if (l === undefined) {
		// Source: array or array-like
		l = toPosInt(arrayLike.length);
		if (Constructor) arr = new Constructor(l);
		for (i = 0; i < l; ++i) {
			value = mapFn ? call.call(mapFn, thisArg, arrayLike[i], i) : arrayLike[i];
			if (!Constructor) {
				arr[i] = value;
			} else {
				desc.value = value;
				defineProperty(arr, i, desc);
			}
		}
	}
	if (Constructor) {
		desc.value = null;
		arr.length = l;
	}
	return arr;
};

},{"../../function/is-arguments":85,"../../function/is-function":86,"../../number/to-pos-integer":92,"../../object/valid-callable":105,"../../object/valid-value":106,"../../string/is-string":110,"es6-symbol":111}],82:[function(require,module,exports){
'use strict';

var from = require('./from')

  , isArray = Array.isArray;

module.exports = function (arrayLike) {
	return isArray(arrayLike) ? arrayLike : from(arrayLike);
};

},{"./from":79}],83:[function(require,module,exports){
'use strict';

var assign = require('../object/assign')

  , captureStackTrace = Error.captureStackTrace;

exports = module.exports = function (message/*, code, ext*/) {
	var err = new Error(message), code = arguments[1], ext = arguments[2];
	if (ext == null) {
		if (code && (typeof code === 'object')) {
			ext = code;
			code = null;
		}
	}
	if (ext != null) assign(err, ext);
	if (code != null) err.code = String(code);
	if (captureStackTrace) captureStackTrace(err, exports);
	return err;
};

},{"../object/assign":94}],84:[function(require,module,exports){
'use strict';

var toPosInt = require('../number/to-pos-integer')

  , test = function (a, b) {}, desc, defineProperty
  , generate, mixin;

try {
	Object.defineProperty(test, 'length', { configurable: true, writable: false,
		enumerable: false, value: 1 });
} catch (ignore) {}

if (test.length === 1) {
	// ES6
	desc = { configurable: true, writable: false, enumerable: false };
	defineProperty = Object.defineProperty;
	module.exports = function (fn, length) {
		length = toPosInt(length);
		if (fn.length === length) return fn;
		desc.value = length;
		return defineProperty(fn, 'length', desc);
	};
} else {
	mixin = require('../object/mixin');
	generate = (function () {
		var cache = [];
		return function (l) {
			var args, i = 0;
			if (cache[l]) return cache[l];
			args = [];
			while (l--) args.push('a' + (++i).toString(36));
			return new Function('fn', 'return function (' + args.join(', ') +
				') { return fn.apply(this, arguments); };');
		};
	}());
	module.exports = function (src, length) {
		var target;
		length = toPosInt(length);
		if (src.length === length) return src;
		target = generate(length)(src);
		try { mixin(target, src); } catch (ignore) {}
		return target;
	};
}

},{"../number/to-pos-integer":92,"../object/mixin":103}],85:[function(require,module,exports){
'use strict';

var toString = Object.prototype.toString

  , id = toString.call((function () { return arguments; }()));

module.exports = function (x) { return (toString.call(x) === id); };

},{}],86:[function(require,module,exports){
'use strict';

var toString = Object.prototype.toString

  , id = toString.call(require('./noop'));

module.exports = function (f) {
	return (typeof f === "function") && (toString.call(f) === id);
};

},{"./noop":87}],87:[function(require,module,exports){
'use strict';

module.exports = function () {};

},{}],88:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? Math.sign
	: require('./shim');

},{"./is-implemented":89,"./shim":90}],89:[function(require,module,exports){
'use strict';

module.exports = function () {
	var sign = Math.sign;
	if (typeof sign !== 'function') return false;
	return ((sign(10) === 1) && (sign(-20) === -1));
};

},{}],90:[function(require,module,exports){
'use strict';

module.exports = function (value) {
	value = Number(value);
	if (isNaN(value) || (value === 0)) return value;
	return (value > 0) ? 1 : -1;
};

},{}],91:[function(require,module,exports){
'use strict';

var sign = require('../math/sign')

  , abs = Math.abs, floor = Math.floor;

module.exports = function (value) {
	if (isNaN(value)) return 0;
	value = Number(value);
	if ((value === 0) || !isFinite(value)) return value;
	return sign(value) * floor(abs(value));
};

},{"../math/sign":88}],92:[function(require,module,exports){
'use strict';

var toInteger = require('./to-integer')

  , max = Math.max;

module.exports = function (value) { return max(0, toInteger(value)); };

},{"./to-integer":91}],93:[function(require,module,exports){
// Internal method, used by iteration functions.
// Calls a function for each key-value pair found in object
// Optionally takes compareFn to iterate object in specific order

'use strict';

var callable = require('./valid-callable')
  , value    = require('./valid-value')

  , bind = Function.prototype.bind, call = Function.prototype.call, keys = Object.keys
  , propertyIsEnumerable = Object.prototype.propertyIsEnumerable;

module.exports = function (method, defVal) {
	return function (obj, cb/*, thisArg, compareFn*/) {
		var list, thisArg = arguments[2], compareFn = arguments[3];
		obj = Object(value(obj));
		callable(cb);

		list = keys(obj);
		if (compareFn) {
			list.sort((typeof compareFn === 'function') ? bind.call(compareFn, obj) : undefined);
		}
		if (typeof method !== 'function') method = list[method];
		return call.call(method, list, function (key, index) {
			if (!propertyIsEnumerable.call(obj, key)) return defVal;
			return call.call(cb, thisArg, obj[key], key, obj, index);
		});
	};
};

},{"./valid-callable":105,"./valid-value":106}],94:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? Object.assign
	: require('./shim');

},{"./is-implemented":95,"./shim":96}],95:[function(require,module,exports){
'use strict';

module.exports = function () {
	var assign = Object.assign, obj;
	if (typeof assign !== 'function') return false;
	obj = { foo: 'raz' };
	assign(obj, { bar: 'dwa' }, { trzy: 'trzy' });
	return (obj.foo + obj.bar + obj.trzy) === 'razdwatrzy';
};

},{}],96:[function(require,module,exports){
'use strict';

var keys  = require('../keys')
  , value = require('../valid-value')

  , max = Math.max;

module.exports = function (dest, src/*, …srcn*/) {
	var error, i, l = max(arguments.length, 2), assign;
	dest = Object(value(dest));
	assign = function (key) {
		try { dest[key] = src[key]; } catch (e) {
			if (!error) error = e;
		}
	};
	for (i = 1; i < l; ++i) {
		src = arguments[i];
		keys(src).forEach(assign);
	}
	if (error !== undefined) throw error;
	return dest;
};

},{"../keys":99,"../valid-value":106}],97:[function(require,module,exports){
'use strict';

module.exports = require('./_iterate')('forEach');

},{"./_iterate":93}],98:[function(require,module,exports){
// Deprecated

'use strict';

module.exports = function (obj) { return typeof obj === 'function'; };

},{}],99:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? Object.keys
	: require('./shim');

},{"./is-implemented":100,"./shim":101}],100:[function(require,module,exports){
'use strict';

module.exports = function () {
	try {
		Object.keys('primitive');
		return true;
	} catch (e) { return false; }
};

},{}],101:[function(require,module,exports){
'use strict';

var keys = Object.keys;

module.exports = function (object) {
	return keys(object == null ? object : Object(object));
};

},{}],102:[function(require,module,exports){
'use strict';

var callable = require('./valid-callable')
  , forEach  = require('./for-each')

  , call = Function.prototype.call;

module.exports = function (obj, cb/*, thisArg*/) {
	var o = {}, thisArg = arguments[2];
	callable(cb);
	forEach(obj, function (value, key, obj, index) {
		o[key] = call.call(cb, thisArg, value, key, obj, index);
	});
	return o;
};

},{"./for-each":97,"./valid-callable":105}],103:[function(require,module,exports){
'use strict';

var value = require('./valid-value')

  , defineProperty = Object.defineProperty
  , getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor
  , getOwnPropertyNames = Object.getOwnPropertyNames
  , getOwnPropertySymbols = Object.getOwnPropertySymbols;

module.exports = function (target, source) {
	var error, sourceObject = Object(value(source));
	target = Object(value(target));
	getOwnPropertyNames(sourceObject).forEach(function (name) {
		try {
			defineProperty(target, name, getOwnPropertyDescriptor(source, name));
		} catch (e) { error = e; }
	});
	if (typeof getOwnPropertySymbols === 'function') {
		getOwnPropertySymbols(sourceObject).forEach(function (symbol) {
			try {
				defineProperty(target, symbol, getOwnPropertyDescriptor(source, symbol));
			} catch (e) { error = e; }
		});
	}
	if (error !== undefined) throw error;
	return target;
};

},{"./valid-value":106}],104:[function(require,module,exports){
'use strict';

var forEach = Array.prototype.forEach, create = Object.create;

var process = function (src, obj) {
	var key;
	for (key in src) obj[key] = src[key];
};

module.exports = function (options/*, …options*/) {
	var result = create(null);
	forEach.call(arguments, function (options) {
		if (options == null) return;
		process(Object(options), result);
	});
	return result;
};

},{}],105:[function(require,module,exports){
'use strict';

module.exports = function (fn) {
	if (typeof fn !== 'function') throw new TypeError(fn + " is not a function");
	return fn;
};

},{}],106:[function(require,module,exports){
'use strict';

module.exports = function (value) {
	if (value == null) throw new TypeError("Cannot use null or undefined");
	return value;
};

},{}],107:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')()
	? String.prototype.contains
	: require('./shim');

},{"./is-implemented":108,"./shim":109}],108:[function(require,module,exports){
'use strict';

var str = 'razdwatrzy';

module.exports = function () {
	if (typeof str.contains !== 'function') return false;
	return ((str.contains('dwa') === true) && (str.contains('foo') === false));
};

},{}],109:[function(require,module,exports){
'use strict';

var indexOf = String.prototype.indexOf;

module.exports = function (searchString/*, position*/) {
	return indexOf.call(this, searchString, arguments[1]) > -1;
};

},{}],110:[function(require,module,exports){
'use strict';

var toString = Object.prototype.toString

  , id = toString.call('');

module.exports = function (x) {
	return (typeof x === 'string') || (x && (typeof x === 'object') &&
		((x instanceof String) || (toString.call(x) === id))) || false;
};

},{}],111:[function(require,module,exports){
'use strict';

module.exports = require('./is-implemented')() ? Symbol : require('./polyfill');

},{"./is-implemented":112,"./polyfill":114}],112:[function(require,module,exports){
'use strict';

var validTypes = { object: true, symbol: true };

module.exports = function () {
	var symbol;
	if (typeof Symbol !== 'function') return false;
	symbol = Symbol('test symbol');
	try { String(symbol); } catch (e) { return false; }

	// Return 'true' also for polyfills
	if (!validTypes[typeof Symbol.iterator]) return false;
	if (!validTypes[typeof Symbol.toPrimitive]) return false;
	if (!validTypes[typeof Symbol.toStringTag]) return false;

	return true;
};

},{}],113:[function(require,module,exports){
'use strict';

module.exports = function (x) {
	if (!x) return false;
	if (typeof x === 'symbol') return true;
	if (!x.constructor) return false;
	if (x.constructor.name !== 'Symbol') return false;
	return (x[x.constructor.toStringTag] === 'Symbol');
};

},{}],114:[function(require,module,exports){
// ES2015 Symbol polyfill for environments that do not (or partially) support it

'use strict';

var d              = require('d')
  , validateSymbol = require('./validate-symbol')

  , create = Object.create, defineProperties = Object.defineProperties
  , defineProperty = Object.defineProperty, objPrototype = Object.prototype
  , NativeSymbol, SymbolPolyfill, HiddenSymbol, globalSymbols = create(null)
  , isNativeSafe;

if (typeof Symbol === 'function') {
	NativeSymbol = Symbol;
	try {
		String(NativeSymbol());
		isNativeSafe = true;
	} catch (ignore) {}
}

var generateName = (function () {
	var created = create(null);
	return function (desc) {
		var postfix = 0, name, ie11BugWorkaround;
		while (created[desc + (postfix || '')]) ++postfix;
		desc += (postfix || '');
		created[desc] = true;
		name = '@@' + desc;
		defineProperty(objPrototype, name, d.gs(null, function (value) {
			// For IE11 issue see:
			// https://connect.microsoft.com/IE/feedbackdetail/view/1928508/
			//    ie11-broken-getters-on-dom-objects
			// https://github.com/medikoo/es6-symbol/issues/12
			if (ie11BugWorkaround) return;
			ie11BugWorkaround = true;
			defineProperty(this, name, d(value));
			ie11BugWorkaround = false;
		}));
		return name;
	};
}());

// Internal constructor (not one exposed) for creating Symbol instances.
// This one is used to ensure that `someSymbol instanceof Symbol` always return false
HiddenSymbol = function Symbol(description) {
	if (this instanceof HiddenSymbol) throw new TypeError('Symbol is not a constructor');
	return SymbolPolyfill(description);
};

// Exposed `Symbol` constructor
// (returns instances of HiddenSymbol)
module.exports = SymbolPolyfill = function Symbol(description) {
	var symbol;
	if (this instanceof Symbol) throw new TypeError('Symbol is not a constructor');
	if (isNativeSafe) return NativeSymbol(description);
	symbol = create(HiddenSymbol.prototype);
	description = (description === undefined ? '' : String(description));
	return defineProperties(symbol, {
		__description__: d('', description),
		__name__: d('', generateName(description))
	});
};
defineProperties(SymbolPolyfill, {
	for: d(function (key) {
		if (globalSymbols[key]) return globalSymbols[key];
		return (globalSymbols[key] = SymbolPolyfill(String(key)));
	}),
	keyFor: d(function (s) {
		var key;
		validateSymbol(s);
		for (key in globalSymbols) if (globalSymbols[key] === s) return key;
	}),

	// To ensure proper interoperability with other native functions (e.g. Array.from)
	// fallback to eventual native implementation of given symbol
	hasInstance: d('', (NativeSymbol && NativeSymbol.hasInstance) || SymbolPolyfill('hasInstance')),
	isConcatSpreadable: d('', (NativeSymbol && NativeSymbol.isConcatSpreadable) ||
		SymbolPolyfill('isConcatSpreadable')),
	iterator: d('', (NativeSymbol && NativeSymbol.iterator) || SymbolPolyfill('iterator')),
	match: d('', (NativeSymbol && NativeSymbol.match) || SymbolPolyfill('match')),
	replace: d('', (NativeSymbol && NativeSymbol.replace) || SymbolPolyfill('replace')),
	search: d('', (NativeSymbol && NativeSymbol.search) || SymbolPolyfill('search')),
	species: d('', (NativeSymbol && NativeSymbol.species) || SymbolPolyfill('species')),
	split: d('', (NativeSymbol && NativeSymbol.split) || SymbolPolyfill('split')),
	toPrimitive: d('', (NativeSymbol && NativeSymbol.toPrimitive) || SymbolPolyfill('toPrimitive')),
	toStringTag: d('', (NativeSymbol && NativeSymbol.toStringTag) || SymbolPolyfill('toStringTag')),
	unscopables: d('', (NativeSymbol && NativeSymbol.unscopables) || SymbolPolyfill('unscopables'))
});

// Internal tweaks for real symbol producer
defineProperties(HiddenSymbol.prototype, {
	constructor: d(SymbolPolyfill),
	toString: d('', function () { return this.__name__; })
});

// Proper implementation of methods exposed on Symbol.prototype
// They won't be accessible on produced symbol instances as they derive from HiddenSymbol.prototype
defineProperties(SymbolPolyfill.prototype, {
	toString: d(function () { return 'Symbol (' + validateSymbol(this).__description__ + ')'; }),
	valueOf: d(function () { return validateSymbol(this); })
});
defineProperty(SymbolPolyfill.prototype, SymbolPolyfill.toPrimitive, d('', function () {
	var symbol = validateSymbol(this);
	if (typeof symbol === 'symbol') return symbol;
	return symbol.toString();
}));
defineProperty(SymbolPolyfill.prototype, SymbolPolyfill.toStringTag, d('c', 'Symbol'));

// Proper implementaton of toPrimitive and toStringTag for returned symbol instances
defineProperty(HiddenSymbol.prototype, SymbolPolyfill.toStringTag,
	d('c', SymbolPolyfill.prototype[SymbolPolyfill.toStringTag]));

// Note: It's important to define `toPrimitive` as last one, as some implementations
// implement `toPrimitive` natively without implementing `toStringTag` (or other specified symbols)
// And that may invoke error in definition flow:
// See: https://github.com/medikoo/es6-symbol/issues/13#issuecomment-164146149
defineProperty(HiddenSymbol.prototype, SymbolPolyfill.toPrimitive,
	d('c', SymbolPolyfill.prototype[SymbolPolyfill.toPrimitive]));

},{"./validate-symbol":115,"d":72}],115:[function(require,module,exports){
'use strict';

var isSymbol = require('./is-symbol');

module.exports = function (value) {
	if (!isSymbol(value)) throw new TypeError(value + " is not a symbol");
	return value;
};

},{"./is-symbol":113}],116:[function(require,module,exports){
'use strict';

var d        = require('d')
  , callable = require('es5-ext/object/valid-callable')

  , apply = Function.prototype.apply, call = Function.prototype.call
  , create = Object.create, defineProperty = Object.defineProperty
  , defineProperties = Object.defineProperties
  , hasOwnProperty = Object.prototype.hasOwnProperty
  , descriptor = { configurable: true, enumerable: false, writable: true }

  , on, once, off, emit, methods, descriptors, base;

on = function (type, listener) {
	var data;

	callable(listener);

	if (!hasOwnProperty.call(this, '__ee__')) {
		data = descriptor.value = create(null);
		defineProperty(this, '__ee__', descriptor);
		descriptor.value = null;
	} else {
		data = this.__ee__;
	}
	if (!data[type]) data[type] = listener;
	else if (typeof data[type] === 'object') data[type].push(listener);
	else data[type] = [data[type], listener];

	return this;
};

once = function (type, listener) {
	var once, self;

	callable(listener);
	self = this;
	on.call(this, type, once = function () {
		off.call(self, type, once);
		apply.call(listener, this, arguments);
	});

	once.__eeOnceListener__ = listener;
	return this;
};

off = function (type, listener) {
	var data, listeners, candidate, i;

	callable(listener);

	if (!hasOwnProperty.call(this, '__ee__')) return this;
	data = this.__ee__;
	if (!data[type]) return this;
	listeners = data[type];

	if (typeof listeners === 'object') {
		for (i = 0; (candidate = listeners[i]); ++i) {
			if ((candidate === listener) ||
					(candidate.__eeOnceListener__ === listener)) {
				if (listeners.length === 2) data[type] = listeners[i ? 0 : 1];
				else listeners.splice(i, 1);
			}
		}
	} else {
		if ((listeners === listener) ||
				(listeners.__eeOnceListener__ === listener)) {
			delete data[type];
		}
	}

	return this;
};

emit = function (type) {
	var i, l, listener, listeners, args;

	if (!hasOwnProperty.call(this, '__ee__')) return;
	listeners = this.__ee__[type];
	if (!listeners) return;

	if (typeof listeners === 'object') {
		l = arguments.length;
		args = new Array(l - 1);
		for (i = 1; i < l; ++i) args[i - 1] = arguments[i];

		listeners = listeners.slice();
		for (i = 0; (listener = listeners[i]); ++i) {
			apply.call(listener, this, args);
		}
	} else {
		switch (arguments.length) {
		case 1:
			call.call(listeners, this);
			break;
		case 2:
			call.call(listeners, this, arguments[1]);
			break;
		case 3:
			call.call(listeners, this, arguments[1], arguments[2]);
			break;
		default:
			l = arguments.length;
			args = new Array(l - 1);
			for (i = 1; i < l; ++i) {
				args[i - 1] = arguments[i];
			}
			apply.call(listeners, this, args);
		}
	}
};

methods = {
	on: on,
	once: once,
	off: off,
	emit: emit
};

descriptors = {
	on: d(on),
	once: d(once),
	off: d(off),
	emit: d(emit)
};

base = defineProperties({}, descriptors);

module.exports = exports = function (o) {
	return (o == null) ? create(base) : defineProperties(Object(o), descriptors);
};
exports.methods = methods;

},{"d":72,"es5-ext/object/valid-callable":105}],117:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],118:[function(require,module,exports){
'use strict';

require('setimmediate');
require('array.prototype.find');
require('array.prototype.findindex');

var FDBFactory = require('./lib/FDBFactory');

module.exports = new FDBFactory();
},{"./lib/FDBFactory":125,"array.prototype.find":37,"array.prototype.findindex":38,"setimmediate":183}],119:[function(require,module,exports){
'use strict';

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-database
module.exports = function (name, version) {
    this.deletePending = false;
    this.transactions = [];
    this.rawObjectStores = {};
    this.connections = [];

    this.name = name;
    this.version = version;

    this.processTransactions = function () {
        setImmediate(function () {
            var anyRunning = this.transactions.some(function (transaction) {
                return transaction._started && !transaction._finished;
            });

            if (!anyRunning) {
                var next = this.transactions.find(function (transaction) {
                    return !transaction._started && !transaction._finished;
                });

                if (next) {
                    next._start();

                    next.addEventListener('complete', this.processTransactions.bind(this));
                    next.addEventListener('abort', this.processTransactions.bind(this));
                }
            }
        }.bind(this));
    };
};
},{}],120:[function(require,module,exports){
'use strict';

module.exports = function (type, eventInitDict) {
    this._eventPath = [];

    // Flags
    this._stopPropagation = false;
    this._stopImmediatePropagation = false;
    this._canceled = false;
    this._initialized = true;
    this._dispatch = false;

    this.type = type;
    this.target = null;
    this.currentTarget = null;

    this.NONE = 0;
    this.CAPTURING_PHASE = 1;
    this.AT_TARGET = 2;
    this.BUBBLING_PHASE = 3;
    this.eventPhase = this.NONE;

    this.stopPropagation = function () {
        this._stopPropagation = true;
    }.bind(this);
    this.stopImmediatePropagation = function () {
        this._stopPropagation = true;
        this._stopImmediatePropagation = true;
    }.bind(this);

    eventInitDict = eventInitDict !== undefined ? eventInitDict : {};
    this.bubbles = eventInitDict.bubbles !== undefined ? eventInitDict.bubbles : false;
    this.cancelable = eventInitDict.cancelable !== undefined ? eventInitDict.cancelable : false;
    this.preventDefault = function () {
        if (this.cancelable) {
            this._canceled = true;
        }
    }.bind(this);
    this.defaultPrevented = false;

    this.isTrusted = false;
    this.timestamp = Date.now();
};
},{}],121:[function(require,module,exports){
'use strict';

var InvalidStateError = require('./errors/InvalidStateError');

function stop(event, listener) {
    return event._stopImmediatePropagation ||
           (event.eventPhase === event.CAPTURING_PHASE && listener.capture === false) ||
           (event.eventPhase === event.BUBBLING_PHASE && listener.capture === true);
}

// http://www.w3.org/TR/dom/#concept-event-listener-invoke
function invokeEventListeners(event, obj) {
    event.currentTarget = obj;

    obj._listeners.forEach(function (listener) {
        if (event.type !== listener.type || stop(event, listener)) {
            return;
        }

        listener.callback.call(event.currentTarget, event);
    });

    if (event.currentTarget['on' + event.type]) {
        var listener = {
            type: event.type,
            callback: event.currentTarget['on' + event.type],
            capture: false
        };
        if (stop(event, listener)) {
            return;
        }
        listener.callback.call(event.currentTarget, event);
    }
}

module.exports = function () {
    this._listeners = [];

    this.addEventListener = function (type, callback, capture) {
        if (callback === null) { return; }
        capture = capture !== undefined ? capture : false;

        this._listeners.push({
            type: type,
            callback: callback,
            capture: capture
        });
    };

    this.removeEventListener = function (type, callback, capture) {
        capture = capture !== undefined ? capture : false;

        var i = this._listeners.findIndex(function (listener) {
            return listener.type === type &&
                   listener.callback === callback &&
                   listener.capture === capture;
        });

        this._listeners.splice(i, 1);
    };

    // http://www.w3.org/TR/dom/#dispatching-events
    this.dispatchEvent = function (event) {
        if (event._dispatch || !event._initialized) {
            throw new InvalidStateError('The object is in an invalid state.');
        }
        event._isTrusted = false;

        event._dispatch = true;
        event.target = this;
// NOT SURE WHEN THIS SHOULD BE SET        event._eventPath = [];

        event.eventPhase = event.CAPTURING_PHASE;
        event._eventPath.forEach(function (obj) {
            if (!event._stopPropagation) {
                invokeEventListeners(event, obj);
            }
        });

        event.eventPhase = event.AT_TARGET;
        if (!event._stopPropagation) {
            invokeEventListeners(event, event.target);
        }

        if (event.bubbles) {
            event._eventPath.reverse();
            event.eventPhase = event.BUBBLING_PHASE;
            event._eventPath.forEach(function (obj) {
                if (!event._stopPropagation) {
                    invokeEventListeners(event, obj);
                }
            });
        }

        event._dispatch = false;
        event.eventPhase = event.NONE;
        event.currentTarget = null;

        if (event._canceled) {
            return false;
        }
        return true;
    };
};
},{"./errors/InvalidStateError":143}],122:[function(require,module,exports){
'use strict';

var structuredClone = require('./structuredClone');
var FDBKeyRange = require('./FDBKeyRange');
var DataError = require('./errors/DataError');
var InvalidStateError = require('./errors/InvalidStateError');
var ReadOnlyError = require('./errors/ReadOnlyError');
var TransactionInactiveError = require('./errors/TransactionInactiveError');
var cmp = require('./cmp');
var extractKey = require('./extractKey');
var validateKey = require('./validateKey');

function getEffectiveObjectStore(cursor) {
    if (cursor.source.hasOwnProperty('_rawIndex')) {
        return cursor.source.objectStore;
    }
    return cursor.source;
}

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#cursor
module.exports = function (source, range, direction, request) {
    this._gotValue = false;
    this._range = range;
    this._position = undefined; // Key of previously returned record
    this._objectStorePosition = undefined;
    this._request = request;

// Not sure if this is a good way to make things readonly. Messy if other classes need to update a value that is to be presented to the user as readonly, like FDBCursorWithValue.value
    var ro = {
        source: source,
        direction: direction !== undefined ? direction : 'next',
        key: undefined,
        primaryKey: undefined
    };
    Object.defineProperty(this, 'source', {
        get: function () {
            return ro.source;
        }
    });
    Object.defineProperty(this, 'direction', {
        get: function () {
            return ro.direction;
        }
    });
    Object.defineProperty(this, 'key', {
        get: function () {
            return ro.key;
        }
    });
    Object.defineProperty(this, 'primaryKey', {
        get: function () {
            return ro.primaryKey;
        }
    });

    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-iterating-a-cursor
    this._iterate = function (key) {
        var sourceIsObjectStore = !this.source.hasOwnProperty('_rawIndex');

        var records;
        if (sourceIsObjectStore) {
            records = this.source._rawObjectStore.records;
        } else {
            records = this.source._rawIndex.records;
        }

        var foundRecord;
        if (this.direction === "next") {
            foundRecord = records.find(function (record) {
                if (key !== undefined) {
                    if (cmp(record.key, key) === -1) {
                        return false;
                    }
                }
                if (this._position !== undefined && sourceIsObjectStore) {
                    if (cmp(record.key, this._position) !== 1) {
                        return false;
                    }
                }
                if (this._position !== undefined && !sourceIsObjectStore) {
                    var cmpResult = cmp(record.key, this._position);
                    if (cmpResult === -1) {
                        return false;
                    }
                    if (cmpResult === 0 && cmp(record.value, this._objectStorePosition) !== 1) {
                        return false;
                    }
                }
                if (this._range !== undefined) {
                    if (!FDBKeyRange.check(this._range, record.key)) {
                        return false;
                    }
                }
                return true;
            }.bind(this));
        } else if (this.direction === "nextunique") {
            foundRecord = records.find(function (record) {
                if (key !== undefined) {
                    if (cmp(record.key, key) === -1) {
                        return false;
                    }
                }
                if (this._position !== undefined) {
                    if (cmp(record.key, this._position) !== 1) {
                        return false;
                    }
                }
                if (this._range !== undefined) {
                    if (!FDBKeyRange.check(this._range, record.key)) {
                        return false;
                    }
                }
                return true;
            }.bind(this));
        } else if (this.direction === "prev") {
            foundRecord = records.reverse().find(function (record) {
                if (key !== undefined) {
                    if (cmp(record.key, key) === 1) {
                        return false;
                    }
                }
                if (this._position !== undefined && sourceIsObjectStore) {
                    if (cmp(record.key, this._position) !== -1) {
                        return false;
                    }
                }
                if (this._position !== undefined && !sourceIsObjectStore) {
                    var cmpResult = cmp(record.key, this._position);
                    if (cmpResult === 1) {
                        return false;
                    }
                    if (cmpResult === 0 && cmp(record.value, this._objectStorePosition) !== -1) {
                        return false;
                    }
                }
                if (this._range !== undefined) {
                    if (!FDBKeyRange.check(this._range, record.key)) {
                        return false;
                    }
                }
                return true;
            }.bind(this));
            records.reverse();
        } else if (this.direction === "prevunique") {
            var tempRecord = records.reverse().find(function (record) {
                if (key !== undefined) {
                    if (cmp(record.key, key) === 1) {
                        return false;
                    }
                }
                if (this._position !== undefined) {
                    if (cmp(record.key, this._position) !== -1) {
                        return false;
                    }
                }
                if (this._range !== undefined) {
                    if (!FDBKeyRange.check(this._range, record.key)) {
                        return false;
                    }
                }
                return true;
            }.bind(this));
            records.reverse();


            if (tempRecord) {
                foundRecord = records.find(function (record) {
                    return cmp(record.key, tempRecord.key) === 0;
                });
            }
        }

        var result;
        if (!foundRecord) {
            ro.key = undefined;
            if (!sourceIsObjectStore) { this._objectStorePosition = undefined; }
            this.value = undefined;
            result = null;
        } else {
            this._position = foundRecord.key;
            if (!sourceIsObjectStore) { this._objectStorePosition = foundRecord.value; }
            ro.key = foundRecord.key;
            if (sourceIsObjectStore) {
                this.value = structuredClone(foundRecord.value);
            } else {
                this.value = structuredClone(this.source.objectStore._rawObjectStore.getValue(foundRecord.value));
                ro.primaryKey = structuredClone(foundRecord.value);
            }
            this._gotValue = true;
            result = this;
        }

        return result;
    };

    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBCursor-update-IDBRequest-any-value
    this.update = function (value) {
        if (value === undefined) { throw new TypeError(); }

        var effectiveObjectStore = getEffectiveObjectStore(this);
        var effectiveKey = this.source.hasOwnProperty('_rawIndex') ? this.primaryKey : this._position;
        var transaction = effectiveObjectStore.transaction;

        if (transaction.mode === 'readonly') {
            throw new ReadOnlyError();
        }

        if (!transaction._active) {
            throw new TransactionInactiveError();
        }

        if (effectiveObjectStore._rawObjectStore.deleted) {
            throw new InvalidStateError();
        }

        if (!this._gotValue || !this.hasOwnProperty('value')) {
            throw new InvalidStateError();
        }

        if (effectiveObjectStore.keyPath !== null) {
            var tempKey;

            try {
                tempKey = extractKey(effectiveObjectStore.keyPath, value);
            } catch (err) { /* Handled immediately below */ }

            if (tempKey !== effectiveKey) {
                throw new DataError();
            }
        }

        var record = {
            key: effectiveKey,
            value: structuredClone(value)
        };

        return transaction._execRequestAsync({
            source: this,
            operation: effectiveObjectStore._rawObjectStore.storeRecord.bind(effectiveObjectStore._rawObjectStore, record, false, transaction._rollbackLog)
        });
    };

    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBCursor-advance-void-unsigned-long-count
    this.advance = function (count) {
        if (!Number.isInteger(count) || count <= 0) { throw new TypeError(); }

        var effectiveObjectStore = getEffectiveObjectStore(this);
        var transaction = effectiveObjectStore.transaction;

        if (!transaction._active) {
            throw new TransactionInactiveError();
        }

        if (effectiveObjectStore._rawObjectStore.deleted) {
            throw new InvalidStateError();
        }

        if (!this._gotValue) {
            throw new InvalidStateError();
        }

        this._request.readyState = 'pending';
        transaction._execRequestAsync({
            source: this.source,
            operation: function () {
                var result;
                for (var i = 0; i < count; i++) {
                    result = this._iterate();

                    // Not sure why this is needed
                    if (!result) {
                        break;
                    }
                }
                return result;
            }.bind(this),
            request: this._request
        });

        this._gotValue = false;
    };

    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBCursor-continue-void-any-key
    this.continue = function (key) {
        var effectiveObjectStore = getEffectiveObjectStore(this);
        var transaction = effectiveObjectStore.transaction;

        if (!transaction._active) {
            throw new TransactionInactiveError();
        }

        if (effectiveObjectStore._rawObjectStore.deleted) {
            throw new InvalidStateError();
        }

        if (!this._gotValue) {
            throw new InvalidStateError();
        }

        if (key !== undefined) {
            validateKey(key);

            var cmpResult = cmp(key, this._position);

            if ((cmpResult <= 0 && (this.direction === 'next' || this.direction === 'nextunique')) ||
                (cmpResult >= 0 && (this.direction === 'prev' || this.direction === 'prevunique'))) {
                throw new DataError();
            }
        }

        this._request.readyState = 'pending';
        transaction._execRequestAsync({
            source: this.source,
            operation: this._iterate.bind(this, key),
            request: this._request
        });

        this._gotValue = false;
    };

    this.delete = function () {
        var effectiveObjectStore = getEffectiveObjectStore(this);
        var effectiveKey = this.source.hasOwnProperty('_rawIndex') ? this.primaryKey : this._position;
        var transaction = effectiveObjectStore.transaction;

        if (transaction.mode === 'readonly') {
            throw new ReadOnlyError();
        }

        if (!transaction._active) {
            throw new TransactionInactiveError();
        }

        if (effectiveObjectStore._rawObjectStore.deleted) {
            throw new InvalidStateError();
        }

        if (!this._gotValue || !this.hasOwnProperty('value')) {
            throw new InvalidStateError();
        }

        return transaction._execRequestAsync({
            source: this,
            operation: effectiveObjectStore._rawObjectStore.deleteRecord.bind(effectiveObjectStore._rawObjectStore, effectiveKey, transaction._rollbackLog)
        });
    };

    this.toString = function () {
        return '[object IDBCursor]';
    };
};
},{"./FDBKeyRange":127,"./cmp":137,"./errors/DataError":141,"./errors/InvalidStateError":143,"./errors/ReadOnlyError":145,"./errors/TransactionInactiveError":146,"./extractKey":148,"./structuredClone":149,"./validateKey":150}],123:[function(require,module,exports){
'use strict';

var util = require('util');
var FDBCursor = require('./FDBCursor');

function FDBCursorWithValue() {
    FDBCursor.apply(this, arguments);

    this.value = undefined;

    this.toString = function () {
        return '[object IDBCursorWithValue]';
    };
}
util.inherits(FDBCursorWithValue, FDBCursor);

module.exports = FDBCursorWithValue;
},{"./FDBCursor":122,"util":190}],124:[function(require,module,exports){
'use strict';

var util = require('util');
var EventTarget = require('./EventTarget');
var FDBTransaction = require('./FDBTransaction');
var ObjectStore = require('./ObjectStore');
var ConstraintError = require('./errors/ConstraintError');
var InvalidAccessError = require('./errors/InvalidAccessError');
var InvalidStateError = require('./errors/InvalidStateError');
var NotFoundError = require('./errors/NotFoundError');
var TransactionInactiveError = require('./errors/TransactionInactiveError');
var addDomStringListMethods = require('./addDomStringListMethods');
var validateKeyPath = require('./validateKeyPath');

function confirmActiveVersionchangeTransaction(database) {
    if (!database._runningVersionchangeTransaction) {
        throw new InvalidStateError();
    }

    var transaction = database._rawDatabase.transactions.find(function (transaction) {
        return transaction._active && transaction.mode === 'versionchange';
    });
    if (!transaction) {
        throw new TransactionInactiveError();
    }

    return transaction;
}

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#database-closing-steps
function closeConnection(connection) {
    connection._closePending = true;

    var transactionsComplete = connection._rawDatabase.transactions.every(function (transaction) {
        return transaction._finished;
    });

    if (transactionsComplete) {
        connection._closed = true;
        connection._rawDatabase.connections = connection._rawDatabase.connections.filter(function (otherConnection) {
            return connection !== otherConnection;
        });
    } else {
        setImmediate(function () {
            closeConnection(connection);
        });
    }
}

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#database-interface
function FDBDatabase(rawDatabase) {
    EventTarget.call(this);

    this._closePending = false;
    this._closed = false;
    this._runningVersionchangeTransaction = false;
    this._rawDatabase = rawDatabase;
    this._rawDatabase.connections.push(this);

    this.name = rawDatabase.name;
    this.version = rawDatabase.version;
    this.objectStoreNames = Object.keys(rawDatabase.rawObjectStores).sort();
    addDomStringListMethods(this.objectStoreNames);

    this.createObjectStore = function (name, optionalParameters) {
        if (name === undefined) { throw new TypeError(); }
        var transaction = confirmActiveVersionchangeTransaction(this);

        if (this._rawDatabase.rawObjectStores.hasOwnProperty(name)) {
            throw new ConstraintError();
        }

        optionalParameters = optionalParameters || {};
        var keyPath = optionalParameters.keyPath !== undefined ? optionalParameters.keyPath : null;
        var autoIncrement = optionalParameters.autoIncrement !== undefined ? optionalParameters.autoIncrement : false;

        if (keyPath !== null) {
            validateKeyPath(keyPath);
        }

        if (autoIncrement && (keyPath === '' || Array.isArray(keyPath))) {
            throw new InvalidAccessError();
        }

        transaction._rollbackLog.push(function (objectStoreNames) {
            this.objectStoreNames = objectStoreNames;
            addDomStringListMethods(this.objectStoreNames);
            delete this._rawDatabase.rawObjectStores[name];
        }.bind(this, this.objectStoreNames.slice()));

        var objectStore = new ObjectStore(this._rawDatabase, name, keyPath, autoIncrement);
        this.objectStoreNames.push(name);
        this.objectStoreNames.sort();
        this._rawDatabase.rawObjectStores[name] = objectStore;

        return transaction.objectStore(name);
    };

    this.deleteObjectStore = function (name) {
        if (name === undefined) { throw new TypeError(); }
        var transaction = confirmActiveVersionchangeTransaction(this);

        if (!this._rawDatabase.rawObjectStores.hasOwnProperty(name)) {
            throw new NotFoundError();
        }

        this.objectStoreNames = this.objectStoreNames.filter(function (objectStoreName) {
            return objectStoreName !== name;
        });
        addDomStringListMethods(this.objectStoreNames);

        transaction._rollbackLog.push(function (store) {
            store.deleted = false;
            this._rawDatabase.rawObjectStores[name] = store;
            this.objectStoreNames.push(name);
            this.objectStoreNames.sort();
        }.bind(this, this._rawDatabase.rawObjectStores[name]));

        this._rawDatabase.rawObjectStores[name].deleted = true;
        delete this._rawDatabase.rawObjectStores[name];
    };

    this.transaction = function (storeNames, mode) {
        mode = mode !== undefined ? mode : 'readonly';
        if (mode !== 'readonly' && mode !== 'readwrite' && mode !== 'versionchange') {
            throw new TypeError('Invalid mode: ' + mode);
        }

        var hasActiveVersionchange = this._rawDatabase.transactions.some(function (transaction) {
            return transaction._active && transaction.mode === 'versionchange';
        });
        if (hasActiveVersionchange) {
            throw new InvalidStateError();
        }

        if (this._closePending) {
            throw new InvalidStateError();
        }

        if (!Array.isArray(storeNames)) {
            storeNames = [storeNames];
        }
        if (storeNames.length === 0 && mode !== 'versionchange') {
            throw new InvalidAccessError();
        }
        storeNames.forEach(function (storeName) {
            if (this.objectStoreNames.indexOf(storeName) < 0) {
                throw new NotFoundError('No objectStore named ' + storeName + ' in this database');
            }
        }.bind(this));

        var tx = new FDBTransaction(storeNames, mode);
        tx.db = this;
        this._rawDatabase.transactions.push(tx);
        this._rawDatabase.processTransactions(); // See if can start right away (async)

        return tx;
    };

    this.close = function () {
        closeConnection(this);
    };

    this.toString = function () {
        return '[object IDBDatabase]';
    };
}
util.inherits(FDBDatabase, EventTarget);

module.exports = FDBDatabase;

},{"./EventTarget":121,"./FDBTransaction":131,"./ObjectStore":135,"./addDomStringListMethods":136,"./errors/ConstraintError":139,"./errors/InvalidAccessError":142,"./errors/InvalidStateError":143,"./errors/NotFoundError":144,"./errors/TransactionInactiveError":146,"./validateKeyPath":151,"util":190}],125:[function(require,module,exports){
'use strict';

var Event = require('./Event');
var Database = require('./Database');
var FDBOpenDBRequest = require('./FDBOpenDBRequest');
var FDBDatabase = require('./FDBDatabase');
var FDBVersionChangeEvent = require('./FDBVersionChangeEvent');
var AbortError = require('./errors/AbortError');
var VersionError = require('./errors/VersionError');
var cmp = require('./cmp');

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-deleting-a-database
function deleteDatabase(databases, name, request, cb) {
    try {
        var db;
        if (databases.hasOwnProperty(name)) {
            db = databases[name];
        } else {
            cb();
            return;
        }

        db.deletePending = true;

        var openDatabases = db.connections.filter(function (connection) {
            return !connection._closed;
        });

        openDatabases.forEach(function (openDatabase) {
            if (!openDatabase._closePending) {
                var event = new FDBVersionChangeEvent('versionchange', {
                    oldVersion: db.version,
                    newVersion: null
                });
                openDatabase.dispatchEvent(event);
            }
        });

        var anyOpen = openDatabases.some(function (openDatabase) {
            return !openDatabase._closed;
        });

        if (request && anyOpen) {
            var event = new FDBVersionChangeEvent('blocked', {
                oldVersion: db.version,
                newVersion: null
            });
            request.dispatchEvent(event);
        }
    } catch (err) {
        cb(err);
    }

    var waitForOthersClosed = function () {
        var anyOpen = openDatabases.some(function (openDatabase) {
            return !openDatabase._closed;
        });

        if (anyOpen) {
            setImmediate(waitForOthersClosed);
            return;
        }

        delete databases[name];

        cb();
    };

    waitForOthersClosed();
}

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-running-a-versionchange-transaction
function runVersionchangeTransaction(connection, version, request, cb) {
    connection._runningVersionchangeTransaction = true;

    var oldVersion = connection.version;

    var openDatabases = connection._rawDatabase.connections.filter(function (otherDatabase) {
        return connection !== otherDatabase;
    });

    openDatabases.forEach(function (openDatabase) {
        if (!openDatabase._closed) {
            var event = new FDBVersionChangeEvent('versionchange', {
                oldVersion: oldVersion,
                newVersion: version
            });
            openDatabase.dispatchEvent(event);
        }
    });

    var anyOpen = openDatabases.some(function (openDatabase) {
        return !openDatabase._closed;
    });

    if (anyOpen) {
        var event = new FDBVersionChangeEvent('blocked', {
            oldVersion: oldVersion,
            newVersion: version
        });
        request.dispatchEvent(event);
    }

    var waitForOthersClosed = function () {
        var anyOpen = openDatabases.some(function (openDatabase) {
            return !openDatabase._closed;
        });

        if (anyOpen) {
            setImmediate(waitForOthersClosed);
            return;
        }

//  Set the version of database to version. This change is considered part of the transaction, and so if the transaction is aborted, this change is reverted.
        connection._rawDatabase.version = version;
        connection.version = version;

// Get rid of this setImmediate?
        var transaction = connection.transaction(connection.objectStoreNames, 'versionchange');
        request.result = connection;
        request.transaction = transaction;

        transaction._rollbackLog.push(function () {
            connection._rawDatabase.version = oldVersion;
            connection.version = oldVersion;
        });

        var event = new FDBVersionChangeEvent('upgradeneeded', {
            oldVersion: oldVersion,
            newVersion: version
        });
        request.dispatchEvent(event);

        request.readyState = 'done';

        transaction.addEventListener('error', function () {
            connection._runningVersionchangeTransaction = false;
//throw arguments[0].target.error;
//console.log('error in versionchange transaction - not sure if anything needs to be done here', e.target.error.name);
        });
        transaction.addEventListener('abort', function () {
            connection._runningVersionchangeTransaction = false;
            request.transaction = null;
            setImmediate(function () {
                cb(new AbortError());
            });
        });
        transaction.addEventListener('complete', function () {
            connection._runningVersionchangeTransaction = false;
            request.transaction = null;
            // Let other complete event handlers run before continuing
            setImmediate(function () {
                if (connection._closePending) {
                    cb(new AbortError());
                } else {
                    cb(null);
                }
            });
        });
    };

    waitForOthersClosed();
}

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-opening-a-database
function openDatabase(databases, name, version, request, cb) {
    var db;
    if (databases.hasOwnProperty(name)) {
        db = databases[name];
    } else {
        db = new Database(name, 0);
        databases[name] = db;
    }

    if (version === undefined) {
        version = db.version !== 0 ? db.version : 1;
    }

    if (db.version > version) {
        return cb(new VersionError());
    }

    var connection = new FDBDatabase(databases[name]);

    if (db.version < version) {
        runVersionchangeTransaction(connection, version, request, function (err) {
            if (err) {
// DO THIS HERE: ensure that connection is closed by running the steps for closing a database connection before these steps are aborted.
                return cb(err);
            }

            cb(null, connection);
        });
    } else {
        cb(null, connection);
    }
}

module.exports = function () {
    this._databases = {};

    this.cmp = cmp;

    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBFactory-deleteDatabase-IDBOpenDBRequest-DOMString-name
    this.deleteDatabase = function (name) {
        var request = new FDBOpenDBRequest();
        request.source = null;

        setImmediate(function () {
            var version = this._databases.hasOwnProperty(name) ? this._databases[name].version : null;
            deleteDatabase(this._databases, name, request, function (err) {
                var event;

                if (err) {
                    request.error = new Error();
                    request.error.name = err.name;

                    event = new Event('error', {
                        bubbles: true,
                        cancelable: false
                    });
                    event._eventPath = [];
                    request.dispatchEvent(event);

                    return;
                }

                request.result = undefined;

                event = new FDBVersionChangeEvent('success', {
                    oldVersion: version,
                    newVersion: null
                });
                request.dispatchEvent(event);
            });
        }.bind(this));

        return request;
    };

    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBFactory-open-IDBOpenDBRequest-DOMString-name-unsigned-long-long-version
    this.open = function (name, version) {
        if (arguments.length > 1 && (isNaN(version) || version < 1 || version >= 9007199254740992)) {
            throw new TypeError();
        }

        var request = new FDBOpenDBRequest();
        request.source = null;

        setImmediate(function () {
            openDatabase(this._databases, name, version, request, function (err, connection) {
                var event;

                if (err) {
                    request.result = undefined;

                    request.error = new Error();
                    request.error.name = err.name;

                    event = new Event('error', {
                        bubbles: true,
                        cancelable: false
                    });
                    event._eventPath = [];
                    request.dispatchEvent(event);

                    return;
                }

                request.result = connection;

                event = new Event('success');
                event._eventPath = [];
                request.dispatchEvent(event);
            });
        }.bind(this));

        return request;
    };

    this.toString = function () {
        return '[object IDBFactory]';
    };
};

},{"./Database":119,"./Event":120,"./FDBDatabase":124,"./FDBOpenDBRequest":129,"./FDBVersionChangeEvent":132,"./cmp":137,"./errors/AbortError":138,"./errors/VersionError":147}],126:[function(require,module,exports){
'use strict';

var structuredClone = require('./structuredClone');
var FDBCursor = require('./FDBCursor');
var FDBCursorWithValue = require('./FDBCursorWithValue');
var FDBKeyRange = require('./FDBKeyRange');
var FDBRequest = require('./FDBRequest');
var InvalidStateError = require('./errors/InvalidStateError');
var TransactionInactiveError = require('./errors/TransactionInactiveError');
var cmp = require('./cmp');
var validateKey = require('./validateKey');

function confirmActiveTransaction(index) {
    if (!index.objectStore.transaction._active) {
        throw new TransactionInactiveError();
    }

    if (index._rawIndex.deleted || index.objectStore._rawObjectStore.deleted) {
        throw new InvalidStateError();
    }
}

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#idl-def-IDBIndex
module.exports = function (objectStore, rawIndex) {
    this._rawIndex = rawIndex;

    this.name = rawIndex.name;
    this.objectStore = objectStore;
    this.keyPath = rawIndex.keyPath;
    this.multiEntry = rawIndex.multiEntry;
    this.unique = rawIndex.unique;

    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBIndex-openCursor-IDBRequest-any-range-IDBCursorDirection-direction
    this.openCursor = function (range, direction) {
        confirmActiveTransaction(this);

        if (range === null) { range = undefined; }
        if (range !== undefined && !(range instanceof FDBKeyRange)) {
            range = FDBKeyRange.only(structuredClone(validateKey(range)));
        }

        var request = new FDBRequest();
        request.source = this;
        request.transaction = this.objectStore.transaction;

        var cursor = new FDBCursorWithValue(this, range, direction);
        cursor._request = request;

        return this.objectStore.transaction._execRequestAsync({
            source: this,
            operation: cursor._iterate.bind(cursor),
            request: request
        });
    };

    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBIndex-openKeyCursor-IDBRequest-any-range-IDBCursorDirection-direction
    this.openKeyCursor = function (range, direction) {
        confirmActiveTransaction(this);

        if (range === null) { range = undefined; }
        if (range !== undefined && !(range instanceof FDBKeyRange)) {
            range = FDBKeyRange.only(structuredClone(validateKey(range)));
        }

        var request = new FDBRequest();
        request.source = this;
        request.transaction = this.objectStore.transaction;

        var cursor = new FDBCursor(this, range, direction);
        cursor._request = request;

        return this.objectStore.transaction._execRequestAsync({
            source: this,
            operation: cursor._iterate.bind(cursor),
            request: request
        });
    };

    this.get = function (key) {
        confirmActiveTransaction(this);

        if (!(key instanceof FDBKeyRange)) {
            key = structuredClone(validateKey(key));
        }

        return this.objectStore.transaction._execRequestAsync({
            source: this,
            operation: this._rawIndex.getValue.bind(this._rawIndex, key)
        });
    };

    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBIndex-getKey-IDBRequest-any-key
    this.getKey = function (key) {
        confirmActiveTransaction(this);

        if (!(key instanceof FDBKeyRange)) {
            key = structuredClone(validateKey(key));
        }

        return this.objectStore.transaction._execRequestAsync({
            source: this,
            operation: this._rawIndex.getKey.bind(this._rawIndex, key)
        });
    };

    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBIndex-count-IDBRequest-any-key
    this.count = function (key) {
        confirmActiveTransaction(this);

        if (key !== undefined && !(key instanceof FDBKeyRange)) {
            key = structuredClone(validateKey(key));
        }

// Should really use a cursor under the hood
        return this.objectStore.transaction._execRequestAsync({
            source: this,
            operation: function () {
                var count;

                if (key instanceof FDBKeyRange) {
                    count = 0;
                    this._rawIndex.records.forEach(function (record) {
                        if (FDBKeyRange.check(key, record.key)) {
                            count += 1;
                        }
                    });
                } else if (key !== undefined) {
                    count = 0;
                    this._rawIndex.records.forEach(function (record) {
                        if (cmp(record.key, key) === 0) {
                            count += 1;
                        }
                    });
                } else {
                    count = this._rawIndex.records.length;
                }

                return count;
            }.bind(this)
        });
    };

    this.toString = function () {
        return '[object IDBIndex]';
    };
};
},{"./FDBCursor":122,"./FDBCursorWithValue":123,"./FDBKeyRange":127,"./FDBRequest":130,"./cmp":137,"./errors/InvalidStateError":143,"./errors/TransactionInactiveError":146,"./structuredClone":149,"./validateKey":150}],127:[function(require,module,exports){
'use strict';

var DataError = require('./errors/DataError');
var cmp = require('./cmp');
var validateKey = require('./validateKey');

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#range-concept
function FDBKeyRange() {
    this.lower = undefined;
    this.upper = undefined;
    this.lowerOpen = undefined;
    this.upperOpen = undefined;

    this.toString = function () {
        return '[object IDBKeyRange]';
    };
}

FDBKeyRange.only = function (value) {
    if (value === undefined) { throw new TypeError(); }
    validateKey(value);
    var keyRange = new FDBKeyRange();
    keyRange.lower = value;
    keyRange.upper = value;
    keyRange.lowerOpen = false;
    keyRange.upperOpen = false;
    return keyRange;
};

FDBKeyRange.lowerBound = function (lower, open) {
    if (lower === undefined) { throw new TypeError(); }
    validateKey(lower);
    var keyRange = new FDBKeyRange();
    keyRange.lower = lower;
    keyRange.lowerOpen = open === true ? true : false;
    keyRange.upperOpen = true;
    return keyRange;
};

FDBKeyRange.upperBound = function (upper, open) {
    if (upper === undefined) { throw new TypeError(); }
    validateKey(upper);
    var keyRange = new FDBKeyRange();
    keyRange.upper = upper;
    keyRange.lowerOpen = true;
    keyRange.upperOpen = open === true ? true : false;
    return keyRange;
};

FDBKeyRange.bound = function (lower, upper, lowerOpen, upperOpen) {
    if (lower === undefined || upper === undefined) { throw new TypeError(); }

    var cmpResult = cmp(lower, upper);
    if (cmpResult === 1 || (cmpResult === 0 && (lowerOpen || upperOpen))) {
        throw new DataError();
    }

    validateKey(lower);
    validateKey(upper);
    var keyRange = new FDBKeyRange();
    keyRange.lower = lower;
    keyRange.upper = upper;
    keyRange.lowerOpen = lowerOpen === true ? true : false;
    keyRange.upperOpen = upperOpen === true ? true : false;
    return keyRange;
};


FDBKeyRange.check = function (keyRange, key) {
    var cmpResult;
    if (keyRange.lower !== undefined) {
        cmpResult = cmp(keyRange.lower, key);

        if (cmpResult === 1 || (cmpResult === 0 && keyRange.lowerOpen)) {
            return false;
        }
    }
    if (keyRange.upper !== undefined) {
        cmpResult = cmp(keyRange.upper, key);

        if (cmpResult === -1 || (cmpResult === 0 && keyRange.upperOpen)) {
            return false;
        }
    }
    return true;
};

module.exports = FDBKeyRange;
},{"./cmp":137,"./errors/DataError":141,"./validateKey":150}],128:[function(require,module,exports){
'use strict';

var structuredClone = require('./structuredClone');
var Index = require('./Index');
var FDBCursorWithValue = require('./FDBCursorWithValue');
var FDBIndex = require('./FDBIndex');
var FDBKeyRange = require('./FDBKeyRange');
var FDBRequest = require('./FDBRequest');
var ConstraintError = require('./errors/ConstraintError');
var DataError = require('./errors/DataError');
var InvalidAccessError = require('./errors/InvalidAccessError');
var InvalidStateError = require('./errors/InvalidStateError');
var NotFoundError = require('./errors/NotFoundError');
var ReadOnlyError = require('./errors/ReadOnlyError');
var TransactionInactiveError = require('./errors/TransactionInactiveError');
var addDomStringListMethods = require('./addDomStringListMethods');
var cmp = require('./cmp');
var extractKey = require('./extractKey');
var validateKey = require('./validateKey');
var validateKeyPath = require('./validateKeyPath');

function confirmActiveTransaction(objectStore) {
    if (objectStore._rawObjectStore.deleted) {
        throw new InvalidStateError();
    }

    if (!objectStore.transaction._active) {
        throw new TransactionInactiveError();
    }
}

function buildRecordAddPut(value, key) {
    if (this.transaction.mode === 'readonly') {
        throw new ReadOnlyError();
    }

    confirmActiveTransaction(this);

    if (this.keyPath !== null) {
        if (key !== undefined) {
            throw new DataError();
        }

        var tempKey = extractKey(this.keyPath, value);

        if (tempKey !== undefined) {
            validateKey(tempKey);
        } else {
            if (!this._rawObjectStore.keyGenerator) {
                throw new DataError();
            }
        }
    }

    if (this.keyPath === null && this._rawObjectStore.keyGenerator === null && key === undefined) {
        throw new DataError();
    }

    if (key !== undefined) {
        validateKey(key);
    }

    return {
        key: structuredClone(key),
        value: structuredClone(value)
    };
}

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#object-store
module.exports = function (transaction, rawObjectStore) {
    this._rawObjectStore = rawObjectStore;
    this._rawIndexesCache = {}; // Store the FDBIndex objects

    this.name = rawObjectStore.name;
    this.keyPath = rawObjectStore.keyPath;
    this.autoIncrement = rawObjectStore.autoIncrement;
    this.transaction = transaction;
    this.indexNames = Object.keys(rawObjectStore.rawIndexes).sort();
    addDomStringListMethods(this.indexNames);

    this.put = function (value, key) {
        var record = buildRecordAddPut.call(this, value, key);

        return this.transaction._execRequestAsync({
            source: this,
            operation: this._rawObjectStore.storeRecord.bind(this._rawObjectStore, record, false, this.transaction._rollbackLog)
        });
    };

    this.add = function (value, key) {
        var record = buildRecordAddPut.call(this, value, key);

        return this.transaction._execRequestAsync({
            source: this,
            operation: this._rawObjectStore.storeRecord.bind(this._rawObjectStore, record, true, this.transaction._rollbackLog)
        });
    };

    this.delete = function (key) {
        if (this.transaction.mode === 'readonly') {
            throw new ReadOnlyError();
        }
        confirmActiveTransaction(this);


        if (!(key instanceof FDBKeyRange)) {
            key = structuredClone(validateKey(key));
        }

        return this.transaction._execRequestAsync({
            source: this,
            operation: this._rawObjectStore.deleteRecord.bind(this._rawObjectStore, key, this.transaction._rollbackLog)
        });
    };

    this.get = function (key) {
        confirmActiveTransaction(this);

        if (!(key instanceof FDBKeyRange)) {
            key = structuredClone(validateKey(key));
        }

        return this.transaction._execRequestAsync({
            source: this,
            operation: this._rawObjectStore.getValue.bind(this._rawObjectStore, key)
        });
    };

    this.clear = function () {
        if (this.transaction.mode === 'readonly') {
            throw new ReadOnlyError();
        }
        confirmActiveTransaction(this);

        return this.transaction._execRequestAsync({
            source: this,
            operation: this._rawObjectStore.clear.bind(this._rawObjectStore, this.transaction._rollbackLog)
        });
    };

    this.openCursor = function (range, direction) {
        confirmActiveTransaction(this);

        if (range === null) { range = undefined; }
        if (range !== undefined && !(range instanceof FDBKeyRange)) {
            range = FDBKeyRange.only(structuredClone(validateKey(range)));
        }

        var request = new FDBRequest();
        request.source = this;
        request.transaction = this.transaction;

        var cursor = new FDBCursorWithValue(this, range, direction);
        cursor._request = request;

        return this.transaction._execRequestAsync({
            source: this,
            operation: cursor._iterate.bind(cursor),
            request: request
        });
    };

    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBObjectStore-createIndex-IDBIndex-DOMString-name-DOMString-sequence-DOMString--keyPath-IDBIndexParameters-optionalParameters
    this.createIndex = function (name, keyPath, optionalParameters) {
        if (keyPath === undefined) { throw new TypeError(); }

        optionalParameters = optionalParameters !== undefined ? optionalParameters : {};
        var multiEntry = optionalParameters.multiEntry !== undefined ? optionalParameters.multiEntry : false;
        var unique = optionalParameters.unique !== undefined ? optionalParameters.unique : false;

        if (this.transaction.mode !== 'versionchange') {
            throw new InvalidStateError();
        }

        confirmActiveTransaction(this);

        if (this.indexNames.indexOf(name) >= 0) {
            throw new ConstraintError();
        }

        validateKeyPath(keyPath);

        if (Array.isArray(keyPath) && multiEntry) {
            throw new InvalidAccessError();
        }

// The index that is requested to be created can contain constraints on the data allowed in the index's referenced object store, such as requiring uniqueness of the values referenced by the index's keyPath. If the referenced object store already contains data which violates these constraints, this MUST NOT cause the implementation of createIndex to throw an exception or affect what it returns. The implementation MUST still create and return an IDBIndex object. Instead the implementation must queue up an operation to abort the "versionchange" transaction which was used for the createIndex call.

        this.transaction._rollbackLog.push(function (indexNames) {
            this.indexNames = indexNames;
            addDomStringListMethods(this.indexNames);
            delete this._rawObjectStore.rawIndexes[name];
        }.bind(this, this.indexNames.slice()));

        var index = new Index(this._rawObjectStore, name, keyPath, multiEntry, unique);
        this.indexNames.push(name);
        this.indexNames.sort();
        this._rawObjectStore.rawIndexes[name] = index;

        index.initialize(this.transaction); // This is async by design

        return new FDBIndex(this, index);
    };

    this.index = function (name) {
        if (name === undefined) { throw new TypeError(); }

        if (this._rawIndexesCache.hasOwnProperty(name)) {
            return this._rawIndexesCache[name];
        }

        if (this.indexNames.indexOf(name) < 0) {
            throw new NotFoundError();
        }

        if (this._rawObjectStore.deleted) {
            throw new InvalidStateError();
        }

        var index = new FDBIndex(this, this._rawObjectStore.rawIndexes[name]);
        this._rawIndexesCache[name] = index;

        return index;
    };

    this.deleteIndex = function (name) {
        if (name === undefined) { throw new TypeError(); }

        if (this.transaction.mode !== 'versionchange') {
            throw new InvalidStateError();
        }

        confirmActiveTransaction(this);

        if (!this._rawObjectStore.rawIndexes.hasOwnProperty(name)) {
            throw new NotFoundError();
        }

        this.transaction._rollbackLog.push(function (index) {
            index.deleted = false;
            this._rawObjectStore.rawIndexes[name] = index;
            this.indexNames.push(name);
            this.indexNames.sort();
        }.bind(this, this._rawObjectStore.rawIndexes[name]));

        this.indexNames = this.indexNames.filter(function (indexName) {
            return indexName !== name;
        });
        addDomStringListMethods(this.indexNames);
        this._rawObjectStore.rawIndexes[name].deleted = true; // Not sure if this is supposed to happen synchronously

        this.transaction._execRequestAsync({
            source: this,
            operation: function () {
                delete this._rawObjectStore.rawIndexes[name];
            }.bind(this)
        });
    };

    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBObjectStore-count-IDBRequest-any-key
    this.count = function (key) {
        confirmActiveTransaction(this);

        if (key !== undefined && !(key instanceof FDBKeyRange)) {
            key = structuredClone(validateKey(key));
        }

// Should really use a cursor under the hood
        return this.transaction._execRequestAsync({
            source: this,
            operation: function () {
                var count;

                if (key instanceof FDBKeyRange) {
                    count = 0;
                    this._rawObjectStore.records.forEach(function (record) {
                        if (FDBKeyRange.check(key, record.key)) {
                            count += 1;
                        }
                    });
                } else if (key !== undefined) {
                    count = 0;
                    this._rawObjectStore.records.forEach(function (record) {
                        if (cmp(record.key, key) === 0) {
                            count += 1;
                        }
                    });
                } else {
                    count = this._rawObjectStore.records.length;
                }

                return count;
            }.bind(this)
        });
    };

    this.toString = function () {
        return '[object IDBObjectStore]';
    };
};
},{"./FDBCursorWithValue":123,"./FDBIndex":126,"./FDBKeyRange":127,"./FDBRequest":130,"./Index":133,"./addDomStringListMethods":136,"./cmp":137,"./errors/ConstraintError":139,"./errors/DataError":141,"./errors/InvalidAccessError":142,"./errors/InvalidStateError":143,"./errors/NotFoundError":144,"./errors/ReadOnlyError":145,"./errors/TransactionInactiveError":146,"./extractKey":148,"./structuredClone":149,"./validateKey":150,"./validateKeyPath":151}],129:[function(require,module,exports){
'use strict';

var util = require('util');
var FDBRequest = require('./FDBRequest');

function FDBOpenDBRequest() {
    FDBRequest.call(this);

    this.onupgradeneeded = null;
    this.onblocked = null;

    this.toString = function () {
        return '[object IDBOpenDBRequest]';
    };
}
util.inherits(FDBOpenDBRequest, FDBRequest);

module.exports = FDBOpenDBRequest;
},{"./FDBRequest":130,"util":190}],130:[function(require,module,exports){
'use strict';

var util = require('util');
var EventTarget = require('./EventTarget');

function FDBRequest() {
    EventTarget.call(this);

    this.result = null;
    this.error = null;
    this.source = null;
    this.transaction = null;
    this.readyState = 'pending';
    this.onsuccess = null;
    this.onerror = null;

    this.toString = function () {
        return '[object IDBRequest]';
    };
}
util.inherits(FDBRequest, EventTarget);

module.exports = FDBRequest;
},{"./EventTarget":121,"util":190}],131:[function(require,module,exports){
'use strict';

var util = require('util');
var Event = require('./Event');
var EventTarget = require('./EventTarget');
var FDBObjectStore = require('./FDBObjectStore');
var FDBRequest = require('./FDBRequest');
var AbortError = require('./errors/AbortError');
var TransactionInactiveError = require('./errors/TransactionInactiveError');
var NotFoundError = require('./errors/NotFoundError');
var InvalidStateError = require('./errors/InvalidStateError');

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#transaction
function FDBTransaction(storeNames, mode) {
    EventTarget.call(this);

    this._scope = storeNames;
    this._started = false;
    this._active = true;
    this._finished = false; // Set true after commit or abort
    this._requests = [];
    this._rollbackLog = [];

    this.mode = mode;
    this.db = null;
    this.error = null;
    this.onabort = null;
    this.oncomplete = null;
    this.onerror = null;

    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-aborting-a-transaction
    this._abort = function (error) {
        this._rollbackLog.reverse().forEach(function (f) {
            f();
        });

        var e;
        if (error !== null) {
            e = new Error();
            e.name = error;
            this.error = e;
        }

// Should this directly remove from _requests?
        this._requests.forEach(function (r) {
            var request = r.request;
            if (request.readyState !== 'done') {
                request.readyState = 'done'; // This will cancel execution of this request's operation
                if (request.source) {
                    request.result = undefined;
                    request.error = new AbortError();

                    var event = new Event('error', {
                        bubbles: true,
                        cancelable: true
                    });
                    event._eventPath = [this.db, this];
                    request.dispatchEvent(event);
                }
            }
        }.bind(this));

        setImmediate(function () {
            var event = new Event('abort', {
                bubbles: true,
                cancelable: false
            });
            event._eventPath = [this.db];
            this.dispatchEvent(event);
        }.bind(this));

        this._finished = true;
    };

    this.abort = function () {
        if (this._finished) {
            throw new InvalidStateError();
        }
        this._active = false;

        this._abort(null);
    };

    this.objectStore = function (name) {
        if (this._scope.indexOf(name) < 0) {
            throw new NotFoundError();
        }

        if (!this._active) {
            throw new InvalidStateError();
        }

        return new FDBObjectStore(this, this.db._rawDatabase.rawObjectStores[name]);
    };

    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-asynchronously-executing-a-request
    this._execRequestAsync = function (obj) {
        var source = obj.source;
        var operation = obj.operation;
        var request = obj.hasOwnProperty('request') ? obj.request : null;

        if (!this._active) {
            throw new TransactionInactiveError();
        }

        // Request should only be passed for cursors
        if (!request) {
            if (!source) {
                // Special requests like indexes that just need to run some coe
                request = {
                    readyState: 'pending'
                };
            } else {
                request = new FDBRequest();
                request.source = source;
                request.transaction = source.transaction;
            }
        }

        this._requests.push({
            request: request,
            operation: operation
        });

        return request;
    };

    this._start = function () {
        var event;

        this._started = true;

        // Remove from request queue - cursor ones will be added back if necessary by cursor.continue and such
        var operation, request;
        while (this._requests.length > 0) {
            var r = this._requests.shift();

            // This should only be false if transaction was aborted
            if (r.request.readyState !== 'done') {
                request = r.request;
                operation = r.operation;
                break;
            }
        }

        if (request) {
            if (!request.source) {
                // Special requests like indexes that just need to run some code, with error handling already built into operation
                operation();
            } else {
                var defaultAction;
                try {
                    var result = operation();
                    request.readyState = 'done';
                    request.result = result;
                    request.error = undefined;

                    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-fire-a-success-event
                    this._active = true;
                    event = new Event('success', {
                        bubbles: false,
                        cancelable: false
                    });
                } catch (err) {
                    request.readyState = 'done';
                    request.result = undefined;
                    request.error = err;

                    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-fire-an-error-event
                    this._active = true;
                    event = new Event('error', {
                        bubbles: true,
                        cancelable: true
                    });

                    defaultAction = this._abort.bind(this, err.name);
                }

                try {
                    event._eventPath = [this.db, this];
                    request.dispatchEvent(event);

                    // You're supposed to set this._active to false here, but I'm skipping that.
                    // Why? Because scheduling gets tricky when promises are involved. I know that
                    // promises and IndexedDB transactions in general are tricky
                    // https://lists.w3.org/Archives/Public/public-webapps/2015AprJun/0126.html but
                    // for some reason I still tend to do it. So this line is commented out for me,
                    // and for any other masochists who do similar things. It doesn't seem to break
                    // any tests or functionality, and in fact if I uncomment this line it does make
                    // transaction/promise interactions wonky.
                    //this._active = false;
                } catch (err) {
//console.error(err);
                    this._abort('AbortError');
                    throw err;
                }

                // Default action of event
                if (!event._canceled) {
                    if (defaultAction) {
                        defaultAction();
                    }
                }
            }

            // On to the next one
            if (this._requests.length > 0) {
                this._start();
            } else {
                // Give it another chance for new handlers to be set before finishing
                setImmediate(this._start.bind(this));
            }
            return;
        }

        // Check if transaction complete event needs to be fired
        if (!this._finished) { // Either aborted or committed already
            this._active = false;
            this._finished = true;

            if (!this.error) {
                event = new Event();
                event.type = 'complete';
                this.dispatchEvent(event);
            }
        }
    };

    this.toString = function () {
        return '[object IDBRequest]';
    };
}
util.inherits(FDBTransaction, EventTarget);

module.exports = FDBTransaction;
},{"./Event":120,"./EventTarget":121,"./FDBObjectStore":128,"./FDBRequest":130,"./errors/AbortError":138,"./errors/InvalidStateError":143,"./errors/NotFoundError":144,"./errors/TransactionInactiveError":146,"util":190}],132:[function(require,module,exports){
'use strict';

var util = require('util');
var Event = require('./Event');

function FDBVersionChangeEvent(type, parameters) {
    Event.call(this, type);

    parameters = parameters !== undefined ? parameters : {};
    this.oldVersion = parameters.oldVersion !== undefined ? parameters.oldVersion : 0;
    this.newVersion = parameters.newVersion !== undefined ? parameters.newVersion : null;

    this.toString = function () {
        return '[object IDBVersionChangeEvent]';
    };
}
util.inherits(FDBVersionChangeEvent, Event);

module.exports = FDBVersionChangeEvent;
},{"./Event":120,"util":190}],133:[function(require,module,exports){
'use strict';

var FDBKeyRange = require('./FDBKeyRange');
var ConstraintError = require('./errors/ConstraintError');
var cmp = require('./cmp');
var extractKey = require('./extractKey');
var validateKey = require('./validateKey');

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-index
module.exports = function (rawObjectStore, name, keyPath, multiEntry, unique) {
    this.records = [];
    this.rawObjectStore = rawObjectStore;
    this.initialized = false;
    this.deleted = false;
// Initialized should be used to decide whether to throw an error or abort the versionchange transaction when there is a constraint

    this.name = name;
    this.keyPath = keyPath;
    this.multiEntry = multiEntry;
    this.unique = unique;

    this._getRecord = function (key) {
        var record;
        if (key instanceof FDBKeyRange) {
            record = this.records.find(function (record) {
                return FDBKeyRange.check(key, record.key);
            });
        } else {
            record = this.records.find(function (record) {
                return cmp(record.key, key) === 0;
            });
        }
        return record;
    };

    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-retrieving-a-value-from-an-index
    this.getKey = function (key) {
        var record = this._getRecord(key);

        return record !== undefined ? record.value : undefined;
    };

    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#index-referenced-value-retrieval-operation
    this.getValue = function (key) {
        var record = this._getRecord(key);

        return record !== undefined ? this.rawObjectStore.getValue(record.value) : undefined;
    };

    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-storing-a-record-into-an-object-store (step 7)
    this.storeRecord = function (newRecord) {
        var indexKey;
        try {
            indexKey = extractKey(this.keyPath, newRecord.value);
        } catch (err) {
            if (err.name === 'DataError') {
                // Invalid key is not an actual error, just means we do not store an entry in this index
                return;
            }

            throw err;
        }

        if (!this.multiEntry || !Array.isArray(indexKey)) {
            try {
                validateKey(indexKey);
            } catch (e) {
                return;
            }
        } else {
            // remove any elements from index key that are not valid keys and remove any duplicate elements from index key such that only one instance of the duplicate value remains.
            var keep = [];
            indexKey.forEach(function (part) {
                if (keep.indexOf(part) < 0) {
                    try {
                        validateKey(part);
                        keep.push(part);
                    } catch (err) { /* Do nothing */ }
                }
            });
            indexKey = keep;
        }

        if (!this.multiEntry || !Array.isArray(indexKey)) {
            if (this.unique) {
                var i = this.records.findIndex(function (record) {
                    return cmp(record.key, indexKey) === 0;
                });
                if (i >= 0) {
                    throw new ConstraintError();
                }
            }
        } else {
            if (this.unique) {
                indexKey.forEach(function (individualIndexKey) {
                    this.records.forEach(function (record) {
                        if (cmp(record.key, individualIndexKey) === 0) {
                            throw new ConstraintError();
                        }
                    });
                }.bind(this));
            }
        }

        // Store record {key (indexKey) and value (recordKey)} sorted ascending by key (primarily) and value (secondarily)
        var storeInIndex = function (newRecord) {
            var i = this.records.findIndex(function (record) {
                return cmp(record.key, newRecord.key) >= 0;
            });

            // If no matching key, add to end
            if (i === -1) {
                i = this.records.length;
            } else {
                // If matching key, advance to appropriate position based on value
                while (i < this.records.length && cmp(this.records[i].key, newRecord.key) === 0) {
                    if (cmp(this.records[i].value, newRecord.value) !== -1) {
                        // Record value >= newRecord value, so insert here
                        break;
                    }

                    i += 1; // Look at next record
                }
            }

            this.records.splice(i, 0, newRecord);
        }.bind(this);

        if (!this.multiEntry || !Array.isArray(indexKey)) {
            storeInIndex({
                key: indexKey,
                value: newRecord.key
            });
        } else {
            indexKey.forEach(function (individualIndexKey) {
                storeInIndex({
                    key: individualIndexKey,
                    value: newRecord.key
                });
            });
        }
    };

    this.initialize = function (transaction) {
        if (this.initialized) {
            throw new Error("Index already initialized");
        }

        transaction._execRequestAsync({
            source: null,
            operation: function () {
                try {
                    // Create index based on current value of objectstore
                    this.rawObjectStore.records.forEach(function (record) {
                        this.storeRecord(record);
                    }.bind(this));

                    this.initialized = true;
                } catch (err) {
                    transaction._abort(err.name);
                }
            }.bind(this)
        });
    };
};
},{"./FDBKeyRange":127,"./cmp":137,"./errors/ConstraintError":139,"./extractKey":148,"./validateKey":150}],134:[function(require,module,exports){
'use strict';

var ConstraintError = require('./errors/ConstraintError');

module.exports = function () {
// This is kind of wrong. Should start at 1 and increment only after record is saved
    this.num = 0;

    this.next = function () {
        if (this.num >= 9007199254740992) {
            throw new ConstraintError();
        }

        this.num += 1;

        return this.num;
    };

    this.setIfLarger = function (num) {
        if (num > 9007199254740992) {
            throw new ConstraintError();
        }

        if (num > this.num) {
            this.num = Math.floor(num);
        }
    };
};
},{"./errors/ConstraintError":139}],135:[function(require,module,exports){
'use strict';

var structuredClone = require('./structuredClone');
var FDBKeyRange = require('../lib/FDBKeyRange');
var KeyGenerator = require('./KeyGenerator');
var ConstraintError = require('./errors/ConstraintError');
var DataError = require('./errors/DataError');
var cmp = require('./cmp');
var extractKey = require('./extractKey');

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-object-store
module.exports = function (rawDatabase, name, keyPath, autoIncrement) {
    this.rawDatabase = rawDatabase;
    this.records = [];
    this.rawIndexes = {};
    this.keyGenerator = autoIncrement === true ? new KeyGenerator() : null;
    this.deleted = false;

    this.name = name;
    this.keyPath = keyPath;
    this.autoIncrement = autoIncrement;

    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-retrieving-a-value-from-an-object-store
    this.getValue = function (key) {
        var record;
        if (key instanceof FDBKeyRange) {
            record = this.records.find(function (record) {
                return FDBKeyRange.check(key, record.key);
            });
        } else {
            record = this.records.find(function (record) {
                return cmp(record.key, key) === 0;
            });
        }

        return record !== undefined ? structuredClone(record.value) : undefined;
    };

    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-storing-a-record-into-an-object-store
    this.storeRecord = function (newRecord, noOverwrite, rollbackLog) {
        if (this.keyPath !== null) {
            var key = extractKey(this.keyPath, newRecord.value);
            if (key !== undefined) {
                newRecord.key = key;
            }
        }

        var i;
        if (this.keyGenerator !== null && newRecord.key === undefined) {
            if (rollbackLog) {
                rollbackLog.push(function (keyGeneratorBefore) {
                    this.keyGenerator.num = keyGeneratorBefore;
                }.bind(this, this.keyGenerator.num));
            }

            newRecord.key = this.keyGenerator.next();

            // Set in value if keyPath defiend but led to no key
            // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-to-assign-a-key-to-a-value-using-a-key-path
            if (this.keyPath !== null) {
                var remainingKeyPath = this.keyPath;
                var object = newRecord.value;
                var identifier;

                i = 0; // Just to run the loop at least once
                while (i >= 0) {
                    if (typeof object !== 'object') {
                        throw new DataError();
                    }

                    i = remainingKeyPath.indexOf('.');
                    if (i >= 0) {
                        identifier = remainingKeyPath.slice(0, i);
                        remainingKeyPath = remainingKeyPath.slice(i + 1);

                        if (!object.hasOwnProperty(identifier)) {
                            object[identifier] = {};
                        }

                        object = object[identifier];
                    }
                }

                identifier = remainingKeyPath;

                object[identifier] = newRecord.key;
            }
        } else if (this.keyGenerator !== null && typeof newRecord.key === 'number') {
            this.keyGenerator.setIfLarger(newRecord.key);
        }

        i = this.records.findIndex(function (record) {
            return cmp(record.key, newRecord.key) === 0;
        });

        if (i >= 0) {
            if (noOverwrite) {
                throw new ConstraintError();
            }
            this.deleteRecord(newRecord.key, rollbackLog);
        }

        // Find where to put it so it's sorted by key
        if (this.records.length === 0) {
            i = 0;
        }
        i = this.records.findIndex(function (record) {
            return cmp(record.key, newRecord.key) === 1;
        });
        if (i === -1) {
            i = this.records.length;
        }
        this.records.splice(i, 0, newRecord);

        // Update indexes
        Object.keys(this.rawIndexes).forEach(function (name) {
            if (this.rawIndexes[name].initialized) {
                this.rawIndexes[name].storeRecord(newRecord);
            }
        }.bind(this));

        if (rollbackLog) {
            rollbackLog.push(this.deleteRecord.bind(this, newRecord.key));
        }

        return newRecord.key;
    };

    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-deleting-records-from-an-object-store
    this.deleteRecord = function (key, rollbackLog) {
        var range;
        if (key instanceof FDBKeyRange) {
            range = key;
        } else {
            range = FDBKeyRange.only(key);
        }

        this.records = this.records.filter(function (record) {
            var shouldDelete = FDBKeyRange.check(range, record.key);

            if (shouldDelete && rollbackLog) {
                rollbackLog.push(this.storeRecord.bind(this, record, true));
            }

            return !shouldDelete;
        }.bind(this));

        Object.keys(this.rawIndexes).forEach(function (name) {
            var rawIndex = this.rawIndexes[name];
            rawIndex.records = rawIndex.records.filter(function (record) {
                return !FDBKeyRange.check(range, record.value);
            });
        }.bind(this));
    };

    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-clearing-an-object-store
    this.clear = function (rollbackLog) {
        if (rollbackLog) {
            this.records.forEach(function (record) {
                rollbackLog.push(this.storeRecord.bind(this, record, true));
            }.bind(this));
        }

        this.records = [];
        Object.keys(this.rawIndexes).forEach(function (name) {
            var rawIndex = this.rawIndexes[name];
            rawIndex.records = [];
        }.bind(this));
    };
};
},{"../lib/FDBKeyRange":127,"./KeyGenerator":134,"./cmp":137,"./errors/ConstraintError":139,"./errors/DataError":141,"./extractKey":148,"./structuredClone":149}],136:[function(require,module,exports){
'use strict';

// Polyfill the DOMStringList methods on array, for objectStoreNames and indexNames
function addDomStringListMethods(array) {
    Object.defineProperty(array, 'item', {
        value: function (i) {
            return this[i];
        }
    });

    Object.defineProperty(array, 'contains', {
        value: function (value) {
            return this.indexOf(value) >= 0;
        }
    });
}

module.exports = addDomStringListMethods;
},{}],137:[function(require,module,exports){
'use strict';

var DataError = require('./errors/DataError');
var validateKey = require('./validateKey');

function getType(x) {
    if (typeof x === 'number') {
        return 'Number';
    }
    if (x instanceof Date) {
        return 'Date';
    }
    if (Array.isArray(x)) {
        return 'Array';
    }
    if (typeof x === 'string') {
        return 'String';
    }

    throw new DataError();
}

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBFactory-cmp-short-any-first-any-second
function cmp(first, second) {
    if (second === undefined) { throw new TypeError(); }

    validateKey(first);
    validateKey(second);

    var t1 = getType(first);
    var t2 = getType(second);

    if (t1 !== t2) {
        if (t1 === 'Array') {
            return 1;
        }
        if (t1 === 'String' && (t2 === 'Date' || t2 === 'Number')) {
            return 1;
        }
        if (t1 === 'Date' && t2 === 'Number') {
            return 1;
        }
        return -1;
    }

    if (t1 === 'Array') {
        var length = Math.min(first.length, second.length);
        for (var i = 0; i < length; i++) {
            var result = cmp(first[i], second[i]);

            if (result !== 0) {
                return result;
            }
        }

        if (first.length > second.length) {
            return 1;
        }
        if (first.length < second.length) {
            return -1;
        }
        return 0;
    }

    if (t1 === 'Date') {
        if (first.getTime() === second.getTime()) {
            return 0;
        }
    } else {
        if (first === second) {
            return 0;
        }
    }
    return first > second ? 1 : -1;
}

module.exports = cmp;

},{"./errors/DataError":141,"./validateKey":150}],138:[function(require,module,exports){
'use strict';

var util = require('util');

function AbortError(message) {
    this.name = this.constructor.name;
    this.message = message !== undefined ? message : ' A request was aborted, for example through a call to IDBTransaction.abort.';
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, AbortError);
    }
}
util.inherits(AbortError, Error);

module.exports = AbortError;
},{"util":190}],139:[function(require,module,exports){
'use strict';

var util = require('util');

function ConstraintError(message) {
    this.name = this.constructor.name;
    this.message = message !== undefined ? message : ' A mutation operation in the transaction failed because a constraint was not satisfied. For example, an object such as an object store or index already exists and a request attempted to create a new one.';
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, ConstraintError);
    }
}
util.inherits(ConstraintError, Error);

module.exports = ConstraintError;
},{"util":190}],140:[function(require,module,exports){
'use strict';

var util = require('util');

function DataCloneError(message) {
    this.name = this.constructor.name;
    this.message = message !== undefined ? message : 'The data being stored could not be cloned by the internal structured cloning algorithm.';
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, DataCloneError);
    }
}
util.inherits(DataCloneError, Error);

module.exports = DataCloneError;
},{"util":190}],141:[function(require,module,exports){
'use strict';

var util = require('util');

function DataError(message) {
    this.name = this.constructor.name;
    this.message = message !== undefined ? message : 'Data provided to an operation does not meet requirements.';
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, DataError);
    }
}
util.inherits(DataError, Error);

module.exports = DataError;
},{"util":190}],142:[function(require,module,exports){
'use strict';

var util = require('util');

function InvalidAccessError(message) {
    this.name = this.constructor.name;
    this.message = message !== undefined ? message : 'An invalid operation was performed on an object. For example transaction creation attempt was made, but an empty scope was provided.';
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, InvalidAccessError);
    }
}
util.inherits(InvalidAccessError, Error);

module.exports = InvalidAccessError;
},{"util":190}],143:[function(require,module,exports){
'use strict';

var util = require('util');

function InvalidStateError(message) {
    this.name = this.constructor.name;
    this.message = message !== undefined ? message : 'An operation was called on an object on which it is not allowed or at a time when it is not allowed. Also occurs if a request is made on a source object that has been deleted or removed. Use TransactionInactiveError or ReadOnlyError when possible, as they are more specific variations of InvalidStateError.';
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, InvalidStateError);
    }
}
util.inherits(InvalidStateError, Error);

module.exports = InvalidStateError;
},{"util":190}],144:[function(require,module,exports){
'use strict';

var util = require('util');

function NotFoundError(message) {
    this.name = this.constructor.name;
    this.message = message !== undefined ? message : 'The operation failed because the requested database object could not be found. For example, an object store did not exist but was being opened.';
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, NotFoundError);
    }
}
util.inherits(NotFoundError, Error);

module.exports = NotFoundError;
},{"util":190}],145:[function(require,module,exports){
'use strict';

var util = require('util');

function ReadOnlyError(message) {
    this.name = this.constructor.name;
    this.message = message !== undefined ? message : 'The mutating operation was attempted in a "readonly" transaction.';
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, ReadOnlyError);
    }
}
util.inherits(ReadOnlyError, Error);

module.exports = ReadOnlyError;
},{"util":190}],146:[function(require,module,exports){
'use strict';

var util = require('util');

function TransactionInactiveError(message) {
    this.name = this.constructor.name;
    this.message = message !== undefined ? message : 'A request was placed against a transaction which is currently not active, or which is finished.';
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, TransactionInactiveError);
    }
}
util.inherits(TransactionInactiveError, Error);

module.exports = TransactionInactiveError;
},{"util":190}],147:[function(require,module,exports){
'use strict';

var util = require('util');

function VersionError(message) {
    this.name = this.constructor.name;
    this.message = message !== undefined ? message : 'An attempt was made to open a database using a lower version than the existing version.';
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, VersionError);
    }
}
util.inherits(VersionError, Error);

module.exports = VersionError;
},{"util":190}],148:[function(require,module,exports){
'use strict';

var structuredClone = require('./structuredClone');
var validateKey = require('./validateKey');

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-extracting-a-key-from-a-value-using-a-key-path
function extractKey(keyPath, value) {
    if (Array.isArray(keyPath)) {
        var result = [];

        keyPath.forEach(function (item) {
            // This doesn't make sense to me based on the spec, but it is needed to pass the W3C KeyPath tests (see same comment in validateKey)
            if (item !== undefined && item !== null && typeof item !== 'string' && item.toString) {
                item = item.toString();
            }
            result.push(structuredClone(validateKey(extractKey(item, value))));
        });

        return result;
    }

    if (keyPath === '') {
        return value;
    }

    var remainingKeyPath = keyPath;
    var object = value;

    while (remainingKeyPath !== null) {
        var identifier;

        var i = remainingKeyPath.indexOf('.');
        if (i >= 0) {
            identifier = remainingKeyPath.slice(0, i);
            remainingKeyPath = remainingKeyPath.slice(i + 1);
        } else {
            identifier = remainingKeyPath;
            remainingKeyPath = null;
        }

        if (!object.hasOwnProperty(identifier)) {
            return;
        }

        object = object[identifier];
    }

    return object;
}

module.exports = extractKey;
},{"./structuredClone":149,"./validateKey":150}],149:[function(require,module,exports){
'use strict';

var realisticStructuredClone = require('realistic-structured-clone');
var DataCloneError = require('./errors/DataCloneError');

module.exports = function (input) {
    try {
        return realisticStructuredClone(input);
    } catch (err) {
        throw new DataCloneError();
    }
};
},{"./errors/DataCloneError":140,"realistic-structured-clone":182}],150:[function(require,module,exports){
'use strict';

var DataError = require('./errors/DataError');

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-valid-key
function validateKey(key, seen) {
    if (typeof key === 'number') {
        if (isNaN(key)) {
            throw new DataError();
        }
    } else if (key instanceof Date) {
        if (isNaN(key.valueOf())) {
            throw new DataError();
        }
    } else if (Array.isArray(key)) {
        seen = seen !== undefined ? seen : [];
        key.forEach(function (x) {
            // Only need to test objects, because otherwise [0, 0] shows up as circular
            if (typeof x === 'object' && seen.indexOf(x) >= 0) {
                throw new DataError();
            }
            seen.push(x);
        });

        var count = 0;
        key = key.map(function (item) {
            count += 1;
            return validateKey(item, seen);
        });
        if (count !== key.length) {
            throw new DataError();
        }
        return key;
    } else if (typeof key !== 'string') {
        throw new DataError();
    }

    return key;
}

module.exports = validateKey;
},{"./errors/DataError":141}],151:[function(require,module,exports){
'use strict';

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-valid-key-path
function validateKeyPath(keyPath, parent) {
    // This doesn't make sense to me based on the spec, but it is needed to pass the W3C KeyPath tests (see same comment in extractKey)
    if (keyPath !== undefined && keyPath !== null && typeof keyPath !== 'string' && keyPath.toString && (parent === 'array' || !Array.isArray(keyPath))) {
        keyPath = keyPath.toString();
    }

    if (typeof keyPath === 'string') {
        if (keyPath === '' && parent !== 'string') {
            return;
        }
        try {
            // https://mathiasbynens.be/demo/javascript-identifier-regex for ECMAScript 5.1 / Unicode v7.0.0, with reserved words at beginning removed
            var validIdentifierRegex = /^(?:[\$A-Z_a-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B2\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC])(?:[\$0-9A-Z_a-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0-\u08B2\u08E4-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58\u0C59\u0C60-\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D01-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D60-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1CF8\u1CF9\u1D00-\u1DF5\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA69D\uA69F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2D\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC])*$/;
            if (keyPath.length >= 1 && validIdentifierRegex.test(keyPath)) {
                return;
            }
        } catch (err) {
            throw new SyntaxError(err.message);
        }
        if (keyPath.indexOf(' ') >= 0) {
            throw new SyntaxError('The keypath argument contains an invalid key path (no spaces allowed).');
        }
    }

    if (Array.isArray(keyPath) && keyPath.length > 0) {
        if (parent) {
            // No nested arrays
            throw new SyntaxError('The keypath argument contains an invalid key path (nested arrays).');
        }
        keyPath.forEach(function (part) {
            validateKeyPath(part, 'array');
        });
        return;
    } else if (typeof keyPath === 'string' && keyPath.indexOf('.') >= 0) {
        keyPath = keyPath.split('.');
        keyPath.forEach(function (part) {
            validateKeyPath(part, 'string');
        });
        return;
    }

    throw new SyntaxError();
}

module.exports = validateKeyPath;
},{}],152:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],153:[function(require,module,exports){
module.exports = isPromise;

function isPromise(obj) {
  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
}

},{}],154:[function(require,module,exports){
/**
 * lodash 3.0.3 (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright 2012-2016 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * The base implementation of `baseForIn` and `baseForOwn` which iterates
 * over `object` properties returned by `keysFunc` invoking `iteratee` for
 * each property. Iteratee functions may exit iteration early by explicitly
 * returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = createBaseFor();

/**
 * Creates a base function for methods like `_.forIn`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var index = -1,
        iterable = Object(object),
        props = keysFunc(object),
        length = props.length;

    while (length--) {
      var key = props[fromRight ? length : ++index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

module.exports = baseFor;

},{}],155:[function(require,module,exports){
/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]';

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Built-in value references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 *  else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
function isArguments(value) {
  // Safari 8.1 makes `arguments.callee` enumerable in strict mode.
  return isArrayLikeObject(value) && hasOwnProperty.call(value, 'callee') &&
    (!propertyIsEnumerable.call(value, 'callee') || objectToString.call(value) == argsTag);
}

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(value.length) && !isFunction(value);
}

/**
 * This method is like `_.isArrayLike` except that it also checks if `value`
 * is an object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array-like object,
 *  else `false`.
 * @example
 *
 * _.isArrayLikeObject([1, 2, 3]);
 * // => true
 *
 * _.isArrayLikeObject(document.body.children);
 * // => true
 *
 * _.isArrayLikeObject('abc');
 * // => false
 *
 * _.isArrayLikeObject(_.noop);
 * // => false
 */
function isArrayLikeObject(value) {
  return isObjectLike(value) && isArrayLike(value);
}

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 8-9 which returns 'object' for typed array and other constructors.
  var tag = isObject(value) ? objectToString.call(value) : '';
  return tag == funcTag || tag == genTag;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

module.exports = isArguments;

},{}],156:[function(require,module,exports){
/**
 * lodash 3.0.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var arrayTag = '[object Array]',
    funcTag = '[object Function]';

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/* Native method references for those with the same name as other `lodash` methods. */
var nativeIsArray = getNative(Array, 'isArray');

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = object == null ? undefined : object[key];
  return isNative(value) ? value : undefined;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(function() { return arguments; }());
 * // => false
 */
var isArray = nativeIsArray || function(value) {
  return isObjectLike(value) && isLength(value.length) && objToString.call(value) == arrayTag;
};

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 equivalents which return 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (isFunction(value)) {
    return reIsNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && reIsHostCtor.test(value);
}

module.exports = isArray;

},{}],157:[function(require,module,exports){
/**
 * lodash 3.2.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var baseFor = require('lodash._basefor'),
    isArguments = require('lodash.isarguments'),
    keysIn = require('lodash.keysin');

/** `Object#toString` result references. */
var objectTag = '[object Object]';

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/**
 * The base implementation of `_.forIn` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForIn(object, iteratee) {
  return baseFor(object, iteratee, keysIn);
}

/**
 * Checks if `value` is a plain object, that is, an object created by the
 * `Object` constructor or one with a `[[Prototype]]` of `null`.
 *
 * **Note:** This method assumes objects created by the `Object` constructor
 * have no inherited enumerable properties.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 * }
 *
 * _.isPlainObject(new Foo);
 * // => false
 *
 * _.isPlainObject([1, 2, 3]);
 * // => false
 *
 * _.isPlainObject({ 'x': 0, 'y': 0 });
 * // => true
 *
 * _.isPlainObject(Object.create(null));
 * // => true
 */
function isPlainObject(value) {
  var Ctor;

  // Exit early for non `Object` objects.
  if (!(isObjectLike(value) && objToString.call(value) == objectTag && !isArguments(value)) ||
      (!hasOwnProperty.call(value, 'constructor') && (Ctor = value.constructor, typeof Ctor == 'function' && !(Ctor instanceof Ctor)))) {
    return false;
  }
  // IE < 9 iterates inherited properties before own properties. If the first
  // iterated property is an object's own property then there are no inherited
  // enumerable properties.
  var result;
  // In most environments an object's own properties are iterated before
  // its inherited properties. If the last iterated property is an object's
  // own property then there are no inherited enumerable properties.
  baseForIn(value, function(subValue, key) {
    result = key;
  });
  return result === undefined || hasOwnProperty.call(value, result);
}

module.exports = isPlainObject;

},{"lodash._basefor":154,"lodash.isarguments":155,"lodash.keysin":158}],158:[function(require,module,exports){
/**
 * lodash 3.0.8 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var isArguments = require('lodash.isarguments'),
    isArray = require('lodash.isarray');

/** Used to detect unsigned integer values. */
var reIsUint = /^\d+$/;

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used as the [maximum length](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return value > -1 && value % 1 == 0 && value < length;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  if (object == null) {
    return [];
  }
  if (!isObject(object)) {
    object = Object(object);
  }
  var length = object.length;
  length = (length && isLength(length) &&
    (isArray(object) || isArguments(object)) && length) || 0;

  var Ctor = object.constructor,
      index = -1,
      isProto = typeof Ctor == 'function' && Ctor.prototype === object,
      result = Array(length),
      skipIndexes = length > 0;

  while (++index < length) {
    result[index] = (index + '');
  }
  for (var key in object) {
    if (!(skipIndexes && isIndex(key, length)) &&
        !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = keysIn;

},{"lodash.isarguments":155,"lodash.isarray":156}],159:[function(require,module,exports){
'use strict';

var toPosInt = require('es5-ext/number/to-pos-integer')

  , create = Object.create, hasOwnProperty = Object.prototype.hasOwnProperty;

module.exports = function (limit) {
	var size = 0, base = 1, queue = create(null), map = create(null), index = 0, del;
	limit = toPosInt(limit);
	return {
		hit: function (id) {
			var oldIndex = map[id], nuIndex = ++index;
			queue[nuIndex] = id;
			map[id] = nuIndex;
			if (!oldIndex) {
				++size;
				if (size <= limit) return;
				id = queue[base];
				del(id);
				return id;
			}
			delete queue[oldIndex];
			if (base !== oldIndex) return;
			while (!hasOwnProperty.call(queue, ++base)) continue; //jslint: skip
		},
		delete: del = function (id) {
			var oldIndex = map[id];
			if (!oldIndex) return;
			delete queue[oldIndex];
			delete map[id];
			--size;
			if (base !== oldIndex) return;
			if (!size) {
				index = 0;
				base = 1;
				return;
			}
			while (!hasOwnProperty.call(queue, ++base)) continue; //jslint: skip
		},
		clear: function () {
			size = 0;
			base = 1;
			queue = create(null);
			map = create(null);
			index = 0;
		}
	};
};

},{"es5-ext/number/to-pos-integer":92}],160:[function(require,module,exports){
// Support for asynchronous functions

'use strict';

var aFrom        = require('es5-ext/array/from')
  , objectMap    = require('es5-ext/object/map')
  , mixin        = require('es5-ext/object/mixin')
  , defineLength = require('es5-ext/function/_define-length')
  , nextTick     = require('next-tick')

  , slice = Array.prototype.slice
  , apply = Function.prototype.apply, create = Object.create
  , hasOwnProperty = Object.prototype.hasOwnProperty;

require('../lib/registered-extensions').async = function (tbi, conf) {
	var waiting = create(null), cache = create(null)
	  , base = conf.memoized, original = conf.original
	  , currentCallback, currentContext, currentArgs;

	// Initial
	conf.memoized = defineLength(function (arg) {
		var args = arguments, last = args[args.length - 1];
		if (typeof last === 'function') {
			currentCallback = last;
			args = slice.call(args, 0, -1);
		}
		return base.apply(currentContext = this, currentArgs = args);
	}, base);
	try { mixin(conf.memoized, base); } catch (ignore) {}

	// From cache (sync)
	conf.on('get', function (id) {
		var cb, context, args;
		if (!currentCallback) return;

		// Unresolved
		if (waiting[id]) {
			if (typeof waiting[id] === 'function') waiting[id] = [waiting[id], currentCallback];
			else waiting[id].push(currentCallback);
			currentCallback = null;
			return;
		}

		// Resolved, assure next tick invocation
		cb = currentCallback;
		context = currentContext;
		args = currentArgs;
		currentCallback = currentContext = currentArgs = null;
		nextTick(function () {
			var data;
			if (hasOwnProperty.call(cache, id)) {
				data = cache[id];
				conf.emit('getasync', id, args, context);
				apply.call(cb, data.context, data.args);
			} else {
				// Purged in a meantime, we shouldn't rely on cached value, recall
				currentCallback = cb;
				currentContext = context;
				currentArgs = args;
				base.apply(context, args);
			}
		});
	});

	// Not from cache
	conf.original = function () {
		var args, cb, origCb, result;
		if (!currentCallback) return apply.call(original, this, arguments);
		args = aFrom(arguments);
		cb = function self(err) {
			var cb, args, id = self.id;
			if (id == null) {
				// Shouldn't happen, means async callback was called sync way
				nextTick(apply.bind(self, this, arguments));
				return;
			}
			delete self.id;
			cb = waiting[id];
			delete waiting[id];
			if (!cb) {
				// Already processed,
				// outcome of race condition: asyncFn(1, cb), asyncFn.clear(), asyncFn(1, cb)
				return;
			}
			args = aFrom(arguments);
			if (conf.has(id)) {
				if (err) {
					conf.delete(id);
				} else {
					cache[id] = { context: this, args: args };
					conf.emit('setasync', id, (typeof cb === 'function') ? 1 : cb.length);
				}
			}
			if (typeof cb === 'function') {
				result = apply.call(cb, this, args);
			} else {
				cb.forEach(function (cb) { result = apply.call(cb, this, args); }, this);
			}
			return result;
		};
		origCb = currentCallback;
		currentCallback = currentContext = currentArgs = null;
		args.push(cb);
		result = apply.call(original, this, args);
		cb.cb = origCb;
		currentCallback = cb;
		return result;
	};

	// After not from cache call
	conf.on('set', function (id) {
		if (!currentCallback) {
			conf.delete(id);
			return;
		}
		if (waiting[id]) {
			// Race condition: asyncFn(1, cb), asyncFn.clear(), asyncFn(1, cb)
			if (typeof waiting[id] === 'function') waiting[id] = [waiting[id], currentCallback.cb];
			else waiting[id].push(currentCallback.cb);
		} else {
			waiting[id] = currentCallback.cb;
		}
		delete currentCallback.cb;
		currentCallback.id = id;
		currentCallback = null;
	});

	// On delete
	conf.on('delete', function (id) {
		var result;
		// If false, we don't have value yet, so we assume that intention is not
		// to memoize this call. After value is obtained we don't cache it but
		// gracefully pass to callback
		if (hasOwnProperty.call(waiting, id)) return;
		if (!cache[id]) return;
		result = cache[id];
		delete cache[id];
		conf.emit('deleteasync', id, slice.call(result.args, 1));
	});

	// On clear
	conf.on('clear', function () {
		var oldCache = cache;
		cache = create(null);
		conf.emit('clearasync', objectMap(oldCache, function (data) {
			return slice.call(data.args, 1);
		}));
	});
};

},{"../lib/registered-extensions":168,"es5-ext/array/from":79,"es5-ext/function/_define-length":84,"es5-ext/object/map":102,"es5-ext/object/mixin":103,"next-tick":178}],161:[function(require,module,exports){
// Call dispose callback on each cache purge

'use strict';

var callable   = require('es5-ext/object/valid-callable')
  , forEach    = require('es5-ext/object/for-each')
  , extensions = require('../lib/registered-extensions')

  , apply = Function.prototype.apply;

extensions.dispose = function (dispose, conf, options) {
	var del;
	callable(dispose);
	if ((options.async && extensions.async) || (options.promise && extensions.promise)) {
		conf.on('deleteasync', del = function (id, resultArray) {
			apply.call(dispose, null, resultArray);
		});
		conf.on('clearasync', function (cache) {
			forEach(cache, function (result, id) { del(id, result); });
		});
		return;
	}
	conf.on('delete', del = function (id, result) { dispose(result); });
	conf.on('clear', function (cache) {
		forEach(cache, function (result, id) { del(id, result); });
	});
};

},{"../lib/registered-extensions":168,"es5-ext/object/for-each":97,"es5-ext/object/valid-callable":105}],162:[function(require,module,exports){
// Timeout cached values

'use strict';

var aFrom      = require('es5-ext/array/from')
  , forEach    = require('es5-ext/object/for-each')
  , nextTick   = require('next-tick')
  , isPromise  = require('is-promise')
  , timeout    = require('timers-ext/valid-timeout')
  , extensions = require('../lib/registered-extensions')

  , noop = Function.prototype
  , max = Math.max, min = Math.min, create = Object.create;

extensions.maxAge = function (maxAge, conf, options) {
	var timeouts, postfix, preFetchAge, preFetchTimeouts;

	maxAge = timeout(maxAge);
	if (!maxAge) return;

	timeouts = create(null);
	postfix = ((options.async && extensions.async) || (options.promise && extensions.promise))
		? 'async' : '';
	conf.on('set' + postfix, function (id) {
		timeouts[id] = setTimeout(function () { conf.delete(id); }, maxAge);
		if (!preFetchTimeouts) return;
		if (preFetchTimeouts[id]) {
			if (preFetchTimeouts[id] !== 'nextTick') clearTimeout(preFetchTimeouts[id]);
		}
		preFetchTimeouts[id] = setTimeout(function () {
			delete preFetchTimeouts[id];
		}, preFetchAge);
	});
	conf.on('delete' + postfix, function (id) {
		clearTimeout(timeouts[id]);
		delete timeouts[id];
		if (!preFetchTimeouts) return;
		if (preFetchTimeouts[id] !== 'nextTick') clearTimeout(preFetchTimeouts[id]);
		delete preFetchTimeouts[id];
	});

	if (options.preFetch) {
		if ((options.preFetch === true) || isNaN(options.preFetch)) {
			preFetchAge = 0.333;
		} else {
			preFetchAge = max(min(Number(options.preFetch), 1), 0);
		}
		if (preFetchAge) {
			preFetchTimeouts = {};
			preFetchAge = (1 - preFetchAge) * maxAge;
			conf.on('get' + postfix, function (id, args, context) {
				if (!preFetchTimeouts[id]) {
					preFetchTimeouts[id] = 'nextTick';
					nextTick(function () {
						var result;
						if (preFetchTimeouts[id] !== 'nextTick') return;
						delete preFetchTimeouts[id];
						conf.delete(id);
						if (options.async) {
							args = aFrom(args);
							args.push(noop);
						}
						result = conf.memoized.apply(context, args);
						if (options.promise) {
							// Supress eventual error warnings
							if (isPromise(result)) {
								if (typeof result.done === 'function') result.done(noop, noop);
								else result.then(noop, noop);
							}
						}
					});
				}
			});
		}
	}

	conf.on('clear' + postfix, function () {
		forEach(timeouts, function (id) { clearTimeout(id); });
		timeouts = {};
		if (preFetchTimeouts) {
			forEach(preFetchTimeouts, function (id) {
				if (id !== 'nextTick') clearTimeout(id);
			});
			preFetchTimeouts = {};
		}
	});
};

},{"../lib/registered-extensions":168,"es5-ext/array/from":79,"es5-ext/object/for-each":97,"is-promise":153,"next-tick":178,"timers-ext/valid-timeout":185}],163:[function(require,module,exports){
// Limit cache size, LRU (least recently used) algorithm.

'use strict';

var toPosInteger = require('es5-ext/number/to-pos-integer')
  , lruQueue     = require('lru-queue')
  , extensions   = require('../lib/registered-extensions');

extensions.max = function (max, conf, options) {
	var postfix, queue, hit;

	max = toPosInteger(max);
	if (!max) return;

	queue = lruQueue(max);
	postfix = ((options.async && extensions.async) || (options.promise && extensions.promise))
		? 'async' : '';

	conf.on('set' + postfix, hit = function (id) {
		id = queue.hit(id);
		if (id === undefined) return;
		conf.delete(id);
	});
	conf.on('get' + postfix, hit);
	conf.on('delete' + postfix, queue.delete);
	conf.on('clear' + postfix, queue.clear);
};

},{"../lib/registered-extensions":168,"es5-ext/number/to-pos-integer":92,"lru-queue":159}],164:[function(require,module,exports){
// Support for functions returning promise

'use strict';

var objectMap = require('es5-ext/object/map')
  , isPromise = require('is-promise')
  , nextTick  = require('next-tick')

  , create = Object.create, hasOwnProperty = Object.prototype.hasOwnProperty;

require('../lib/registered-extensions').promise = function (mode, conf) {
	var waiting = create(null), cache = create(null), promises = create(null);

	// After not from cache call
	conf.on('set', function (id, ignore, promise) {
		var isFailed = false;

		if (!isPromise(promise)) {
			// Non promise result
			cache[id] = promise;
			conf.emit('setasync', id, 1);
			return;
		}
		waiting[id] = 1;
		promises[id] = promise;
		var onSuccess = function (result) {
			var count = waiting[id];
			if (isFailed) {
				throw new Error("Memoizee error: Promise resolved with both failure and success," +
					" this can be result of unordered done & finally resolution.\n" +
					"Instead of `promise: true` consider configuring memoization via `promise: 'then'` or " +
					"`promise: 'done'");
			}
			if (!count) return; // deleted from cache before resolved
			delete waiting[id];
			cache[id] = result;
			conf.emit('setasync', id, count);
		};
		var onFailure = function () {
			isFailed = true;
			if (!waiting[id]) return; // deleted from cache (or succeed in case of finally)
			delete waiting[id];
			delete promises[id];
			conf.delete(id);
		};

		if ((mode !== 'then') && (typeof promise.done === 'function')) {
			// Optimal promise resolution
			if ((mode !== 'done') && (typeof promise.finally === 'function')) {
				// Use 'finally' to not register error handling (still proper behavior is subject to
				// used implementation, if library throws unconditionally even on handled errors
				// switch to 'then' mode)
				promise.done(onSuccess);
				promise.finally(onFailure);
			} else {
				// With no `finally` side effect is that it mutes any eventual
				// "Unhandled error" events on returned promise
				promise.done(onSuccess, onFailure);
			}
		} else {
			// With no `done` it's best we can do.
			// Side effect is that it mutes any eventual "Unhandled error" events on returned promise
			promise.then(function (result) {
				nextTick(onSuccess.bind(this, result));
			}, function () {
				nextTick(onFailure);
			});
		}
	});

	// From cache (sync)
	conf.on('get', function (id, args, context) {
		var promise;
		if (waiting[id]) {
			++waiting[id]; // Still waiting
			return;
		}
		promise = promises[id];
		var emit = function () { conf.emit('getasync', id, args, context); };
		if (isPromise(promise)) {
			if (typeof promise.done === 'function') promise.done(emit);
			else promise.then(function () { nextTick(emit); });
		} else {
			emit();
		}
	});

	// On delete
	conf.on('delete', function (id) {
		delete promises[id];
		if (waiting[id]) {
			delete waiting[id];
			return; // Not yet resolved
		}
		if (!hasOwnProperty.call(cache, id)) return;
		var result = cache[id];
		delete cache[id];
		conf.emit('deleteasync', id, [result]);
	});

	// On clear
	conf.on('clear', function () {
		var oldCache = cache;
		cache = create(null);
		waiting = create(null);
		promises = create(null);
		conf.emit('clearasync', objectMap(oldCache, function (data) { return [data]; }));
	});
};

},{"../lib/registered-extensions":168,"es5-ext/object/map":102,"is-promise":153,"next-tick":178}],165:[function(require,module,exports){
// Reference counter, useful for garbage collector like functionality

'use strict';

var d          = require('d')
  , extensions = require('../lib/registered-extensions')

  , create = Object.create, defineProperties = Object.defineProperties;

extensions.refCounter = function (ignore, conf, options) {
	var cache, postfix;

	cache = create(null);
	postfix = ((options.async && extensions.async) || (options.promise && extensions.promise))
		? 'async' : '';

	conf.on('set' + postfix, function (id, length) { cache[id] = length || 1; });
	conf.on('get' + postfix, function (id) { ++cache[id]; });
	conf.on('delete' + postfix, function (id) { delete cache[id]; });
	conf.on('clear' + postfix, function () { cache = {}; });

	defineProperties(conf.memoized, {
		deleteRef: d(function () {
			var id = conf.get(arguments);
			if (id === null) return null;
			if (!cache[id]) return null;
			if (!--cache[id]) {
				conf.delete(id);
				return true;
			}
			return false;
		}),
		getRefCount: d(function () {
			var id = conf.get(arguments);
			if (id === null) return 0;
			if (!cache[id]) return 0;
			return cache[id];
		})
	});
};

},{"../lib/registered-extensions":168,"d":72}],166:[function(require,module,exports){
'use strict';

var normalizeOpts = require('es5-ext/object/normalize-options')
  , resolveLength = require('./lib/resolve-length')
  , plain         = require('./plain');

module.exports = function (fn/*, options*/) {
	var options = normalizeOpts(arguments[1]), length;

	if (!options.normalizer) {
		length = options.length = resolveLength(options.length, fn.length, options.async);
		if (length !== 0) {
			if (options.primitive) {
				if (length === false) {
					options.normalizer = require('./normalizers/primitive');
				} else if (length > 1) {
					options.normalizer = require('./normalizers/get-primitive-fixed')(length);
				}
			} else {
				if (length === false) options.normalizer = require('./normalizers/get')();
				else if (length === 1) options.normalizer = require('./normalizers/get-1')();
				else options.normalizer = require('./normalizers/get-fixed')(length);
			}
		}
	}

	// Assure extensions
	if (options.async) require('./ext/async');
	if (options.promise) require('./ext/promise');
	if (options.dispose) require('./ext/dispose');
	if (options.maxAge) require('./ext/max-age');
	if (options.max) require('./ext/max');
	if (options.refCounter) require('./ext/ref-counter');

	return plain(fn, options);
};

},{"./ext/async":160,"./ext/dispose":161,"./ext/max":163,"./ext/max-age":162,"./ext/promise":164,"./ext/ref-counter":165,"./lib/resolve-length":169,"./normalizers/get":175,"./normalizers/get-1":172,"./normalizers/get-fixed":173,"./normalizers/get-primitive-fixed":174,"./normalizers/primitive":176,"./plain":177,"es5-ext/object/normalize-options":104}],167:[function(require,module,exports){
'use strict';

var customError      = require('es5-ext/error/custom')
  , defineLength     = require('es5-ext/function/_define-length')
  , d                = require('d')
  , ee               = require('event-emitter').methods
  , resolveResolve   = require('./resolve-resolve')
  , resolveNormalize = require('./resolve-normalize')

  , apply = Function.prototype.apply, call = Function.prototype.call
  , create = Object.create, hasOwnProperty = Object.prototype.hasOwnProperty
  , defineProperties = Object.defineProperties
  , on = ee.on, emit = ee.emit;

module.exports = function (original, length, options) {
	var cache = create(null), conf, memLength, get, set, del, clear, extDel,
		extGet, extHas, normalizer, getListeners, setListeners, deleteListeners, memoized, resolve;
	if (length !== false) memLength = length;
	else if (isNaN(original.length)) memLength = 1;
	else memLength = original.length;

	if (options.normalizer) {
		normalizer = resolveNormalize(options.normalizer);
		get = normalizer.get;
		set = normalizer.set;
		del = normalizer.delete;
		clear = normalizer.clear;
	}
	if (options.resolvers != null) resolve = resolveResolve(options.resolvers);

	if (get) {
		memoized = defineLength(function (arg) {
			var id, result, args = arguments;
			if (resolve) args = resolve(args);
			id = get(args);
			if (id !== null) {
				if (hasOwnProperty.call(cache, id)) {
					if (getListeners) conf.emit('get', id, args, this);
					return cache[id];
				}
			}
			if (args.length === 1) result = call.call(original, this, args[0]);
			else result = apply.call(original, this, args);
			if (id === null) {
				id = get(args);
				if (id !== null) throw customError("Circular invocation", 'CIRCULAR_INVOCATION');
				id = set(args);
			} else if (hasOwnProperty.call(cache, id)) {
				throw customError("Circular invocation", 'CIRCULAR_INVOCATION');
			}
			cache[id] = result;
			if (setListeners) conf.emit('set', id, null, result);
			return result;
		}, memLength);
	} else if (length === 0) {
		memoized = function () {
			var result;
			if (hasOwnProperty.call(cache, 'data')) {
				if (getListeners) conf.emit('get', 'data', arguments, this);
				return cache.data;
			}
			if (!arguments.length) result = call.call(original, this);
			else result = apply.call(original, this, arguments);
			if (hasOwnProperty.call(cache, 'data')) {
				throw customError("Circular invocation", 'CIRCULAR_INVOCATION');
			}
			cache.data = result;
			if (setListeners) conf.emit('set', 'data', null, result);
			return result;
		};
	} else {
		memoized = function (arg) {
			var result, args = arguments, id;
			if (resolve) args = resolve(arguments);
			id = String(args[0]);
			if (hasOwnProperty.call(cache, id)) {
				if (getListeners) conf.emit('get', id, args, this);
				return cache[id];
			}
			if (args.length === 1) result = call.call(original, this, args[0]);
			else result = apply.call(original, this, args);
			if (hasOwnProperty.call(cache, id)) {
				throw customError("Circular invocation", 'CIRCULAR_INVOCATION');
			}
			cache[id] = result;
			if (setListeners) conf.emit('set', id, null, result);
			return result;
		};
	}
	conf = {
		original: original,
		memoized: memoized,
		get: function (args) {
			if (resolve) args = resolve(args);
			if (get) return get(args);
			return String(args[0]);
		},
		has: function (id) { return hasOwnProperty.call(cache, id); },
		delete: function (id) {
			var result;
			if (!hasOwnProperty.call(cache, id)) return;
			if (del) del(id);
			result = cache[id];
			delete cache[id];
			if (deleteListeners) conf.emit('delete', id, result);
		},
		clear: function () {
			var oldCache = cache;
			if (clear) clear();
			cache = create(null);
			conf.emit('clear', oldCache);
		},
		on: function (type, listener) {
			if (type === 'get') getListeners = true;
			else if (type === 'set') setListeners = true;
			else if (type === 'delete') deleteListeners = true;
			return on.call(this, type, listener);
		},
		emit: emit,
		updateEnv: function () { original = conf.original; }
	};
	if (get) {
		extDel = defineLength(function (arg) {
			var id, args = arguments;
			if (resolve) args = resolve(args);
			id = get(args);
			if (id === null) return;
			conf.delete(id);
		}, memLength);
	} else if (length === 0) {
		extDel = function () { return conf.delete('data'); };
	} else {
		extDel = function (arg) {
			if (resolve) arg = resolve(arguments)[0];
			return conf.delete(arg);
		};
	}
	extGet = defineLength(function () {
		var id, args = arguments;
		if (resolve) args = resolve(args);
		id = get(args);
		return cache[id];
	});
	extHas = defineLength(function () {
		var id, args = arguments;
		if (resolve) args = resolve(args);
		id = get(args);
		if (id === null) return false;
		return conf.has(id);
	});
	defineProperties(memoized, {
		__memoized__: d(true),
		delete: d(extDel),
		clear: d(conf.clear),
		_get: d(extGet),
		_has: d(extHas)
	});
	return conf;
};

},{"./resolve-normalize":170,"./resolve-resolve":171,"d":72,"es5-ext/error/custom":83,"es5-ext/function/_define-length":84,"event-emitter":116}],168:[function(require,module,exports){
'use strict';

},{}],169:[function(require,module,exports){
'use strict';

var toPosInt = require('es5-ext/number/to-pos-integer');

module.exports = function (optsLength, fnLength, isAsync) {
	var length;
	if (isNaN(optsLength)) {
		length = fnLength;
		if (!(length >= 0)) return 1;
		if (isAsync && length) return length - 1;
		return length;
	}
	if (optsLength === false) return false;
	return toPosInt(optsLength);
};

},{"es5-ext/number/to-pos-integer":92}],170:[function(require,module,exports){
'use strict';

var callable = require('es5-ext/object/valid-callable');

module.exports = function (userNormalizer) {
	var normalizer;
	if (typeof userNormalizer === 'function') return { set: userNormalizer, get: userNormalizer };
	normalizer = { get: callable(userNormalizer.get) };
	if (userNormalizer.set !== undefined) {
		normalizer.set = callable(userNormalizer.set);
		if (userNormalizer.delete) normalizer.delete = callable(userNormalizer.delete);
		if (userNormalizer.clear) normalizer.clear = callable(userNormalizer.clear);
		return normalizer;
	}
	normalizer.set = normalizer.get;
	return normalizer;
};

},{"es5-ext/object/valid-callable":105}],171:[function(require,module,exports){
'use strict';

var toArray  = require('es5-ext/array/to-array')
  , callable = require('es5-ext/object/valid-callable')

  , slice = Array.prototype.slice
  , resolveArgs;

resolveArgs = function (args) {
	return this.map(function (r, i) {
		return r ? r(args[i]) : args[i];
	}).concat(slice.call(args, this.length));
};

module.exports = function (resolvers) {
	resolvers = toArray(resolvers);
	resolvers.forEach(function (r) {
		if (r != null) callable(r);
	});
	return resolveArgs.bind(resolvers);
};

},{"es5-ext/array/to-array":82,"es5-ext/object/valid-callable":105}],172:[function(require,module,exports){
'use strict';

var indexOf = require('es5-ext/array/#/e-index-of');

module.exports = function () {
	var lastId = 0, argsMap = [], cache = [];
	return {
		get: function (args) {
			var index = indexOf.call(argsMap, args[0]);
			return (index === -1) ? null : cache[index];
		},
		set: function (args) {
			argsMap.push(args[0]);
			cache.push(++lastId);
			return lastId;
		},
		delete: function (id) {
			var index = indexOf.call(cache, id);
			if (index !== -1) {
				argsMap.splice(index, 1);
				cache.splice(index, 1);
			}
		},
		clear: function () {
			argsMap = [];
			cache = [];
		}
	};
};

},{"es5-ext/array/#/e-index-of":78}],173:[function(require,module,exports){
'use strict';

var indexOf = require('es5-ext/array/#/e-index-of')
  , create = Object.create;

module.exports = function (length) {
	var lastId = 0, map = [[], []], cache = create(null);
	return {
		get: function (args) {
			var index = 0, set = map, i;
			while (index < (length - 1)) {
				i = indexOf.call(set[0], args[index]);
				if (i === -1) return null;
				set = set[1][i];
				++index;
			}
			i = indexOf.call(set[0], args[index]);
			if (i === -1) return null;
			return set[1][i] || null;
		},
		set: function (args) {
			var index = 0, set = map, i;
			while (index < (length - 1)) {
				i = indexOf.call(set[0], args[index]);
				if (i === -1) {
					i = set[0].push(args[index]) - 1;
					set[1].push([[], []]);
				}
				set = set[1][i];
				++index;
			}
			i = indexOf.call(set[0], args[index]);
			if (i === -1) {
				i = set[0].push(args[index]) - 1;
			}
			set[1][i] = ++lastId;
			cache[lastId] = args;
			return lastId;
		},
		delete: function (id) {
			var index = 0, set = map, i, path = [], args = cache[id];
			while (index < (length - 1)) {
				i = indexOf.call(set[0], args[index]);
				if (i === -1) {
					return;
				}
				path.push(set, i);
				set = set[1][i];
				++index;
			}
			i = indexOf.call(set[0], args[index]);
			if (i === -1) {
				return;
			}
			id = set[1][i];
			set[0].splice(i, 1);
			set[1].splice(i, 1);
			while (!set[0].length && path.length) {
				i = path.pop();
				set = path.pop();
				set[0].splice(i, 1);
				set[1].splice(i, 1);
			}
			delete cache[id];
		},
		clear: function () {
			map = [[], []];
			cache = create(null);
		}
	};
};

},{"es5-ext/array/#/e-index-of":78}],174:[function(require,module,exports){
'use strict';

module.exports = function (length) {
	if (!length) {
		return function () { return ''; };
	}
	return function (args) {
		var id = String(args[0]), i = 0, l = length;
		while (--l) { id += '\u0001' + args[++i]; }
		return id;
	};
};

},{}],175:[function(require,module,exports){
'use strict';

var indexOf = require('es5-ext/array/#/e-index-of')
  , create = Object.create;

module.exports = function () {
	var lastId = 0, map = [], cache = create(null);
	return {
		get: function (args) {
			var index = 0, set = map, i, length = args.length;
			if (length === 0) return set[length] || null;
			if ((set = set[length])) {
				while (index < (length - 1)) {
					i = indexOf.call(set[0], args[index]);
					if (i === -1) return null;
					set = set[1][i];
					++index;
				}
				i = indexOf.call(set[0], args[index]);
				if (i === -1) return null;
				return set[1][i] || null;
			}
			return null;
		},
		set: function (args) {
			var index = 0, set = map, i, length = args.length;
			if (length === 0) {
				set[length] = ++lastId;
			} else {
				if (!set[length]) {
					set[length] = [[], []];
				}
				set = set[length];
				while (index < (length - 1)) {
					i = indexOf.call(set[0], args[index]);
					if (i === -1) {
						i = set[0].push(args[index]) - 1;
						set[1].push([[], []]);
					}
					set = set[1][i];
					++index;
				}
				i = indexOf.call(set[0], args[index]);
				if (i === -1) {
					i = set[0].push(args[index]) - 1;
				}
				set[1][i] = ++lastId;
			}
			cache[lastId] = args;
			return lastId;
		},
		delete: function (id) {
			var index = 0, set = map, i, args = cache[id], length = args.length
			  , path = [];
			if (length === 0) {
				delete set[length];
			} else if ((set = set[length])) {
				while (index < (length - 1)) {
					i = indexOf.call(set[0], args[index]);
					if (i === -1) {
						return;
					}
					path.push(set, i);
					set = set[1][i];
					++index;
				}
				i = indexOf.call(set[0], args[index]);
				if (i === -1) {
					return;
				}
				id = set[1][i];
				set[0].splice(i, 1);
				set[1].splice(i, 1);
				while (!set[0].length && path.length) {
					i = path.pop();
					set = path.pop();
					set[0].splice(i, 1);
					set[1].splice(i, 1);
				}
			}
			delete cache[id];
		},
		clear: function () {
			map = [];
			cache = create(null);
		}
	};
};

},{"es5-ext/array/#/e-index-of":78}],176:[function(require,module,exports){
'use strict';

module.exports = function (args) {
	var id, i, length = args.length;
	if (!length) return '\u0002';
	id = String(args[i = 0]);
	while (--length) id += '\u0001' + args[++i];
	return id;
};

},{}],177:[function(require,module,exports){
'use strict';

var callable      = require('es5-ext/object/valid-callable')
  , forEach       = require('es5-ext/object/for-each')
  , extensions    = require('./lib/registered-extensions')
  , configure     = require('./lib/configure-map')
  , resolveLength = require('./lib/resolve-length')

  , hasOwnProperty = Object.prototype.hasOwnProperty;

module.exports = function self(fn/*, options */) {
	var options, length, conf;

	callable(fn);
	options = Object(arguments[1]);

	if (options.async && options.promise) {
		throw new Error("Options 'async' and 'promise' cannot be used together");
	}

	// Do not memoize already memoized function
	if (hasOwnProperty.call(fn, '__memoized__') && !options.force) return fn;

	// Resolve length;
	length = resolveLength(options.length, fn.length, options.async && extensions.async);

	// Configure cache map
	conf = configure(fn, length, options);

	// Bind eventual extensions
	forEach(extensions, function (fn, name) {
		if (options[name]) fn(options[name], conf, options);
	});

	if (self.__profiler__) self.__profiler__(conf);

	conf.updateEnv();
	return conf.memoized;
};

},{"./lib/configure-map":167,"./lib/registered-extensions":168,"./lib/resolve-length":169,"es5-ext/object/for-each":97,"es5-ext/object/valid-callable":105}],178:[function(require,module,exports){
(function (process){
'use strict';

var callable, byObserver;

callable = function (fn) {
	if (typeof fn !== 'function') throw new TypeError(fn + " is not a function");
	return fn;
};

byObserver = function (Observer) {
	var node = document.createTextNode(''), queue, currentQueue, i = 0;
	new Observer(function () {
		var callback;
		if (!queue) {
			if (!currentQueue) return;
			queue = currentQueue;
		} else if (currentQueue) {
			queue = currentQueue.concat(queue);
		}
		currentQueue = queue;
		queue = null;
		if (typeof currentQueue === 'function') {
			callback = currentQueue;
			currentQueue = null;
			callback();
			return;
		}
		node.data = (i = ++i % 2); // Invoke other batch, to handle leftover callbacks in case of crash
		while (currentQueue) {
			callback = currentQueue.shift();
			if (!currentQueue.length) currentQueue = null;
			callback();
		}
	}).observe(node, { characterData: true });
	return function (fn) {
		callable(fn);
		if (queue) {
			if (typeof queue === 'function') queue = [queue, fn];
			else queue.push(fn);
			return;
		}
		queue = fn;
		node.data = (i = ++i % 2);
	};
};

module.exports = (function () {
	// Node.js
	if ((typeof process === 'object') && process && (typeof process.nextTick === 'function')) {
		return process.nextTick;
	}

	// MutationObserver
	if ((typeof document === 'object') && document) {
		if (typeof MutationObserver === 'function') return byObserver(MutationObserver);
		if (typeof WebKitMutationObserver === 'function') return byObserver(WebKitMutationObserver);
	}

	// W3C Draft
	// http://dvcs.w3.org/hg/webperf/raw-file/tip/specs/setImmediate/Overview.html
	if (typeof setImmediate === 'function') {
		return function (cb) { setImmediate(callable(cb)); };
	}

	// Wide available standard
	if ((typeof setTimeout === 'function') || (typeof setTimeout === 'object')) {
		return function (cb) { setTimeout(callable(cb), 0); };
	}

	return null;
}());

}).call(this,require('_process'))
},{"_process":180}],179:[function(require,module,exports){
(function (global){
!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var t;"undefined"!=typeof window?t=window:"undefined"!=typeof global?t=global:"undefined"!=typeof self&&(t=self),t.objectHash=e()}}(function(){return function e(t,n,r){function o(u,a){if(!n[u]){if(!t[u]){var f="function"==typeof require&&require;if(!a&&f)return f(u,!0);if(i)return i(u,!0);throw new Error("Cannot find module '"+u+"'")}var s=n[u]={exports:{}};t[u][0].call(s.exports,function(e){var n=t[u][1][e];return o(n?n:e)},s,s.exports,e,t,n,r)}return n[u].exports}for(var i="function"==typeof require&&require,u=0;u<r.length;u++)o(r[u]);return o}({1:[function(e,t,n){(function(r,o,i,u,a,f,s,c,l){"use strict";function d(e,t){return t=h(e,t),g(e,t)}function h(e,t){if(t=t||{},t.algorithm=t.algorithm||"sha1",t.encoding=t.encoding||"hex",t.excludeValues=!!t.excludeValues,t.algorithm=t.algorithm.toLowerCase(),t.encoding=t.encoding.toLowerCase(),t.ignoreUnknown=t.ignoreUnknown===!0,t.respectType=t.respectType!==!1,t.respectFunctionNames=t.respectFunctionNames!==!1,t.respectFunctionProperties=t.respectFunctionProperties!==!1,t.unorderedArrays=t.unorderedArrays===!0,t.unorderedSets=t.unorderedSets!==!1,t.replacer=t.replacer||void 0,"undefined"==typeof e)throw new Error("Object argument required.");for(var n=0;n<v.length;++n)v[n].toLowerCase()===t.algorithm.toLowerCase()&&(t.algorithm=v[n]);if(v.indexOf(t.algorithm)===-1)throw new Error('Algorithm "'+t.algorithm+'"  not supported. supported values: '+v.join(", "));if(m.indexOf(t.encoding)===-1&&"passthrough"!==t.algorithm)throw new Error('Encoding "'+t.encoding+'"  not supported. supported values: '+m.join(", "));return t}function p(e){if("function"!=typeof e)return!1;var t=/^function\s+\w*\s*\(\s*\)\s*{\s+\[native code\]\s+}$/i;return null!=t.exec(Function.prototype.toString.call(e))}function g(e,t){var n;n="passthrough"!==t.algorithm?b.createHash(t.algorithm):new w,"undefined"==typeof n.write&&(n.write=n.update,n.end=n.update);var r=y(t,n);if(r.dispatch(e),n.update||n.end(""),n.digest)return n.digest("buffer"===t.encoding?void 0:t.encoding);var o=n.read();return"buffer"===t.encoding?o:o.toString(t.encoding)}function y(e,t,n){n=n||[];var r=function(e){return t.update?t.update(e,"utf8"):t.write(e,"utf8")};return{dispatch:function(t){e.replacer&&(t=e.replacer(t));var n=typeof t;return null===t&&(n="null"),this["_"+n](t)},_object:function(t){var o=/\[object (.*)\]/i,u=Object.prototype.toString.call(t),a=o.exec(u);a=a?a[1]:"unknown:["+u+"]",a=a.toLowerCase();var f=null;if((f=n.indexOf(t))>=0)return this.dispatch("[CIRCULAR:"+f+"]");if(n.push(t),"undefined"!=typeof i&&i.isBuffer&&i.isBuffer(t))return r("buffer:"),r(t);if("object"===a||"function"===a){var s=Object.keys(t).sort();e.respectType===!1||p(t)||s.splice(0,0,"prototype","__proto__","constructor"),r("object:"+s.length+":");var c=this;return s.forEach(function(n){c.dispatch(n),r(":"),e.excludeValues||c.dispatch(t[n]),r(",")})}if(!this["_"+a]){if(e.ignoreUnknown)return r("["+a+"]");throw new Error('Unknown object type "'+a+'"')}this["_"+a](t)},_array:function(t,o){o="undefined"!=typeof o?o:e.unorderedArrays!==!1;var i=this;if(r("array:"+t.length+":"),!o||t.length<=1)return t.forEach(function(e){return i.dispatch(e)});var u=[],a=t.map(function(t){var r=new w,o=n.slice(),i=y(e,r,o);return i.dispatch(t),u=u.concat(o.slice(n.length)),r.read().toString()});return n=n.concat(u),a.sort(),this._array(a,!1)},_date:function(e){return r("date:"+e.toJSON())},_symbol:function(e){return r("symbol:"+e.toString())},_error:function(e){return r("error:"+e.toString())},_boolean:function(e){return r("bool:"+e.toString())},_string:function(e){r("string:"+e.length+":"),r(e)},_function:function(t){r("fn:"),p(t)?this.dispatch("[native]"):this.dispatch(t.toString()),e.respectFunctionNames!==!1&&this.dispatch("function-name:"+String(t.name)),e.respectFunctionProperties&&this._object(t)},_number:function(e){return r("number:"+e.toString())},_xml:function(e){return r("xml:"+e.toString())},_null:function(){return r("Null")},_undefined:function(){return r("Undefined")},_regexp:function(e){return r("regex:"+e.toString())},_uint8array:function(e){return r("uint8array:"),this.dispatch(Array.prototype.slice.call(e))},_uint8clampedarray:function(e){return r("uint8clampedarray:"),this.dispatch(Array.prototype.slice.call(e))},_int8array:function(e){return r("uint8array:"),this.dispatch(Array.prototype.slice.call(e))},_uint16array:function(e){return r("uint16array:"),this.dispatch(Array.prototype.slice.call(e))},_int16array:function(e){return r("uint16array:"),this.dispatch(Array.prototype.slice.call(e))},_uint32array:function(e){return r("uint32array:"),this.dispatch(Array.prototype.slice.call(e))},_int32array:function(e){return r("uint32array:"),this.dispatch(Array.prototype.slice.call(e))},_float32array:function(e){return r("float32array:"),this.dispatch(Array.prototype.slice.call(e))},_float64array:function(e){return r("float64array:"),this.dispatch(Array.prototype.slice.call(e))},_arraybuffer:function(e){return r("arraybuffer:"),this.dispatch(new Uint8Array(e))},_url:function(e){return r("url:"+e.toString(),"utf8")},_map:function(t){r("map:");var n=Array.from(t);return this._array(n,e.unorderedSets!==!1)},_set:function(t){r("set:");var n=Array.from(t);return this._array(n,e.unorderedSets!==!1)},_blob:function(){if(e.ignoreUnknown)return r("[blob]");throw Error('Hashing Blob objects is currently not supported\n(see https://github.com/puleos/object-hash/issues/26)\nUse "options.replacer" or "options.ignoreUnknown"\n')},_domwindow:function(){return r("domwindow")},_process:function(){return r("process")},_timer:function(){return r("timer")},_pipe:function(){return r("pipe")},_tcp:function(){return r("tcp")},_udp:function(){return r("udp")},_tty:function(){return r("tty")},_statwatcher:function(){return r("statwatcher")},_securecontext:function(){return r("securecontext")},_connection:function(){return r("connection")},_zlib:function(){return r("zlib")},_context:function(){return r("context")},_nodescript:function(){return r("nodescript")},_httpparser:function(){return r("httpparser")},_dataview:function(){return r("dataview")},_signal:function(){return r("signal")},_fsevent:function(){return r("fsevent")},_tlswrap:function(){return r("tlswrap")}}}function w(){return{buf:"",write:function(e){this.buf+=e},end:function(e){this.buf+=e},read:function(){return this.buf}}}var b=e("crypto");n=t.exports=d,n.sha1=function(e){return d(e)},n.keys=function(e){return d(e,{excludeValues:!0,algorithm:"sha1",encoding:"hex"})},n.MD5=function(e){return d(e,{algorithm:"md5",encoding:"hex"})},n.keysMD5=function(e){return d(e,{algorithm:"md5",encoding:"hex",excludeValues:!0})};var v=b.getHashes?b.getHashes().slice():["sha1","md5"];v.push("passthrough");var m=["buffer","hex","binary","base64"];n.writeToStream=function(e,t,n){return"undefined"==typeof n&&(n=t,t={}),t=h(e,t),y(t,n).dispatch(e)}}).call(this,e("lYpoI2"),"undefined"!=typeof self?self:"undefined"!=typeof window?window:{},e("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/fake_8c3adc78.js","/")},{buffer:3,crypto:5,lYpoI2:10}],2:[function(e,t,n){(function(e,t,r,o,i,u,a,f,s){var c="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";!function(e){"use strict";function t(e){var t=e.charCodeAt(0);return t===i||t===l?62:t===u||t===d?63:t<a?-1:t<a+10?t-a+26+26:t<s+26?t-s:t<f+26?t-f+26:void 0}function n(e){function n(e){s[l++]=e}var r,i,u,a,f,s;if(e.length%4>0)throw new Error("Invalid string. Length must be a multiple of 4");var c=e.length;f="="===e.charAt(c-2)?2:"="===e.charAt(c-1)?1:0,s=new o(3*e.length/4-f),u=f>0?e.length-4:e.length;var l=0;for(r=0,i=0;r<u;r+=4,i+=3)a=t(e.charAt(r))<<18|t(e.charAt(r+1))<<12|t(e.charAt(r+2))<<6|t(e.charAt(r+3)),n((16711680&a)>>16),n((65280&a)>>8),n(255&a);return 2===f?(a=t(e.charAt(r))<<2|t(e.charAt(r+1))>>4,n(255&a)):1===f&&(a=t(e.charAt(r))<<10|t(e.charAt(r+1))<<4|t(e.charAt(r+2))>>2,n(a>>8&255),n(255&a)),s}function r(e){function t(e){return c.charAt(e)}function n(e){return t(e>>18&63)+t(e>>12&63)+t(e>>6&63)+t(63&e)}var r,o,i,u=e.length%3,a="";for(r=0,i=e.length-u;r<i;r+=3)o=(e[r]<<16)+(e[r+1]<<8)+e[r+2],a+=n(o);switch(u){case 1:o=e[e.length-1],a+=t(o>>2),a+=t(o<<4&63),a+="==";break;case 2:o=(e[e.length-2]<<8)+e[e.length-1],a+=t(o>>10),a+=t(o>>4&63),a+=t(o<<2&63),a+="="}return a}var o="undefined"!=typeof Uint8Array?Uint8Array:Array,i="+".charCodeAt(0),u="/".charCodeAt(0),a="0".charCodeAt(0),f="a".charCodeAt(0),s="A".charCodeAt(0),l="-".charCodeAt(0),d="_".charCodeAt(0);e.toByteArray=n,e.fromByteArray=r}("undefined"==typeof n?this.base64js={}:n)}).call(this,e("lYpoI2"),"undefined"!=typeof self?self:"undefined"!=typeof window?window:{},e("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/gulp-browserify/node_modules/base64-js/lib/b64.js","/node_modules/gulp-browserify/node_modules/base64-js/lib")},{buffer:3,lYpoI2:10}],3:[function(e,t,n){(function(t,r,o,i,u,a,f,s,c){function o(e,t,n){if(!(this instanceof o))return new o(e,t,n);var r=typeof e;if("base64"===t&&"string"===r)for(e=N(e);e.length%4!==0;)e+="=";var i;if("number"===r)i=F(e);else if("string"===r)i=o.byteLength(e,t);else{if("object"!==r)throw new Error("First argument needs to be a number, array or string.");i=F(e.length)}var u;o._useTypedArrays?u=o._augment(new Uint8Array(i)):(u=this,u.length=i,u._isBuffer=!0);var a;if(o._useTypedArrays&&"number"==typeof e.byteLength)u._set(e);else if(O(e))for(a=0;a<i;a++)o.isBuffer(e)?u[a]=e.readUInt8(a):u[a]=e[a];else if("string"===r)u.write(e,0,t);else if("number"===r&&!o._useTypedArrays&&!n)for(a=0;a<i;a++)u[a]=0;return u}function l(e,t,n,r){n=Number(n)||0;var i=e.length-n;r?(r=Number(r),r>i&&(r=i)):r=i;var u=t.length;G(u%2===0,"Invalid hex string"),r>u/2&&(r=u/2);for(var a=0;a<r;a++){var f=parseInt(t.substr(2*a,2),16);G(!isNaN(f),"Invalid hex string"),e[n+a]=f}return o._charsWritten=2*a,a}function d(e,t,n,r){var i=o._charsWritten=W(V(t),e,n,r);return i}function h(e,t,n,r){var i=o._charsWritten=W(q(t),e,n,r);return i}function p(e,t,n,r){return h(e,t,n,r)}function g(e,t,n,r){var i=o._charsWritten=W(R(t),e,n,r);return i}function y(e,t,n,r){var i=o._charsWritten=W(P(t),e,n,r);return i}function w(e,t,n){return 0===t&&n===e.length?K.fromByteArray(e):K.fromByteArray(e.slice(t,n))}function b(e,t,n){var r="",o="";n=Math.min(e.length,n);for(var i=t;i<n;i++)e[i]<=127?(r+=J(o)+String.fromCharCode(e[i]),o=""):o+="%"+e[i].toString(16);return r+J(o)}function v(e,t,n){var r="";n=Math.min(e.length,n);for(var o=t;o<n;o++)r+=String.fromCharCode(e[o]);return r}function m(e,t,n){return v(e,t,n)}function _(e,t,n){var r=e.length;(!t||t<0)&&(t=0),(!n||n<0||n>r)&&(n=r);for(var o="",i=t;i<n;i++)o+=H(e[i]);return o}function E(e,t,n){for(var r=e.slice(t,n),o="",i=0;i<r.length;i+=2)o+=String.fromCharCode(r[i]+256*r[i+1]);return o}function I(e,t,n,r){r||(G("boolean"==typeof n,"missing or invalid endian"),G(void 0!==t&&null!==t,"missing offset"),G(t+1<e.length,"Trying to read beyond buffer length"));var o=e.length;if(!(t>=o)){var i;return n?(i=e[t],t+1<o&&(i|=e[t+1]<<8)):(i=e[t]<<8,t+1<o&&(i|=e[t+1])),i}}function A(e,t,n,r){r||(G("boolean"==typeof n,"missing or invalid endian"),G(void 0!==t&&null!==t,"missing offset"),G(t+3<e.length,"Trying to read beyond buffer length"));var o=e.length;if(!(t>=o)){var i;return n?(t+2<o&&(i=e[t+2]<<16),t+1<o&&(i|=e[t+1]<<8),i|=e[t],t+3<o&&(i+=e[t+3]<<24>>>0)):(t+1<o&&(i=e[t+1]<<16),t+2<o&&(i|=e[t+2]<<8),t+3<o&&(i|=e[t+3]),i+=e[t]<<24>>>0),i}}function B(e,t,n,r){r||(G("boolean"==typeof n,"missing or invalid endian"),G(void 0!==t&&null!==t,"missing offset"),G(t+1<e.length,"Trying to read beyond buffer length"));var o=e.length;if(!(t>=o)){var i=I(e,t,n,!0),u=32768&i;return u?(65535-i+1)*-1:i}}function L(e,t,n,r){r||(G("boolean"==typeof n,"missing or invalid endian"),G(void 0!==t&&null!==t,"missing offset"),G(t+3<e.length,"Trying to read beyond buffer length"));var o=e.length;if(!(t>=o)){var i=A(e,t,n,!0),u=2147483648&i;return u?(4294967295-i+1)*-1:i}}function U(e,t,n,r){return r||(G("boolean"==typeof n,"missing or invalid endian"),G(t+3<e.length,"Trying to read beyond buffer length")),Q.read(e,t,n,23,4)}function x(e,t,n,r){return r||(G("boolean"==typeof n,"missing or invalid endian"),G(t+7<e.length,"Trying to read beyond buffer length")),Q.read(e,t,n,52,8)}function S(e,t,n,r,o){o||(G(void 0!==t&&null!==t,"missing value"),G("boolean"==typeof r,"missing or invalid endian"),G(void 0!==n&&null!==n,"missing offset"),G(n+1<e.length,"trying to write beyond buffer length"),z(t,65535));var i=e.length;if(!(n>=i))for(var u=0,a=Math.min(i-n,2);u<a;u++)e[n+u]=(t&255<<8*(r?u:1-u))>>>8*(r?u:1-u)}function C(e,t,n,r,o){o||(G(void 0!==t&&null!==t,"missing value"),G("boolean"==typeof r,"missing or invalid endian"),G(void 0!==n&&null!==n,"missing offset"),G(n+3<e.length,"trying to write beyond buffer length"),z(t,4294967295));var i=e.length;if(!(n>=i))for(var u=0,a=Math.min(i-n,4);u<a;u++)e[n+u]=t>>>8*(r?u:3-u)&255}function j(e,t,n,r,o){o||(G(void 0!==t&&null!==t,"missing value"),G("boolean"==typeof r,"missing or invalid endian"),G(void 0!==n&&null!==n,"missing offset"),G(n+1<e.length,"Trying to write beyond buffer length"),X(t,32767,-32768));var i=e.length;n>=i||(t>=0?S(e,t,n,r,o):S(e,65535+t+1,n,r,o))}function k(e,t,n,r,o){o||(G(void 0!==t&&null!==t,"missing value"),G("boolean"==typeof r,"missing or invalid endian"),G(void 0!==n&&null!==n,"missing offset"),G(n+3<e.length,"Trying to write beyond buffer length"),X(t,2147483647,-2147483648));var i=e.length;n>=i||(t>=0?C(e,t,n,r,o):C(e,4294967295+t+1,n,r,o))}function T(e,t,n,r,o){o||(G(void 0!==t&&null!==t,"missing value"),G("boolean"==typeof r,"missing or invalid endian"),G(void 0!==n&&null!==n,"missing offset"),G(n+3<e.length,"Trying to write beyond buffer length"),$(t,3.4028234663852886e38,-3.4028234663852886e38));var i=e.length;n>=i||Q.write(e,t,n,r,23,4)}function M(e,t,n,r,o){o||(G(void 0!==t&&null!==t,"missing value"),G("boolean"==typeof r,"missing or invalid endian"),G(void 0!==n&&null!==n,"missing offset"),G(n+7<e.length,"Trying to write beyond buffer length"),$(t,1.7976931348623157e308,-1.7976931348623157e308));var i=e.length;n>=i||Q.write(e,t,n,r,52,8)}function N(e){return e.trim?e.trim():e.replace(/^\s+|\s+$/g,"")}function Y(e,t,n){return"number"!=typeof e?n:(e=~~e,e>=t?t:e>=0?e:(e+=t,e>=0?e:0))}function F(e){return e=~~Math.ceil(+e),e<0?0:e}function D(e){return(Array.isArray||function(e){return"[object Array]"===Object.prototype.toString.call(e)})(e)}function O(e){return D(e)||o.isBuffer(e)||e&&"object"==typeof e&&"number"==typeof e.length}function H(e){return e<16?"0"+e.toString(16):e.toString(16)}function V(e){for(var t=[],n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<=127)t.push(e.charCodeAt(n));else{var o=n;r>=55296&&r<=57343&&n++;for(var i=encodeURIComponent(e.slice(o,n+1)).substr(1).split("%"),u=0;u<i.length;u++)t.push(parseInt(i[u],16))}}return t}function q(e){for(var t=[],n=0;n<e.length;n++)t.push(255&e.charCodeAt(n));return t}function P(e){for(var t,n,r,o=[],i=0;i<e.length;i++)t=e.charCodeAt(i),n=t>>8,r=t%256,o.push(r),o.push(n);return o}function R(e){return K.toByteArray(e)}function W(e,t,n,r){for(var o=0;o<r&&!(o+n>=t.length||o>=e.length);o++)t[o+n]=e[o];return o}function J(e){try{return decodeURIComponent(e)}catch(t){return String.fromCharCode(65533)}}function z(e,t){G("number"==typeof e,"cannot write a non-number as a number"),G(e>=0,"specified a negative value for writing an unsigned value"),G(e<=t,"value is larger than maximum value for type"),G(Math.floor(e)===e,"value has a fractional component")}function X(e,t,n){G("number"==typeof e,"cannot write a non-number as a number"),G(e<=t,"value larger than maximum allowed value"),G(e>=n,"value smaller than minimum allowed value"),G(Math.floor(e)===e,"value has a fractional component")}function $(e,t,n){G("number"==typeof e,"cannot write a non-number as a number"),G(e<=t,"value larger than maximum allowed value"),G(e>=n,"value smaller than minimum allowed value")}function G(e,t){if(!e)throw new Error(t||"Failed assertion")}var K=e("base64-js"),Q=e("ieee754");n.Buffer=o,n.SlowBuffer=o,n.INSPECT_MAX_BYTES=50,o.poolSize=8192,o._useTypedArrays=function(){try{var e=new ArrayBuffer(0),t=new Uint8Array(e);return t.foo=function(){return 42},42===t.foo()&&"function"==typeof t.subarray}catch(n){return!1}}(),o.isEncoding=function(e){switch(String(e).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"binary":case"base64":case"raw":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return!0;default:return!1}},o.isBuffer=function(e){return!(null===e||void 0===e||!e._isBuffer)},o.byteLength=function(e,t){var n;switch(e+="",t||"utf8"){case"hex":n=e.length/2;break;case"utf8":case"utf-8":n=V(e).length;break;case"ascii":case"binary":case"raw":n=e.length;break;case"base64":n=R(e).length;break;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":n=2*e.length;break;default:throw new Error("Unknown encoding")}return n},o.concat=function(e,t){if(G(D(e),"Usage: Buffer.concat(list, [totalLength])\nlist should be an Array."),0===e.length)return new o(0);if(1===e.length)return e[0];var n;if("number"!=typeof t)for(t=0,n=0;n<e.length;n++)t+=e[n].length;var r=new o(t),i=0;for(n=0;n<e.length;n++){var u=e[n];u.copy(r,i),i+=u.length}return r},o.prototype.write=function(e,t,n,r){if(isFinite(t))isFinite(n)||(r=n,n=void 0);else{var o=r;r=t,t=n,n=o}t=Number(t)||0;var i=this.length-t;n?(n=Number(n),n>i&&(n=i)):n=i,r=String(r||"utf8").toLowerCase();var u;switch(r){case"hex":u=l(this,e,t,n);break;case"utf8":case"utf-8":u=d(this,e,t,n);break;case"ascii":u=h(this,e,t,n);break;case"binary":u=p(this,e,t,n);break;case"base64":u=g(this,e,t,n);break;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":u=y(this,e,t,n);break;default:throw new Error("Unknown encoding")}return u},o.prototype.toString=function(e,t,n){var r=this;if(e=String(e||"utf8").toLowerCase(),t=Number(t)||0,n=void 0!==n?Number(n):n=r.length,n===t)return"";var o;switch(e){case"hex":o=_(r,t,n);break;case"utf8":case"utf-8":o=b(r,t,n);break;case"ascii":o=v(r,t,n);break;case"binary":o=m(r,t,n);break;case"base64":o=w(r,t,n);break;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":o=E(r,t,n);break;default:throw new Error("Unknown encoding")}return o},o.prototype.toJSON=function(){return{type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}},o.prototype.copy=function(e,t,n,r){var i=this;if(n||(n=0),r||0===r||(r=this.length),t||(t=0),r!==n&&0!==e.length&&0!==i.length){G(r>=n,"sourceEnd < sourceStart"),G(t>=0&&t<e.length,"targetStart out of bounds"),G(n>=0&&n<i.length,"sourceStart out of bounds"),G(r>=0&&r<=i.length,"sourceEnd out of bounds"),r>this.length&&(r=this.length),e.length-t<r-n&&(r=e.length-t+n);var u=r-n;if(u<100||!o._useTypedArrays)for(var a=0;a<u;a++)e[a+t]=this[a+n];else e._set(this.subarray(n,n+u),t)}},o.prototype.slice=function(e,t){var n=this.length;if(e=Y(e,n,0),t=Y(t,n,n),o._useTypedArrays)return o._augment(this.subarray(e,t));for(var r=t-e,i=new o(r,(void 0),(!0)),u=0;u<r;u++)i[u]=this[u+e];return i},o.prototype.get=function(e){return console.log(".get() is deprecated. Access using array indexes instead."),this.readUInt8(e)},o.prototype.set=function(e,t){return console.log(".set() is deprecated. Access using array indexes instead."),this.writeUInt8(e,t)},o.prototype.readUInt8=function(e,t){if(t||(G(void 0!==e&&null!==e,"missing offset"),G(e<this.length,"Trying to read beyond buffer length")),!(e>=this.length))return this[e]},o.prototype.readUInt16LE=function(e,t){return I(this,e,!0,t)},o.prototype.readUInt16BE=function(e,t){return I(this,e,!1,t)},o.prototype.readUInt32LE=function(e,t){return A(this,e,!0,t)},o.prototype.readUInt32BE=function(e,t){return A(this,e,!1,t)},o.prototype.readInt8=function(e,t){if(t||(G(void 0!==e&&null!==e,"missing offset"),G(e<this.length,"Trying to read beyond buffer length")),!(e>=this.length)){var n=128&this[e];return n?(255-this[e]+1)*-1:this[e]}},o.prototype.readInt16LE=function(e,t){return B(this,e,!0,t)},o.prototype.readInt16BE=function(e,t){return B(this,e,!1,t)},o.prototype.readInt32LE=function(e,t){return L(this,e,!0,t)},o.prototype.readInt32BE=function(e,t){return L(this,e,!1,t)},o.prototype.readFloatLE=function(e,t){return U(this,e,!0,t)},o.prototype.readFloatBE=function(e,t){return U(this,e,!1,t)},o.prototype.readDoubleLE=function(e,t){return x(this,e,!0,t)},o.prototype.readDoubleBE=function(e,t){return x(this,e,!1,t)},o.prototype.writeUInt8=function(e,t,n){n||(G(void 0!==e&&null!==e,"missing value"),G(void 0!==t&&null!==t,"missing offset"),G(t<this.length,"trying to write beyond buffer length"),z(e,255)),t>=this.length||(this[t]=e)},o.prototype.writeUInt16LE=function(e,t,n){S(this,e,t,!0,n)},o.prototype.writeUInt16BE=function(e,t,n){S(this,e,t,!1,n)},o.prototype.writeUInt32LE=function(e,t,n){C(this,e,t,!0,n)},o.prototype.writeUInt32BE=function(e,t,n){C(this,e,t,!1,n)},o.prototype.writeInt8=function(e,t,n){n||(G(void 0!==e&&null!==e,"missing value"),G(void 0!==t&&null!==t,"missing offset"),G(t<this.length,"Trying to write beyond buffer length"),X(e,127,-128)),t>=this.length||(e>=0?this.writeUInt8(e,t,n):this.writeUInt8(255+e+1,t,n))},o.prototype.writeInt16LE=function(e,t,n){j(this,e,t,!0,n)},o.prototype.writeInt16BE=function(e,t,n){j(this,e,t,!1,n)},o.prototype.writeInt32LE=function(e,t,n){k(this,e,t,!0,n)},o.prototype.writeInt32BE=function(e,t,n){k(this,e,t,!1,n)},o.prototype.writeFloatLE=function(e,t,n){T(this,e,t,!0,n)},o.prototype.writeFloatBE=function(e,t,n){T(this,e,t,!1,n)},o.prototype.writeDoubleLE=function(e,t,n){M(this,e,t,!0,n)},o.prototype.writeDoubleBE=function(e,t,n){M(this,e,t,!1,n)},o.prototype.fill=function(e,t,n){if(e||(e=0),t||(t=0),n||(n=this.length),"string"==typeof e&&(e=e.charCodeAt(0)),G("number"==typeof e&&!isNaN(e),"value is not a number"),G(n>=t,"end < start"),n!==t&&0!==this.length){G(t>=0&&t<this.length,"start out of bounds"),G(n>=0&&n<=this.length,"end out of bounds");for(var r=t;r<n;r++)this[r]=e}},o.prototype.inspect=function(){for(var e=[],t=this.length,r=0;r<t;r++)if(e[r]=H(this[r]),r===n.INSPECT_MAX_BYTES){e[r+1]="...";break}return"<Buffer "+e.join(" ")+">"},o.prototype.toArrayBuffer=function(){if("undefined"!=typeof Uint8Array){if(o._useTypedArrays)return new o(this).buffer;for(var e=new Uint8Array(this.length),t=0,n=e.length;t<n;t+=1)e[t]=this[t];return e.buffer}throw new Error("Buffer.toArrayBuffer not supported in this browser")};var Z=o.prototype;o._augment=function(e){return e._isBuffer=!0,e._get=e.get,e._set=e.set,e.get=Z.get,e.set=Z.set,e.write=Z.write,e.toString=Z.toString,e.toLocaleString=Z.toString,e.toJSON=Z.toJSON,e.copy=Z.copy,e.slice=Z.slice,e.readUInt8=Z.readUInt8,e.readUInt16LE=Z.readUInt16LE,e.readUInt16BE=Z.readUInt16BE,e.readUInt32LE=Z.readUInt32LE,e.readUInt32BE=Z.readUInt32BE,e.readInt8=Z.readInt8,e.readInt16LE=Z.readInt16LE,e.readInt16BE=Z.readInt16BE,e.readInt32LE=Z.readInt32LE,e.readInt32BE=Z.readInt32BE,e.readFloatLE=Z.readFloatLE,e.readFloatBE=Z.readFloatBE,e.readDoubleLE=Z.readDoubleLE,e.readDoubleBE=Z.readDoubleBE,e.writeUInt8=Z.writeUInt8,e.writeUInt16LE=Z.writeUInt16LE,e.writeUInt16BE=Z.writeUInt16BE,e.writeUInt32LE=Z.writeUInt32LE,e.writeUInt32BE=Z.writeUInt32BE,e.writeInt8=Z.writeInt8,e.writeInt16LE=Z.writeInt16LE,e.writeInt16BE=Z.writeInt16BE,e.writeInt32LE=Z.writeInt32LE,e.writeInt32BE=Z.writeInt32BE,e.writeFloatLE=Z.writeFloatLE,e.writeFloatBE=Z.writeFloatBE,e.writeDoubleLE=Z.writeDoubleLE,e.writeDoubleBE=Z.writeDoubleBE,e.fill=Z.fill,e.inspect=Z.inspect,e.toArrayBuffer=Z.toArrayBuffer,e}}).call(this,e("lYpoI2"),"undefined"!=typeof self?self:"undefined"!=typeof window?window:{},e("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/gulp-browserify/node_modules/buffer/index.js","/node_modules/gulp-browserify/node_modules/buffer")},{"base64-js":2,buffer:3,ieee754:11,lYpoI2:10}],4:[function(e,t,n){(function(n,r,o,i,u,a,f,s,c){function l(e,t){if(e.length%p!==0){var n=e.length+(p-e.length%p);e=o.concat([e,g],n)}for(var r=[],i=t?e.readInt32BE:e.readInt32LE,u=0;u<e.length;u+=p)r.push(i.call(e,u));return r}function d(e,t,n){for(var r=new o(t),i=n?r.writeInt32BE:r.writeInt32LE,u=0;u<e.length;u++)i.call(r,e[u],4*u,!0);return r}function h(e,t,n,r){o.isBuffer(e)||(e=new o(e));var i=t(l(e,r),e.length*y);return d(i,n,r)}var o=e("buffer").Buffer,p=4,g=new o(p);g.fill(0);var y=8;t.exports={hash:h}}).call(this,e("lYpoI2"),"undefined"!=typeof self?self:"undefined"!=typeof window?window:{},e("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/gulp-browserify/node_modules/crypto-browserify/helpers.js","/node_modules/gulp-browserify/node_modules/crypto-browserify")},{buffer:3,lYpoI2:10}],5:[function(e,t,n){(function(t,r,o,i,u,a,f,s,c){function l(e,t,n){o.isBuffer(t)||(t=new o(t)),o.isBuffer(n)||(n=new o(n)),t.length>m?t=e(t):t.length<m&&(t=o.concat([t,_],m));for(var r=new o(m),i=new o(m),u=0;u<m;u++)r[u]=54^t[u],i[u]=92^t[u];var a=e(o.concat([r,n]));return e(o.concat([i,a]))}function d(e,t){e=e||"sha1";var n=v[e],r=[],i=0;return n||h("algorithm:",e,"is not yet supported"),{update:function(e){return o.isBuffer(e)||(e=new o(e)),r.push(e),i+=e.length,this},digest:function(e){var i=o.concat(r),u=t?l(n,t,i):n(i);return r=null,e?u.toString(e):u}}}function h(){var e=[].slice.call(arguments).join(" ");throw new Error([e,"we accept pull requests","http://github.com/dominictarr/crypto-browserify"].join("\n"))}function p(e,t){for(var n in e)t(e[n],n)}var o=e("buffer").Buffer,g=e("./sha"),y=e("./sha256"),w=e("./rng"),b=e("./md5"),v={sha1:g,sha256:y,md5:b},m=64,_=new o(m);_.fill(0),n.createHash=function(e){return d(e)},n.createHmac=function(e,t){return d(e,t)},n.randomBytes=function(e,t){if(!t||!t.call)return new o(w(e));try{t.call(this,void 0,new o(w(e)))}catch(n){t(n)}},p(["createCredentials","createCipher","createCipheriv","createDecipher","createDecipheriv","createSign","createVerify","createDiffieHellman","pbkdf2"],function(e){n[e]=function(){h("sorry,",e,"is not implemented yet")}})}).call(this,e("lYpoI2"),"undefined"!=typeof self?self:"undefined"!=typeof window?window:{},e("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/gulp-browserify/node_modules/crypto-browserify/index.js","/node_modules/gulp-browserify/node_modules/crypto-browserify")},{"./md5":6,"./rng":7,"./sha":8,"./sha256":9,buffer:3,lYpoI2:10}],6:[function(e,t,n){(function(n,r,o,i,u,a,f,s,c){function l(e,t){e[t>>5]|=128<<t%32,e[(t+64>>>9<<4)+14]=t;for(var n=1732584193,r=-271733879,o=-1732584194,i=271733878,u=0;u<e.length;u+=16){var a=n,f=r,s=o,c=i;n=h(n,r,o,i,e[u+0],7,-680876936),i=h(i,n,r,o,e[u+1],12,-389564586),o=h(o,i,n,r,e[u+2],17,606105819),r=h(r,o,i,n,e[u+3],22,-1044525330),n=h(n,r,o,i,e[u+4],7,-176418897),i=h(i,n,r,o,e[u+5],12,1200080426),o=h(o,i,n,r,e[u+6],17,-1473231341),r=h(r,o,i,n,e[u+7],22,-45705983),n=h(n,r,o,i,e[u+8],7,1770035416),i=h(i,n,r,o,e[u+9],12,-1958414417),o=h(o,i,n,r,e[u+10],17,-42063),r=h(r,o,i,n,e[u+11],22,-1990404162),n=h(n,r,o,i,e[u+12],7,1804603682),i=h(i,n,r,o,e[u+13],12,-40341101),o=h(o,i,n,r,e[u+14],17,-1502002290),r=h(r,o,i,n,e[u+15],22,1236535329),n=p(n,r,o,i,e[u+1],5,-165796510),i=p(i,n,r,o,e[u+6],9,-1069501632),o=p(o,i,n,r,e[u+11],14,643717713),r=p(r,o,i,n,e[u+0],20,-373897302),n=p(n,r,o,i,e[u+5],5,-701558691),i=p(i,n,r,o,e[u+10],9,38016083),o=p(o,i,n,r,e[u+15],14,-660478335),r=p(r,o,i,n,e[u+4],20,-405537848),n=p(n,r,o,i,e[u+9],5,568446438),i=p(i,n,r,o,e[u+14],9,-1019803690),o=p(o,i,n,r,e[u+3],14,-187363961),r=p(r,o,i,n,e[u+8],20,1163531501),n=p(n,r,o,i,e[u+13],5,-1444681467),i=p(i,n,r,o,e[u+2],9,-51403784),o=p(o,i,n,r,e[u+7],14,1735328473),r=p(r,o,i,n,e[u+12],20,-1926607734),n=g(n,r,o,i,e[u+5],4,-378558),i=g(i,n,r,o,e[u+8],11,-2022574463),o=g(o,i,n,r,e[u+11],16,1839030562),r=g(r,o,i,n,e[u+14],23,-35309556),n=g(n,r,o,i,e[u+1],4,-1530992060),i=g(i,n,r,o,e[u+4],11,1272893353),o=g(o,i,n,r,e[u+7],16,-155497632),r=g(r,o,i,n,e[u+10],23,-1094730640),n=g(n,r,o,i,e[u+13],4,681279174),i=g(i,n,r,o,e[u+0],11,-358537222),o=g(o,i,n,r,e[u+3],16,-722521979),r=g(r,o,i,n,e[u+6],23,76029189),n=g(n,r,o,i,e[u+9],4,-640364487),i=g(i,n,r,o,e[u+12],11,-421815835),o=g(o,i,n,r,e[u+15],16,530742520),r=g(r,o,i,n,e[u+2],23,-995338651),n=y(n,r,o,i,e[u+0],6,-198630844),i=y(i,n,r,o,e[u+7],10,1126891415),o=y(o,i,n,r,e[u+14],15,-1416354905),r=y(r,o,i,n,e[u+5],21,-57434055),n=y(n,r,o,i,e[u+12],6,1700485571),i=y(i,n,r,o,e[u+3],10,-1894986606),o=y(o,i,n,r,e[u+10],15,-1051523),r=y(r,o,i,n,e[u+1],21,-2054922799),n=y(n,r,o,i,e[u+8],6,1873313359),i=y(i,n,r,o,e[u+15],10,-30611744),o=y(o,i,n,r,e[u+6],15,-1560198380),r=y(r,o,i,n,e[u+13],21,1309151649),n=y(n,r,o,i,e[u+4],6,-145523070),i=y(i,n,r,o,e[u+11],10,-1120210379),o=y(o,i,n,r,e[u+2],15,718787259),r=y(r,o,i,n,e[u+9],21,-343485551),n=w(n,a),r=w(r,f),o=w(o,s),i=w(i,c)}return Array(n,r,o,i)}function d(e,t,n,r,o,i){return w(b(w(w(t,e),w(r,i)),o),n)}function h(e,t,n,r,o,i,u){return d(t&n|~t&r,e,t,o,i,u)}function p(e,t,n,r,o,i,u){return d(t&r|n&~r,e,t,o,i,u)}function g(e,t,n,r,o,i,u){return d(t^n^r,e,t,o,i,u)}function y(e,t,n,r,o,i,u){return d(n^(t|~r),e,t,o,i,u)}function w(e,t){var n=(65535&e)+(65535&t),r=(e>>16)+(t>>16)+(n>>16);return r<<16|65535&n}function b(e,t){return e<<t|e>>>32-t}var v=e("./helpers");t.exports=function(e){return v.hash(e,l,16)}}).call(this,e("lYpoI2"),"undefined"!=typeof self?self:"undefined"!=typeof window?window:{},e("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/gulp-browserify/node_modules/crypto-browserify/md5.js","/node_modules/gulp-browserify/node_modules/crypto-browserify")},{"./helpers":4,buffer:3,lYpoI2:10}],7:[function(e,t,n){(function(e,n,r,o,i,u,a,f,s){!function(){var e,n,r=this;e=function(e){for(var t,t,n=new Array(e),r=0;r<e;r++)0==(3&r)&&(t=4294967296*Math.random()),n[r]=t>>>((3&r)<<3)&255;return n},r.crypto&&crypto.getRandomValues&&(n=function(e){var t=new Uint8Array(e);return crypto.getRandomValues(t),t}),t.exports=n||e}()}).call(this,e("lYpoI2"),"undefined"!=typeof self?self:"undefined"!=typeof window?window:{},e("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/gulp-browserify/node_modules/crypto-browserify/rng.js","/node_modules/gulp-browserify/node_modules/crypto-browserify")},{buffer:3,lYpoI2:10}],8:[function(e,t,n){(function(n,r,o,i,u,a,f,s,c){function l(e,t){e[t>>5]|=128<<24-t%32,e[(t+64>>9<<4)+15]=t;for(var n=Array(80),r=1732584193,o=-271733879,i=-1732584194,u=271733878,a=-1009589776,f=0;f<e.length;f+=16){for(var s=r,c=o,l=i,y=u,w=a,b=0;b<80;b++){b<16?n[b]=e[f+b]:n[b]=g(n[b-3]^n[b-8]^n[b-14]^n[b-16],1);var v=p(p(g(r,5),d(b,o,i,u)),p(p(a,n[b]),h(b)));a=u,u=i,i=g(o,30),o=r,r=v}r=p(r,s),o=p(o,c),i=p(i,l),u=p(u,y),a=p(a,w)}return Array(r,o,i,u,a)}function d(e,t,n,r){return e<20?t&n|~t&r:e<40?t^n^r:e<60?t&n|t&r|n&r:t^n^r}function h(e){return e<20?1518500249:e<40?1859775393:e<60?-1894007588:-899497514}function p(e,t){var n=(65535&e)+(65535&t),r=(e>>16)+(t>>16)+(n>>16);return r<<16|65535&n}function g(e,t){return e<<t|e>>>32-t}var y=e("./helpers");t.exports=function(e){return y.hash(e,l,20,!0)}}).call(this,e("lYpoI2"),"undefined"!=typeof self?self:"undefined"!=typeof window?window:{},e("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/gulp-browserify/node_modules/crypto-browserify/sha.js","/node_modules/gulp-browserify/node_modules/crypto-browserify")},{"./helpers":4,buffer:3,lYpoI2:10}],9:[function(e,t,n){(function(n,r,o,i,u,a,f,s,c){var l=e("./helpers"),d=function(e,t){var n=(65535&e)+(65535&t),r=(e>>16)+(t>>16)+(n>>16);return r<<16|65535&n},h=function(e,t){return e>>>t|e<<32-t},p=function(e,t){return e>>>t},g=function(e,t,n){return e&t^~e&n},y=function(e,t,n){return e&t^e&n^t&n},w=function(e){return h(e,2)^h(e,13)^h(e,22)},b=function(e){return h(e,6)^h(e,11)^h(e,25)},v=function(e){return h(e,7)^h(e,18)^p(e,3)},m=function(e){return h(e,17)^h(e,19)^p(e,10)},_=function(e,t){var n,r,o,i,u,a,f,s,c,l,h,p,_=new Array(1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298),E=new Array(1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225),I=new Array(64);
e[t>>5]|=128<<24-t%32,e[(t+64>>9<<4)+15]=t;for(var c=0;c<e.length;c+=16){n=E[0],r=E[1],o=E[2],i=E[3],u=E[4],a=E[5],f=E[6],s=E[7];for(var l=0;l<64;l++)l<16?I[l]=e[l+c]:I[l]=d(d(d(m(I[l-2]),I[l-7]),v(I[l-15])),I[l-16]),h=d(d(d(d(s,b(u)),g(u,a,f)),_[l]),I[l]),p=d(w(n),y(n,r,o)),s=f,f=a,a=u,u=d(i,h),i=o,o=r,r=n,n=d(h,p);E[0]=d(n,E[0]),E[1]=d(r,E[1]),E[2]=d(o,E[2]),E[3]=d(i,E[3]),E[4]=d(u,E[4]),E[5]=d(a,E[5]),E[6]=d(f,E[6]),E[7]=d(s,E[7])}return E};t.exports=function(e){return l.hash(e,_,32,!0)}}).call(this,e("lYpoI2"),"undefined"!=typeof self?self:"undefined"!=typeof window?window:{},e("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/gulp-browserify/node_modules/crypto-browserify/sha256.js","/node_modules/gulp-browserify/node_modules/crypto-browserify")},{"./helpers":4,buffer:3,lYpoI2:10}],10:[function(e,t,n){(function(e,n,r,o,i,u,a,f,s){function c(){}var e=t.exports={};e.nextTick=function(){var e="undefined"!=typeof window&&window.setImmediate,t="undefined"!=typeof window&&window.postMessage&&window.addEventListener;if(e)return function(e){return window.setImmediate(e)};if(t){var n=[];return window.addEventListener("message",function(e){var t=e.source;if((t===window||null===t)&&"process-tick"===e.data&&(e.stopPropagation(),n.length>0)){var r=n.shift();r()}},!0),function(e){n.push(e),window.postMessage("process-tick","*")}}return function(e){setTimeout(e,0)}}(),e.title="browser",e.browser=!0,e.env={},e.argv=[],e.on=c,e.addListener=c,e.once=c,e.off=c,e.removeListener=c,e.removeAllListeners=c,e.emit=c,e.binding=function(e){throw new Error("process.binding is not supported")},e.cwd=function(){return"/"},e.chdir=function(e){throw new Error("process.chdir is not supported")}}).call(this,e("lYpoI2"),"undefined"!=typeof self?self:"undefined"!=typeof window?window:{},e("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/gulp-browserify/node_modules/process/browser.js","/node_modules/gulp-browserify/node_modules/process")},{buffer:3,lYpoI2:10}],11:[function(e,t,n){(function(e,t,r,o,i,u,a,f,s){n.read=function(e,t,n,r,o){var i,u,a=8*o-r-1,f=(1<<a)-1,s=f>>1,c=-7,l=n?o-1:0,d=n?-1:1,h=e[t+l];for(l+=d,i=h&(1<<-c)-1,h>>=-c,c+=a;c>0;i=256*i+e[t+l],l+=d,c-=8);for(u=i&(1<<-c)-1,i>>=-c,c+=r;c>0;u=256*u+e[t+l],l+=d,c-=8);if(0===i)i=1-s;else{if(i===f)return u?NaN:(h?-1:1)*(1/0);u+=Math.pow(2,r),i-=s}return(h?-1:1)*u*Math.pow(2,i-r)},n.write=function(e,t,n,r,o,i){var u,a,f,s=8*i-o-1,c=(1<<s)-1,l=c>>1,d=23===o?Math.pow(2,-24)-Math.pow(2,-77):0,h=r?0:i-1,p=r?1:-1,g=t<0||0===t&&1/t<0?1:0;for(t=Math.abs(t),isNaN(t)||t===1/0?(a=isNaN(t)?1:0,u=c):(u=Math.floor(Math.log(t)/Math.LN2),t*(f=Math.pow(2,-u))<1&&(u--,f*=2),t+=u+l>=1?d/f:d*Math.pow(2,1-l),t*f>=2&&(u++,f/=2),u+l>=c?(a=0,u=c):u+l>=1?(a=(t*f-1)*Math.pow(2,o),u+=l):(a=t*Math.pow(2,l-1)*Math.pow(2,o),u=0));o>=8;e[n+h]=255&a,h+=p,a/=256,o-=8);for(u=u<<o|a,s+=o;s>0;e[n+h]=255&u,h+=p,u/=256,s-=8);e[n+h-p]|=128*g}}).call(this,e("lYpoI2"),"undefined"!=typeof self?self:"undefined"!=typeof window?window:{},e("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/ieee754/index.js","/node_modules/ieee754")},{buffer:3,lYpoI2:10}]},{},[1])(1)});
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],180:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],181:[function(require,module,exports){
(function (process){
// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2009-2017 Kris Kowal under the terms of the MIT
 * license found at https://github.com/kriskowal/q/blob/v1/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function (definition) {
    "use strict";

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (typeof exports === "object" && typeof module === "object") {
        module.exports = definition();

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
        define(definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeQ = definition;
        }

    // <script>
    } else if (typeof window !== "undefined" || typeof self !== "undefined") {
        // Prefer window over self for add-on scripts. Use self for
        // non-windowed contexts.
        var global = typeof window !== "undefined" ? window : self;

        // Get the `window` object, save the previous Q global
        // and initialize Q as a global.
        var previousQ = global.Q;
        global.Q = definition();

        // Add a noConflict function so Q can be removed from the
        // global namespace.
        global.Q.noConflict = function () {
            global.Q = previousQ;
            return this;
        };

    } else {
        throw new Error("This environment was not anticipated by Q. Please file a bug.");
    }

})(function () {
"use strict";

var hasStacks = false;
try {
    throw new Error();
} catch (e) {
    hasStacks = !!e.stack;
}

// All code after this point will be filtered from stack traces reported
// by Q.
var qStartingLine = captureLine();
var qFileName;

// shims

// used for fallback in "allResolved"
var noop = function () {};

// Use the fastest possible means to execute a task in a future turn
// of the event loop.
var nextTick =(function () {
    // linked list of tasks (single, with head node)
    var head = {task: void 0, next: null};
    var tail = head;
    var flushing = false;
    var requestTick = void 0;
    var isNodeJS = false;
    // queue for late tasks, used by unhandled rejection tracking
    var laterQueue = [];

    function flush() {
        /* jshint loopfunc: true */
        var task, domain;

        while (head.next) {
            head = head.next;
            task = head.task;
            head.task = void 0;
            domain = head.domain;

            if (domain) {
                head.domain = void 0;
                domain.enter();
            }
            runSingle(task, domain);

        }
        while (laterQueue.length) {
            task = laterQueue.pop();
            runSingle(task);
        }
        flushing = false;
    }
    // runs a single function in the async queue
    function runSingle(task, domain) {
        try {
            task();

        } catch (e) {
            if (isNodeJS) {
                // In node, uncaught exceptions are considered fatal errors.
                // Re-throw them synchronously to interrupt flushing!

                // Ensure continuation if the uncaught exception is suppressed
                // listening "uncaughtException" events (as domains does).
                // Continue in next event to avoid tick recursion.
                if (domain) {
                    domain.exit();
                }
                setTimeout(flush, 0);
                if (domain) {
                    domain.enter();
                }

                throw e;

            } else {
                // In browsers, uncaught exceptions are not fatal.
                // Re-throw them asynchronously to avoid slow-downs.
                setTimeout(function () {
                    throw e;
                }, 0);
            }
        }

        if (domain) {
            domain.exit();
        }
    }

    nextTick = function (task) {
        tail = tail.next = {
            task: task,
            domain: isNodeJS && process.domain,
            next: null
        };

        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };

    if (typeof process === "object" &&
        process.toString() === "[object process]" && process.nextTick) {
        // Ensure Q is in a real Node environment, with a `process.nextTick`.
        // To see through fake Node environments:
        // * Mocha test runner - exposes a `process` global without a `nextTick`
        // * Browserify - exposes a `process.nexTick` function that uses
        //   `setTimeout`. In this case `setImmediate` is preferred because
        //    it is faster. Browserify's `process.toString()` yields
        //   "[object Object]", while in a real Node environment
        //   `process.toString()` yields "[object process]".
        isNodeJS = true;

        requestTick = function () {
            process.nextTick(flush);
        };

    } else if (typeof setImmediate === "function") {
        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
        if (typeof window !== "undefined") {
            requestTick = setImmediate.bind(window, flush);
        } else {
            requestTick = function () {
                setImmediate(flush);
            };
        }

    } else if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
        // working message ports the first time a page loads.
        channel.port1.onmessage = function () {
            requestTick = requestPortTick;
            channel.port1.onmessage = flush;
            flush();
        };
        var requestPortTick = function () {
            // Opera requires us to provide a message payload, regardless of
            // whether we use it.
            channel.port2.postMessage(0);
        };
        requestTick = function () {
            setTimeout(flush, 0);
            requestPortTick();
        };

    } else {
        // old browsers
        requestTick = function () {
            setTimeout(flush, 0);
        };
    }
    // runs a task after all other tasks have been run
    // this is useful for unhandled rejection tracking that needs to happen
    // after all `then`d tasks have been run.
    nextTick.runAfter = function (task) {
        laterQueue.push(task);
        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };
    return nextTick;
})();

// Attempt to make generics safe in the face of downstream
// modifications.
// There is no situation where this is necessary.
// If you need a security guarantee, these primordials need to be
// deeply frozen anyway, and if you don’t need a security guarantee,
// this is just plain paranoid.
// However, this **might** have the nice side-effect of reducing the size of
// the minified code by reducing x.call() to merely x()
// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
var call = Function.call;
function uncurryThis(f) {
    return function () {
        return call.apply(f, arguments);
    };
}
// This is equivalent, but slower:
// uncurryThis = Function_bind.bind(Function_bind.call);
// http://jsperf.com/uncurrythis

var array_slice = uncurryThis(Array.prototype.slice);

var array_reduce = uncurryThis(
    Array.prototype.reduce || function (callback, basis) {
        var index = 0,
            length = this.length;
        // concerning the initial value, if one is not provided
        if (arguments.length === 1) {
            // seek to the first value in the array, accounting
            // for the possibility that is is a sparse array
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        // reduce
        for (; index < length; index++) {
            // account for the possibility that the array is sparse
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    }
);

var array_indexOf = uncurryThis(
    Array.prototype.indexOf || function (value) {
        // not a very good shim, but good enough for our one use of it
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    }
);

var array_map = uncurryThis(
    Array.prototype.map || function (callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function (undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    }
);

var object_create = Object.create || function (prototype) {
    function Type() { }
    Type.prototype = prototype;
    return new Type();
};

var object_defineProperty = Object.defineProperty || function (obj, prop, descriptor) {
    obj[prop] = descriptor.value;
    return obj;
};

var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);

var object_keys = Object.keys || function (object) {
    var keys = [];
    for (var key in object) {
        if (object_hasOwnProperty(object, key)) {
            keys.push(key);
        }
    }
    return keys;
};

var object_toString = uncurryThis(Object.prototype.toString);

function isObject(value) {
    return value === Object(value);
}

// generator related shims

// FIXME: Remove this function once ES6 generators are in SpiderMonkey.
function isStopIteration(exception) {
    return (
        object_toString(exception) === "[object StopIteration]" ||
        exception instanceof QReturnValue
    );
}

// FIXME: Remove this helper and Q.return once ES6 generators are in
// SpiderMonkey.
var QReturnValue;
if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
} else {
    QReturnValue = function (value) {
        this.value = value;
    };
}

// long stack traces

var STACK_JUMP_SEPARATOR = "From previous event:";

function makeStackTraceLong(error, promise) {
    // If possible, transform the error stack trace by removing Node and Q
    // cruft, then concatenating with the stack trace of `promise`. See #57.
    if (hasStacks &&
        promise.stack &&
        typeof error === "object" &&
        error !== null &&
        error.stack
    ) {
        var stacks = [];
        for (var p = promise; !!p; p = p.source) {
            if (p.stack && (!error.__minimumStackCounter__ || error.__minimumStackCounter__ > p.stackCounter)) {
                object_defineProperty(error, "__minimumStackCounter__", {value: p.stackCounter, configurable: true});
                stacks.unshift(p.stack);
            }
        }
        stacks.unshift(error.stack);

        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
        var stack = filterStackString(concatedStacks);
        object_defineProperty(error, "stack", {value: stack, configurable: true});
    }
}

function filterStackString(stackString) {
    var lines = stackString.split("\n");
    var desiredLines = [];
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];

        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
            desiredLines.push(line);
        }
    }
    return desiredLines.join("\n");
}

function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 ||
           stackLine.indexOf("(node.js:") !== -1;
}

function getFileNameAndLineNumber(stackLine) {
    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
    // In IE10 function name can have spaces ("Anonymous function") O_o
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) {
        return [attempt1[1], Number(attempt1[2])];
    }

    // Anonymous functions: "at filename:lineNumber:columnNumber"
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) {
        return [attempt2[1], Number(attempt2[2])];
    }

    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) {
        return [attempt3[1], Number(attempt3[2])];
    }
}

function isInternalFrame(stackLine) {
    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

    if (!fileNameAndLineNumber) {
        return false;
    }

    var fileName = fileNameAndLineNumber[0];
    var lineNumber = fileNameAndLineNumber[1];

    return fileName === qFileName &&
        lineNumber >= qStartingLine &&
        lineNumber <= qEndingLine;
}

// discover own file name and line number range for filtering stack
// traces
function captureLine() {
    if (!hasStacks) {
        return;
    }

    try {
        throw new Error();
    } catch (e) {
        var lines = e.stack.split("\n");
        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
        if (!fileNameAndLineNumber) {
            return;
        }

        qFileName = fileNameAndLineNumber[0];
        return fileNameAndLineNumber[1];
    }
}

function deprecate(callback, name, alternative) {
    return function () {
        if (typeof console !== "undefined" &&
            typeof console.warn === "function") {
            console.warn(name + " is deprecated, use " + alternative +
                         " instead.", new Error("").stack);
        }
        return callback.apply(callback, arguments);
    };
}

// end of shims
// beginning of real work

/**
 * Constructs a promise for an immediate reference, passes promises through, or
 * coerces promises from different systems.
 * @param value immediate reference or promise
 */
function Q(value) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (value instanceof Promise) {
        return value;
    }

    // assimilate thenables
    if (isPromiseAlike(value)) {
        return coerce(value);
    } else {
        return fulfill(value);
    }
}
Q.resolve = Q;

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
Q.nextTick = nextTick;

/**
 * Controls whether or not long stack traces will be on
 */
Q.longStackSupport = false;

/**
 * The counter is used to determine the stopping point for building
 * long stack traces. In makeStackTraceLong we walk backwards through
 * the linked list of promises, only stacks which were created before
 * the rejection are concatenated.
 */
var longStackCounter = 1;

// enable long stacks if Q_DEBUG is set
if (typeof process === "object" && process && process.env && process.env.Q_DEBUG) {
    Q.longStackSupport = true;
}

/**
 * Constructs a {promise, resolve, reject} object.
 *
 * `resolve` is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke `resolve` with any value that is
 * not a thenable. To reject the promise, invoke `resolve` with a rejected
 * thenable, or invoke `reject` with the reason directly. To resolve the
 * promise to another thenable, thus putting it in the same state, invoke
 * `resolve` with that other thenable.
 */
Q.defer = defer;
function defer() {
    // if "messages" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the messages array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the `resolve` function because it handles both fully
    // non-thenable values and other thenables gracefully.
    var messages = [], progressListeners = [], resolvedPromise;

    var deferred = object_create(defer.prototype);
    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, operands) {
        var args = array_slice(arguments);
        if (messages) {
            messages.push(args);
            if (op === "when" && operands[1]) { // progress operand
                progressListeners.push(operands[1]);
            }
        } else {
            Q.nextTick(function () {
                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
            });
        }
    };

    // XXX deprecated
    promise.valueOf = function () {
        if (messages) {
            return promise;
        }
        var nearerValue = nearer(resolvedPromise);
        if (isPromise(nearerValue)) {
            resolvedPromise = nearerValue; // shorten chain
        }
        return nearerValue;
    };

    promise.inspect = function () {
        if (!resolvedPromise) {
            return { state: "pending" };
        }
        return resolvedPromise.inspect();
    };

    if (Q.longStackSupport && hasStacks) {
        try {
            throw new Error();
        } catch (e) {
            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
            // accessor around; that causes memory leaks as per GH-111. Just
            // reify the stack trace as a string ASAP.
            //
            // At the same time, cut off the first line; it's always just
            // "[object Promise]\n", as per the `toString`.
            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
            promise.stackCounter = longStackCounter++;
        }
    }

    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
    // consolidating them into `become`, since otherwise we'd create new
    // promises with the lines `become(whatever(value))`. See e.g. GH-252.

    function become(newPromise) {
        resolvedPromise = newPromise;

        if (Q.longStackSupport && hasStacks) {
            // Only hold a reference to the new promise if long stacks
            // are enabled to reduce memory usage
            promise.source = newPromise;
        }

        array_reduce(messages, function (undefined, message) {
            Q.nextTick(function () {
                newPromise.promiseDispatch.apply(newPromise, message);
            });
        }, void 0);

        messages = void 0;
        progressListeners = void 0;
    }

    deferred.promise = promise;
    deferred.resolve = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(Q(value));
    };

    deferred.fulfill = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(fulfill(value));
    };
    deferred.reject = function (reason) {
        if (resolvedPromise) {
            return;
        }

        become(reject(reason));
    };
    deferred.notify = function (progress) {
        if (resolvedPromise) {
            return;
        }

        array_reduce(progressListeners, function (undefined, progressListener) {
            Q.nextTick(function () {
                progressListener(progress);
            });
        }, void 0);
    };

    return deferred;
}

/**
 * Creates a Node-style callback that will resolve or reject the deferred
 * promise.
 * @returns a nodeback
 */
defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(array_slice(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};

/**
 * @param resolver {Function} a function that returns nothing and accepts
 * the resolve, reject, and notify functions for a deferred.
 * @returns a promise that may be resolved with the given resolve and reject
 * functions, or rejected by a thrown exception in resolver
 */
Q.Promise = promise; // ES6
Q.promise = promise;
function promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("resolver must be a function.");
    }
    var deferred = defer();
    try {
        resolver(deferred.resolve, deferred.reject, deferred.notify);
    } catch (reason) {
        deferred.reject(reason);
    }
    return deferred.promise;
}

promise.race = race; // ES6
promise.all = all; // ES6
promise.reject = reject; // ES6
promise.resolve = Q; // ES6

// XXX experimental.  This method is a way to denote that a local value is
// serializable and should be immediately dispatched to a remote upon request,
// instead of passing a reference.
Q.passByCopy = function (object) {
    //freeze(object);
    //passByCopies.set(object, true);
    return object;
};

Promise.prototype.passByCopy = function () {
    //freeze(object);
    //passByCopies.set(object, true);
    return this;
};

/**
 * If two promises eventually fulfill to the same value, promises that value,
 * but otherwise rejects.
 * @param x {Any*}
 * @param y {Any*}
 * @returns {Any*} a promise for x and y if they are the same, but a rejection
 * otherwise.
 *
 */
Q.join = function (x, y) {
    return Q(x).join(y);
};

Promise.prototype.join = function (that) {
    return Q([this, that]).spread(function (x, y) {
        if (x === y) {
            // TODO: "===" should be Object.is or equiv
            return x;
        } else {
            throw new Error("Q can't join: not the same: " + x + " " + y);
        }
    });
};

/**
 * Returns a promise for the first of an array of promises to become settled.
 * @param answers {Array[Any*]} promises to race
 * @returns {Any*} the first promise to be settled
 */
Q.race = race;
function race(answerPs) {
    return promise(function (resolve, reject) {
        // Switch to this once we can assume at least ES5
        // answerPs.forEach(function (answerP) {
        //     Q(answerP).then(resolve, reject);
        // });
        // Use this in the meantime
        for (var i = 0, len = answerPs.length; i < len; i++) {
            Q(answerPs[i]).then(resolve, reject);
        }
    });
}

Promise.prototype.race = function () {
    return this.then(Q.race);
};

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * set(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
Q.makePromise = Promise;
function Promise(descriptor, fallback, inspect) {
    if (fallback === void 0) {
        fallback = function (op) {
            return reject(new Error(
                "Promise does not support operation: " + op
            ));
        };
    }
    if (inspect === void 0) {
        inspect = function () {
            return {state: "unknown"};
        };
    }

    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, args) {
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(promise, args);
            } else {
                result = fallback.call(promise, op, args);
            }
        } catch (exception) {
            result = reject(exception);
        }
        if (resolve) {
            resolve(result);
        }
    };

    promise.inspect = inspect;

    // XXX deprecated `valueOf` and `exception` support
    if (inspect) {
        var inspected = inspect();
        if (inspected.state === "rejected") {
            promise.exception = inspected.reason;
        }

        promise.valueOf = function () {
            var inspected = inspect();
            if (inspected.state === "pending" ||
                inspected.state === "rejected") {
                return promise;
            }
            return inspected.value;
        };
    }

    return promise;
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.then = function (fulfilled, rejected, progressed) {
    var self = this;
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return typeof fulfilled === "function" ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(exception) {
        if (typeof rejected === "function") {
            makeStackTraceLong(exception, self);
            try {
                return rejected(exception);
            } catch (newException) {
                return reject(newException);
            }
        }
        return reject(exception);
    }

    function _progressed(value) {
        return typeof progressed === "function" ? progressed(value) : value;
    }

    Q.nextTick(function () {
        self.promiseDispatch(function (value) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_fulfilled(value));
        }, "when", [function (exception) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_rejected(exception));
        }]);
    });

    // Progress propagator need to be attached in the current tick.
    self.promiseDispatch(void 0, "when", [void 0, function (value) {
        var newValue;
        var threw = false;
        try {
            newValue = _progressed(value);
        } catch (e) {
            threw = true;
            if (Q.onerror) {
                Q.onerror(e);
            } else {
                throw e;
            }
        }

        if (!threw) {
            deferred.notify(newValue);
        }
    }]);

    return deferred.promise;
};

Q.tap = function (promise, callback) {
    return Q(promise).tap(callback);
};

/**
 * Works almost like "finally", but not called for rejections.
 * Original resolution value is passed through callback unaffected.
 * Callback may return a promise that will be awaited for.
 * @param {Function} callback
 * @returns {Q.Promise}
 * @example
 * doSomething()
 *   .then(...)
 *   .tap(console.log)
 *   .then(...);
 */
Promise.prototype.tap = function (callback) {
    callback = Q(callback);

    return this.then(function (value) {
        return callback.fcall(value).thenResolve(value);
    });
};

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value      promise or immediate reference to observe
 * @param fulfilled  function to be called with the fulfilled value
 * @param rejected   function to be called with the rejection exception
 * @param progressed function to be called on any progress notifications
 * @return promise for the return value from the invoked callback
 */
Q.when = when;
function when(value, fulfilled, rejected, progressed) {
    return Q(value).then(fulfilled, rejected, progressed);
}

Promise.prototype.thenResolve = function (value) {
    return this.then(function () { return value; });
};

Q.thenResolve = function (promise, value) {
    return Q(promise).thenResolve(value);
};

Promise.prototype.thenReject = function (reason) {
    return this.then(function () { throw reason; });
};

Q.thenReject = function (promise, reason) {
    return Q(promise).thenReject(reason);
};

/**
 * If an object is not a promise, it is as "near" as possible.
 * If a promise is rejected, it is as "near" as possible too.
 * If it’s a fulfilled promise, the fulfillment value is nearer.
 * If it’s a deferred promise and the deferred has been resolved, the
 * resolution is "nearer".
 * @param object
 * @returns most resolved (nearest) form of the object
 */

// XXX should we re-do this?
Q.nearer = nearer;
function nearer(value) {
    if (isPromise(value)) {
        var inspected = value.inspect();
        if (inspected.state === "fulfilled") {
            return inspected.value;
        }
    }
    return value;
}

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
Q.isPromise = isPromise;
function isPromise(object) {
    return object instanceof Promise;
}

Q.isPromiseAlike = isPromiseAlike;
function isPromiseAlike(object) {
    return isObject(object) && typeof object.then === "function";
}

/**
 * @returns whether the given object is a pending promise, meaning not
 * fulfilled or rejected.
 */
Q.isPending = isPending;
function isPending(object) {
    return isPromise(object) && object.inspect().state === "pending";
}

Promise.prototype.isPending = function () {
    return this.inspect().state === "pending";
};

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
Q.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(object) || object.inspect().state === "fulfilled";
}

Promise.prototype.isFulfilled = function () {
    return this.inspect().state === "fulfilled";
};

/**
 * @returns whether the given object is a rejected promise.
 */
Q.isRejected = isRejected;
function isRejected(object) {
    return isPromise(object) && object.inspect().state === "rejected";
}

Promise.prototype.isRejected = function () {
    return this.inspect().state === "rejected";
};

//// BEGIN UNHANDLED REJECTION TRACKING

// This promise library consumes exceptions thrown in handlers so they can be
// handled by a subsequent promise.  The exceptions get added to this array when
// they are created, and removed when they are handled.  Note that in ES6 or
// shimmed environments, this would naturally be a `Set`.
var unhandledReasons = [];
var unhandledRejections = [];
var reportedUnhandledRejections = [];
var trackUnhandledRejections = true;

function resetUnhandledRejections() {
    unhandledReasons.length = 0;
    unhandledRejections.length = 0;

    if (!trackUnhandledRejections) {
        trackUnhandledRejections = true;
    }
}

function trackRejection(promise, reason) {
    if (!trackUnhandledRejections) {
        return;
    }
    if (typeof process === "object" && typeof process.emit === "function") {
        Q.nextTick.runAfter(function () {
            if (array_indexOf(unhandledRejections, promise) !== -1) {
                process.emit("unhandledRejection", reason, promise);
                reportedUnhandledRejections.push(promise);
            }
        });
    }

    unhandledRejections.push(promise);
    if (reason && typeof reason.stack !== "undefined") {
        unhandledReasons.push(reason.stack);
    } else {
        unhandledReasons.push("(no stack) " + reason);
    }
}

function untrackRejection(promise) {
    if (!trackUnhandledRejections) {
        return;
    }

    var at = array_indexOf(unhandledRejections, promise);
    if (at !== -1) {
        if (typeof process === "object" && typeof process.emit === "function") {
            Q.nextTick.runAfter(function () {
                var atReport = array_indexOf(reportedUnhandledRejections, promise);
                if (atReport !== -1) {
                    process.emit("rejectionHandled", unhandledReasons[at], promise);
                    reportedUnhandledRejections.splice(atReport, 1);
                }
            });
        }
        unhandledRejections.splice(at, 1);
        unhandledReasons.splice(at, 1);
    }
}

Q.resetUnhandledRejections = resetUnhandledRejections;

Q.getUnhandledReasons = function () {
    // Make a copy so that consumers can't interfere with our internal state.
    return unhandledReasons.slice();
};

Q.stopUnhandledRejectionTracking = function () {
    resetUnhandledRejections();
    trackUnhandledRejections = false;
};

resetUnhandledRejections();

//// END UNHANDLED REJECTION TRACKING

/**
 * Constructs a rejected promise.
 * @param reason value describing the failure
 */
Q.reject = reject;
function reject(reason) {
    var rejection = Promise({
        "when": function (rejected) {
            // note that the error has been handled
            if (rejected) {
                untrackRejection(this);
            }
            return rejected ? rejected(reason) : this;
        }
    }, function fallback() {
        return this;
    }, function inspect() {
        return { state: "rejected", reason: reason };
    });

    // Note that the reason has not been handled.
    trackRejection(rejection, reason);

    return rejection;
}

/**
 * Constructs a fulfilled promise for an immediate reference.
 * @param value immediate reference
 */
Q.fulfill = fulfill;
function fulfill(value) {
    return Promise({
        "when": function () {
            return value;
        },
        "get": function (name) {
            return value[name];
        },
        "set": function (name, rhs) {
            value[name] = rhs;
        },
        "delete": function (name) {
            delete value[name];
        },
        "post": function (name, args) {
            // Mark Miller proposes that post with no name should apply a
            // promised function.
            if (name === null || name === void 0) {
                return value.apply(void 0, args);
            } else {
                return value[name].apply(value, args);
            }
        },
        "apply": function (thisp, args) {
            return value.apply(thisp, args);
        },
        "keys": function () {
            return object_keys(value);
        }
    }, void 0, function inspect() {
        return { state: "fulfilled", value: value };
    });
}

/**
 * Converts thenables to Q promises.
 * @param promise thenable promise
 * @returns a Q promise
 */
function coerce(promise) {
    var deferred = defer();
    Q.nextTick(function () {
        try {
            promise.then(deferred.resolve, deferred.reject, deferred.notify);
        } catch (exception) {
            deferred.reject(exception);
        }
    });
    return deferred.promise;
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the "isDef" message
 * without a rejection.
 */
Q.master = master;
function master(object) {
    return Promise({
        "isDef": function () {}
    }, function fallback(op, args) {
        return dispatch(object, op, args);
    }, function () {
        return Q(object).inspect();
    });
}

/**
 * Spreads the values of a promised array of arguments into the
 * fulfillment callback.
 * @param fulfilled callback that receives variadic arguments from the
 * promised array
 * @param rejected callback that receives the exception if the promise
 * is rejected.
 * @returns a promise for the return value or thrown exception of
 * either callback.
 */
Q.spread = spread;
function spread(value, fulfilled, rejected) {
    return Q(value).spread(fulfilled, rejected);
}

Promise.prototype.spread = function (fulfilled, rejected) {
    return this.all().then(function (array) {
        return fulfilled.apply(void 0, array);
    }, rejected);
};

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  Although generators are only part
 * of the newest ECMAScript 6 drafts, this code does not cause syntax
 * errors in older engines.  This code should continue to work and will
 * in fact improve over time as the language improves.
 *
 * ES6 generators are currently part of V8 version 3.19 with the
 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
 * for longer, but under an older Python-inspired form.  This function
 * works on both kinds of generators.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 */
Q.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is an exception
        function continuer(verb, arg) {
            var result;

            // Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
            // engine that has a deployed base of browsers that support generators.
            // However, SM's generators use the Python-inspired semantics of
            // outdated ES6 drafts.  We would like to support ES6, but we'd also
            // like to make it possible to use generators in deployed browsers, so
            // we also support Python-style generators.  At some point we can remove
            // this block.

            if (typeof StopIteration === "undefined") {
                // ES6 Generators
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    return reject(exception);
                }
                if (result.done) {
                    return Q(result.value);
                } else {
                    return when(result.value, callback, errback);
                }
            } else {
                // SpiderMonkey Generators
                // FIXME: Remove this case when SM does ES6 generators.
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    if (isStopIteration(exception)) {
                        return Q(exception.value);
                    } else {
                        return reject(exception);
                    }
                }
                return when(result, callback, errback);
            }
        }
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "next");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * The spawn function is a small wrapper around async that immediately
 * calls the generator and also ends the promise chain, so that any
 * unhandled errors are thrown instead of forwarded to the error
 * handler. This is useful because it's extremely common to run
 * generators at the top-level to work with libraries.
 */
Q.spawn = spawn;
function spawn(makeGenerator) {
    Q.done(Q.async(makeGenerator)());
}

// FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
/**
 * Throws a ReturnValue exception to stop an asynchronous generator.
 *
 * This interface is a stop-gap measure to support generator return
 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
 * generators like Chromium 29, just use "return" in your generator
 * functions.
 *
 * @param value the return value for the surrounding generator
 * @throws ReturnValue exception with the value.
 * @example
 * // ES6 style
 * Q.async(function* () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      return foo + bar;
 * })
 * // Older SpiderMonkey style
 * Q.async(function () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      Q.return(foo + bar);
 * })
 */
Q["return"] = _return;
function _return(value) {
    throw new QReturnValue(value);
}

/**
 * The promised function decorator ensures that any promise arguments
 * are settled and passed as values (`this` is also settled and passed
 * as a value).  It will also ensure that the result of a function is
 * always a promise.
 *
 * @example
 * var add = Q.promised(function (a, b) {
 *     return a + b;
 * });
 * add(Q(a), Q(B));
 *
 * @param {function} callback The function to decorate
 * @returns {function} a function that has been decorated.
 */
Q.promised = promised;
function promised(callback) {
    return function () {
        return spread([this, all(arguments)], function (self, args) {
            return callback.apply(self, args);
        });
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
Q.dispatch = dispatch;
function dispatch(object, op, args) {
    return Q(object).dispatch(op, args);
}

Promise.prototype.dispatch = function (op, args) {
    var self = this;
    var deferred = defer();
    Q.nextTick(function () {
        self.promiseDispatch(deferred.resolve, op, args);
    });
    return deferred.promise;
};

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
Q.get = function (object, key) {
    return Q(object).dispatch("get", [key]);
};

Promise.prototype.get = function (key) {
    return this.dispatch("get", [key]);
};

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
Q.set = function (object, key, value) {
    return Q(object).dispatch("set", [key, value]);
};

Promise.prototype.set = function (key, value) {
    return this.dispatch("set", [key, value]);
};

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
Q.del = // XXX legacy
Q["delete"] = function (object, key) {
    return Q(object).dispatch("delete", [key]);
};

Promise.prototype.del = // XXX legacy
Promise.prototype["delete"] = function (key) {
    return this.dispatch("delete", [key]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `resolve` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
// bound locally because it is used by other methods
Q.mapply = // XXX As proposed by "Redsandro"
Q.post = function (object, name, args) {
    return Q(object).dispatch("post", [name, args]);
};

Promise.prototype.mapply = // XXX As proposed by "Redsandro"
Promise.prototype.post = function (name, args) {
    return this.dispatch("post", [name, args]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
Q.send = // XXX Mark Miller's proposed parlance
Q.mcall = // XXX As proposed by "Redsandro"
Q.invoke = function (object, name /*...args*/) {
    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
};

Promise.prototype.send = // XXX Mark Miller's proposed parlance
Promise.prototype.mcall = // XXX As proposed by "Redsandro"
Promise.prototype.invoke = function (name /*...args*/) {
    return this.dispatch("post", [name, array_slice(arguments, 1)]);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param args      array of application arguments
 */
Q.fapply = function (object, args) {
    return Q(object).dispatch("apply", [void 0, args]);
};

Promise.prototype.fapply = function (args) {
    return this.dispatch("apply", [void 0, args]);
};

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q["try"] =
Q.fcall = function (object /* ...args*/) {
    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
};

Promise.prototype.fcall = function (/*...args*/) {
    return this.dispatch("apply", [void 0, array_slice(arguments)]);
};

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q.fbind = function (object /*...args*/) {
    var promise = Q(object);
    var args = array_slice(arguments, 1);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};
Promise.prototype.fbind = function (/*...args*/) {
    var promise = this;
    var args = array_slice(arguments);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually settled object
 */
Q.keys = function (object) {
    return Q(object).dispatch("keys", []);
};

Promise.prototype.keys = function () {
    return this.dispatch("keys", []);
};

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
Q.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var pendingCount = 0;
        var deferred = defer();
        array_reduce(promises, function (undefined, promise, index) {
            var snapshot;
            if (
                isPromise(promise) &&
                (snapshot = promise.inspect()).state === "fulfilled"
            ) {
                promises[index] = snapshot.value;
            } else {
                ++pendingCount;
                when(
                    promise,
                    function (value) {
                        promises[index] = value;
                        if (--pendingCount === 0) {
                            deferred.resolve(promises);
                        }
                    },
                    deferred.reject,
                    function (progress) {
                        deferred.notify({ index: index, value: progress });
                    }
                );
            }
        }, void 0);
        if (pendingCount === 0) {
            deferred.resolve(promises);
        }
        return deferred.promise;
    });
}

Promise.prototype.all = function () {
    return all(this);
};

/**
 * Returns the first resolved promise of an array. Prior rejected promises are
 * ignored.  Rejects only if all promises are rejected.
 * @param {Array*} an array containing values or promises for values
 * @returns a promise fulfilled with the value of the first resolved promise,
 * or a rejected promise if all promises are rejected.
 */
Q.any = any;

function any(promises) {
    if (promises.length === 0) {
        return Q.resolve();
    }

    var deferred = Q.defer();
    var pendingCount = 0;
    array_reduce(promises, function (prev, current, index) {
        var promise = promises[index];

        pendingCount++;

        when(promise, onFulfilled, onRejected, onProgress);
        function onFulfilled(result) {
            deferred.resolve(result);
        }
        function onRejected(err) {
            pendingCount--;
            if (pendingCount === 0) {
                err.message = ("Q can't get fulfillment value from any promise, all " +
                    "promises were rejected. Last error message: " + err.message);
                deferred.reject(err);
            }
        }
        function onProgress(progress) {
            deferred.notify({
                index: index,
                value: progress
            });
        }
    }, undefined);

    return deferred.promise;
}

Promise.prototype.any = function () {
    return any(this);
};

/**
 * Waits for all promises to be settled, either fulfilled or
 * rejected.  This is distinct from `all` since that would stop
 * waiting at the first rejection.  The promise returned by
 * `allResolved` will never be rejected.
 * @param promises a promise for an array (or an array) of promises
 * (or values)
 * @return a promise for an array of promises
 */
Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
function allResolved(promises) {
    return when(promises, function (promises) {
        promises = array_map(promises, Q);
        return when(all(array_map(promises, function (promise) {
            return when(promise, noop, noop);
        })), function () {
            return promises;
        });
    });
}

Promise.prototype.allResolved = function () {
    return allResolved(this);
};

/**
 * @see Promise#allSettled
 */
Q.allSettled = allSettled;
function allSettled(promises) {
    return Q(promises).allSettled();
}

/**
 * Turns an array of promises into a promise for an array of their states (as
 * returned by `inspect`) when they have all settled.
 * @param {Array[Any*]} values an array (or promise for an array) of values (or
 * promises for values)
 * @returns {Array[State]} an array of states for the respective values.
 */
Promise.prototype.allSettled = function () {
    return this.then(function (promises) {
        return all(array_map(promises, function (promise) {
            promise = Q(promise);
            function regardless() {
                return promise.inspect();
            }
            return promise.then(regardless, regardless);
        }));
    });
};

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
Q.fail = // XXX legacy
Q["catch"] = function (object, rejected) {
    return Q(object).then(void 0, rejected);
};

Promise.prototype.fail = // XXX legacy
Promise.prototype["catch"] = function (rejected) {
    return this.then(void 0, rejected);
};

/**
 * Attaches a listener that can respond to progress notifications from a
 * promise's originating deferred. This listener receives the exact arguments
 * passed to ``deferred.notify``.
 * @param {Any*} promise for something
 * @param {Function} callback to receive any progress notifications
 * @returns the given promise, unchanged
 */
Q.progress = progress;
function progress(object, progressed) {
    return Q(object).then(void 0, void 0, progressed);
}

Promise.prototype.progress = function (progressed) {
    return this.then(void 0, void 0, progressed);
};

/**
 * Provides an opportunity to observe the settling of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
Q.fin = // XXX legacy
Q["finally"] = function (object, callback) {
    return Q(object)["finally"](callback);
};

Promise.prototype.fin = // XXX legacy
Promise.prototype["finally"] = function (callback) {
    if (!callback || typeof callback.apply !== "function") {
        throw new Error("Q can't apply finally callback");
    }
    callback = Q(callback);
    return this.then(function (value) {
        return callback.fcall().then(function () {
            return value;
        });
    }, function (reason) {
        // TODO attempt to recycle the rejection with "this".
        return callback.fcall().then(function () {
            throw reason;
        });
    });
};

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
Q.done = function (object, fulfilled, rejected, progress) {
    return Q(object).done(fulfilled, rejected, progress);
};

Promise.prototype.done = function (fulfilled, rejected, progress) {
    var onUnhandledError = function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        Q.nextTick(function () {
            makeStackTraceLong(error, promise);
            if (Q.onerror) {
                Q.onerror(error);
            } else {
                throw error;
            }
        });
    };

    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
    var promise = fulfilled || rejected || progress ?
        this.then(fulfilled, rejected, progress) :
        this;

    if (typeof process === "object" && process && process.domain) {
        onUnhandledError = process.domain.bind(onUnhandledError);
    }

    promise.then(void 0, onUnhandledError);
};

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @param {Any*} custom error message or Error object (optional)
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
Q.timeout = function (object, ms, error) {
    return Q(object).timeout(ms, error);
};

Promise.prototype.timeout = function (ms, error) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        if (!error || "string" === typeof error) {
            error = new Error(error || "Timed out after " + ms + " ms");
            error.code = "ETIMEDOUT";
        }
        deferred.reject(error);
    }, ms);

    this.then(function (value) {
        clearTimeout(timeoutId);
        deferred.resolve(value);
    }, function (exception) {
        clearTimeout(timeoutId);
        deferred.reject(exception);
    }, deferred.notify);

    return deferred.promise;
};

/**
 * Returns a promise for the given value (or promised value), some
 * milliseconds after it resolved. Passes rejections immediately.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after milliseconds
 * time has elapsed since the resolution of the given promise.
 * If the given promise rejects, that is passed immediately.
 */
Q.delay = function (object, timeout) {
    if (timeout === void 0) {
        timeout = object;
        object = void 0;
    }
    return Q(object).delay(timeout);
};

Promise.prototype.delay = function (timeout) {
    return this.then(function (value) {
        var deferred = defer();
        setTimeout(function () {
            deferred.resolve(value);
        }, timeout);
        return deferred.promise;
    });
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided as an array, and returns a promise.
 *
 *      Q.nfapply(FS.readFile, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
Q.nfapply = function (callback, args) {
    return Q(callback).nfapply(args);
};

Promise.prototype.nfapply = function (args) {
    var deferred = defer();
    var nodeArgs = array_slice(args);
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided individually, and returns a promise.
 * @example
 * Q.nfcall(FS.readFile, __filename)
 * .then(function (content) {
 * })
 *
 */
Q.nfcall = function (callback /*...args*/) {
    var args = array_slice(arguments, 1);
    return Q(callback).nfapply(args);
};

Promise.prototype.nfcall = function (/*...args*/) {
    var nodeArgs = array_slice(arguments);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 * @example
 * Q.nfbind(FS.readFile, __filename)("utf-8")
 * .then(console.log)
 * .done()
 */
Q.nfbind =
Q.denodeify = function (callback /*...args*/) {
    if (callback === undefined) {
        throw new Error("Q can't wrap an undefined function");
    }
    var baseArgs = array_slice(arguments, 1);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        Q(callback).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nfbind =
Promise.prototype.denodeify = function (/*...args*/) {
    var args = array_slice(arguments);
    args.unshift(this);
    return Q.denodeify.apply(void 0, args);
};

Q.nbind = function (callback, thisp /*...args*/) {
    var baseArgs = array_slice(arguments, 2);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        function bound() {
            return callback.apply(thisp, arguments);
        }
        Q(bound).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nbind = function (/*thisp, ...args*/) {
    var args = array_slice(arguments, 0);
    args.unshift(this);
    return Q.nbind.apply(void 0, args);
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback with a given array of arguments, plus a provided callback.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param {Array} args arguments to pass to the method; the callback
 * will be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nmapply = // XXX As proposed by "Redsandro"
Q.npost = function (object, name, args) {
    return Q(object).npost(name, args);
};

Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
Promise.prototype.npost = function (name, args) {
    var nodeArgs = array_slice(args || []);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback, forwarding the given variadic arguments, plus a provided
 * callback argument.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param ...args arguments to pass to the method; the callback will
 * be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nsend = // XXX Based on Mark Miller's proposed "send"
Q.nmcall = // XXX Based on "Redsandro's" proposal
Q.ninvoke = function (object, name /*...args*/) {
    var nodeArgs = array_slice(arguments, 2);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
Promise.prototype.ninvoke = function (name /*...args*/) {
    var nodeArgs = array_slice(arguments, 1);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * If a function would like to support both Node continuation-passing-style and
 * promise-returning-style, it can end its internal promise chain with
 * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
 * elects to use a nodeback, the result will be sent there.  If they do not
 * pass a nodeback, they will receive the result promise.
 * @param object a result (or a promise for a result)
 * @param {Function} nodeback a Node.js-style callback
 * @returns either the promise or nothing
 */
Q.nodeify = nodeify;
function nodeify(object, nodeback) {
    return Q(object).nodeify(nodeback);
}

Promise.prototype.nodeify = function (nodeback) {
    if (nodeback) {
        this.then(function (value) {
            Q.nextTick(function () {
                nodeback(null, value);
            });
        }, function (error) {
            Q.nextTick(function () {
                nodeback(error);
            });
        });
    } else {
        return this;
    }
};

Q.noConflict = function() {
    throw new Error("Q.noConflict only works when Q is used as a global");
};

// All code before this point will be filtered from stack traces.
var qEndingLine = captureLine();

return Q;

});

}).call(this,require('_process'))
},{"_process":180}],182:[function(require,module,exports){
'use strict';

var util = require('util');
var isPlainObject = require('lodash.isplainobject');

function DataCloneError(message) {
    this.name = this.constructor.name;
    this.message = message;
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, DataCloneError);
    }
}
util.inherits(DataCloneError, Error);

// https://html.spec.whatwg.org/multipage/infrastructure.html#structuredclone
function structuredClone(input, memory) {
    memory = memory !== undefined ? memory : new Map();

    if (memory.has(input)) {
        return memory.get(input);
    }

    var type = typeof input;
    var output;

    if (type === 'string' || type === 'number' || type === 'boolean' || type === 'undefined' || input === null) {
        return input;
    }

    if (type === 'symbol') {
        throw new DataCloneError('Value could not be cloned: ' + input.toString() + ' is a Symbol');
    }

    var deepClone = 'none';

    if (input instanceof Boolean || input instanceof Number || input instanceof String || input instanceof Date) {
        output = new input.constructor(input.valueOf());
    } else if (input instanceof RegExp) {
        output = new RegExp(input.source, input.flags);
    } else if (input instanceof ArrayBuffer) {
        output = input.slice();
    } else if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView && ArrayBuffer.isView(input)) {
        var outputBuffer = structuredClone(input.buffer, memory);
        if (input instanceof DataView) {
            output = new DataView(outputBuffer, input.byteOffset, input.byteLength);
        } else {
            output = new input.constructor(outputBuffer, input.byteOffset, input.length);
        }
    } else if (input instanceof Map) {
        output = new Map();
        deepClone = 'map';
    } else if (input instanceof Set) {
        output = new Set();
        deepClone = 'set';
    } else if (typeof Blob !== 'undefined' && input instanceof Blob) {
        output = input.slice(0, input.size, input.type);
    } else if (Array.isArray(input)) {
        output = new Array(input.length);
        deepClone = 'own';
    } else if (typeof input === 'function') {
        throw new DataCloneError('Object could not be cloned: ' + input.name + ' is a function');
    } else if (!isPlainObject(input)) {
        // This is way too restrictive. Should be able to clone any object that isn't
        // a platform object with an internal slot other than [[Prototype]] or [[Extensible]].
        // But need to reject all platform objects, except those whitelisted for cloning
        // (ie, those with a [[Clone]] internal method), and this errs on the side of caution
        // for now.

        // Supposed to also handle FileList, ImageData, ImageBitmap, but fuck it
        throw new DataCloneError();
    } else {
        output = {};
        deepClone = 'own';
    }

    memory.set(input, output);

    if (deepClone === 'map') {
        input.forEach(function (v, k) {
            output.set(structuredClone(k, memory), structuredClone(v, memory));
        });
    } else if (deepClone === 'set') {
        input.forEach(function (v) {
            output.add(structuredClone(v, memory));
        });
    } else if (deepClone === 'own') {
        for (var name in input) {
            if (input.hasOwnProperty(name)) {
                var sourceValue = input[name];
                var clonedValue = structuredClone(sourceValue, memory);
                output[name] = clonedValue;
            }
        }
    }

    return output;
}

module.exports = structuredClone;

},{"lodash.isplainobject":157,"util":190}],183:[function(require,module,exports){
(function (process,global){
(function (global, undefined) {
    "use strict";

    if (global.setImmediate) {
        return;
    }

    var nextHandle = 1; // Spec says greater than zero
    var tasksByHandle = {};
    var currentlyRunningATask = false;
    var doc = global.document;
    var registerImmediate;

    function setImmediate(callback) {
      // Callback can either be a function or a string
      if (typeof callback !== "function") {
        callback = new Function("" + callback);
      }
      // Copy function arguments
      var args = new Array(arguments.length - 1);
      for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i + 1];
      }
      // Store and register the task
      var task = { callback: callback, args: args };
      tasksByHandle[nextHandle] = task;
      registerImmediate(nextHandle);
      return nextHandle++;
    }

    function clearImmediate(handle) {
        delete tasksByHandle[handle];
    }

    function run(task) {
        var callback = task.callback;
        var args = task.args;
        switch (args.length) {
        case 0:
            callback();
            break;
        case 1:
            callback(args[0]);
            break;
        case 2:
            callback(args[0], args[1]);
            break;
        case 3:
            callback(args[0], args[1], args[2]);
            break;
        default:
            callback.apply(undefined, args);
            break;
        }
    }

    function runIfPresent(handle) {
        // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
        // So if we're currently running a task, we'll need to delay this invocation.
        if (currentlyRunningATask) {
            // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
            // "too much recursion" error.
            setTimeout(runIfPresent, 0, handle);
        } else {
            var task = tasksByHandle[handle];
            if (task) {
                currentlyRunningATask = true;
                try {
                    run(task);
                } finally {
                    clearImmediate(handle);
                    currentlyRunningATask = false;
                }
            }
        }
    }

    function installNextTickImplementation() {
        registerImmediate = function(handle) {
            process.nextTick(function () { runIfPresent(handle); });
        };
    }

    function canUsePostMessage() {
        // The test against `importScripts` prevents this implementation from being installed inside a web worker,
        // where `global.postMessage` means something completely different and can't be used for this purpose.
        if (global.postMessage && !global.importScripts) {
            var postMessageIsAsynchronous = true;
            var oldOnMessage = global.onmessage;
            global.onmessage = function() {
                postMessageIsAsynchronous = false;
            };
            global.postMessage("", "*");
            global.onmessage = oldOnMessage;
            return postMessageIsAsynchronous;
        }
    }

    function installPostMessageImplementation() {
        // Installs an event handler on `global` for the `message` event: see
        // * https://developer.mozilla.org/en/DOM/window.postMessage
        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

        var messagePrefix = "setImmediate$" + Math.random() + "$";
        var onGlobalMessage = function(event) {
            if (event.source === global &&
                typeof event.data === "string" &&
                event.data.indexOf(messagePrefix) === 0) {
                runIfPresent(+event.data.slice(messagePrefix.length));
            }
        };

        if (global.addEventListener) {
            global.addEventListener("message", onGlobalMessage, false);
        } else {
            global.attachEvent("onmessage", onGlobalMessage);
        }

        registerImmediate = function(handle) {
            global.postMessage(messagePrefix + handle, "*");
        };
    }

    function installMessageChannelImplementation() {
        var channel = new MessageChannel();
        channel.port1.onmessage = function(event) {
            var handle = event.data;
            runIfPresent(handle);
        };

        registerImmediate = function(handle) {
            channel.port2.postMessage(handle);
        };
    }

    function installReadyStateChangeImplementation() {
        var html = doc.documentElement;
        registerImmediate = function(handle) {
            // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
            // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
            var script = doc.createElement("script");
            script.onreadystatechange = function () {
                runIfPresent(handle);
                script.onreadystatechange = null;
                html.removeChild(script);
                script = null;
            };
            html.appendChild(script);
        };
    }

    function installSetTimeoutImplementation() {
        registerImmediate = function(handle) {
            setTimeout(runIfPresent, 0, handle);
        };
    }

    // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;

    // Don't get fooled by e.g. browserify environments.
    if ({}.toString.call(global.process) === "[object process]") {
        // For Node.js before 0.9
        installNextTickImplementation();

    } else if (canUsePostMessage()) {
        // For non-IE10 modern browsers
        installPostMessageImplementation();

    } else if (global.MessageChannel) {
        // For web workers, where supported
        installMessageChannelImplementation();

    } else if (doc && "onreadystatechange" in doc.createElement("script")) {
        // For IE 6–8
        installReadyStateChangeImplementation();

    } else {
        // For older browsers
        installSetTimeoutImplementation();
    }

    attachTo.setImmediate = setImmediate;
    attachTo.clearImmediate = clearImmediate;
}(typeof self === "undefined" ? typeof global === "undefined" ? this : global : self));

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":180}],184:[function(require,module,exports){
'use strict';

module.exports = 2147483647;

},{}],185:[function(require,module,exports){
'use strict';

var toPosInt   = require('es5-ext/number/to-pos-integer')
  , maxTimeout = require('./max-timeout');

module.exports = function (value) {
	value = toPosInt(value);
	if (value > maxTimeout) throw new TypeError(value + " exceeds maximum possible timeout");
	return value;
};

},{"./max-timeout":184,"es5-ext/number/to-pos-integer":92}],186:[function(require,module,exports){
arguments[4][75][0].apply(exports,arguments)
},{"./lib/type":187,"dup":75}],187:[function(require,module,exports){
/*!
 * type-detect
 * Copyright(c) 2013 jake luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Primary Exports
 */

var exports = module.exports = getType;

/**
 * ### typeOf (obj)
 *
 * Use several different techniques to determine
 * the type of object being tested.
 *
 *
 * @param {Mixed} object
 * @return {String} object type
 * @api public
 */
var objectTypeRegexp = /^\[object (.*)\]$/;

function getType(obj) {
  var type = Object.prototype.toString.call(obj).match(objectTypeRegexp)[1].toLowerCase();
  // Let "new String('')" return 'object'
  if (typeof Promise === 'function' && obj instanceof Promise) return 'promise';
  // PhantomJS has type "DOMWindow" for null
  if (obj === null) return 'null';
  // PhantomJS has type "DOMWindow" for undefined
  if (obj === undefined) return 'undefined';
  return type;
}

exports.Library = Library;

/**
 * ### Library
 *
 * Create a repository for custom type detection.
 *
 * ```js
 * var lib = new type.Library;
 * ```
 *
 */

function Library() {
  if (!(this instanceof Library)) return new Library();
  this.tests = {};
}

/**
 * #### .of (obj)
 *
 * Expose replacement `typeof` detection to the library.
 *
 * ```js
 * if ('string' === lib.of('hello world')) {
 *   // ...
 * }
 * ```
 *
 * @param {Mixed} object to test
 * @return {String} type
 */

Library.prototype.of = getType;

/**
 * #### .define (type, test)
 *
 * Add a test to for the `.test()` assertion.
 *
 * Can be defined as a regular expression:
 *
 * ```js
 * lib.define('int', /^[0-9]+$/);
 * ```
 *
 * ... or as a function:
 *
 * ```js
 * lib.define('bln', function (obj) {
 *   if ('boolean' === lib.of(obj)) return true;
 *   var blns = [ 'yes', 'no', 'true', 'false', 1, 0 ];
 *   if ('string' === lib.of(obj)) obj = obj.toLowerCase();
 *   return !! ~blns.indexOf(obj);
 * });
 * ```
 *
 * @param {String} type
 * @param {RegExp|Function} test
 * @api public
 */

Library.prototype.define = function(type, test) {
  if (arguments.length === 1) return this.tests[type];
  this.tests[type] = test;
  return this;
};

/**
 * #### .test (obj, test)
 *
 * Assert that an object is of type. Will first
 * check natives, and if that does not pass it will
 * use the user defined custom tests.
 *
 * ```js
 * assert(lib.test('1', 'int'));
 * assert(lib.test('yes', 'bln'));
 * ```
 *
 * @param {Mixed} object
 * @param {String} type
 * @return {Boolean} result
 * @api public
 */

Library.prototype.test = function(obj, type) {
  if (type === getType(obj)) return true;
  var test = this.tests[type];

  if (test && 'regexp' === getType(test)) {
    return test.test(obj);
  } else if (test && 'function' === getType(test)) {
    return test(obj);
  } else {
    throw new ReferenceError('Type test "' + type + '" not defined or invalid.');
  }
};

},{}],188:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],189:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],190:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":189,"_process":180,"inherits":188}]},{},[26]);
