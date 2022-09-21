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
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const HOME = os_1.default.homedir ? os_1.default.homedir() : "/";
/**
 * Config Parser
 */
class Config {
    module;
    prefix;
    suffix;
    fallback;
    options = {};
    alias = {};
    data = {};
    env = {};
    args = {};
    argv = [];
    pass = [];
    query = {};
    hash = {};
    constructor(module, options) {
        (0, bsert_1.default)(typeof module === "string");
        (0, bsert_1.default)(module.length > 0);
        this.module = module;
        this.prefix = path_1.default.join(HOME, `.${module}`);
        if (options) {
            this.init(options);
        }
    }
    init(options) {
        (0, bsert_1.default)(options && typeof options === "object");
        if (options.suffix != null) {
            (0, bsert_1.default)(typeof options.suffix === "string");
            this.suffix = options.suffix;
        }
        if (options.fallback != null) {
            (0, bsert_1.default)(typeof options.fallback === "string");
            this.fallback = options.fallback;
        }
        if (options.alias) {
            (0, bsert_1.default)(typeof options.alias === "object");
            for (const key of Object.keys(options.alias)) {
                const value = options.alias[key];
                (0, bsert_1.default)(typeof value === "string");
                this.alias[key] = value;
            }
        }
    }
    inject(options) {
        for (const key of Object.keys(options)) {
            const value = options[key];
            switch (key) {
                case "hash":
                case "query":
                case "env":
                case "argv":
                case "config":
                    continue;
            }
            this.set(key, value);
        }
    }
    load(options) {
        if (options.hash) {
            this.parseHash(options.hash);
        }
        if (options.query) {
            this.parseQuery(options.query);
        }
        if (options.env) {
            this.parseEnv(options.env);
        }
        if (options.argv) {
            this.parseArg(options.argv);
        }
        this.prefix = this.getPrefix();
    }
    open(file) {
        const path = this.getFile(file);
        let text;
        try {
            text = fs_1.default.readFileSync(path, "utf8");
        }
        catch (e) {
            if (e.code === "ENOENT")
                return;
            throw e;
        }
        this.parseConfig(text);
        this.prefix = this.getPrefix();
    }
    openDir(dir) {
        (0, bsert_1.default)(fs_1.default.existsSync(dir), `Directory ${dir} does not exist`);
        let files = fs_1.default.readdirSync(dir).map((item) => path_1.default.join(dir, item));
        files.forEach(this.openJson.bind(this));
    }
    openJson(file) {
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
        for (const key of Object.keys(json)) {
            const value = json[key];
            switch (true) {
                case Array.isArray(value):
                    this.set(key, [...(this.array(key) ?? []), ...value]);
                    break;
                default:
                    this.set(key, value);
                    break;
            }
        }
        this.prefix = this.getPrefix();
    }
    saveConfigJson(file, data) {
        (0, bsert_1.default)(typeof data === "object");
        (0, bsert_1.default)(!Array.isArray(data));
        const fullPath = path_1.default.join(this.str("configdir"), file);
        fs_1.default.writeFileSync(fullPath, JSON.stringify(data));
        this.openJson(fullPath);
    }
    filter(name) {
        (0, bsert_1.default)(typeof name === "string");
        const child = new Config(this.module);
        child.prefix = this.prefix;
        child.suffix = this.suffix;
        child.fallback = this.fallback;
        child.argv = this.argv;
        child.pass = this.pass;
        _filter(name, this.env, child.env);
        _filter(name, this.args, child.args);
        _filter(name, this.query, child.query);
        _filter(name, this.hash, child.hash);
        _filter(name, this.options, child.options);
        return child;
    }
    set(key, value) {
        (0, bsert_1.default)(typeof key === "string", "Key must be a string.");
        if (value == null) {
            return;
        }
        key = key.replace(/-/g, "");
        key = key.toLowerCase();
        this.options[key] = value;
    }
    has(key) {
        if (typeof key === "number") {
            (0, bsert_1.default)(key >= 0, "Index must be positive.");
            return key < this.argv.length;
        }
        (0, bsert_1.default)(typeof key === "string", "Key must be a string.");
        key = key.replace(/-/g, "");
        key = key.toLowerCase();
        if (key in this.hash && this.hash[key] !== null) {
            return true;
        }
        if (key in this.query && this.query[key] !== null) {
            return true;
        }
        if (key in this.args && this.args[key] !== null) {
            return true;
        }
        if (key in this.env && this.env[key] !== null) {
            return true;
        }
        if (key in this.data && this.data[key] !== null) {
            return true;
        }
        return this.options[key] !== null;
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
        if (typeof key === "number") {
            (0, bsert_1.default)(key >= 0, "Index must be positive.");
            if (key >= this.argv.length) {
                return fallback;
            }
            if (this.argv[key] != null) {
                return this.argv[key];
            }
            return fallback;
        }
        (0, bsert_1.default)(typeof key === "string", "Key must be a string.");
        key = key.replace(/-/g, "");
        key = key.toLowerCase();
        if (key in this.hash && this.hash[key] !== null) {
            return this.hash[key];
        }
        if (key in this.query && this.query[key] !== null) {
            return this.query[key];
        }
        if (key in this.args && this.args[key] !== null) {
            return this.args[key];
        }
        if (key in this.env && this.env[key] !== null) {
            return this.env[key];
        }
        if (key in this.data && this.data[key] !== null) {
            return this.data[key];
        }
        if (key in this.options && this.options[key] !== null) {
            return this.options[key];
        }
        return fallback;
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
    path(key, fallback = null) {
        let value = this.str(key);
        if (value === null) {
            return fallback;
        }
        if (value.length === 0) {
            return fallback;
        }
        switch (value[0]) {
            case "~": // home dir
                value = path_1.default.join(HOME, value.substring(1));
                break;
            case "@": // prefix
                value = path_1.default.join(this.prefix, value.substring(1));
                break;
            default: // cwd
                break;
        }
        return path_1.default.normalize(value);
    }
    mb(key, fallback = null) {
        const value = this.uint(key);
        if (value === null) {
            return fallback;
        }
        return value * 1024 * 1024;
    }
    getSuffix() {
        if (!this.suffix) {
            throw new Error("No suffix presented.");
        }
        const suffix = this.str(this.suffix, this.fallback);
        (0, bsert_1.default)(isAlpha(suffix), "Bad suffix.");
        return suffix;
    }
    getPrefix() {
        let prefix = this.str("prefix");
        if (prefix) {
            if (prefix[0] === "~") {
                prefix = path_1.default.join(HOME, prefix.substring(1));
            }
        }
        else {
            prefix = path_1.default.join(HOME, `.${this.module}`);
        }
        if (this.suffix) {
            const suffix = this.str(this.suffix);
            if (suffix) {
                (0, bsert_1.default)(isAlpha(suffix), "Bad suffix.");
                if (this.fallback && suffix !== this.fallback) {
                    prefix = path_1.default.join(prefix, suffix);
                }
            }
        }
        return path_1.default.normalize(prefix);
    }
    getFile(file) {
        const name = this.str("config");
        if (name) {
            return name;
        }
        return path_1.default.join(this.prefix, file);
    }
    location(file) {
        return path_1.default.join(this.prefix, file);
    }
    parseConfig(text) {
        (0, bsert_1.default)(typeof text === "string", "Config must be text.");
        if (text.charCodeAt(0) === 0xfeff) {
            text = text.substring(1);
        }
        text = text.replace(/\r\n/g, "\n");
        text = text.replace(/\r/g, "\n");
        text = text.replace(/\\\n/g, "");
        let num = 0;
        for (const chunk of text.split("\n")) {
            const line = chunk.trim();
            num += 1;
            if (line.length === 0) {
                continue;
            }
            if (line[0] === "#") {
                continue;
            }
            const index = line.indexOf(":");
            if (index === -1) {
                throw new Error(`Expected ':' on line ${num}: "${line}".`);
            }
            let key = line.substring(0, index).trim();
            key = key.replace(/\-/g, "");
            if (!isLowerKey(key)) {
                throw new Error(`Invalid option on line ${num}: ${key}.`);
            }
            const value = line.substring(index + 1).trim();
            if (value.length === 0) {
                continue;
            }
            const alias = this.alias[key];
            if (alias) {
                key = alias;
            }
            this.data[key] = value;
        }
    }
    parseArg(argv) {
        if (!argv || typeof argv !== "object")
            argv = process.argv;
        (0, bsert_1.default)(Array.isArray(argv));
        let last = null;
        let pass = false;
        for (let i = 2; i < argv.length; i++) {
            const arg = argv[i];
            (0, bsert_1.default)(typeof arg === "string");
            if (arg === "--") {
                pass = true;
                continue;
            }
            if (pass) {
                this.pass.push(arg);
                continue;
            }
            if (arg.length === 0) {
                last = null;
                continue;
            }
            if (arg.indexOf("--") === 0) {
                const index = arg.indexOf("=");
                let key = null;
                let value = null;
                let empty = false;
                if (index !== -1) {
                    // e.g. --opt=val
                    key = arg.substring(2, index);
                    value = arg.substring(index + 1);
                    last = null;
                    empty = false;
                }
                else {
                    // e.g. --opt
                    key = arg.substring(2);
                    value = "true";
                    last = null;
                    empty = true;
                }
                key = key.replace(/\-/g, "");
                if (!isLowerKey(key)) {
                    throw new Error(`Invalid argument: --${key}.`);
                }
                if (value.length === 0) {
                    continue;
                }
                // Do not allow one-letter aliases.
                if (key.length > 1) {
                    const alias = this.alias[key];
                    if (alias) {
                        key = alias;
                    }
                }
                this.args[key] = value;
                if (empty) {
                    last = key;
                }
                continue;
            }
            if (arg[0] === "-") {
                // e.g. -abc
                last = null;
                for (let j = 1; j < arg.length; j++) {
                    let key = arg[j];
                    if ((key < "a" || key > "z") &&
                        (key < "A" || key > "Z") &&
                        (key < "0" || key > "9") &&
                        key !== "?") {
                        throw new Error(`Invalid argument: -${key}.`);
                    }
                    const alias = this.alias[key];
                    if (alias) {
                        key = alias;
                    }
                    this.args[key] = "true";
                    last = key;
                }
                continue;
            }
            // e.g. foo
            const value = arg;
            if (value.length === 0) {
                last = null;
                continue;
            }
            if (last) {
                this.args[last] = value;
                last = null;
            }
            else {
                this.argv.push(value);
            }
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
            if (key.indexOf(prefix) !== 0)
                continue;
            key = key.substring(prefix.length);
            key = key.replace(/_/g, "");
            if (!isUpperKey(key)) {
                continue;
            }
            if (value.length === 0) {
                continue;
            }
            key = key.toLowerCase();
            // Do not allow one-letter aliases.
            if (key.length > 1) {
                const alias = this.alias[key];
                if (alias) {
                    key = alias;
                }
            }
            this.env[key] = value;
        }
    }
    parseQuery(query) {
        if (typeof query !== "string") {
            if (!global.location) {
                return {};
            }
            query = global.location.search;
            if (typeof query !== "string") {
                return {};
            }
        }
        return this.parseForm(query, "?", this.query);
    }
    parseHash(hash) {
        if (typeof hash !== "string") {
            if (!global.location) {
                return {};
            }
            hash = global.location.hash;
            if (typeof hash !== "string") {
                return {};
            }
        }
        return this.parseForm(hash, "#", this.hash);
    }
    parseForm(query, ch, map) {
        (0, bsert_1.default)(typeof query === "string");
        if (query.length === 0) {
            return;
        }
        if (query[0] === ch) {
            query = query.substring(1);
        }
        for (const pair of query.split("&")) {
            const index = pair.indexOf("=");
            let key, value;
            if (index !== -1) {
                key = pair.substring(0, index);
                value = pair.substring(index + 1);
            }
            else {
                key = pair;
                value = "true";
            }
            key = unescape(key);
            key = key.replace(/\-/g, "");
            if (!isLowerKey(key)) {
                continue;
            }
            value = unescape(value);
            if (value.length === 0) {
                continue;
            }
            const alias = this.alias[key];
            if (alias) {
                key = alias;
            }
            map[key] = value;
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
function unescape(str) {
    try {
        str = decodeURIComponent(str);
        str = str.replace(/\+/g, " ");
    }
    catch (e) { }
    str = str.replace(/\0/g, "");
    return str;
}
function isAlpha(str) {
    return /^[a-z0-9_\-]+$/i.test(str);
}
function isKey(key) {
    return /^[a-zA-Z0-9]+$/.test(key);
}
function isLowerKey(key) {
    if (!isKey(key)) {
        return false;
    }
    return !/[A-Z]/.test(key);
}
function isUpperKey(key) {
    if (!isKey(key)) {
        return false;
    }
    return !/[a-z]/.test(key);
}
function _filter(name, a, b) {
    for (const key of Object.keys(a)) {
        if (key.length > name.length && key.indexOf(name) === 0) {
            const sub = key.substring(name.length);
            b[sub] = a[key];
        }
    }
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