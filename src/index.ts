/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable jsdoc/require-jsdoc */
/* !
 * config.js - configuration parsing for bcoin
 * Copyright (c) 2016-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

"use strict";

import fs from "fs";
import Path from "path";

import arg from "arg";
import assert from "bsert";
import deepToFlatObject from "deep-to-flat-object";
import objectPath from "object-path";

/**
 * Config Parser
 */

export class Config {
  private module: string;
  private data = {};
  private configProperty;

  constructor(module: string, configProperty: string) {
    assert(typeof module === "string");
    assert(module.length > 0);

    this.module = module;
    this.configProperty = configProperty;
  }

  public inject(options: object) {
    for (const key of Object.keys(options)) {
      const value = options[key];

      // eslint-disable-next-line default-case
      switch (key) {
        case "env":
        case "argv":
        case "config":
          continue;
      }

      this.set(key, value);
    }
  }

  public load() {
    const args = arg({}, { permissive: true });

    this.parseArg(args);
  }

  public openDir(dir: string) {
    assert(fs.existsSync(dir), `Directory ${dir} does not exist`);

    let files = fs
      .readdirSync(dir)
      .filter((item) => item.endsWith(".json"))
      .map((item) => Path.join(dir, item));
    files.forEach(this.open.bind(this));
  }

  public open(file: string) {
    let json;
    try {
      json = fs.readFileSync(file, "utf8");
      json = JSON.parse(json);
    } catch (e) {
      if (e.code === "ENOENT") {
        return;
      }
      throw new Error(`Error parsing file ${file}: ${e.message}`);
    }

    assert(typeof json === "object", `Config file ${file} must be an object`);

    const settings = deepToFlatObject(json);

    for (const key of Object.keys(settings)) {
      const value = settings[key];
      this.set(key, value);
    }
  }

  public save(file: string, data: object): void {
    assert(typeof data === "object");
    assert(!Array.isArray(data));

    const configDir = this.str(this.configProperty) as string;
    const fullPath = Path.join(configDir, `${file}.json`);

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(fullPath, JSON.stringify(data));
    this.open(fullPath);
  }

  public savePath(file: string, path: string): void {
    this.save(file, this.get(path));
  }

  public set(key: string, value: any) {
    assert(typeof key === "string", "Key must be a string.");

    if (value === null) {
      return;
    }

    key = this.normalize(key);

    objectPath.set(this.data, key, value);
  }

  public has(key: string) {
    assert(typeof key === "string", "Key must be a string.");

    key = key.replace(/-/g, "");
    key = key.toLowerCase();

    return objectPath.has(this.data, key);
  }

  private normalize(key: string, env = false): string {
    assert(typeof key === "string", "Key must be a string.");

    if (env) {
      key = key.replace(/__/g, ".");
      key = key.replace(/_/g, "");
    } else {
      key = key.replace(/-/g, "");
    }

    key = key.toLowerCase();

    return key;
  }

  public get(key: string, fallback = null) {
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

    assert(typeof key === "string", "Key must be a string.");

    key = this.normalize(key);

    return objectPath.get(this.data, key, fallback);
  }

  public typeOf(key: string) {
    const value = this.get(key);

    if (value === null) {
      return "null";
    }

    return typeof value;
  }

  public str(key: string, fallback = null) {
    const value = this.get(key);

    if (value === null) {
      return fallback;
    }

    if (typeof value !== "string") {
      throw new Error(`${fmt(key)} must be a string.`);
    }

    return value;
  }

  public int(key, fallback = null) {
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

    if (!/^-?\d+$/.test(value)) {
      throw new Error(`${fmt(key)} must be an int.`);
    }

    const num = parseInt(value, 10);

    if (!Number.isSafeInteger(num)) {
      throw new Error(`${fmt(key)} must be an int.`);
    }

    return num;
  }

  public uint(key, fallback = null) {
    const value = this.int(key);

    if (value === null) {
      return fallback;
    }

    if (value < 0) {
      throw new Error(`${fmt(key)} must be a uint.`);
    }

    return value;
  }

