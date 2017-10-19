const { expect } = require('chai');

const { build } = require('../../src/lang/filter.js');
const Fields = require('../../src/lang/fields.js');

const evalExpr = (expr, doc) => {
    const pred = build(expr);
    if (pred === false) { return false; }

    return pred.run(new Fields(doc));
};

const getClauses = expr => build(expr).getClauses();

describe('equality (without $eq)', () => {
    it('should find clauses for index and be matchable', () => {
        expect(getClauses({ x: 4 })).to.have.lengthOf(1);
    });

    it('should test for equality', () => {
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

describe('$eq', () => {
    it('should find clauses for index', () => {
        const clauses1 = getClauses({ x: { $eq: undefined } });
        expect(clauses1).to.have.lengthOf(0);

        const clauses2 = getClauses({ x: { $eq: null } });
        expect(clauses2).to.have.lengthOf(0);

        const clauses3 = getClauses({ x: { $eq: 4 } });
        expect(clauses3).to.have.lengthOf(1);

        const clauses4 = getClauses({ x: { $eq: 'foo' } });
        expect(clauses4).to.have.lengthOf(1);

        const clauses5 = getClauses({ x: { $eq: true } });
        expect(clauses5).to.have.lengthOf(1);

        const clauses6 = getClauses({ x: { $eq: { g: 3 } } });
        expect(clauses6).to.have.lengthOf(0);

        const clauses7 = getClauses({ x: { $eq: [] } });
        expect(clauses7).to.have.lengthOf(1);
    });

    it('should test for equality', () => {
        expect(evalExpr({ x: { $eq: 4 } }, { x: 9 })).to.be.false;
        expect(evalExpr({ x: { $eq: 4 } }, { x: 4 })).to.be.true;
    });
});

describe('$ne', () => {
    it("shouldn't find clauses for index", () => {
        expect(getClauses({ x: { $ne: 4 } })).to.have.lengthOf(0);
    });

    it('should test for inequality', () => {
        expect(evalExpr({ x: { $ne: 4 } }, { x: 4 })).to.be.false;
        expect(evalExpr({ x: { $ne: 4 } }, { x: 9 })).to.be.true;
    });
});

describe('conjunction without $and', () => {
    it('should find clauses for index', () => {
        expect(getClauses({ x: 4, k: 3 })).to.have.lengthOf(2);
    });

    it('should perform conjunction', () => {
        expect(evalExpr({ x: 2, g: 3 }, { x: 2, g: 8 })).to.be.false;
        expect(evalExpr({ x: 2, g: 3 }, { x: 2, g: 3 })).to.be.true;
    });
});

describe('$and', () => {
    it('should find clauses for index', () => {
        expect(getClauses({ $and: [{ x: 4 }] })).to.have.lengthOf(1);

        const clauses1 = getClauses({ $and: [{ x: 4 }, { k: 3 }] });
        expect(clauses1).to.have.lengthOf(2);

        const clauses2 = getClauses({
            $and: [{ $and: [{ x: 4 }, { z: 3 }] }, { k: 3 }]
        });

        expect(clauses2).to.have.lengthOf(3);
    });

    it('should perform conjunction', () => {
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

describe('$or', () => {
    it("shouldn't find clauses for index except when only one argument", () => {
        expect(getClauses({ $or: [{ x: 4 }] })).to.have.lengthOf(1);

        expect(getClauses({
            $or: [{ x: 4 }, { k: 3 }]
        })).to.have.lengthOf(0);

        expect(getClauses({
            $or: [{ $or: [{ x: 4 }, { z: 3 }] }, { k: 3 }]
        })).to.have.lengthOf(0);
    });

    it('should perform disjunction', () => {
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

describe('$not', () => {
    it("shouldn't find clauses for index", () => {
        expect(getClauses({ $not: [{ x: 4 }] })).to.have.lengthOf(0);

        expect(getClauses({
            $not: [{ x: 4 }, { k: 3 }]
        })).to.have.lengthOf(0);

        expect(getClauses({
            $not: [{ $not: [{ x: 4 }, { z: 3 }] }, { k: 3 }]
        })).to.have.lengthOf(0);
    });

    it('should perform negation', () => {
        expect(evalExpr({ $not: { x: 4 } }, { x: 4 })).to.be.false;
        expect(evalExpr({ $not: { x: 4 } }, { x: 8 })).to.be.true;
        expect(evalExpr({ $not: { $not: { x: 8 } } }, { x: 4 })).to.be.false;
        expect(evalExpr({ $not: { $not: { x: 4 } } }, { x: 4 })).to.be.true;
    });
});

describe('$gt', () => {
    it('should find clauses for index', () => {
        expect(getClauses({ x: { $gt: 4 } })).to.have.lengthOf(1);
    });

    it('should perform greater than comparison', () => {
        expect(evalExpr({ x: { $gt: 8 } }, { x: 4 })).to.be.false;
        expect(evalExpr({ x: { $gt: 3 } }, { x: 6 })).to.be.true;
    });
});

describe('$gte', () => {
    it('should find clauses for index', () => {
        expect(getClauses({ x: { $gte: 4 } })).to.have.lengthOf(1);
    });

    it('should perform greater than or equal comparison', () => {
        expect(evalExpr({ x: { $gte: 8 } }, { x: 4 })).to.be.false;
        expect(evalExpr({ x: { $gte: 3 } }, { x: 6 })).to.be.true;
        expect(evalExpr({ x: { $gte: 6 } }, { x: 6 })).to.be.true;
    });
});

describe('$lt', () => {
    it('should find clauses for index', () => {
        expect(getClauses({ x: { $lt: 4 } })).to.have.lengthOf(1);
    });

    it('should perform less than comparison', () => {
        expect(evalExpr({ x: { $lt: 3 } }, { x: 6 })).to.be.false;
        expect(evalExpr({ x: { $lt: null } }, {})).to.be.false;
        expect(evalExpr({ x: { $lt: 8 } }, { x: 4 })).to.be.true;
    });
});

describe('$lte', () => {
    it('should find clauses for index', () => {
        expect(getClauses({ x: { $lte: 4 } })).to.have.lengthOf(1);
    });

    it('should perform less than or equal comparison', () => {
        expect(evalExpr({ x: { $lte: 3 } }, { x: 6 })).to.be.false;
        expect(evalExpr({ x: { $lte: null } }, {})).to.be.false;
        expect(evalExpr({ x: { $lte: 8 } }, { x: 4 })).to.be.true;
        expect(evalExpr({ x: { $lte: 6 } }, { x: 6 })).to.be.true;
    });
});

describe('$gt and $lt', () => {
    it('should find clauses for index', () => {
        expect(getClauses({ x: { $gt: 4, $lt: 8 } })).to.have.lengthOf(1);
    });

    it('should perform gt and lt comparison', () => {
        expect(evalExpr({ x: { $gt: 8, $lt: 10 } }, { x: 6 })).to.be.false;
        expect(evalExpr({ x: { $gt: 8, $lt: 10 } }, { x: 11 })).to.be.false;
        expect(evalExpr({ x: { $gt: null } }, {})).to.be.false;
        expect(evalExpr({ x: { $gt: 3, $lt: 8 } }, { x: 6 })).to.be.true;
    });
});

describe('$gte and $lt', () => {
    it('should find clauses for index', () => {
        expect(getClauses({ x: { $gte: 4, $lt: 8 } })).to.have.lengthOf(1);
    });

    it('should perform gte and lt comparison', () => {
        expect(evalExpr({ x: { $gte: 8, $lt: 10 } }, { x: 4 })).to.be.false;
        expect(evalExpr({ x: { $gte: 3, $lt: 10 } }, { x: 11 })).to.be.false;
        expect(evalExpr({ x: { $gte: null } }, {})).to.be.false;
        expect(evalExpr({ x: { $gte: 3, $lt: 8 } }, { x: 6 })).to.be.true;
        expect(evalExpr({ x: { $gte: 3, $lt: 8 } }, { x: 3 })).to.be.true;
    });
});

describe('$gt and $lte', () => {
    it('should find clauses for index', () => {
        expect(getClauses({ x: { $gt: 4, $lte: 8 } })).to.have.lengthOf(1);
    });

    it('should perform gt and lte comparison', () => {
        expect(evalExpr({ x: { $gt: 8, $lte: 10 } }, { x: 4 })).to.be.false;
        expect(evalExpr({ x: { $gt: 3, $lte: 10 } }, { x: 11 })).to.be.false;
        expect(evalExpr({ x: { $gt: 3, $lte: null } }, {})).to.be.false;
        expect(evalExpr({ x: { $gt: 3, $lte: 8 } }, { x: 4 })).to.be.true;
        expect(evalExpr({ x: { $gt: 3, $lte: 8 } }, { x: 8 })).to.be.true;
    });
});

describe('$gte and $lte', () => {
    it('should find clauses for index', () => {
        expect(getClauses({ x: { $gte: 4, $lte: 8 } })).to.have.lengthOf(1);
    });

    it('should perform gte and lte comparison', () => {
        expect(evalExpr({ x: { $gte: 8, $lte: 10 } }, { x: 4 })).to.be.false;
        expect(evalExpr({ x: { $gte: 3, $lte: 10 } }, { x: 11 })).to.be.false;
        expect(evalExpr({ x: { $gte: 3, $lte: null } }, {})).to.be.false;
        expect(evalExpr({ x: { $gte: 3, $lte: 8 } }, { x: 4 })).to.be.true;
        expect(evalExpr({ x: { $gte: 3, $lte: 8 } }, { x: 3 })).to.be.true;
        expect(evalExpr({ x: { $gte: 3, $lte: 8 } }, { x: 8 })).to.be.true;
    });
});

describe('$in', () => {
    it('should find clauses for index', () => {
        expect(getClauses({ x: { $in: [3] } })).to.have.lengthOf(1);
        expect(getClauses({ x: { $in: [3, 4] } })).to.have.lengthOf(0);
    });

    it('should perform disjunction equality test', () => {
        expect(evalExpr({ x: { $in: [3, 4] } }, { x: 8 })).to.be.false;
        expect(evalExpr({ x: { $in: [3, 4] } }, { x: 4 })).to.be.true;
    });
});

describe('$nin', () => {
    it("shouldn't find clauses for index", () => {
        expect(getClauses({ x: { $nin: [3] } })).to.have.lengthOf(0);
        expect(getClauses({ x: { $nin: [3, 4] } })).to.have.lengthOf(0);
    });

    it('should perform conjunction inequality test', () => {
        expect(evalExpr({ x: { $nin: [3, 4] } }, { x: 4 })).to.be.false;
        expect(evalExpr({ x: { $nin: [3, 4] } }, { x: 8 })).to.be.true;
    });
});

describe('$elemMatch', () => {
    it("shouldn't find clauses for index", () => {
        expect(getClauses({
            elements: { $elemMatch: { x: 2 } }
        })).to.have.lengthOf(0);
    });

    it('should test if any iterable elements satisify a predicate', () => {
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

describe('$regex', () => {
    it("shouldn't find clauses for index", () => {
        expect(getClauses({ s: { $regex: '' } })).to.have.lengthOf(0);
    });

    it('should test against a regular expression', () => {
        const expr = { s: { $regex: /^[a-z]+$/ } };

        expect(evalExpr(expr, { s: 'K' })).to.be.false;
        expect(evalExpr(expr, { s: 'k' })).to.be.true;
    });

    it('should test against a regular expression with options', () => {
        const expr = { s: { $regex: /^[a-z]+$/, $options: 'i' } };

        expect(evalExpr(expr, { s: 'K' })).to.be.true;
        expect(evalExpr(expr, { s: 'k' })).to.be.true;
    });
});

describe('$exists', () => {
    it('should find clauses for index when exists is true', () => {
        expect(getClauses({ x: { $exists: 1 } })).to.have.lengthOf(1);
    });

    it("shouldn't find clauses for index when exists is false", () => {
        expect(getClauses({ x: { $exists: 0 } })).to.have.lengthOf(0);
    });

    it('should test if document contains a field', () => {
        expect(evalExpr({ x: { $exists: 1 } }, { k: 4 })).to.be.false;
        expect(evalExpr({ x: { $exists: 1 } }, { x: 4 })).to.be.true;
    });

    it("should test if document doesn't contain a field", () => {
        expect(evalExpr({ x: { $exists: 0 } }, { x: 4 })).to.be.false;
        expect(evalExpr({ x: { $exists: 0 } }, { k: 4 })).to.be.true;
    });
});
