const { unknownOp } = require('./util.js');
const Cursor = require('./cursor.js');

const ops = {
    $match: (cur, doc) => cur.filter(doc),
    $project: (cur, spec) => cur.project(spec),
    $group: (cur, spec) => cur.group(spec),
    $unwind: (cur, path) => cur.unwind(path),
    $sort: (cur, spec) => cur.sort(spec),
    $skip: (cur, num) => cur.skip(num),
    $limit: (cur, num) => cur.limit(num)
};

const getStageObject = (doc) => {
    const op_keys = Object.keys(doc);

    if (op_keys.length > 1) {
        throw Error('stages must be passed only one operator');
    }

    const op_key = op_keys[0], fn = ops[op_key];

    if (!fn) { unknownOp(op_key); }

    return [fn, doc[op_key]];
};

const aggregate = (col, pipeline) => {
    const cur = new Cursor(col, 'readonly');

    for (let doc of pipeline) {
        const [fn, arg] = getStageObject(doc);

        fn(cur, arg);
    }

    return cur;
};

module.exports = aggregate;
