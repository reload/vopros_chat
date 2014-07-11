/**
 * indexOf was added to the ECMA-262 standard in the 5th edition; as
 * such it may not be present in all browsers.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf
 */

/*eslint-disable no-extend-native*/

if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function (searchElement, fromIndex) {
    if (this === undefined || this === null) {
      throw new TypeError('"this" is null or not defined');
    }

    // Hack to convert object.length to a UInt32.
    var length = this.length >>> 0;

    fromIndex = +fromIndex || 0;

    if (Math.abs(fromIndex) === Infinity) {
      fromIndex = 0;
    }

    if (fromIndex < 0) {
      fromIndex += length;
      if (fromIndex < 0) {
        fromIndex = 0;
      }
    }

    for (; fromIndex < length; fromIndex++) {
      if (this[fromIndex] === searchElement) {
        return fromIndex;
      }
    }

    return -1;
  };
}
