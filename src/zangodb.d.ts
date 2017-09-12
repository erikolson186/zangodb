/// <reference types="node" />

declare module "zangodb" {
    export interface Callback { (error: Error): void; }
    export interface ResultCallback<T> { (error: Error, result: T): void; }
    export interface IteratorCallback { (doc: any): void; }

    export class Cursor extends NodeJS.EventEmitter {
        filter(expr: Object): Cursor;
        forEach(fn: IteratorCallback, cb?: Callback): Promise<Object>;
        group(spec: Object): Cursor;
        hint(path: string): Cursor;
        limit(num: number): Cursor;
        project(spec: Object): Cursor;
        skip(num: number): Cursor;
        sort(spec: Object): Cursor;
        toArray(cb?: ResultCallback<Object[]>): Promise<Object[]>;
        unwind(path: string): Cursor;
    }

    export class Collection {
        name: string;

        aggregate(pipeline: Object[]): Cursor;
        find(expr: Object, projection_spec?: Object): Cursor;
        findOne(expr: Object, projection_spec?: Object,
                cb?: ResultCallback<Object>): Promise<Object>;
        insert(docs: Object|Object[], cb?: Callback): Promise<void>;
        remove(expr: Object, cb?: Callback): Promise<void>;
        update(expr: Object, spec: Object, cb?: Callback): Promise<void>;
    }

    export class Db extends NodeJS.EventEmitter {
        constructor(name: string, version?: number, config?: string[]|Object);

        name: string;
        version: number;

        open(cb?: Callback): ResultCallback<Db>;
        close(): void;
        collection(name: string): Collection;
        drop(cb?: Callback): Promise<void>;
    }
}