  public float(key, fallback = null) {
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

    if (!/^-?\d*(?:\.\d*)?$/.test(value)) {
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

  public ufloat(key, fallback = null) {
    const value = this.float(key);
    if (value === null) {
      return fallback;
    }

    if (value < 0) {
      throw new Error(`${fmt(key)} must be a positive float.`);
    }

    return value;
  }

  public fixed(key, exp, fallback = null) {
    const value = this.float(key);

    if (value === null) {
      return fallback;
    }

    try {
      return fromFloat(value, exp || 0);
    } catch (e) {
      throw new Error(`${fmt(key)} must be a fixed number.`);
    }
  }

  public ufixed(key, exp, fallback = null) {
    const value = this.fixed(key, exp);

    if (value === null) {
      return fallback;
    }

    if (value < 0) {
      throw new Error(`${fmt(key)} must be a positive fixed number.`);
    }

    return value;
  }

  public bool(key, fallback = null) {
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

  public buf(key: string, fallback = null, enc: BufferEncoding = "hex") {
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

  public array(key: string, fallback = null) {
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
    const result: string[] = [];
    for (const part of parts) {
      if (part.length === 0) {
        continue;
      }

      result.push(part);
    }

    return result;
  }

  public obj(key: string, fallback = null) {
    const value = this.get(key);

    if (value === null) {
      return fallback;
    }

    if (typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${fmt(key)} must be an object.`);
    }

    return value;
  }

  public func(key: string, fallback = null) {
    const value = this.get(key);

    if (value === null) {
      return fallback;
    }

    if (typeof value !== "function") {
      throw new Error(`${fmt(key)} must be a function.`);
    }

    return value;
  }

  public mb(key: string, fallback = null) {
    const value = this.uint(key);

    if (value === null) {
      return fallback;
    }

    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    return value * 1024 * 1024;
  }

  public parseArg(args: arg.Result<any>) {
    const argPairs = args._.reduce((prev: any, item: any) => {
      const parts = item.split("=");
      const key = parts[0].replace("-", "");
      prev[key] = parts[1];

      return prev;
    }, {});

    // eslint-disable-next-line @typescript-eslint/no-for-in-array
    for (const key in argPairs) {
      objectPath.set(this.data, key, argPairs[key]);
    }
  }

  public parseEnv(env?: object) {
    let prefix = this.module;

    prefix = prefix.toUpperCase();
    prefix = prefix.replace(/-/g, "_");
    prefix += "_";

    if (!env || typeof env !== "object") {
      env = process.env;
    }

    assert(typeof env === "object");

    for (let key of Object.keys(env)) {
      const value = env[key];

      assert(typeof value === "string");

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

      objectPath.set(this.data, key);
    }
  }
}

/*
 * Helpers
 */

function fmt(key: string[] | string | number) {
  if (Array.isArray(key)) {
    key = key[0];
  }

  if (typeof key === "number") {
    return `Argument #${key}`;
  }

  return key;
}

function isAlpha(str: string) {
  return /^[a-z0-9_-]+$/i.test(str);
}

function isKey(key: string) {
  return /^[a-zA-Z0-9]+$/.test(key);
}

function isUpperKey(key: string) {
  if (!isKey(key)) {
    return false;
  }

  return !/[a-z]/.test(key);
}

function fromFloat(num: number, exp: number) {
  assert(typeof num === "number" && isFinite(num));
  assert(Number.isSafeInteger(exp));

  let str = num.toFixed(exp);
  let sign = 1;

  if (str.length > 0 && str[0] === "-") {
    str = str.substring(1);
    sign = -1;
  }

  let hi: number | string = str;
  let lo: number | string = "0";

  const index = str.indexOf(".");

  if (index !== -1) {
    hi = str.substring(0, index);
    lo = str.substring(index + 1);
  }

  hi = hi.replace(/^0+/, "");
  lo = lo.replace(/0+$/, "");

  assert(hi.length <= 16 - exp, "Fixed number string exceeds 2^53-1.");

  assert(lo.length <= exp, "Too many decimal places in fixed number string.");

  if (hi.length === 0) {
    hi = "0";
  }

  while (lo.length < exp) {
    lo += "0";
  }

  if (lo.length === 0) {
    lo = "0";
  }

  assert(
    /^\d+$/.test(hi) && /^\d+$/.test(lo),
    "Non-numeric characters in fixed number string.",
  );

  hi = parseInt(hi, 10);
  lo = parseInt(lo, 10);

  const mult = Math.pow(10, exp);
  const maxLo = Number.MAX_SAFE_INTEGER % mult;
  const maxHi = (Number.MAX_SAFE_INTEGER - maxLo) / mult;

  assert(
    hi < maxHi || (hi === maxHi && lo <= maxLo),
    "Fixed number string exceeds 2^53-1.",
  );

  return sign * (hi * mult + lo);
}
