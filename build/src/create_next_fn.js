'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var merge = require('deepmerge');

var _require = require('./util.js');

var hashify = _require.hashify;
var getIDBError = _require.getIDBError;
var filter = require('./filter.js');
var sort = require('./sort.js');
var _require2 = require('./lang/filter.js');

var build = _require2.build;
var Conjunction = _require2.Conjunction;
var Disjunction = _require2.Disjunction;
var Exists = _require2.Exists;


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

var openConn = function openConn(_ref2, cb) {
    var col = _ref2.col;
    var read_pref = _ref2.read_pref;

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
    var key_range = clause.idb_key_range || null;
    var direction = clause.idb_direction || 'next';
    var literal = clause.path.literal;


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
            var _step$value = _slicedToArray(_step.value, 2);

            var fn = _step$value[0];
            var arg = _step$value[1];

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
    var pipeline = config.pipeline;
    var preds = [];
    var sort_specs = [];

    var i = 0;

    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
        for (var _iterator2 = pipeline[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var _step2$value = _slicedToArray(_step2.value, 2);

            var fn = _step2$value[0];
            var arg = _step2$value[1];

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
    var col = config.col;
    var pred = config.pred;


    config.clauses = getClauses(col, pred);
};

var initHint = function initHint(config) {
    if (!config.hint) {
        return;
    }

    var clauses = config.clauses;
    var hint = config.hint;


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

    var clauses = config.clauses;
    var spec = config.sort_spec;
    var pipeline = config.pipeline;

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
        pipeline.unshift([sort, spec]);
    }
};

var createGetIDBReqFn = function createGetIDBReqFn(_ref3) {
    var pred = _ref3.pred;
    var clauses = _ref3.clauses;
    var pipeline = _ref3.pipeline;

    var getIDBReq = void 0;

    if (clauses.length) {
        var _ret = function () {
            var clause = clauses[0];

            getIDBReq = function getIDBReq(store) {
                return getIDBReqWithIndex(store, clause);
            };

            if (!pred || clause === pred) {
                return {
                    v: getIDBReq
                };
            }

            removeClause(clause);
        }();

        if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
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
            var _step6$value = _slicedToArray(_step6.value, 2);

            var fn = _step6$value[0];
            var arg = _step6$value[1];

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
    var next_fns = [],
        pred_args = config.pred.args;

    for (var i = pred_args.length - 1; i >= 0; i--) {
        var new_config = {
            col: config.col,
            read_pref: config.read_pref,
            pred: pred_args[i],
            pipeline: []
        };

        initClauses(new_config);

        var _next = createNextFn(new_config);

        next_fns.push(addPipelineStages(new_config, _next));
    }

    var _id_hashes = new Set();

    var onDoc = function onDoc(doc) {
        var _id_hash = hashify(doc._id);

        if (!_id_hashes.has(_id_hash)) {
            return _id_hashes.add(_id_hash);
        }
    };

    var getNextFn = function getNextFn() {
        return next_fns.pop();
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