/*!
 * config.js - configuration parsing for bcoin
 * Copyright (c) 2016-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bsert_1 = __importDefault(require("bsert"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const arg_1 = __importDefault(require("arg"));
const object_path_1 = __importDefault(require("object-path"));
const deep_to_flat_object_1 = __importDefault(require("deep-to-flat-object"));
/**
 * Config Parser
 */
class Config {
    module;
    data = {};
    constructor(module) {
        (0, bsert_1.default)(typeof module === "string");
        (0, bsert_1.default)(module.length > 0);
        this.module = module;
    }
    inject(options) {
        for (const key of Object.keys(options)) {
            const value = options[key];
            switch (key) {
                case "env":
                case "argv":
                case "config":
                    continue;
            }
            this.set(key, value);
        }
    }
    load() {
        const args = (0, arg_1.default)({}, { permissive: true });
        this.parseArg(args);
    }
    openDir(dir) {
        (0, bsert_1.default)(fs_1.default.existsSync(dir), `Directory ${dir} does not exist`);
        let files = fs_1.default
            .readdirSync(dir)
            .filter((item) => item.endsWith(".json"))
            .map((item) => path_1.default.join(dir, item));
        files.forEach(this.open.bind(this));
    }
    open(file) {
        let json;
        try {
            json = fs_1.default.readFileSync(file, "utf8");
            json = JSON.parse(json);
        }
        catch (e) {
            if (e.code === "ENOENT")
                return;
            throw new Error(`Error parsing file ${file}: ${e.message}`);
        }
        (0, bsert_1.default)(typeof json === "object", `Config file ${file} must be an object`);
        const settings = (0, deep_to_flat_object_1.default)(json);
        for (const key of Object.keys(settings)) {
            const value = settings[key];
            let keyPath = key.split(".");
            let isArray = key.includes(".") &&
                keyPath.length > 1 &&
                typeof parseInt(keyPath.pop()) === "number";
            if (isArray) {
                let itemPath = keyPath.join(".");
                let item = this.get(itemPath, []);
                item.push(value);
                this.set(itemPath, item);
                continue;
            }
            this.set(key, value);
        }
    }
    save(file, data) {
        (0, bsert_1.default)(typeof data === "object");
        (0, bsert_1.default)(!Array.isArray(data));
        const configDir = this.str("configdir");
        const fullPath = path_1.default.join(configDir, file);
        if (!fs_1.default.existsSync(configDir)) {
            fs_1.default.mkdirSync(configDir, { recursive: true });
        }
        fs_1.default.writeFileSync(fullPath, JSON.stringify(data));
        this.open(fullPath);
    }
    set(key, value) {
        (0, bsert_1.default)(typeof key === "string", "Key must be a string.");
        if (value == null) {
            return;
        }
        key = this.normalize(key);
        object_path_1.default.set(this.data, key, value);
        this.data[key] = value;
    }
    has(key) {
        (0, bsert_1.default)(typeof key === "string", "Key must be a string.");
        key = key.replace(/-/g, "");
        key = key.toLowerCase();
        return object_path_1.default.has(this.data, key);
    }
    normalize(key, env = false) {
        (0, bsert_1.default)(typeof key === "string", "Key must be a string.");
        if (env) {
            key = key.replace(/__/g, ".");
            key = key.replace(/_/g, "");
        }
        else {
            key = key.replace(/-/g, "");
        }
        key = key.toLowerCase();
        return key;
    }
    get(key, fallback = null) {
        if (Array.isArray(key)) {
            const keys = key;
            for (const key of keys) {
                const value = this.get(key);
                if (value !== null) {
                    return value;
                }
            }
            return fallback;
        }
        (0, bsert_1.default)(typeof key === "string", "Key must be a string.");
        key = this.normalize(key);
        return object_path_1.default.get(this.data, key, fallback);
    }
    typeOf(key) {
        const value = this.get(key);
        if (value === null) {
            return "null";
        }
        return typeof value;
    }
    str(key, fallback = null) {
        const value = this.get(key);
        if (value === null) {
            return fallback;
        }
        if (typeof value !== "string") {
            throw new Error(`${fmt(key)} must be a string.`);
        }
        return value;
    }
    int(key, fallback = null) {
        const value = this.get(key);
        if (value === null) {
            return fallback;
        }
        if (typeof value !== "string") {
            if (typeof value !== "number") {
                throw new Error(`${fmt(key)} must be an int.`);
            }
            if (!Number.isSafeInteger(value)) {
                throw new Error(`${fmt(key)} must be an int.`);
            }
            return value;
        }
        if (!/^\-?\d+$/.test(value)) {
            throw new Error(`${fmt(key)} must be an int.`);
        }
        const num = parseInt(value, 10);
        if (!Number.isSafeInteger(num)) {
            throw new Error(`${fmt(key)} must be an int.`);
        }
        return num;
    }
    uint(key, fallback = null) {
        const value = this.int(key);
        if (value === null) {
            return fallback;
        }
        if (value < 0) {
            throw new Error(`${fmt(key)} must be a uint.`);
        }
        return value;
    }
    float(key, fallback = null) {
        const value = this.get(key);
        if (value === null) {
            return fallback;
        }
        if (typeof value !== "string") {
            if (typeof value !== "number") {
                throw new Error(`${fmt(key)} must be a float.`);
            }
            if (!isFinite(value)) {
                throw new Error(`${fmt(key)} must be a float.`);
            }
            return value;
        }
        if (!/^\-?\d*(?:\.\d*)?$/.test(value)) {
            throw new Error(`${fmt(key)} must be a float.`);
        }
        if (!/\d/.test(value)) {
            throw new Error(`${fmt(key)} must be a float.`);
        }
        const num = parseFloat(value);
        if (!isFinite(num)) {
            throw new Error(`${fmt(key)} must be a float.`);
        }
        return num;
    }
    ufloat(key, fallback = null) {
        const value = this.float(key);
        if (value === null) {
            return fallback;
        }
        if (value < 0) {
            throw new Error(`${fmt(key)} must be a positive float.`);
        }
        return value;
    }
    fixed(key, exp, fallback = null) {
        const value = this.float(key);
        if (value === null) {
            return fallback;
        }
        try {
            return fromFloat(value, exp || 0);
        }
        catch (e) {
            throw new Error(`${fmt(key)} must be a fixed number.`);
        }
    }
    ufixed(key, exp, fallback = null) {
        const value = this.fixed(key, exp);
        if (value === null) {
            return fallback;
        }
        if (value < 0) {
            throw new Error(`${fmt(key)} must be a positive fixed number.`);
        }
        return value;
    }
    bool(key, fallback = null) {
        const value = this.get(key);
        if (value === null) {
            return fallback;
        }
        // Bitcoin Core compat.
        if (typeof value === "number") {
            if (value === 1) {
                return true;
            }
            if (value === 0) {
                return false;
            }
        }
        if (typeof value !== "string") {
            if (typeof value !== "boolean") {
                throw new Error(`${fmt(key)} must be a boolean.`);
            }
            return value;
        }
        if (value === "true" || value === "1") {
            return true;
        }
        if (value === "false" || value === "0") {
            return false;
        }
        throw new Error(`${fmt(key)} must be a boolean.`);
    }
    buf(key, fallback = null, enc = "hex") {
        const value = this.get(key);
        if (value === null) {
            return fallback;
        }
        if (typeof value !== "string") {
            if (!Buffer.isBuffer(value)) {
                throw new Error(`${fmt(key)} must be a buffer.`);
            }
            return value;
        }
        const data = Buffer.from(value, enc);
        if (data.length !== Buffer.byteLength(value, enc)) {
            throw new Error(`${fmt(key)} must be a ${enc} string.`);
        }
        return data;
    }
    array(key, fallback = null) {
        const value = this.get(key);
        if (value === null) {
            return fallback;
        }
        if (typeof value !== "string") {
            if (!Array.isArray(value)) {
                throw new Error(`${fmt(key)} must be an array.`);
            }
            return value;
        }
        const parts = value.trim().split(/\s*,\s*/);
        const result = [];
        for (const part of parts) {
            if (part.length === 0) {
                continue;
            }
            result.push(part);
        }
        return result;
    }
    obj(key, fallback = null) {
        const value = this.get(key);
        if (value === null) {
            return fallback;
        }
        if (typeof value !== "object" || Array.isArray(value)) {
            throw new Error(`${fmt(key)} must be an object.`);
        }
        return value;
    }
    func(key, fallback = null) {
        const value = this.get(key);
        if (value === null) {
            return fallback;
        }
        if (typeof value !== "function") {
            throw new Error(`${fmt(key)} must be a function.`);
        }
        return value;
    }
    mb(key, fallback = null) {
        const value = this.uint(key);
        if (value === null) {
            return fallback;
        }
        return value * 1024 * 1024;
    }
    parseArg(args) {
        for (let key in args._) {
            let newKey = key.replace("-", "");
            object_path_1.default.set(this.data, newKey, args[key]);
        }
    }
    parseEnv(env) {
        let prefix = this.module;
        prefix = prefix.toUpperCase();
        prefix = prefix.replace(/-/g, "_");
        prefix += "_";
        if (!env || typeof env !== "object") {
            env = process.env;
        }
        (0, bsert_1.default)(env && typeof env === "object");
        for (let key of Object.keys(env)) {
            const value = env[key];
            (0, bsert_1.default)(typeof value === "string");
            if (key.indexOf(prefix) !== 0) {
                continue;
            }
            if (!isUpperKey(key)) {
                continue;
            }
            key = key.substring(prefix.length);
            key = this.normalize(key, true);
            if (value.length === 0) {
                continue;
            }
            object_path_1.default.set(this.data, key);
        }
    }
}
exports.default = Config;
/*
 * Helpers
 */
