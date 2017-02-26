const memoize = require('memoizee');

const { unknownOp, hashify } = require('./util.js'),
      build = require('./lang/expression.js'),
      Fields = require('./lang/fields.js');

class Operator {
    get value() { return this._value; }

    static getNoRefsSteps(steps) { return steps.in_iter; }
    static getOpValue(expr, cb) { cb(expr.ast.run()); }

    getOpValueWithRefs(expr, doc, cb) {
        const { ast, fields } = expr;

        cb(ast.run(fields));
    }
}

class Sum extends Operator {
    constructor() {
        super();

        this._value = 0;
    }

    static _verify(value, cb) {
        if (typeof value === 'number') { cb(value); }
    }

    static getOpValue(expr, cb) {
        super.getOpValue(expr, value => Sum._verify(value, cb));
    }

    getOpValueWithRefs(expr, doc, cb) {
        super.getOpValueWithRefs(expr, doc, (value) => {
            Sum._verify(value, cb);
        });
    }

    add(value) { this._value += value; }
}

class Avg extends Sum {
    constructor() {
        super();

        this._count = 0;
    }

    add(value) {
        this._count++;

        super.add(value);
    }

    get value() { return this._value / this._count || 0; }
}

class Compare extends Operator {
    constructor(fn) {
        super();

        this._value = null;
        this._fn = fn;
        this._add = this._add1;
    }

    static getNoRefsSteps(steps) { return steps.in_end; }

    _add1(value) {
        this._value = value;
        this._add = this._add2;
    }

    _add2(new_value) {
        if (this._fn(new_value, this._value)) {
            this._value = new_value;
        }
    }

    add(value) {
        if (value != null) { this._add(value); }
    }
}

class Min extends Compare {
    constructor() { super((a, b) => a < b); }
}

class Max extends Compare {
    constructor() { super((a, b) => a > b); }
}

class Push extends Operator {
    constructor() {
        super();

        this._value = [];
    }

    add(value) { this._value.push(value); }
}

class AddToSet extends Operator {
    constructor() {
        super();

        this._hashes = {};
    }

    static getNoRefsSteps(steps) { return steps.in_end; }

    add(value) { this._hashes[hashify(value)] = value; }

    get value() {
        const docs = [];

        for (let hash in this._hashes) {
            docs.push(this._hashes[hash]);
        }

        return docs;
    }
}

const runSteps = (steps, ...args) => {
    for (let fn of steps) { fn(...args); }
};

const runInEnd = (in_end, groups) => {
    for (let group_doc of groups) {
        runSteps(in_end, group_doc);
    }
};

const groupLoopFn = (next, in_end, groups, fn) => (cb) => {
    const done = (error) => {
        if (!error) { runInEnd(in_end, groups); }

        cb(error, groups);
    };

    (function iterate() {
        next((error, doc) => {
            if (!doc) { return done(error); }

            fn(doc);
            iterate();
        });
    })();
};

const createGroupByRefFn = (next, expr, steps) => {
    const { in_start, in_iter, in_end } = steps;
    const groups = [];

    const add = memoize((_id_hash, _id) => {
        const group_doc = { _id };

        groups.push(group_doc);
        runSteps(in_start, group_doc);

        return group_doc;
    }, { length: 1 });

    const { ast } = expr;
    const _idFn = doc => ast.run(new Fields(doc));

    let onDoc;

    if (in_iter.length) {
        onDoc = (doc) => {
            const _id = _idFn(doc);
            const group_doc = add(hashify(_id), _id);

            runSteps(in_iter, group_doc, doc);
        };
    } else {
        onDoc = (doc) => {
            const _id = _idFn(doc);

            add(hashify(_id), _id);
        };
    }

    return groupLoopFn(next, in_end, groups, onDoc);
};

const createGroupFn = (next, expr, steps) => {
    if (expr.has_refs) {
        return createGroupByRefFn(next, expr, steps);
    }

    const { in_start, in_iter, in_end } = steps;
    const groups = [];

    const initGroupDoc = () => {
        const group_doc = { _id: expr.ast.run() };

        runSteps(in_start, group_doc);
        groups.push(group_doc);

        return group_doc;
    };

    if (in_iter.length) {
        const add = memoize(() => initGroupDoc());

        return groupLoopFn(next, in_end, groups, (doc) => {
            runSteps(in_iter, add(), doc);
        });
    }

    return (cb) => {
        next((error, doc) => {
            if (doc) {
                initGroupDoc();

                runInEnd(in_end, groups);
            }

            cb(error, groups);
        });
    };
};

const ops = {
    $sum: Sum,
    $avg: Avg,
    $min: Min,
    $max: Max,
    $push: Push,
    $addToSet: AddToSet
};

const _build = (steps, field, value) => {
    const { in_start, in_iter, in_end } = steps;
    const op_strs = Object.keys(value);

    if (op_strs.length > 1) {
        throw Error(`fields must have only one operator`);
    }

    const op_str = op_strs[0], Op = ops[op_str];

    if (!Op) {
        if (op_str[0] === '$') { unknownOp(op_str); }

        throw Error(`unexpected field '${op_str}'`);
    }

    const expr = build(value[op_str]);

    in_start.push((group_doc) => {
        group_doc[field] = new Op(expr);
    });

    if (expr.has_refs) {
        in_iter.push((group_doc, doc) => {
            const fields = new Fields(doc);
            if (!fields.ensure(expr.paths)) { return; }

            const op = group_doc[field],
                  _expr = Object.assign({ fields }, expr),
                  add = value => op.add(value);

            op.getOpValueWithRefs(_expr, doc, add);
        });
    } else {
        Op.getOpValue(expr, (value) => {
            Op.getNoRefsSteps(steps).push((group_doc) => {
                group_doc[field].add(value);
            });
        });
    }

    in_end.push((group_doc) => {
        group_doc[field] = group_doc[field].value;
    });
};

module.exports = (_next, spec) => {
    if (!spec.hasOwnProperty('_id')) {
        throw Error("the '_id' field is missing");
    }

    const expr = build(spec._id);
    const new_spec = Object.assign({}, spec);

    delete new_spec._id;

    const steps = {
        in_start: [],
        in_iter: [],
        in_end: []
    };

    for (let field in new_spec) {
        _build(steps, field, new_spec[field]);
    }

    const group = createGroupFn(_next, expr, steps);

    let next = (cb) => {
        group((error, groups) => {
            if (error) { cb(error); }
            else { (next = cb => cb(null, groups.pop()))(cb); }
        });
    };

    return cb => next(cb);
};
