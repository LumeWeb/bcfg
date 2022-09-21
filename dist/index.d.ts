/*!
 * config.js - configuration parsing for bcoin
 * Copyright (c) 2016-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */
/// <reference types="node" />
export interface Options {
  suffix?: string;
  fallback?: string;
  alias?: object;
}
export interface LoadOptions {
  hash?: string | boolean;
  query?: string | boolean;
  env?: object | boolean;
  argv?: string[] | boolean;
  config?: string | boolean;
}
/**
 * Config Parser
 */
export default class Config {
  private module;
  private prefix;
  private suffix?;
  private fallback?;
  private options;
  private alias;
  private data;
  private env;
  private args;
  private argv;
  private pass;
  private query;
  private hash;
  constructor(module: string, options?: Options);
  private init;
  inject(options: object): void;
  load(options: LoadOptions): void;
  open(file: string): void;
  openDir(dir: string): void;
  openJson(file: string): void;
  filter(name: string): Config;
  set(key: string, value: any): void;
  has(key: string): boolean;
  get(key: string, fallback?: any): any;
  typeOf(
    key: string
  ):
    | "string"
    | "number"
    | "bigint"
    | "boolean"
    | "symbol"
    | "undefined"
    | "object"
    | "function"
    | "null";
  str(key: string, fallback?: any): any;
  int(key: any, fallback?: any): any;
  uint(key: any, fallback?: any): any;
  float(key: any, fallback?: any): any;
  ufloat(key: any, fallback?: any): any;
  fixed(key: any, exp: any, fallback?: any): any;
  ufixed(key: any, exp: any, fallback?: any): any;
  bool(key: any, fallback?: any): any;
  buf(key: string, fallback?: any, enc?: BufferEncoding): any;
  array(key: string, fallback?: any): any;
  obj(key: string, fallback?: any): any;
  func(key: string, fallback?: any): any;
  path(key: string, fallback?: any): any;
  mb(key: string, fallback?: any): any;
  getSuffix(): any;
  getPrefix(): string;
  getFile(file: string): any;
  location(file: string): string;
  parseConfig(text: string): void;
  parseArg(argv?: string[]): void;
  parseEnv(env?: object): void;
  parseQuery(query: string): void | {};
  parseHash(hash: string): void | {};
  parseForm(query: string, ch: string, map: object): void;
}
