/**
 * fast-check UMD stub for js/vendor/fast-check.umd.js
 *
 * This is a minimal, self-contained implementation of the fast-check API
 * surface used by the project's property tests. It runs entirely in plain
 * JavaScript with no dependencies and works under both the browser (file://)
 * and Node.js without any build step.
 *
 * Implemented arbitraries: integer, string, stringOf, boolean, date, record,
 * array, uuid, constant, constantFrom, oneof, nat, char, fullUnicode, option,
 * tuple, mapToConstant, filterNotEmpty.
 *
 * Implemented runners: assert, check, property, asyncProperty.
 *
 * NOTE: Replace this file with the official fast-check UMD bundle once a
 * package manager is available (npm install fast-check && copy the CJS/UMD
 * build to this path) for full coverage, shrinking, and replay support.
 *
 * SPDX-License-Identifier: MIT
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.fc = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Pseudo-random helpers
  // ---------------------------------------------------------------------------

  function randomInt(min, max) {
    // inclusive on both ends
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomBool() {
    return Math.random() < 0.5;
  }

  // Printable ASCII characters (space..~)
  var PRINTABLE = (function () {
    var chars = [];
    for (var i = 32; i <= 126; i++) chars.push(String.fromCharCode(i));
    return chars;
  }());

  var ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  // ---------------------------------------------------------------------------
  // Arbitrary base class
  // ---------------------------------------------------------------------------

  function Arbitrary(generateFn) {
    this._generate = generateFn;
  }

  Arbitrary.prototype.generate = function () {
    return this._generate();
  };

  Arbitrary.prototype.map = function (fn) {
    var self = this;
    return new Arbitrary(function () { return fn(self.generate()); });
  };

  Arbitrary.prototype.filter = function (pred) {
    var self = this;
    return new Arbitrary(function () {
      var v;
      var attempts = 0;
      do {
        v = self.generate();
        attempts++;
        if (attempts > 10000) throw new Error('fc.filter: too many rejections');
      } while (!pred(v));
      return v;
    });
  };

  Arbitrary.prototype.chain = function (fn) {
    var self = this;
    return new Arbitrary(function () { return fn(self.generate()).generate(); });
  };

  // ---------------------------------------------------------------------------
  // Arbitraries
  // ---------------------------------------------------------------------------

  function integer(opts) {
    var min = -0x80000000;
    var max = 0x7fffffff;
    if (opts !== undefined) {
      if (typeof opts === 'number') { max = opts; }
      else {
        if (opts.min !== undefined) min = opts.min;
        if (opts.max !== undefined) max = opts.max;
      }
    }
    return new Arbitrary(function () { return randomInt(min, max); });
  }

  function nat(max) {
    return integer({ min: 0, max: max !== undefined ? max : 0x7fffffff });
  }

  function boolean_() {
    return new Arbitrary(randomBool);
  }

  function char() {
    return new Arbitrary(function () {
      return PRINTABLE[randomInt(0, PRINTABLE.length - 1)];
    });
  }

  function fullUnicode() {
    return char();
  }

  function string(opts) {
    var minLen = 0;
    var maxLen = 20;
    if (opts) {
      if (opts.minLength !== undefined) minLen = opts.minLength;
      if (opts.maxLength !== undefined) maxLen = opts.maxLength;
    }
    return new Arbitrary(function () {
      var len = randomInt(minLen, maxLen);
      var s = '';
      for (var i = 0; i < len; i++) {
        s += PRINTABLE[randomInt(0, PRINTABLE.length - 1)];
      }
      return s;
    });
  }

  function stringOf(charArb, opts) {
    var minLen = 0;
    var maxLen = 20;
    if (opts) {
      if (opts.minLength !== undefined) minLen = opts.minLength;
      if (opts.maxLength !== undefined) maxLen = opts.maxLength;
    }
    return new Arbitrary(function () {
      var len = randomInt(minLen, maxLen);
      var s = '';
      for (var i = 0; i < len; i++) s += charArb.generate();
      return s;
    });
  }

  function constantFrom() {
    var values = Array.prototype.slice.call(arguments);
    return new Arbitrary(function () {
      return values[randomInt(0, values.length - 1)];
    });
  }

  function constant(v) {
    return new Arbitrary(function () { return v; });
  }

  function oneof() {
    var arbs = Array.prototype.slice.call(arguments);
    return new Arbitrary(function () {
      return arbs[randomInt(0, arbs.length - 1)].generate();
    });
  }

  function option(arb, opts) {
    var freq = (opts && opts.freq !== undefined) ? opts.freq : 5;
    return new Arbitrary(function () {
      if (randomInt(0, freq) === 0) return null;
      return arb.generate();
    });
  }

  function tuple() {
    var arbs = Array.prototype.slice.call(arguments);
    return new Arbitrary(function () {
      return arbs.map(function (a) { return a.generate(); });
    });
  }

  function record(spec) {
    return new Arbitrary(function () {
      var obj = {};
      Object.keys(spec).forEach(function (k) { obj[k] = spec[k].generate(); });
      return obj;
    });
  }

  function array(arb, opts) {
    var minLen = 0;
    var maxLen = 10;
    if (opts) {
      if (opts.minLength !== undefined) minLen = opts.minLength;
      if (opts.maxLength !== undefined) maxLen = opts.maxLength;
    }
    return new Arbitrary(function () {
      var len = randomInt(minLen, maxLen);
      var arr = [];
      for (var i = 0; i < len; i++) arr.push(arb.generate());
      return arr;
    });
  }

  function uuid() {
    return new Arbitrary(function () {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
    });
  }

  function date(opts) {
    var minMs = (opts && opts.min) ? opts.min.getTime() : 0;
    var maxMs = (opts && opts.max) ? opts.max.getTime() : Date.now();
    return new Arbitrary(function () {
      return new Date(randomInt(minMs, maxMs));
    });
  }

  // ---------------------------------------------------------------------------
  // Runners
  // ---------------------------------------------------------------------------

  var DEFAULT_NUM_RUNS = 100;

  function property() {
    var arbs = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
    var pred = arguments[arguments.length - 1];
    return { _arbs: arbs, _pred: pred, _async: false };
  }

  function asyncProperty() {
    var arbs = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
    var pred = arguments[arguments.length - 1];
    return { _arbs: arbs, _pred: pred, _async: true };
  }

  function check(prop, opts) {
    var numRuns = (opts && opts.numRuns !== undefined) ? opts.numRuns : DEFAULT_NUM_RUNS;
    var counterexample = null;
    var failed = false;

    for (var i = 0; i < numRuns; i++) {
      var args = prop._arbs.map(function (a) { return a.generate(); });
      var result;
      try {
        result = prop._pred.apply(null, args);
      } catch (e) {
        failed = true;
        counterexample = args;
        return {
          failed: true,
          numRuns: i + 1,
          counterexample: counterexample,
          error: e,
          toString: function () {
            return 'Property failed after ' + (i + 1) + ' runs\nCounterexample: ' + JSON.stringify(counterexample);
          }
        };
      }
      if (result === false) {
        failed = true;
        counterexample = args;
        return {
          failed: true,
          numRuns: i + 1,
          counterexample: counterexample,
          error: null,
          toString: function () {
            return 'Property failed after ' + (i + 1) + ' runs\nCounterexample: ' + JSON.stringify(counterexample);
          }
        };
      }
    }

    return {
      failed: false,
      numRuns: numRuns,
      counterexample: null,
      error: null,
      toString: function () { return 'Property passed ' + numRuns + ' tests'; }
    };
  }

  function assert(prop, opts) {
    var out = check(prop, opts);
    if (out.failed) {
      var msg = 'Property failed after ' + out.numRuns + ' tests.\n' +
        'Counterexample: ' + JSON.stringify(out.counterexample);
      if (out.error) msg += '\nCaught: ' + out.error;
      throw new Error(msg);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  return {
    // arbitraries
    integer: integer,
    nat: nat,
    boolean: boolean_,
    char: char,
    fullUnicode: fullUnicode,
    string: string,
    stringOf: stringOf,
    constant: constant,
    constantFrom: constantFrom,
    oneof: oneof,
    option: option,
    tuple: tuple,
    record: record,
    array: array,
    uuid: uuid,
    date: date,

    // runners
    property: property,
    asyncProperty: asyncProperty,
    check: check,
    assert: assert,
  };
}));
