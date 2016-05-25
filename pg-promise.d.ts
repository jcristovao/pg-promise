/// <reference path="../pg/pg.d.ts" />
/// <reference path="../node/node.d.ts" />

declare module "pg-promise" {
  export interface ConfigurationObject
    { host?     : string
    , port?     : number
    , database  : string
    , user?     : string
    , password? : string
    }

  export interface ctx {
      isTX: any;
      start: Date;
      finish?: Date;
      tag?: any;
      success?: boolean;
      context?: any;
  }
  export interface eventContext {
      cn: any;
      client: any;
      query: string;
      params: any;
      ctx: ctx;
  }
  export interface options {
      pgFormatting?: boolean;
      promiseLib?: any;
      connect?: (client: any) => void;
      disconnect?: (client: any) => void;
      query?: (e: eventContext) => void;
      receive?: (data: any[], result: any, e: eventContext) => void;
      task?: (e: eventContext) => void;
      transact?: (client: any) => void;
      error?: (err: any, e: eventContext) => void;
      extend?: (obj: any) => void;
      noLocking?: boolean;
      capTX?: boolean;
  }
  export interface Database {
      query       : any;
      done?       : any;
      connect?    : any;
      none?       : (q: string, vs: any[]) => Promise<void>;
      one?        : (q: string, vs: any[]) => Promise<any>;
      many?       : (q: string, vs?: any[]) => Promise<any[]>;
      oneOrNone?  : (q: string, vs: any[]) => Promise<any>;
      manyOrNone? : (q: string, vs: any[]) => Promise<any[]>;
      any?        : (q: string, vs: any[]) => Promise<any>;
      result?     : (q: string, vs: any[]) => any;
      stream?     : (qs: any, init: (stream: any) => (any)) => any;
      func?       : (fn: string, vs: any[], qrm: number) => Promise<any>;
      proc?       : (pn: string, vs: any[]) => any;
      task?       : (p1?: any, p2?: any) => any;
      tx?         : (p1?: any, p2?: any) => any;
  }
  export interface DatabaseConnect extends Database {
      query: any;
      done: any;
  }
  /**
   * Complete access layer to node-postgres via $[Promises/A+]
   * @module pg-promise
   * @author Vitaly Tomilov
   * @param {Object} [options]
   * Library initialization options:
   * - `pgFormatting` - redirects query formatting to PG;
   * - `promiseLib` - overrides default promise library;
   * - `connect` - database `connect` notification;
   * - `disconnect` - database `disconnect` notification;
   * - `query` - query execution notification;
   * - `receive` - received data notification;
   * - `task` - task event notification;
   * - `transact` - transaction event notification;
   * - `error` - error event notification;
   * - `extend` - protocol extension event;
   * - `noLocking` - prevents protocol locking;
   * - `capTX` - capitalizes transaction commands.
   */


  export interface $Main {
    new (options: options) : (cn: ConfigurationObject | string) => Database; 
  }

  /* To use with extend */
  export interface $MainExtend<T> {
    new (options: options) : (cn: ConfigurationObject | string) => T; 
  }

}