function fmt(key) {
    if (Array.isArray(key)) {
        key = key[0];
    }
    if (typeof key === "number") {
        return `Argument #${key}`;
    }
    return key;
}
function isAlpha(str) {
    return /^[a-z0-9_\-]+$/i.test(str);
}
function isKey(key) {
    return /^[a-zA-Z0-9]+$/.test(key);
}
function isUpperKey(key) {
    if (!isKey(key)) {
        return false;
    }
    return !/[a-z]/.test(key);
}
function fromFloat(num, exp) {
    (0, bsert_1.default)(typeof num === "number" && isFinite(num));
    (0, bsert_1.default)(Number.isSafeInteger(exp));
    let str = num.toFixed(exp);
    let sign = 1;
    if (str.length > 0 && str[0] === "-") {
        str = str.substring(1);
        sign = -1;
    }
    let hi = str;
    let lo = "0";
    const index = str.indexOf(".");
    if (index !== -1) {
        hi = str.substring(0, index);
        lo = str.substring(index + 1);
    }
    hi = hi.replace(/^0+/, "");
    lo = lo.replace(/0+$/, "");
    (0, bsert_1.default)(hi.length <= 16 - exp, "Fixed number string exceeds 2^53-1.");
    (0, bsert_1.default)(lo.length <= exp, "Too many decimal places in fixed number string.");
    if (hi.length === 0) {
        hi = "0";
    }
    while (lo.length < exp) {
        lo += "0";
    }
    if (lo.length === 0) {
        lo = "0";
    }
    (0, bsert_1.default)(/^\d+$/.test(hi) && /^\d+$/.test(lo), "Non-numeric characters in fixed number string.");
    hi = parseInt(hi, 10);
    lo = parseInt(lo, 10);
    const mult = Math.pow(10, exp);
    const maxLo = Number.MAX_SAFE_INTEGER % mult;
    const maxHi = (Number.MAX_SAFE_INTEGER - maxLo) / mult;
    (0, bsert_1.default)(hi < maxHi || (hi === maxHi && lo <= maxLo), "Fixed number string exceeds 2^53-1.");
    return sign * (hi * mult + lo);
}
//# sourceMappingURL=index.js.map