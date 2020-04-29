(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
(function (Buffer){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":3,"ieee754":6}],4:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.

function isArray(arg) {
  if (Array.isArray) {
    return Array.isArray(arg);
  }
  return objectToString(arg) === '[object Array]';
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = Buffer.isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

}).call(this,{"isBuffer":require("../../is-buffer/index.js")})
},{"../../is-buffer/index.js":8}],5:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (!events)
    return [];

  var evlistener = events[type];
  if (!evlistener)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],6:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],7:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      })
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    }
  }
}

},{}],8:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],9:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],10:[function(require,module,exports){
(function (process){
'use strict';

if (typeof process === 'undefined' ||
    !process.version ||
    process.version.indexOf('v0.') === 0 ||
    process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
  module.exports = { nextTick: nextTick };
} else {
  module.exports = process
}

function nextTick(fn, arg1, arg2, arg3) {
  if (typeof fn !== 'function') {
    throw new TypeError('"callback" argument must be a function');
  }
  var len = arguments.length;
  var args, i;
  switch (len) {
  case 0:
  case 1:
    return process.nextTick(fn);
  case 2:
    return process.nextTick(function afterTickOne() {
      fn.call(null, arg1);
    });
  case 3:
    return process.nextTick(function afterTickTwo() {
      fn.call(null, arg1, arg2);
    });
  case 4:
    return process.nextTick(function afterTickThree() {
      fn.call(null, arg1, arg2, arg3);
    });
  default:
    args = new Array(len - 1);
    i = 0;
    while (i < args.length) {
      args[i++] = arguments[i];
    }
    return process.nextTick(function afterTick() {
      fn.apply(null, args);
    });
  }
}


}).call(this,require('_process'))
},{"_process":11}],11:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],12:[function(require,module,exports){
module.exports = require('./lib/_stream_duplex.js');

},{"./lib/_stream_duplex.js":13}],13:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    keys.push(key);
  }return keys;
};
/*</replacement>*/

module.exports = Duplex;

/*<replacement>*/
var util = Object.create(require('core-util-is'));
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

{
  // avoid scope creep, the keys array can then be collected
  var keys = objectKeys(Writable.prototype);
  for (var v = 0; v < keys.length; v++) {
    var method = keys[v];
    if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
  }
}

function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false) this.readable = false;

  if (options && options.writable === false) this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

  this.once('end', onend);
}

Object.defineProperty(Duplex.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function () {
    return this._writableState.highWaterMark;
  }
});

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended) return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  pna.nextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

Object.defineProperty(Duplex.prototype, 'destroyed', {
  get: function () {
    if (this._readableState === undefined || this._writableState === undefined) {
      return false;
    }
    return this._readableState.destroyed && this._writableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (this._readableState === undefined || this._writableState === undefined) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
    this._writableState.destroyed = value;
  }
});

Duplex.prototype._destroy = function (err, cb) {
  this.push(null);
  this.end();

  pna.nextTick(cb, err);
};
},{"./_stream_readable":15,"./_stream_writable":17,"core-util-is":4,"inherits":7,"process-nextick-args":10}],14:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

'use strict';

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = Object.create(require('core-util-is'));
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};
},{"./_stream_transform":16,"core-util-is":4,"inherits":7}],15:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Readable.ReadableState = ReadableState;

/*<replacement>*/
var EE = require('events').EventEmitter;

var EElistenerCount = function (emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

/*<replacement>*/

var Buffer = require('safe-buffer').Buffer;
var OurUint8Array = global.Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

/*</replacement>*/

/*<replacement>*/
var util = Object.create(require('core-util-is'));
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var debugUtil = require('util');
var debug = void 0;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/

var BufferList = require('./internal/streams/BufferList');
var destroyImpl = require('./internal/streams/destroy');
var StringDecoder;

util.inherits(Readable, Stream);

var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];

function prependListener(emitter, event, fn) {
  // Sadly this is not cacheable as some libraries bundle their own
  // event emitter implementation with them.
  if (typeof emitter.prependListener === 'function') return emitter.prependListener(event, fn);

  // This is a hack to make sure that our error handler is attached before any
  // userland ones.  NEVER DO THIS. This is here only because this code needs
  // to continue to work with older versions of Node.js that do not include
  // the prependListener() method. The goal is to eventually remove this hack.
  if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
}

function ReadableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.
  var isDuplex = stream instanceof Duplex;

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (isDuplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var readableHwm = options.readableHighWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;

  if (hwm || hwm === 0) this.highWaterMark = hwm;else if (isDuplex && (readableHwm || readableHwm === 0)) this.highWaterMark = readableHwm;else this.highWaterMark = defaultHwm;

  // cast to ints.
  this.highWaterMark = Math.floor(this.highWaterMark);

  // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()
  this.buffer = new BufferList();
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the event 'readable'/'data' is emitted
  // immediately, or on a later tick.  We set this to true at first, because
  // any actions that shouldn't happen until "later" should generally also
  // not happen before the first read call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;

  // has it been destroyed
  this.destroyed = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  if (!(this instanceof Readable)) return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  if (options) {
    if (typeof options.read === 'function') this._read = options.read;

    if (typeof options.destroy === 'function') this._destroy = options.destroy;
  }

  Stream.call(this);
}

Object.defineProperty(Readable.prototype, 'destroyed', {
  get: function () {
    if (this._readableState === undefined) {
      return false;
    }
    return this._readableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._readableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
  }
});

Readable.prototype.destroy = destroyImpl.destroy;
Readable.prototype._undestroy = destroyImpl.undestroy;
Readable.prototype._destroy = function (err, cb) {
  this.push(null);
  cb(err);
};

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;
  var skipChunkCheck;

  if (!state.objectMode) {
    if (typeof chunk === 'string') {
      encoding = encoding || state.defaultEncoding;
      if (encoding !== state.encoding) {
        chunk = Buffer.from(chunk, encoding);
        encoding = '';
      }
      skipChunkCheck = true;
    }
  } else {
    skipChunkCheck = true;
  }

  return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
  return readableAddChunk(this, chunk, null, true, false);
};

function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
  var state = stream._readableState;
  if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else {
    var er;
    if (!skipChunkCheck) er = chunkInvalid(state, chunk);
    if (er) {
      stream.emit('error', er);
    } else if (state.objectMode || chunk && chunk.length > 0) {
      if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
        chunk = _uint8ArrayToBuffer(chunk);
      }

      if (addToFront) {
        if (state.endEmitted) stream.emit('error', new Error('stream.unshift() after end event'));else addChunk(stream, state, chunk, true);
      } else if (state.ended) {
        stream.emit('error', new Error('stream.push() after EOF'));
      } else {
        state.reading = false;
        if (state.decoder && !encoding) {
          chunk = state.decoder.write(chunk);
          if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);else maybeReadMore(stream, state);
        } else {
          addChunk(stream, state, chunk, false);
        }
      }
    } else if (!addToFront) {
      state.reading = false;
    }
  }

  return needMoreData(state);
}

function addChunk(stream, state, chunk, addToFront) {
  if (state.flowing && state.length === 0 && !state.sync) {
    stream.emit('data', chunk);
    stream.read(0);
  } else {
    // update the buffer info.
    state.length += state.objectMode ? 1 : chunk.length;
    if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

    if (state.needReadable) emitReadable(stream);
  }
  maybeReadMore(stream, state);
}

function chunkInvalid(state, chunk) {
  var er;
  if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}

// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
}

Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
};

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 8MB
var MAX_HWM = 0x800000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function howMuchToRead(n, state) {
  if (n <= 0 || state.length === 0 && state.ended) return 0;
  if (state.objectMode) return 1;
  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
  }
  // If we're asking for more than the current hwm, then raise the hwm.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
  if (n <= state.length) return n;
  // Don't have enough
  if (!state.ended) {
    state.needReadable = true;
    return 0;
  }
  return state.length;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n);
  n = parseInt(n, 10);
  var state = this._readableState;
  var nOrig = n;

  if (n !== 0) state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
    // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.
    if (!state.reading) n = howMuchToRead(nOrig, state);
  }

  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  } else {
    state.length -= n;
  }

  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true;

    // If we tried to read() past the EOF, then emit end on the next tick.
    if (nOrig !== n && state.ended) endReadable(this);
  }

  if (ret !== null) this.emit('data', ret);

  return ret;
};

function onEofChunk(stream, state) {
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync) pna.nextTick(emitReadable_, stream);else emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    pna.nextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;else len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  this.emit('error', new Error('_read() is not implemented'));
};

Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;

  var endFn = doEnd ? onend : unpipe;
  if (state.endEmitted) pna.nextTick(endFn);else src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable, unpipeInfo) {
    debug('onunpipe');
    if (readable === src) {
      if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
        unpipeInfo.hasUnpiped = true;
        cleanup();
      }
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', unpipe);
    src.removeListener('data', ondata);

    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }

  // If the user pushes more data while we're writing to dest then we'll end up
  // in ondata again. However, we only want to increase awaitDrain once because
  // dest will only emit one 'drain' event for the multiple writes.
  // => Introduce a guard on increasing awaitDrain.
  var increasedAwaitDrain = false;
  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    increasedAwaitDrain = false;
    var ret = dest.write(chunk);
    if (false === ret && !increasedAwaitDrain) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', src._readableState.awaitDrain);
        src._readableState.awaitDrain++;
        increasedAwaitDrain = true;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) dest.emit('error', er);
  }

  // Make sure our error handler is attached before userland ones.
  prependListener(dest, 'error', onerror);

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function () {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}

Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;
  var unpipeInfo = { hasUnpiped: false };

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0) return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;

    if (!dest) dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this, unpipeInfo);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++) {
      dests[i].emit('unpipe', this, unpipeInfo);
    }return this;
  }

  // try to find the right one.
  var index = indexOf(state.pipes, dest);
  if (index === -1) return this;

  state.pipes.splice(index, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];

  dest.emit('unpipe', this, unpipeInfo);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data') {
    // Start flowing on next tick if stream isn't explicitly paused
    if (this._readableState.flowing !== false) this.resume();
  } else if (ev === 'readable') {
    var state = this._readableState;
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.emittedReadable = false;
      if (!state.reading) {
        pna.nextTick(nReadingNextTick, this);
      } else if (state.length) {
        emitReadable(this);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    pna.nextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  if (!state.reading) {
    debug('resume read 0');
    stream.read(0);
  }

  state.resumeScheduled = false;
  state.awaitDrain = 0;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}

Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  while (state.flowing && stream.read() !== null) {}
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  var _this = this;

  var state = this._readableState;
  var paused = false;

  stream.on('end', function () {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) _this.push(chunk);
    }

    _this.push(null);
  });

  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

    var ret = _this.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function (method) {
        return function () {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  }

  // proxy certain important events.
  for (var n = 0; n < kProxyEvents.length; n++) {
    stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
  }

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  this._read = function (n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return this;
};

Object.defineProperty(Readable.prototype, 'readableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function () {
    return this._readableState.highWaterMark;
  }
});

// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromList(n, state) {
  // nothing buffered
  if (state.length === 0) return null;

  var ret;
  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
    // read it all, truncate the list
    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
    state.buffer.clear();
  } else {
    // read part of list
    ret = fromListPartial(n, state.buffer, state.decoder);
  }

  return ret;
}

// Extracts only enough buffered data to satisfy the amount requested.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromListPartial(n, list, hasStrings) {
  var ret;
  if (n < list.head.data.length) {
    // slice is the same for buffers and strings
    ret = list.head.data.slice(0, n);
    list.head.data = list.head.data.slice(n);
  } else if (n === list.head.data.length) {
    // first chunk is a perfect match
    ret = list.shift();
  } else {
    // result spans more than one buffer
    ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
  }
  return ret;
}

// Copies a specified amount of characters from the list of buffered data
// chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBufferString(n, list) {
  var p = list.head;
  var c = 1;
  var ret = p.data;
  n -= ret.length;
  while (p = p.next) {
    var str = p.data;
    var nb = n > str.length ? str.length : n;
    if (nb === str.length) ret += str;else ret += str.slice(0, n);
    n -= nb;
    if (n === 0) {
      if (nb === str.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = str.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

// Copies a specified amount of bytes from the list of buffered data chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBuffer(n, list) {
  var ret = Buffer.allocUnsafe(n);
  var p = list.head;
  var c = 1;
  p.data.copy(ret);
  n -= p.data.length;
  while (p = p.next) {
    var buf = p.data;
    var nb = n > buf.length ? buf.length : n;
    buf.copy(ret, ret.length - n, 0, nb);
    n -= nb;
    if (n === 0) {
      if (nb === buf.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = buf.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    pna.nextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
  }
}

function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./_stream_duplex":13,"./internal/streams/BufferList":18,"./internal/streams/destroy":19,"./internal/streams/stream":20,"_process":11,"core-util-is":4,"events":5,"inherits":7,"isarray":9,"process-nextick-args":10,"safe-buffer":21,"string_decoder/":22,"util":2}],16:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = Object.create(require('core-util-is'));
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);

function afterTransform(er, data) {
  var ts = this._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb) {
    return this.emit('error', new Error('write callback called multiple times'));
  }

  ts.writechunk = null;
  ts.writecb = null;

  if (data != null) // single equals check for both `null` and `undefined`
    this.push(data);

  cb(er);

  var rs = this._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    this._read(rs.highWaterMark);
  }
}

function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);

  Duplex.call(this, options);

  this._transformState = {
    afterTransform: afterTransform.bind(this),
    needTransform: false,
    transforming: false,
    writecb: null,
    writechunk: null,
    writeencoding: null
  };

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;

    if (typeof options.flush === 'function') this._flush = options.flush;
  }

  // When the writable side finishes, then flush out anything remaining.
  this.on('prefinish', prefinish);
}

function prefinish() {
  var _this = this;

  if (typeof this._flush === 'function') {
    this._flush(function (er, data) {
      done(_this, er, data);
    });
  } else {
    done(this, null, null);
  }
}

Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
  throw new Error('_transform() is not implemented');
};

Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};

Transform.prototype._destroy = function (err, cb) {
  var _this2 = this;

  Duplex.prototype._destroy.call(this, err, function (err2) {
    cb(err2);
    _this2.emit('close');
  });
};

function done(stream, er, data) {
  if (er) return stream.emit('error', er);

  if (data != null) // single equals check for both `null` and `undefined`
    stream.push(data);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  if (stream._writableState.length) throw new Error('Calling transform done when ws.length != 0');

  if (stream._transformState.transforming) throw new Error('Calling transform done when still transforming');

  return stream.push(null);
}
},{"./_stream_duplex":13,"core-util-is":4,"inherits":7}],17:[function(require,module,exports){
(function (process,global,setImmediate){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

module.exports = Writable;

/* <replacement> */
function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
  var _this = this;

  this.next = null;
  this.entry = null;
  this.finish = function () {
    onCorkedFinish(_this, state);
  };
}
/* </replacement> */

/*<replacement>*/
var asyncWrite = !process.browser && ['v0.10', 'v0.9.'].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : pna.nextTick;
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var util = Object.create(require('core-util-is'));
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var internalUtil = {
  deprecate: require('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

/*<replacement>*/

var Buffer = require('safe-buffer').Buffer;
var OurUint8Array = global.Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

/*</replacement>*/

var destroyImpl = require('./internal/streams/destroy');

util.inherits(Writable, Stream);

function nop() {}

function WritableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.
  var isDuplex = stream instanceof Duplex;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (isDuplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var writableHwm = options.writableHighWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;

  if (hwm || hwm === 0) this.highWaterMark = hwm;else if (isDuplex && (writableHwm || writableHwm === 0)) this.highWaterMark = writableHwm;else this.highWaterMark = defaultHwm;

  // cast to ints.
  this.highWaterMark = Math.floor(this.highWaterMark);

  // if _final has been called
  this.finalCalled = false;

  // drain event flag.
  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // has it been destroyed
  this.destroyed = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function (er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;

  // count buffered requests
  this.bufferedRequestCount = 0;

  // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two
  this.corkedRequestsFree = new CorkedRequest(this);
}

WritableState.prototype.getBuffer = function getBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};

(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function () {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
    });
  } catch (_) {}
})();

// Test _writableState for inheritance to account for Duplex streams,
// whose prototype chain only points to Readable.
var realHasInstance;
if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
  realHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(Writable, Symbol.hasInstance, {
    value: function (object) {
      if (realHasInstance.call(this, object)) return true;
      if (this !== Writable) return false;

      return object && object._writableState instanceof WritableState;
    }
  });
} else {
  realHasInstance = function (object) {
    return object instanceof this;
  };
}

function Writable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, too.
  // `realHasInstance` is necessary because using plain `instanceof`
  // would return false, as no `_writableState` property is attached.

  // Trying to use the custom `instanceof` for Writable here will also break the
  // Node.js LazyTransform implementation, which has a non-trivial getter for
  // `_writableState` that would lead to infinite recursion.
  if (!realHasInstance.call(Writable, this) && !(this instanceof Duplex)) {
    return new Writable(options);
  }

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  if (options) {
    if (typeof options.write === 'function') this._write = options.write;

    if (typeof options.writev === 'function') this._writev = options.writev;

    if (typeof options.destroy === 'function') this._destroy = options.destroy;

    if (typeof options.final === 'function') this._final = options.final;
  }

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  this.emit('error', new Error('Cannot pipe, not readable'));
};

function writeAfterEnd(stream, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  pna.nextTick(cb, er);
}

// Checks that a user-supplied chunk is valid, especially for the particular
// mode the stream is in. Currently this means that `null` is never accepted
// and undefined/non-string values are only allowed in object mode.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  var er = false;

  if (chunk === null) {
    er = new TypeError('May not write null values to stream');
  } else if (typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  if (er) {
    stream.emit('error', er);
    pna.nextTick(cb, er);
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;
  var isBuf = !state.objectMode && _isUint8Array(chunk);

  if (isBuf && !Buffer.isBuffer(chunk)) {
    chunk = _uint8ArrayToBuffer(chunk);
  }

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

  if (typeof cb !== 'function') cb = nop;

  if (state.ended) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function () {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function () {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = Buffer.from(chunk, encoding);
  }
  return chunk;
}

Object.defineProperty(Writable.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function () {
    return this._writableState.highWaterMark;
  }
});

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
  if (!isBuf) {
    var newChunk = decodeChunk(state, chunk, encoding);
    if (chunk !== newChunk) {
      isBuf = true;
      encoding = 'buffer';
      chunk = newChunk;
    }
  }
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = {
      chunk: chunk,
      encoding: encoding,
      isBuf: isBuf,
      callback: cb,
      next: null
    };
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;

  if (sync) {
    // defer the callback if we are being called synchronously
    // to avoid piling up things on the stack
    pna.nextTick(cb, er);
    // this can emit finish, and it will always happen
    // after error
    pna.nextTick(finishMaybe, stream, state);
    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
  } else {
    // the caller expect this to happen before if
    // it is async
    cb(er);
    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
    // this can emit finish, but finish must
    // always follow error
    finishMaybe(stream, state);
  }
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state);

    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      /*<replacement>*/
      asyncWrite(afterWrite, stream, state, finished, cb);
      /*</replacement>*/
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;

    var count = 0;
    var allBuffers = true;
    while (entry) {
      buffer[count] = entry;
      if (!entry.isBuf) allBuffers = false;
      entry = entry.next;
      count += 1;
    }
    buffer.allBuffers = allBuffers;

    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

    // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite
    state.pendingcb++;
    state.lastBufferedRequest = null;
    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }
    state.bufferedRequestCount = 0;
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      state.bufferedRequestCount--;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }

    if (entry === null) state.lastBufferedRequest = null;
  }

  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new Error('_write() is not implemented'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished) endWritable(this, state, cb);
};

function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}
function callFinal(stream, state) {
  stream._final(function (err) {
    state.pendingcb--;
    if (err) {
      stream.emit('error', err);
    }
    state.prefinished = true;
    stream.emit('prefinish');
    finishMaybe(stream, state);
  });
}
function prefinish(stream, state) {
  if (!state.prefinished && !state.finalCalled) {
    if (typeof stream._final === 'function') {
      state.pendingcb++;
      state.finalCalled = true;
      pna.nextTick(callFinal, stream, state);
    } else {
      state.prefinished = true;
      stream.emit('prefinish');
    }
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    prefinish(stream, state);
    if (state.pendingcb === 0) {
      state.finished = true;
      stream.emit('finish');
    }
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished) pna.nextTick(cb);else stream.once('finish', cb);
  }
  state.ended = true;
  stream.writable = false;
}

function onCorkedFinish(corkReq, state, err) {
  var entry = corkReq.entry;
  corkReq.entry = null;
  while (entry) {
    var cb = entry.callback;
    state.pendingcb--;
    cb(err);
    entry = entry.next;
  }
  if (state.corkedRequestsFree) {
    state.corkedRequestsFree.next = corkReq;
  } else {
    state.corkedRequestsFree = corkReq;
  }
}

Object.defineProperty(Writable.prototype, 'destroyed', {
  get: function () {
    if (this._writableState === undefined) {
      return false;
    }
    return this._writableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._writableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._writableState.destroyed = value;
  }
});

Writable.prototype.destroy = destroyImpl.destroy;
Writable.prototype._undestroy = destroyImpl.undestroy;
Writable.prototype._destroy = function (err, cb) {
  this.end();
  cb(err);
};
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("timers").setImmediate)
},{"./_stream_duplex":13,"./internal/streams/destroy":19,"./internal/streams/stream":20,"_process":11,"core-util-is":4,"inherits":7,"process-nextick-args":10,"safe-buffer":21,"timers":30,"util-deprecate":31}],18:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Buffer = require('safe-buffer').Buffer;
var util = require('util');

function copyBuffer(src, target, offset) {
  src.copy(target, offset);
}

module.exports = function () {
  function BufferList() {
    _classCallCheck(this, BufferList);

    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  BufferList.prototype.push = function push(v) {
    var entry = { data: v, next: null };
    if (this.length > 0) this.tail.next = entry;else this.head = entry;
    this.tail = entry;
    ++this.length;
  };

  BufferList.prototype.unshift = function unshift(v) {
    var entry = { data: v, next: this.head };
    if (this.length === 0) this.tail = entry;
    this.head = entry;
    ++this.length;
  };

  BufferList.prototype.shift = function shift() {
    if (this.length === 0) return;
    var ret = this.head.data;
    if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
    --this.length;
    return ret;
  };

  BufferList.prototype.clear = function clear() {
    this.head = this.tail = null;
    this.length = 0;
  };

  BufferList.prototype.join = function join(s) {
    if (this.length === 0) return '';
    var p = this.head;
    var ret = '' + p.data;
    while (p = p.next) {
      ret += s + p.data;
    }return ret;
  };

  BufferList.prototype.concat = function concat(n) {
    if (this.length === 0) return Buffer.alloc(0);
    if (this.length === 1) return this.head.data;
    var ret = Buffer.allocUnsafe(n >>> 0);
    var p = this.head;
    var i = 0;
    while (p) {
      copyBuffer(p.data, ret, i);
      i += p.data.length;
      p = p.next;
    }
    return ret;
  };

  return BufferList;
}();

if (util && util.inspect && util.inspect.custom) {
  module.exports.prototype[util.inspect.custom] = function () {
    var obj = util.inspect({ length: this.length });
    return this.constructor.name + ' ' + obj;
  };
}
},{"safe-buffer":21,"util":2}],19:[function(require,module,exports){
'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

// undocumented cb() API, needed for core, not for public API
function destroy(err, cb) {
  var _this = this;

  var readableDestroyed = this._readableState && this._readableState.destroyed;
  var writableDestroyed = this._writableState && this._writableState.destroyed;

  if (readableDestroyed || writableDestroyed) {
    if (cb) {
      cb(err);
    } else if (err && (!this._writableState || !this._writableState.errorEmitted)) {
      pna.nextTick(emitErrorNT, this, err);
    }
    return this;
  }

  // we set destroyed to true before firing error callbacks in order
  // to make it re-entrance safe in case destroy() is called within callbacks

  if (this._readableState) {
    this._readableState.destroyed = true;
  }

  // if this is a duplex stream mark the writable part as destroyed as well
  if (this._writableState) {
    this._writableState.destroyed = true;
  }

  this._destroy(err || null, function (err) {
    if (!cb && err) {
      pna.nextTick(emitErrorNT, _this, err);
      if (_this._writableState) {
        _this._writableState.errorEmitted = true;
      }
    } else if (cb) {
      cb(err);
    }
  });

  return this;
}

function undestroy() {
  if (this._readableState) {
    this._readableState.destroyed = false;
    this._readableState.reading = false;
    this._readableState.ended = false;
    this._readableState.endEmitted = false;
  }

  if (this._writableState) {
    this._writableState.destroyed = false;
    this._writableState.ended = false;
    this._writableState.ending = false;
    this._writableState.finished = false;
    this._writableState.errorEmitted = false;
  }
}

function emitErrorNT(self, err) {
  self.emit('error', err);
}

module.exports = {
  destroy: destroy,
  undestroy: undestroy
};
},{"process-nextick-args":10}],20:[function(require,module,exports){
module.exports = require('events').EventEmitter;

},{"events":5}],21:[function(require,module,exports){
/* eslint-disable node/no-deprecated-api */
var buffer = require('buffer')
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}

},{"buffer":3}],22:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

/*<replacement>*/

var Buffer = require('safe-buffer').Buffer;
/*</replacement>*/

var isEncoding = Buffer.isEncoding || function (encoding) {
  encoding = '' + encoding;
  switch (encoding && encoding.toLowerCase()) {
    case 'hex':case 'utf8':case 'utf-8':case 'ascii':case 'binary':case 'base64':case 'ucs2':case 'ucs-2':case 'utf16le':case 'utf-16le':case 'raw':
      return true;
    default:
      return false;
  }
};

function _normalizeEncoding(enc) {
  if (!enc) return 'utf8';
  var retried;
  while (true) {
    switch (enc) {
      case 'utf8':
      case 'utf-8':
        return 'utf8';
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return 'utf16le';
      case 'latin1':
      case 'binary':
        return 'latin1';
      case 'base64':
      case 'ascii':
      case 'hex':
        return enc;
      default:
        if (retried) return; // undefined
        enc = ('' + enc).toLowerCase();
        retried = true;
    }
  }
};

// Do not cache `Buffer.isEncoding` when checking encoding names as some
// modules monkey-patch it to support additional encodings
function normalizeEncoding(enc) {
  var nenc = _normalizeEncoding(enc);
  if (typeof nenc !== 'string' && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
  return nenc || enc;
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters.
exports.StringDecoder = StringDecoder;
function StringDecoder(encoding) {
  this.encoding = normalizeEncoding(encoding);
  var nb;
  switch (this.encoding) {
    case 'utf16le':
      this.text = utf16Text;
      this.end = utf16End;
      nb = 4;
      break;
    case 'utf8':
      this.fillLast = utf8FillLast;
      nb = 4;
      break;
    case 'base64':
      this.text = base64Text;
      this.end = base64End;
      nb = 3;
      break;
    default:
      this.write = simpleWrite;
      this.end = simpleEnd;
      return;
  }
  this.lastNeed = 0;
  this.lastTotal = 0;
  this.lastChar = Buffer.allocUnsafe(nb);
}

StringDecoder.prototype.write = function (buf) {
  if (buf.length === 0) return '';
  var r;
  var i;
  if (this.lastNeed) {
    r = this.fillLast(buf);
    if (r === undefined) return '';
    i = this.lastNeed;
    this.lastNeed = 0;
  } else {
    i = 0;
  }
  if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
  return r || '';
};

StringDecoder.prototype.end = utf8End;

// Returns only complete characters in a Buffer
StringDecoder.prototype.text = utf8Text;

// Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
StringDecoder.prototype.fillLast = function (buf) {
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
  this.lastNeed -= buf.length;
};

// Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
// continuation byte. If an invalid byte is detected, -2 is returned.
function utf8CheckByte(byte) {
  if (byte <= 0x7F) return 0;else if (byte >> 5 === 0x06) return 2;else if (byte >> 4 === 0x0E) return 3;else if (byte >> 3 === 0x1E) return 4;
  return byte >> 6 === 0x02 ? -1 : -2;
}

// Checks at most 3 bytes at the end of a Buffer in order to detect an
// incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
// needed to complete the UTF-8 character (if applicable) are returned.
function utf8CheckIncomplete(self, buf, i) {
  var j = buf.length - 1;
  if (j < i) return 0;
  var nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 1;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 2;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) {
      if (nb === 2) nb = 0;else self.lastNeed = nb - 3;
    }
    return nb;
  }
  return 0;
}

// Validates as many continuation bytes for a multi-byte UTF-8 character as
// needed or are available. If we see a non-continuation byte where we expect
// one, we "replace" the validated continuation bytes we've seen so far with
// a single UTF-8 replacement character ('\ufffd'), to match v8's UTF-8 decoding
// behavior. The continuation byte check is included three times in the case
// where all of the continuation bytes for a character exist in the same buffer.
// It is also done this way as a slight performance increase instead of using a
// loop.
function utf8CheckExtraBytes(self, buf, p) {
  if ((buf[0] & 0xC0) !== 0x80) {
    self.lastNeed = 0;
    return '\ufffd';
  }
  if (self.lastNeed > 1 && buf.length > 1) {
    if ((buf[1] & 0xC0) !== 0x80) {
      self.lastNeed = 1;
      return '\ufffd';
    }
    if (self.lastNeed > 2 && buf.length > 2) {
      if ((buf[2] & 0xC0) !== 0x80) {
        self.lastNeed = 2;
        return '\ufffd';
      }
    }
  }
}

// Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
function utf8FillLast(buf) {
  var p = this.lastTotal - this.lastNeed;
  var r = utf8CheckExtraBytes(this, buf, p);
  if (r !== undefined) return r;
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, p, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, p, 0, buf.length);
  this.lastNeed -= buf.length;
}

// Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
// partial character, the character's bytes are buffered until the required
// number of bytes are available.
function utf8Text(buf, i) {
  var total = utf8CheckIncomplete(this, buf, i);
  if (!this.lastNeed) return buf.toString('utf8', i);
  this.lastTotal = total;
  var end = buf.length - (total - this.lastNeed);
  buf.copy(this.lastChar, 0, end);
  return buf.toString('utf8', i, end);
}

// For UTF-8, a replacement character is added when ending on a partial
// character.
function utf8End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + '\ufffd';
  return r;
}

// UTF-16LE typically needs two bytes per character, but even if we have an even
// number of bytes available, we need to check if we end on a leading/high
// surrogate. In that case, we need to wait for the next two bytes in order to
// decode the last character properly.
function utf16Text(buf, i) {
  if ((buf.length - i) % 2 === 0) {
    var r = buf.toString('utf16le', i);
    if (r) {
      var c = r.charCodeAt(r.length - 1);
      if (c >= 0xD800 && c <= 0xDBFF) {
        this.lastNeed = 2;
        this.lastTotal = 4;
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
        return r.slice(0, -1);
      }
    }
    return r;
  }
  this.lastNeed = 1;
  this.lastTotal = 2;
  this.lastChar[0] = buf[buf.length - 1];
  return buf.toString('utf16le', i, buf.length - 1);
}

// For UTF-16LE we do not explicitly append special replacement characters if we
// end on a partial character, we simply let v8 handle that.
function utf16End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) {
    var end = this.lastTotal - this.lastNeed;
    return r + this.lastChar.toString('utf16le', 0, end);
  }
  return r;
}

function base64Text(buf, i) {
  var n = (buf.length - i) % 3;
  if (n === 0) return buf.toString('base64', i);
  this.lastNeed = 3 - n;
  this.lastTotal = 3;
  if (n === 1) {
    this.lastChar[0] = buf[buf.length - 1];
  } else {
    this.lastChar[0] = buf[buf.length - 2];
    this.lastChar[1] = buf[buf.length - 1];
  }
  return buf.toString('base64', i, buf.length - n);
}

function base64End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
  return r;
}

// Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
function simpleWrite(buf) {
  return buf.toString(this.encoding);
}

function simpleEnd(buf) {
  return buf && buf.length ? this.write(buf) : '';
}
},{"safe-buffer":21}],23:[function(require,module,exports){
module.exports = require('./readable').PassThrough

},{"./readable":24}],24:[function(require,module,exports){
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = exports;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":13,"./lib/_stream_passthrough.js":14,"./lib/_stream_readable.js":15,"./lib/_stream_transform.js":16,"./lib/_stream_writable.js":17}],25:[function(require,module,exports){
module.exports = require('./readable').Transform

},{"./readable":24}],26:[function(require,module,exports){
module.exports = require('./lib/_stream_writable.js');

},{"./lib/_stream_writable.js":17}],27:[function(require,module,exports){
/* eslint-disable node/no-deprecated-api */
var buffer = require('buffer')
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.prototype = Object.create(Buffer.prototype)

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}

},{"buffer":3}],28:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":5,"inherits":7,"readable-stream/duplex.js":12,"readable-stream/passthrough.js":23,"readable-stream/readable.js":24,"readable-stream/transform.js":25,"readable-stream/writable.js":26}],29:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"dup":22,"safe-buffer":27}],30:[function(require,module,exports){
(function (setImmediate,clearImmediate){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this,require("timers").setImmediate,require("timers").clearImmediate)
},{"process/browser.js":11,"timers":30}],31:[function(require,module,exports){
(function (global){

/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!global.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = global.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],32:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],33:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],34:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":33,"_process":11,"inherits":32}],35:[function(require,module,exports){
const Mathml2asciimath = require('mathml2asciimath');
const MathMl2LaTeX = require('mathml2latex');

window.output2 = function() {
    document.getElementById("latex").value = '$$' + MathMl2LaTeX.convert(document.getElementById("mathml").value) + '$$';
}

window.output3 = function() {
    document.getElementById("asciimath").value = '`' + new Mathml2asciimath(document.getElementById("mathml").value).convert() + '`';
}

window.mathmlCopy = function() {
    var copyText = document.getElementById("mathml");

    copyText.select();
    copyText.setSelectionRange(0, 99999);

    document.execCommand("copy");
}

window.asciimathCopy = function() {
    var copyText = document.getElementById("asciimath");

    copyText.select();
    copyText.setSelectionRange(0, 99999);

    document.execCommand("copy");
}

window.latexCopy = function() {
    var copyText = document.getElementById("latex");

    copyText.select();
    copyText.setSelectionRange(0, 99999);

    document.execCommand("copy");
}
},{"mathml2asciimath":48,"mathml2latex":88}],36:[function(require,module,exports){
/*
 *  Copyright 2011 Rackspace
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

var DEFAULT_PARSER = 'sax';

exports.DEFAULT_PARSER = DEFAULT_PARSER;

},{}],37:[function(require,module,exports){
/**
 *  Copyright 2011 Rackspace
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

var sprintf = require('./sprintf').sprintf;

var utils = require('./utils');
var SyntaxError = require('./errors').SyntaxError;

var _cache = {};

var RE = new RegExp(
  "(" +
  "'[^']*'|\"[^\"]*\"|" +
  "::|" +
  "//?|" +
  "\\.\\.|" +
  "\\(\\)|" +
  "[/.*:\\[\\]\\(\\)@=])|" +
  "((?:\\{[^}]+\\})?[^/\\[\\]\\(\\)@=\\s]+)|" +
  "\\s+", 'g'
);

var xpath_tokenizer = utils.findall.bind(null, RE);

function prepare_tag(next, token) {
  var tag = token[0];

  function select(context, result) {
    var i, len, elem, rv = [];

    for (i = 0, len = result.length; i < len; i++) {
      elem = result[i];
      elem._children.forEach(function(e) {
        if (e.tag === tag) {
          rv.push(e);
        }
      });
    }

    return rv;
  }

  return select;
}

function prepare_star(next, token) {
  function select(context, result) {
    var i, len, elem, rv = [];

    for (i = 0, len = result.length; i < len; i++) {
      elem = result[i];
      elem._children.forEach(function(e) {
        rv.push(e);
      });
    }

    return rv;
  }

  return select;
}

function prepare_dot(next, token) {
  function select(context, result) {
    var i, len, elem, rv = [];

    for (i = 0, len = result.length; i < len; i++) {
      elem = result[i];
      rv.push(elem);
    }

    return rv;
  }

  return select;
}

function prepare_iter(next, token) {
  var tag;
  token = next();

  if (token[1] === '*') {
    tag = '*';
  }
  else if (!token[1]) {
    tag = token[0] || '';
  }
  else {
    throw new SyntaxError(token);
  }

  function select(context, result) {
    var i, len, elem, rv = [];

    for (i = 0, len = result.length; i < len; i++) {
      elem = result[i];
      elem.iter(tag, function(e) {
        if (e !== elem) {
          rv.push(e);
        }
      });
    }

    return rv;
  }

  return select;
}

function prepare_dot_dot(next, token) {
  function select(context, result) {
    var i, len, elem, rv = [], parent_map = context.parent_map;

    if (!parent_map) {
      context.parent_map = parent_map = {};

      context.root.iter(null, function(p) {
        p._children.forEach(function(e) {
          parent_map[e] = p;
        });
      });
    }

    for (i = 0, len = result.length; i < len; i++) {
      elem = result[i];

      if (parent_map.hasOwnProperty(elem)) {
        rv.push(parent_map[elem]);
      }
    }

    return rv;
  }

  return select;
}


function prepare_predicate(next, token) {
  var tag, key, value, select;
  token = next();

  if (token[1] === '@') {
    // attribute
    token = next();

    if (token[1]) {
      throw new SyntaxError(token, 'Invalid attribute predicate');
    }

    key = token[0];
    token = next();

    if (token[1] === ']') {
      select = function(context, result) {
        var i, len, elem, rv = [];

        for (i = 0, len = result.length; i < len; i++) {
          elem = result[i];

          if (elem.get(key)) {
            rv.push(elem);
          }
        }

        return rv;
      };
    }
    else if (token[1] === '=') {
      value = next()[1];

      if (value[0] === '"' || value[value.length - 1] === '\'') {
        value = value.slice(1, value.length - 1);
      }
      else {
        throw new SyntaxError(token, 'Ivalid comparison target');
      }

      token = next();
      select = function(context, result) {
        var i, len, elem, rv = [];

        for (i = 0, len = result.length; i < len; i++) {
          elem = result[i];

          if (elem.get(key) === value) {
            rv.push(elem);
          }
        }

        return rv;
      };
    }

    if (token[1] !== ']') {
      throw new SyntaxError(token, 'Invalid attribute predicate');
    }
  }
  else if (!token[1]) {
    tag = token[0] || '';
    token = next();

    if (token[1] !== ']') {
      throw new SyntaxError(token, 'Invalid node predicate');
    }

    select = function(context, result) {
      var i, len, elem, rv = [];

      for (i = 0, len = result.length; i < len; i++) {
        elem = result[i];

        if (elem.find(tag)) {
          rv.push(elem);
        }
      }

      return rv;
    };
  }
  else {
    throw new SyntaxError(null, 'Invalid predicate');
  }

  return select;
}



var ops = {
  "": prepare_tag,
  "*": prepare_star,
  ".": prepare_dot,
  "..": prepare_dot_dot,
  "//": prepare_iter,
  "[": prepare_predicate,
};

function _SelectorContext(root) {
  this.parent_map = null;
  this.root = root;
}

function findall(elem, path) {
  var selector, result, i, len, token, value, select, context;

  if (_cache.hasOwnProperty(path)) {
    selector = _cache[path];
  }
  else {
    // TODO: Use smarter cache purging approach
    if (Object.keys(_cache).length > 100) {
      _cache = {};
    }

    if (path.charAt(0) === '/') {
      throw new SyntaxError(null, 'Cannot use absolute path on element');
    }

    result = xpath_tokenizer(path);
    selector = [];

    function getToken() {
      return result.shift();
    }

    token = getToken();
    while (true) {
      var c = token[1] || '';
      value = ops[c](getToken, token);

      if (!value) {
        throw new SyntaxError(null, sprintf('Invalid path: %s', path));
      }

      selector.push(value);
      token = getToken();

      if (!token) {
        break;
      }
      else if (token[1] === '/') {
        token = getToken();
      }

      if (!token) {
        break;
      }
    }

    _cache[path] = selector;
  }

  // Execute slector pattern
  result = [elem];
  context = new _SelectorContext(elem);

  for (i = 0, len = selector.length; i < len; i++) {
    select = selector[i];
    result = select(context, result);
  }

  return result || [];
}

function find(element, path) {
  var resultElements = findall(element, path);

  if (resultElements && resultElements.length > 0) {
    return resultElements[0];
  }

  return null;
}

function findtext(element, path, defvalue) {
  var resultElements = findall(element, path);

  if (resultElements && resultElements.length > 0) {
    return resultElements[0].text;
  }

  return defvalue;
}


exports.find = find;
exports.findall = findall;
exports.findtext = findtext;

},{"./errors":39,"./sprintf":43,"./utils":45}],38:[function(require,module,exports){
/**
 *  Copyright 2011 Rackspace
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

var sprintf = require('./sprintf').sprintf;

var utils = require('./utils');
var ElementPath = require('./elementpath');
var TreeBuilder = require('./treebuilder').TreeBuilder;
var get_parser = require('./parser').get_parser;
var constants = require('./constants');

var element_ids = 0;

function Element(tag, attrib)
{
  this._id = element_ids++;
  this.tag = tag;
  this.attrib = {};
  this.text = null;
  this.tail = null;
  this._children = [];

  if (attrib) {
    this.attrib = utils.merge(this.attrib, attrib);
  }
}

Element.prototype.toString = function()
{
  return sprintf("<Element %s at %s>", this.tag, this._id);
};

Element.prototype.makeelement = function(tag, attrib)
{
  return new Element(tag, attrib);
};

Element.prototype.len = function()
{
  return this._children.length;
};

Element.prototype.getItem = function(index)
{
  return this._children[index];
};

Element.prototype.setItem = function(index, element)
{
  this._children[index] = element;
};

Element.prototype.delItem = function(index)
{
  this._children.splice(index, 1);
};

Element.prototype.getSlice = function(start, stop)
{
  return this._children.slice(start, stop);
};

Element.prototype.setSlice = function(start, stop, elements)
{
  var i;
  var k = 0;
  for (i = start; i < stop; i++, k++) {
    this._children[i] = elements[k];
  }
};

Element.prototype.delSlice = function(start, stop)
{
  this._children.splice(start, stop - start);
};

Element.prototype.append = function(element)
{
  this._children.push(element);
};

Element.prototype.extend = function(elements)
{
  this._children.concat(elements);
};

Element.prototype.insert = function(index, element)
{
  this._children[index] = element;
};

Element.prototype.remove = function(element)
{
  this._children = this._children.filter(function(e) {
    /* TODO: is this the right way to do this? */
    if (e._id === element._id) {
      return false;
    }
    return true;
  });
};

Element.prototype.getchildren = function() {
  return this._children;
};

Element.prototype.find = function(path)
{
  return ElementPath.find(this, path);
};

Element.prototype.findtext = function(path, defvalue)
{
  return ElementPath.findtext(this, path, defvalue);
};

Element.prototype.findall = function(path, defvalue)
{
  return ElementPath.findall(this, path, defvalue);
};

Element.prototype.clear = function()
{
  this.attrib = {};
  this._children = [];
  this.text = null;
  this.tail = null;
};

Element.prototype.get = function(key, defvalue)
{
  if (this.attrib[key] !== undefined) {
    return this.attrib[key];
  }
  else {
    return defvalue;
  }
};

Element.prototype.set = function(key, value)
{
  this.attrib[key] = value;
};

Element.prototype.keys = function()
{
  return Object.keys(this.attrib);
};

Element.prototype.items = function()
{
  return utils.items(this.attrib);
};

/*
 * In python this uses a generator, but in v8 we don't have em,
 * so we use a callback instead.
 **/
Element.prototype.iter = function(tag, callback)
{
  var self = this;
  var i, child;

  if (tag === "*") {
    tag = null;
  }

  if (tag === null || this.tag === tag) {
    callback(self);
  }

  for (i = 0; i < this._children.length; i++) {
    child = this._children[i];
    child.iter(tag, function(e) {
      callback(e);
    });
  }
};

Element.prototype.itertext = function(callback)
{
  this.iter(null, function(e) {
    if (e.text) {
      callback(e.text);
    }

    if (e.tail) {
      callback(e.tail);
    }
  });
};


function SubElement(parent, tag, attrib) {
  var element = parent.makeelement(tag, attrib);
  parent.append(element);
  return element;
}

function Comment(text) {
  var element = new Element(Comment);
  if (text) {
    element.text = text;
  }
  return element;
}

function CData(text) {
  var element = new Element(CData);
  if (text) {
    element.text = text;
  }
  return element;
}

function ProcessingInstruction(target, text)
{
  var element = new Element(ProcessingInstruction);
  element.text = target;
  if (text) {
    element.text = element.text + " " + text;
  }
  return element;
}

function QName(text_or_uri, tag)
{
  if (tag) {
    text_or_uri = sprintf("{%s}%s", text_or_uri, tag);
  }
  this.text = text_or_uri;
}

QName.prototype.toString = function() {
  return this.text;
};

function ElementTree(element)
{
  this._root = element;
}

ElementTree.prototype.getroot = function() {
  return this._root;
};

ElementTree.prototype._setroot = function(element) {
  this._root = element;
};

ElementTree.prototype.parse = function(source, parser) {
  if (!parser) {
    parser = get_parser(constants.DEFAULT_PARSER);
    parser = new parser.XMLParser(new TreeBuilder());
  }

  parser.feed(source);
  this._root = parser.close();
  return this._root;
};

ElementTree.prototype.iter = function(tag, callback) {
  this._root.iter(tag, callback);
};

ElementTree.prototype.find = function(path) {
  return this._root.find(path);
};

ElementTree.prototype.findtext = function(path, defvalue) {
  return this._root.findtext(path, defvalue);
};

ElementTree.prototype.findall = function(path) {
  return this._root.findall(path);
};

/**
 * Unlike ElementTree, we don't write to a file, we return you a string.
 */
ElementTree.prototype.write = function(options) {
  var sb = [];
  options = utils.merge({
    encoding: 'utf-8',
    xml_declaration: null,
    default_namespace: null,
    method: 'xml'}, options);

  if (options.xml_declaration !== false) {
    sb.push("<?xml version='1.0' encoding='"+options.encoding +"'?>\n");
  }

  if (options.method === "text") {
    _serialize_text(sb, self._root, encoding);
  }
  else {
    var qnames, namespaces, indent, indent_string;
    var x = _namespaces(this._root, options.encoding, options.default_namespace);
    qnames = x[0];
    namespaces = x[1];

    if (options.hasOwnProperty('indent')) {
      indent = 0;
      indent_string = new Array(options.indent + 1).join(' ');
    }
    else {
      indent = false;
    }

    if (options.method === "xml") {
      _serialize_xml(function(data) {
        sb.push(data);
      }, this._root, options.encoding, qnames, namespaces, indent, indent_string);
    }
    else {
      /* TODO: html */
      throw new Error("unknown serialization method "+ options.method);
    }
  }

  return sb.join("");
};

var _namespace_map = {
    /* "well-known" namespace prefixes */
    "http://www.w3.org/XML/1998/namespace": "xml",
    "http://www.w3.org/1999/xhtml": "html",
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdf",
    "http://schemas.xmlsoap.org/wsdl/": "wsdl",
    /* xml schema */
    "http://www.w3.org/2001/XMLSchema": "xs",
    "http://www.w3.org/2001/XMLSchema-instance": "xsi",
    /* dublic core */
    "http://purl.org/dc/elements/1.1/": "dc",
};

function register_namespace(prefix, uri) {
  if (/ns\d+$/.test(prefix)) {
    throw new Error('Prefix format reserved for internal use');
  }

  if (_namespace_map.hasOwnProperty(uri) && _namespace_map[uri] === prefix) {
    delete _namespace_map[uri];
  }

  _namespace_map[uri] = prefix;
}


function _escape(text, encoding, isAttribute, isText) {
  if (text) {
    text = text.toString();
    text = text.replace(/&/g, '&amp;');
    text = text.replace(/</g, '&lt;');
    text = text.replace(/>/g, '&gt;');
    if (!isText) {
        text = text.replace(/\n/g, '&#xA;');
        text = text.replace(/\r/g, '&#xD;');
    }
    if (isAttribute) {
      text = text.replace(/"/g, '&quot;');
    }
  }
  return text;
}

/* TODO: benchmark single regex */
function _escape_attrib(text, encoding) {
  return _escape(text, encoding, true);
}

function _escape_cdata(text, encoding) {
  return _escape(text, encoding, false);
}

function _escape_text(text, encoding) {
  return _escape(text, encoding, false, true);
}

function _namespaces(elem, encoding, default_namespace) {
  var qnames = {};
  var namespaces = {};

  if (default_namespace) {
    namespaces[default_namespace] = "";
  }

  function encode(text) {
    return text;
  }

  function add_qname(qname) {
    if (qname[0] === "{") {
      var tmp = qname.substring(1).split("}", 2);
      var uri = tmp[0];
      var tag = tmp[1];
      var prefix = namespaces[uri];

      if (prefix === undefined) {
        prefix = _namespace_map[uri];
        if (prefix === undefined) {
          prefix = "ns" + Object.keys(namespaces).length;
        }
        if (prefix !== "xml") {
          namespaces[uri] = prefix;
        }
      }

      if (prefix) {
        qnames[qname] = sprintf("%s:%s", prefix, tag);
      }
      else {
        qnames[qname] = tag;
      }
    }
    else {
      if (default_namespace) {
        throw new Error('cannot use non-qualified names with default_namespace option');
      }

      qnames[qname] = qname;
    }
  }


  elem.iter(null, function(e) {
    var i;
    var tag = e.tag;
    var text = e.text;
    var items = e.items();

    if (tag instanceof QName && qnames[tag.text] === undefined) {
      add_qname(tag.text);
    }
    else if (typeof(tag) === "string") {
      add_qname(tag);
    }
    else if (tag !== null && tag !== Comment && tag !== CData && tag !== ProcessingInstruction) {
      throw new Error('Invalid tag type for serialization: '+ tag);
    }

    if (text instanceof QName && qnames[text.text] === undefined) {
      add_qname(text.text);
    }

    items.forEach(function(item) {
      var key = item[0],
          value = item[1];
      if (key instanceof QName) {
        key = key.text;
      }

      if (qnames[key] === undefined) {
        add_qname(key);
      }

      if (value instanceof QName && qnames[value.text] === undefined) {
        add_qname(value.text);
      }
    });
  });
  return [qnames, namespaces];
}

function _serialize_xml(write, elem, encoding, qnames, namespaces, indent, indent_string) {
  var tag = elem.tag;
  var text = elem.text;
  var items;
  var i;

  var newlines = indent || (indent === 0);
  write(Array(indent + 1).join(indent_string));

  if (tag === Comment) {
    write(sprintf("<!--%s-->", _escape_cdata(text, encoding)));
  }
  else if (tag === ProcessingInstruction) {
    write(sprintf("<?%s?>", _escape_cdata(text, encoding)));
  }
  else if (tag === CData) {
    text = text || '';
    write(sprintf("<![CDATA[%s]]>", text));
  }
  else {
    tag = qnames[tag];
    if (tag === undefined) {
      if (text) {
        write(_escape_text(text, encoding));
      }
      elem.iter(function(e) {
        _serialize_xml(write, e, encoding, qnames, null, newlines ? indent + 1 : false, indent_string);
      });
    }
    else {
      write("<" + tag);
      items = elem.items();

      if (items || namespaces) {
        items.sort(); // lexical order

        items.forEach(function(item) {
          var k = item[0],
              v = item[1];

            if (k instanceof QName) {
              k = k.text;
            }

            if (v instanceof QName) {
              v = qnames[v.text];
            }
            else {
              v = _escape_attrib(v, encoding);
            }
            write(sprintf(" %s=\"%s\"", qnames[k], v));
        });

        if (namespaces) {
          items = utils.items(namespaces);
          items.sort(function(a, b) { return a[1] < b[1]; });

          items.forEach(function(item) {
            var k = item[1],
                v = item[0];

            if (k) {
              k = ':' + k;
            }

            write(sprintf(" xmlns%s=\"%s\"", k, _escape_attrib(v, encoding)));
          });
        }
      }

      if (text || elem.len()) {
        if (text && text.toString().match(/^\s*$/)) {
            text = null;
        }

        write(">");
        if (!text && newlines) {
          write("\n");
        }

        if (text) {
          write(_escape_text(text, encoding));
        }
        elem._children.forEach(function(e) {
          _serialize_xml(write, e, encoding, qnames, null, newlines ? indent + 1 : false, indent_string);
        });

        if (!text && indent) {
          write(Array(indent + 1).join(indent_string));
        }
        write("</" + tag + ">");
      }
      else {
        write(" />");
      }
    }
  }

  if (newlines) {
    write("\n");
  }
}

function parse(source, parser) {
  var tree = new ElementTree();
  tree.parse(source, parser);
  return tree;
}

function tostring(element, options) {
  return new ElementTree(element).write(options);
}

exports.PI = ProcessingInstruction;
exports.Comment = Comment;
exports.CData = CData;
exports.ProcessingInstruction = ProcessingInstruction;
exports.SubElement = SubElement;
exports.QName = QName;
exports.ElementTree = ElementTree;
exports.ElementPath = ElementPath;
exports.Element = function(tag, attrib) {
  return new Element(tag, attrib);
};

exports.XML = function(data) {
  var et = new ElementTree();
  return et.parse(data);
};

exports.parse = parse;
exports.register_namespace = register_namespace;
exports.tostring = tostring;

},{"./constants":36,"./elementpath":37,"./parser":40,"./sprintf":43,"./treebuilder":44,"./utils":45}],39:[function(require,module,exports){
/**
 *  Copyright 2011 Rackspace
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

var util = require('util');

var sprintf = require('./sprintf').sprintf;

function SyntaxError(token, msg) {
  msg = msg || sprintf('Syntax Error at token %s', token.toString());
  this.token = token;
  this.message = msg;
  Error.call(this, msg);
}

util.inherits(SyntaxError, Error);

exports.SyntaxError = SyntaxError;

},{"./sprintf":43,"util":34}],40:[function(require,module,exports){
/*
 *  Copyright 2011 Rackspace
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

/* TODO: support node-expat C++ module optionally */

var util = require('util');
var parsers = require('./parsers/index');

function get_parser(name) {
  if (name === 'sax') {
    return parsers.sax;
  }
  else {
    throw new Error('Invalid parser: ' + name);
  }
}


exports.get_parser = get_parser;

},{"./parsers/index":41,"util":34}],41:[function(require,module,exports){
exports.sax = require('./sax');

},{"./sax":42}],42:[function(require,module,exports){
var util = require('util');

var sax = require('sax');

var TreeBuilder = require('./../treebuilder').TreeBuilder;

function XMLParser(target) {
  this.parser = sax.parser(true);

  this.target = (target) ? target : new TreeBuilder();

  this.parser.onopentag = this._handleOpenTag.bind(this);
  this.parser.ontext = this._handleText.bind(this);
  this.parser.oncdata = this._handleCdata.bind(this);
  this.parser.ondoctype = this._handleDoctype.bind(this);
  this.parser.oncomment = this._handleComment.bind(this);
  this.parser.onclosetag = this._handleCloseTag.bind(this);
  this.parser.onerror = this._handleError.bind(this);
}

XMLParser.prototype._handleOpenTag = function(tag) {
  this.target.start(tag.name, tag.attributes);
};

XMLParser.prototype._handleText = function(text) {
  this.target.data(text);
};

XMLParser.prototype._handleCdata = function(text) {
  this.target.data(text);
};

XMLParser.prototype._handleDoctype = function(text) {
};

XMLParser.prototype._handleComment = function(comment) {
};

XMLParser.prototype._handleCloseTag = function(tag) {
  this.target.end(tag);
};

XMLParser.prototype._handleError = function(err) {
  throw err;
};

XMLParser.prototype.feed = function(chunk) {
  this.parser.write(chunk);
};

XMLParser.prototype.close = function() {
  this.parser.close();
  return this.target.close();
};

exports.XMLParser = XMLParser;

},{"./../treebuilder":44,"sax":46,"util":34}],43:[function(require,module,exports){
/*
 *  Copyright 2011 Rackspace
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

var cache = {};


// Do any others need escaping?
var TO_ESCAPE = {
  '\'': '\\\'',
  '\n': '\\n'
};


function populate(formatter) {
  var i, type,
      key = formatter,
      prev = 0,
      arg = 1,
      builder = 'return \'';

  for (i = 0; i < formatter.length; i++) {
    if (formatter[i] === '%') {
      type = formatter[i + 1];

      switch (type) {
        case 's':
          builder += formatter.slice(prev, i) + '\' + arguments[' + arg + '] + \'';
          prev = i + 2;
          arg++;
          break;
        case 'j':
          builder += formatter.slice(prev, i) + '\' + JSON.stringify(arguments[' + arg + ']) + \'';
          prev = i + 2;
          arg++;
          break;
        case '%':
          builder += formatter.slice(prev, i + 1);
          prev = i + 2;
          i++;
          break;
      }


    } else if (TO_ESCAPE[formatter[i]]) {
      builder += formatter.slice(prev, i) + TO_ESCAPE[formatter[i]];
      prev = i + 1;
    }
  }

  builder += formatter.slice(prev) + '\';';
  cache[key] = new Function(builder);
}


/**
 * A fast version of sprintf(), which currently only supports the %s and %j.
 * This caches a formatting function for each format string that is used, so
 * you should only use this sprintf() will be called many times with a single
 * format string and a limited number of format strings will ever be used (in
 * general this means that format strings should be string literals).
 *
 * @param {String} formatter A format string.
 * @param {...String} var_args Values that will be formatted by %s and %j.
 * @return {String} The formatted output.
 */
exports.sprintf = function(formatter, var_args) {
  if (!cache[formatter]) {
    populate(formatter);
  }

  return cache[formatter].apply(null, arguments);
};

},{}],44:[function(require,module,exports){
function TreeBuilder(element_factory) {
  this._data = [];
  this._elem = [];
  this._last = null;
  this._tail = null;
  if (!element_factory) {
    /* evil circular dep */
    element_factory = require('./elementtree').Element;
  }
  this._factory = element_factory;
}

TreeBuilder.prototype.close = function() {
  return this._last;
};

TreeBuilder.prototype._flush = function() {
  if (this._data) {
    if (this._last !== null) {
      var text = this._data.join("");
      if (this._tail) {
        this._last.tail = text;
      }
      else {
        this._last.text = text;
      }
    }
    this._data = [];
  }
};

TreeBuilder.prototype.data = function(data) {
  this._data.push(data);
};

TreeBuilder.prototype.start = function(tag, attrs) {
  this._flush();
  var elem = this._factory(tag, attrs);
  this._last = elem;

  if (this._elem.length) {
    this._elem[this._elem.length - 1].append(elem);
  }

  this._elem.push(elem);

  this._tail = null;
};

TreeBuilder.prototype.end = function(tag) {
  this._flush();
  this._last = this._elem.pop();
  if (this._last.tag !== tag) {
    throw new Error("end tag mismatch");
  }
  this._tail = 1;
  return this._last;
};

exports.TreeBuilder = TreeBuilder;

},{"./elementtree":38}],45:[function(require,module,exports){
/**
 *  Copyright 2011 Rackspace
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

/**
 * @param {Object} hash.
 * @param {Array} ignored.
 */
function items(hash, ignored) {
  ignored = ignored || null;
  var k, rv = [];

  function is_ignored(key) {
    if (!ignored || ignored.length === 0) {
      return false;
    }

    return ignored.indexOf(key);
  }

  for (k in hash) {
    if (hash.hasOwnProperty(k) && !(is_ignored(ignored))) {
      rv.push([k, hash[k]]);
    }
  }

  return rv;
}


function findall(re, str) {
  var match, matches = [];

  while ((match = re.exec(str))) {
      matches.push(match);
  }

  return matches;
}

function merge(a, b) {
  var c = {}, attrname;

  for (attrname in a) {
    if (a.hasOwnProperty(attrname)) {
      c[attrname] = a[attrname];
    }
  }
  for (attrname in b) {
    if (b.hasOwnProperty(attrname)) {
      c[attrname] = b[attrname];
    }
  }
  return c;
}

exports.items = items;
exports.findall = findall;
exports.merge = merge;

},{}],46:[function(require,module,exports){
(function (Buffer){
;(function (sax) { // wrapper for non-node envs
  sax.parser = function (strict, opt) { return new SAXParser(strict, opt) }
  sax.SAXParser = SAXParser
  sax.SAXStream = SAXStream
  sax.createStream = createStream

  // When we pass the MAX_BUFFER_LENGTH position, start checking for buffer overruns.
  // When we check, schedule the next check for MAX_BUFFER_LENGTH - (max(buffer lengths)),
  // since that's the earliest that a buffer overrun could occur.  This way, checks are
  // as rare as required, but as often as necessary to ensure never crossing this bound.
  // Furthermore, buffers are only tested at most once per write(), so passing a very
  // large string into write() might have undesirable effects, but this is manageable by
  // the caller, so it is assumed to be safe.  Thus, a call to write() may, in the extreme
  // edge case, result in creating at most one complete copy of the string passed in.
  // Set to Infinity to have unlimited buffers.
  sax.MAX_BUFFER_LENGTH = 64 * 1024

  var buffers = [
    'comment', 'sgmlDecl', 'textNode', 'tagName', 'doctype',
    'procInstName', 'procInstBody', 'entity', 'attribName',
    'attribValue', 'cdata', 'script'
  ]

  sax.EVENTS = [
    'text',
    'processinginstruction',
    'sgmldeclaration',
    'doctype',
    'comment',
    'attribute',
    'opentag',
    'closetag',
    'opencdata',
    'cdata',
    'closecdata',
    'error',
    'end',
    'ready',
    'script',
    'opennamespace',
    'closenamespace'
  ]

  function SAXParser (strict, opt) {
    if (!(this instanceof SAXParser)) {
      return new SAXParser(strict, opt)
    }

    var parser = this
    clearBuffers(parser)
    parser.q = parser.c = ''
    parser.bufferCheckPosition = sax.MAX_BUFFER_LENGTH
    parser.opt = opt || {}
    parser.opt.lowercase = parser.opt.lowercase || parser.opt.lowercasetags
    parser.looseCase = parser.opt.lowercase ? 'toLowerCase' : 'toUpperCase'
    parser.tags = []
    parser.closed = parser.closedRoot = parser.sawRoot = false
    parser.tag = parser.error = null
    parser.strict = !!strict
    parser.noscript = !!(strict || parser.opt.noscript)
    parser.state = S.BEGIN
    parser.strictEntities = parser.opt.strictEntities
    parser.ENTITIES = parser.strictEntities ? Object.create(sax.XML_ENTITIES) : Object.create(sax.ENTITIES)
    parser.attribList = []

    // namespaces form a prototype chain.
    // it always points at the current tag,
    // which protos to its parent tag.
    if (parser.opt.xmlns) {
      parser.ns = Object.create(rootNS)
    }

    // mostly just for error reporting
    parser.trackPosition = parser.opt.position !== false
    if (parser.trackPosition) {
      parser.position = parser.line = parser.column = 0
    }
    emit(parser, 'onready')
  }

  if (!Object.create) {
    Object.create = function (o) {
      function F () {}
      F.prototype = o
      var newf = new F()
      return newf
    }
  }

  if (!Object.keys) {
    Object.keys = function (o) {
      var a = []
      for (var i in o) if (o.hasOwnProperty(i)) a.push(i)
      return a
    }
  }

  function checkBufferLength (parser) {
    var maxAllowed = Math.max(sax.MAX_BUFFER_LENGTH, 10)
    var maxActual = 0
    for (var i = 0, l = buffers.length; i < l; i++) {
      var len = parser[buffers[i]].length
      if (len > maxAllowed) {
        // Text/cdata nodes can get big, and since they're buffered,
        // we can get here under normal conditions.
        // Avoid issues by emitting the text node now,
        // so at least it won't get any bigger.
        switch (buffers[i]) {
          case 'textNode':
            closeText(parser)
            break

          case 'cdata':
            emitNode(parser, 'oncdata', parser.cdata)
            parser.cdata = ''
            break

          case 'script':
            emitNode(parser, 'onscript', parser.script)
            parser.script = ''
            break

          default:
            error(parser, 'Max buffer length exceeded: ' + buffers[i])
        }
      }
      maxActual = Math.max(maxActual, len)
    }
    // schedule the next check for the earliest possible buffer overrun.
    var m = sax.MAX_BUFFER_LENGTH - maxActual
    parser.bufferCheckPosition = m + parser.position
  }

  function clearBuffers (parser) {
    for (var i = 0, l = buffers.length; i < l; i++) {
      parser[buffers[i]] = ''
    }
  }

  function flushBuffers (parser) {
    closeText(parser)
    if (parser.cdata !== '') {
      emitNode(parser, 'oncdata', parser.cdata)
      parser.cdata = ''
    }
    if (parser.script !== '') {
      emitNode(parser, 'onscript', parser.script)
      parser.script = ''
    }
  }

  SAXParser.prototype = {
    end: function () { end(this) },
    write: write,
    resume: function () { this.error = null; return this },
    close: function () { return this.write(null) },
    flush: function () { flushBuffers(this) }
  }

  var Stream
  try {
    Stream = require('stream').Stream
  } catch (ex) {
    Stream = function () {}
  }

  var streamWraps = sax.EVENTS.filter(function (ev) {
    return ev !== 'error' && ev !== 'end'
  })

  function createStream (strict, opt) {
    return new SAXStream(strict, opt)
  }

  function SAXStream (strict, opt) {
    if (!(this instanceof SAXStream)) {
      return new SAXStream(strict, opt)
    }

    Stream.apply(this)

    this._parser = new SAXParser(strict, opt)
    this.writable = true
    this.readable = true

    var me = this

    this._parser.onend = function () {
      me.emit('end')
    }

    this._parser.onerror = function (er) {
      me.emit('error', er)

      // if didn't throw, then means error was handled.
      // go ahead and clear error, so we can write again.
      me._parser.error = null
    }

    this._decoder = null

    streamWraps.forEach(function (ev) {
      Object.defineProperty(me, 'on' + ev, {
        get: function () {
          return me._parser['on' + ev]
        },
        set: function (h) {
          if (!h) {
            me.removeAllListeners(ev)
            me._parser['on' + ev] = h
            return h
          }
          me.on(ev, h)
        },
        enumerable: true,
        configurable: false
      })
    })
  }

  SAXStream.prototype = Object.create(Stream.prototype, {
    constructor: {
      value: SAXStream
    }
  })

  SAXStream.prototype.write = function (data) {
    if (typeof Buffer === 'function' &&
      typeof Buffer.isBuffer === 'function' &&
      Buffer.isBuffer(data)) {
      if (!this._decoder) {
        var SD = require('string_decoder').StringDecoder
        this._decoder = new SD('utf8')
      }
      data = this._decoder.write(data)
    }

    this._parser.write(data.toString())
    this.emit('data', data)
    return true
  }

  SAXStream.prototype.end = function (chunk) {
    if (chunk && chunk.length) {
      this.write(chunk)
    }
    this._parser.end()
    return true
  }

  SAXStream.prototype.on = function (ev, handler) {
    var me = this
    if (!me._parser['on' + ev] && streamWraps.indexOf(ev) !== -1) {
      me._parser['on' + ev] = function () {
        var args = arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments)
        args.splice(0, 0, ev)
        me.emit.apply(me, args)
      }
    }

    return Stream.prototype.on.call(me, ev, handler)
  }

  // character classes and tokens
  var whitespace = '\r\n\t '

  // this really needs to be replaced with character classes.
  // XML allows all manner of ridiculous numbers and digits.
  var number = '0124356789'
  var letter = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

  // (Letter | "_" | ":")
  var quote = '\'"'
  var attribEnd = whitespace + '>'
  var CDATA = '[CDATA['
  var DOCTYPE = 'DOCTYPE'
  var XML_NAMESPACE = 'http://www.w3.org/XML/1998/namespace'
  var XMLNS_NAMESPACE = 'http://www.w3.org/2000/xmlns/'
  var rootNS = { xml: XML_NAMESPACE, xmlns: XMLNS_NAMESPACE }

  // turn all the string character sets into character class objects.
  whitespace = charClass(whitespace)
  number = charClass(number)
  letter = charClass(letter)

  // http://www.w3.org/TR/REC-xml/#NT-NameStartChar
  // This implementation works on strings, a single character at a time
  // as such, it cannot ever support astral-plane characters (10000-EFFFF)
  // without a significant breaking change to either this  parser, or the
  // JavaScript language.  Implementation of an emoji-capable xml parser
  // is left as an exercise for the reader.
  var nameStart = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/

  var nameBody = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040\.\d-]/

  var entityStart = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/
  var entityBody = /[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040\.\d-]/

  quote = charClass(quote)
  attribEnd = charClass(attribEnd)

  function charClass (str) {
    return str.split('').reduce(function (s, c) {
      s[c] = true
      return s
    }, {})
  }

  function isRegExp (c) {
    return Object.prototype.toString.call(c) === '[object RegExp]'
  }

  function is (charclass, c) {
    return isRegExp(charclass) ? !!c.match(charclass) : charclass[c]
  }

  function not (charclass, c) {
    return !is(charclass, c)
  }

  var S = 0
  sax.STATE = {
    BEGIN: S++, // leading byte order mark or whitespace
    BEGIN_WHITESPACE: S++, // leading whitespace
    TEXT: S++, // general stuff
    TEXT_ENTITY: S++, // &amp and such.
    OPEN_WAKA: S++, // <
    SGML_DECL: S++, // <!BLARG
    SGML_DECL_QUOTED: S++, // <!BLARG foo "bar
    DOCTYPE: S++, // <!DOCTYPE
    DOCTYPE_QUOTED: S++, // <!DOCTYPE "//blah
    DOCTYPE_DTD: S++, // <!DOCTYPE "//blah" [ ...
    DOCTYPE_DTD_QUOTED: S++, // <!DOCTYPE "//blah" [ "foo
    COMMENT_STARTING: S++, // <!-
    COMMENT: S++, // <!--
    COMMENT_ENDING: S++, // <!-- blah -
    COMMENT_ENDED: S++, // <!-- blah --
    CDATA: S++, // <![CDATA[ something
    CDATA_ENDING: S++, // ]
    CDATA_ENDING_2: S++, // ]]
    PROC_INST: S++, // <?hi
    PROC_INST_BODY: S++, // <?hi there
    PROC_INST_ENDING: S++, // <?hi "there" ?
    OPEN_TAG: S++, // <strong
    OPEN_TAG_SLASH: S++, // <strong /
    ATTRIB: S++, // <a
    ATTRIB_NAME: S++, // <a foo
    ATTRIB_NAME_SAW_WHITE: S++, // <a foo _
    ATTRIB_VALUE: S++, // <a foo=
    ATTRIB_VALUE_QUOTED: S++, // <a foo="bar
    ATTRIB_VALUE_CLOSED: S++, // <a foo="bar"
    ATTRIB_VALUE_UNQUOTED: S++, // <a foo=bar
    ATTRIB_VALUE_ENTITY_Q: S++, // <foo bar="&quot;"
    ATTRIB_VALUE_ENTITY_U: S++, // <foo bar=&quot
    CLOSE_TAG: S++, // </a
    CLOSE_TAG_SAW_WHITE: S++, // </a   >
    SCRIPT: S++, // <script> ...
    SCRIPT_ENDING: S++ // <script> ... <
  }

  sax.XML_ENTITIES = {
    'amp': '&',
    'gt': '>',
    'lt': '<',
    'quot': '"',
    'apos': "'"
  }

  sax.ENTITIES = {
    'amp': '&',
    'gt': '>',
    'lt': '<',
    'quot': '"',
    'apos': "'",
    'AElig': 198,
    'Aacute': 193,
    'Acirc': 194,
    'Agrave': 192,
    'Aring': 197,
    'Atilde': 195,
    'Auml': 196,
    'Ccedil': 199,
    'ETH': 208,
    'Eacute': 201,
    'Ecirc': 202,
    'Egrave': 200,
    'Euml': 203,
    'Iacute': 205,
    'Icirc': 206,
    'Igrave': 204,
    'Iuml': 207,
    'Ntilde': 209,
    'Oacute': 211,
    'Ocirc': 212,
    'Ograve': 210,
    'Oslash': 216,
    'Otilde': 213,
    'Ouml': 214,
    'THORN': 222,
    'Uacute': 218,
    'Ucirc': 219,
    'Ugrave': 217,
    'Uuml': 220,
    'Yacute': 221,
    'aacute': 225,
    'acirc': 226,
    'aelig': 230,
    'agrave': 224,
    'aring': 229,
    'atilde': 227,
    'auml': 228,
    'ccedil': 231,
    'eacute': 233,
    'ecirc': 234,
    'egrave': 232,
    'eth': 240,
    'euml': 235,
    'iacute': 237,
    'icirc': 238,
    'igrave': 236,
    'iuml': 239,
    'ntilde': 241,
    'oacute': 243,
    'ocirc': 244,
    'ograve': 242,
    'oslash': 248,
    'otilde': 245,
    'ouml': 246,
    'szlig': 223,
    'thorn': 254,
    'uacute': 250,
    'ucirc': 251,
    'ugrave': 249,
    'uuml': 252,
    'yacute': 253,
    'yuml': 255,
    'copy': 169,
    'reg': 174,
    'nbsp': 160,
    'iexcl': 161,
    'cent': 162,
    'pound': 163,
    'curren': 164,
    'yen': 165,
    'brvbar': 166,
    'sect': 167,
    'uml': 168,
    'ordf': 170,
    'laquo': 171,
    'not': 172,
    'shy': 173,
    'macr': 175,
    'deg': 176,
    'plusmn': 177,
    'sup1': 185,
    'sup2': 178,
    'sup3': 179,
    'acute': 180,
    'micro': 181,
    'para': 182,
    'middot': 183,
    'cedil': 184,
    'ordm': 186,
    'raquo': 187,
    'frac14': 188,
    'frac12': 189,
    'frac34': 190,
    'iquest': 191,
    'times': 215,
    'divide': 247,
    'OElig': 338,
    'oelig': 339,
    'Scaron': 352,
    'scaron': 353,
    'Yuml': 376,
    'fnof': 402,
    'circ': 710,
    'tilde': 732,
    'Alpha': 913,
    'Beta': 914,
    'Gamma': 915,
    'Delta': 916,
    'Epsilon': 917,
    'Zeta': 918,
    'Eta': 919,
    'Theta': 920,
    'Iota': 921,
    'Kappa': 922,
    'Lambda': 923,
    'Mu': 924,
    'Nu': 925,
    'Xi': 926,
    'Omicron': 927,
    'Pi': 928,
    'Rho': 929,
    'Sigma': 931,
    'Tau': 932,
    'Upsilon': 933,
    'Phi': 934,
    'Chi': 935,
    'Psi': 936,
    'Omega': 937,
    'alpha': 945,
    'beta': 946,
    'gamma': 947,
    'delta': 948,
    'epsilon': 949,
    'zeta': 950,
    'eta': 951,
    'theta': 952,
    'iota': 953,
    'kappa': 954,
    'lambda': 955,
    'mu': 956,
    'nu': 957,
    'xi': 958,
    'omicron': 959,
    'pi': 960,
    'rho': 961,
    'sigmaf': 962,
    'sigma': 963,
    'tau': 964,
    'upsilon': 965,
    'phi': 966,
    'chi': 967,
    'psi': 968,
    'omega': 969,
    'thetasym': 977,
    'upsih': 978,
    'piv': 982,
    'ensp': 8194,
    'emsp': 8195,
    'thinsp': 8201,
    'zwnj': 8204,
    'zwj': 8205,
    'lrm': 8206,
    'rlm': 8207,
    'ndash': 8211,
    'mdash': 8212,
    'lsquo': 8216,
    'rsquo': 8217,
    'sbquo': 8218,
    'ldquo': 8220,
    'rdquo': 8221,
    'bdquo': 8222,
    'dagger': 8224,
    'Dagger': 8225,
    'bull': 8226,
    'hellip': 8230,
    'permil': 8240,
    'prime': 8242,
    'Prime': 8243,
    'lsaquo': 8249,
    'rsaquo': 8250,
    'oline': 8254,
    'frasl': 8260,
    'euro': 8364,
    'image': 8465,
    'weierp': 8472,
    'real': 8476,
    'trade': 8482,
    'alefsym': 8501,
    'larr': 8592,
    'uarr': 8593,
    'rarr': 8594,
    'darr': 8595,
    'harr': 8596,
    'crarr': 8629,
    'lArr': 8656,
    'uArr': 8657,
    'rArr': 8658,
    'dArr': 8659,
    'hArr': 8660,
    'forall': 8704,
    'part': 8706,
    'exist': 8707,
    'empty': 8709,
    'nabla': 8711,
    'isin': 8712,
    'notin': 8713,
    'ni': 8715,
    'prod': 8719,
    'sum': 8721,
    'minus': 8722,
    'lowast': 8727,
    'radic': 8730,
    'prop': 8733,
    'infin': 8734,
    'ang': 8736,
    'and': 8743,
    'or': 8744,
    'cap': 8745,
    'cup': 8746,
    'int': 8747,
    'there4': 8756,
    'sim': 8764,
    'cong': 8773,
    'asymp': 8776,
    'ne': 8800,
    'equiv': 8801,
    'le': 8804,
    'ge': 8805,
    'sub': 8834,
    'sup': 8835,
    'nsub': 8836,
    'sube': 8838,
    'supe': 8839,
    'oplus': 8853,
    'otimes': 8855,
    'perp': 8869,
    'sdot': 8901,
    'lceil': 8968,
    'rceil': 8969,
    'lfloor': 8970,
    'rfloor': 8971,
    'lang': 9001,
    'rang': 9002,
    'loz': 9674,
    'spades': 9824,
    'clubs': 9827,
    'hearts': 9829,
    'diams': 9830
  }

  Object.keys(sax.ENTITIES).forEach(function (key) {
    var e = sax.ENTITIES[key]
    var s = typeof e === 'number' ? String.fromCharCode(e) : e
    sax.ENTITIES[key] = s
  })

  for (var s in sax.STATE) {
    sax.STATE[sax.STATE[s]] = s
  }

  // shorthand
  S = sax.STATE

  function emit (parser, event, data) {
    parser[event] && parser[event](data)
  }

  function emitNode (parser, nodeType, data) {
    if (parser.textNode) closeText(parser)
    emit(parser, nodeType, data)
  }

  function closeText (parser) {
    parser.textNode = textopts(parser.opt, parser.textNode)
    if (parser.textNode) emit(parser, 'ontext', parser.textNode)
    parser.textNode = ''
  }

  function textopts (opt, text) {
    if (opt.trim) text = text.trim()
    if (opt.normalize) text = text.replace(/\s+/g, ' ')
    return text
  }

  function error (parser, er) {
    closeText(parser)
    if (parser.trackPosition) {
      er += '\nLine: ' + parser.line +
        '\nColumn: ' + parser.column +
        '\nChar: ' + parser.c
    }
    er = new Error(er)
    parser.error = er
    emit(parser, 'onerror', er)
    return parser
  }

  function end (parser) {
    if (parser.sawRoot && !parser.closedRoot) strictFail(parser, 'Unclosed root tag')
    if ((parser.state !== S.BEGIN) &&
      (parser.state !== S.BEGIN_WHITESPACE) &&
      (parser.state !== S.TEXT)) {
      error(parser, 'Unexpected end')
    }
    closeText(parser)
    parser.c = ''
    parser.closed = true
    emit(parser, 'onend')
    SAXParser.call(parser, parser.strict, parser.opt)
    return parser
  }

  function strictFail (parser, message) {
    if (typeof parser !== 'object' || !(parser instanceof SAXParser)) {
      throw new Error('bad call to strictFail')
    }
    if (parser.strict) {
      error(parser, message)
    }
  }

  function newTag (parser) {
    if (!parser.strict) parser.tagName = parser.tagName[parser.looseCase]()
    var parent = parser.tags[parser.tags.length - 1] || parser
    var tag = parser.tag = { name: parser.tagName, attributes: {} }

    // will be overridden if tag contails an xmlns="foo" or xmlns:foo="bar"
    if (parser.opt.xmlns) {
      tag.ns = parent.ns
    }
    parser.attribList.length = 0
  }

  function qname (name, attribute) {
    var i = name.indexOf(':')
    var qualName = i < 0 ? [ '', name ] : name.split(':')
    var prefix = qualName[0]
    var local = qualName[1]

    // <x "xmlns"="http://foo">
    if (attribute && name === 'xmlns') {
      prefix = 'xmlns'
      local = ''
    }

    return { prefix: prefix, local: local }
  }

  function attrib (parser) {
    if (!parser.strict) {
      parser.attribName = parser.attribName[parser.looseCase]()
    }

    if (parser.attribList.indexOf(parser.attribName) !== -1 ||
      parser.tag.attributes.hasOwnProperty(parser.attribName)) {
      parser.attribName = parser.attribValue = ''
      return
    }

    if (parser.opt.xmlns) {
      var qn = qname(parser.attribName, true)
      var prefix = qn.prefix
      var local = qn.local

      if (prefix === 'xmlns') {
        // namespace binding attribute. push the binding into scope
        if (local === 'xml' && parser.attribValue !== XML_NAMESPACE) {
          strictFail(parser,
            'xml: prefix must be bound to ' + XML_NAMESPACE + '\n' +
            'Actual: ' + parser.attribValue)
        } else if (local === 'xmlns' && parser.attribValue !== XMLNS_NAMESPACE) {
          strictFail(parser,
            'xmlns: prefix must be bound to ' + XMLNS_NAMESPACE + '\n' +
            'Actual: ' + parser.attribValue)
        } else {
          var tag = parser.tag
          var parent = parser.tags[parser.tags.length - 1] || parser
          if (tag.ns === parent.ns) {
            tag.ns = Object.create(parent.ns)
          }
          tag.ns[local] = parser.attribValue
        }
      }

      // defer onattribute events until all attributes have been seen
      // so any new bindings can take effect. preserve attribute order
      // so deferred events can be emitted in document order
      parser.attribList.push([parser.attribName, parser.attribValue])
    } else {
      // in non-xmlns mode, we can emit the event right away
      parser.tag.attributes[parser.attribName] = parser.attribValue
      emitNode(parser, 'onattribute', {
        name: parser.attribName,
        value: parser.attribValue
      })
    }

    parser.attribName = parser.attribValue = ''
  }

  function openTag (parser, selfClosing) {
    if (parser.opt.xmlns) {
      // emit namespace binding events
      var tag = parser.tag

      // add namespace info to tag
      var qn = qname(parser.tagName)
      tag.prefix = qn.prefix
      tag.local = qn.local
      tag.uri = tag.ns[qn.prefix] || ''

      if (tag.prefix && !tag.uri) {
        strictFail(parser, 'Unbound namespace prefix: ' +
          JSON.stringify(parser.tagName))
        tag.uri = qn.prefix
      }

      var parent = parser.tags[parser.tags.length - 1] || parser
      if (tag.ns && parent.ns !== tag.ns) {
        Object.keys(tag.ns).forEach(function (p) {
          emitNode(parser, 'onopennamespace', {
            prefix: p,
            uri: tag.ns[p]
          })
        })
      }

      // handle deferred onattribute events
      // Note: do not apply default ns to attributes:
      //   http://www.w3.org/TR/REC-xml-names/#defaulting
      for (var i = 0, l = parser.attribList.length; i < l; i++) {
        var nv = parser.attribList[i]
        var name = nv[0]
        var value = nv[1]
        var qualName = qname(name, true)
        var prefix = qualName.prefix
        var local = qualName.local
        var uri = prefix === '' ? '' : (tag.ns[prefix] || '')
        var a = {
          name: name,
          value: value,
          prefix: prefix,
          local: local,
          uri: uri
        }

        // if there's any attributes with an undefined namespace,
        // then fail on them now.
        if (prefix && prefix !== 'xmlns' && !uri) {
          strictFail(parser, 'Unbound namespace prefix: ' +
            JSON.stringify(prefix))
          a.uri = prefix
        }
        parser.tag.attributes[name] = a
        emitNode(parser, 'onattribute', a)
      }
      parser.attribList.length = 0
    }

    parser.tag.isSelfClosing = !!selfClosing

    // process the tag
    parser.sawRoot = true
    parser.tags.push(parser.tag)
    emitNode(parser, 'onopentag', parser.tag)
    if (!selfClosing) {
      // special case for <script> in non-strict mode.
      if (!parser.noscript && parser.tagName.toLowerCase() === 'script') {
        parser.state = S.SCRIPT
      } else {
        parser.state = S.TEXT
      }
      parser.tag = null
      parser.tagName = ''
    }
    parser.attribName = parser.attribValue = ''
    parser.attribList.length = 0
  }

  function closeTag (parser) {
    if (!parser.tagName) {
      strictFail(parser, 'Weird empty close tag.')
      parser.textNode += '</>'
      parser.state = S.TEXT
      return
    }

    if (parser.script) {
      if (parser.tagName !== 'script') {
        parser.script += '</' + parser.tagName + '>'
        parser.tagName = ''
        parser.state = S.SCRIPT
        return
      }
      emitNode(parser, 'onscript', parser.script)
      parser.script = ''
    }

    // first make sure that the closing tag actually exists.
    // <a><b></c></b></a> will close everything, otherwise.
    var t = parser.tags.length
    var tagName = parser.tagName
    if (!parser.strict) {
      tagName = tagName[parser.looseCase]()
    }
    var closeTo = tagName
    while (t--) {
      var close = parser.tags[t]
      if (close.name !== closeTo) {
        // fail the first time in strict mode
        strictFail(parser, 'Unexpected close tag')
      } else {
        break
      }
    }

    // didn't find it.  we already failed for strict, so just abort.
    if (t < 0) {
      strictFail(parser, 'Unmatched closing tag: ' + parser.tagName)
      parser.textNode += '</' + parser.tagName + '>'
      parser.state = S.TEXT
      return
    }
    parser.tagName = tagName
    var s = parser.tags.length
    while (s-- > t) {
      var tag = parser.tag = parser.tags.pop()
      parser.tagName = parser.tag.name
      emitNode(parser, 'onclosetag', parser.tagName)

      var x = {}
      for (var i in tag.ns) {
        x[i] = tag.ns[i]
      }

      var parent = parser.tags[parser.tags.length - 1] || parser
      if (parser.opt.xmlns && tag.ns !== parent.ns) {
        // remove namespace bindings introduced by tag
        Object.keys(tag.ns).forEach(function (p) {
          var n = tag.ns[p]
          emitNode(parser, 'onclosenamespace', { prefix: p, uri: n })
        })
      }
    }
    if (t === 0) parser.closedRoot = true
    parser.tagName = parser.attribValue = parser.attribName = ''
    parser.attribList.length = 0
    parser.state = S.TEXT
  }

  function parseEntity (parser) {
    var entity = parser.entity
    var entityLC = entity.toLowerCase()
    var num
    var numStr = ''

    if (parser.ENTITIES[entity]) {
      return parser.ENTITIES[entity]
    }
    if (parser.ENTITIES[entityLC]) {
      return parser.ENTITIES[entityLC]
    }
    entity = entityLC
    if (entity.charAt(0) === '#') {
      if (entity.charAt(1) === 'x') {
        entity = entity.slice(2)
        num = parseInt(entity, 16)
        numStr = num.toString(16)
      } else {
        entity = entity.slice(1)
        num = parseInt(entity, 10)
        numStr = num.toString(10)
      }
    }
    entity = entity.replace(/^0+/, '')
    if (numStr.toLowerCase() !== entity) {
      strictFail(parser, 'Invalid character entity')
      return '&' + parser.entity + ';'
    }

    return String.fromCodePoint(num)
  }

  function beginWhiteSpace (parser, c) {
    if (c === '<') {
      parser.state = S.OPEN_WAKA
      parser.startTagPosition = parser.position
    } else if (not(whitespace, c)) {
      // have to process this as a text node.
      // weird, but happens.
      strictFail(parser, 'Non-whitespace before first tag.')
      parser.textNode = c
      parser.state = S.TEXT
    }
  }

  function write (chunk) {
    var parser = this
    if (this.error) {
      throw this.error
    }
    if (parser.closed) {
      return error(parser,
        'Cannot write after close. Assign an onready handler.')
    }
    if (chunk === null) {
      return end(parser)
    }
    var i = 0
    var c = ''
    while (true) {
      c = chunk.charAt(i++)
      parser.c = c
      if (!c) {
        break
      }
      if (parser.trackPosition) {
        parser.position++
        if (c === '\n') {
          parser.line++
          parser.column = 0
        } else {
          parser.column++
        }
      }
      switch (parser.state) {
        case S.BEGIN:
          parser.state = S.BEGIN_WHITESPACE
          if (c === '\uFEFF') {
            continue
          }
          beginWhiteSpace(parser, c)
          continue

        case S.BEGIN_WHITESPACE:
          beginWhiteSpace(parser, c)
          continue

        case S.TEXT:
          if (parser.sawRoot && !parser.closedRoot) {
            var starti = i - 1
            while (c && c !== '<' && c !== '&') {
              c = chunk.charAt(i++)
              if (c && parser.trackPosition) {
                parser.position++
                if (c === '\n') {
                  parser.line++
                  parser.column = 0
                } else {
                  parser.column++
                }
              }
            }
            parser.textNode += chunk.substring(starti, i - 1)
          }
          if (c === '<' && !(parser.sawRoot && parser.closedRoot && !parser.strict)) {
            parser.state = S.OPEN_WAKA
            parser.startTagPosition = parser.position
          } else {
            if (not(whitespace, c) && (!parser.sawRoot || parser.closedRoot)) {
              strictFail(parser, 'Text data outside of root node.')
            }
            if (c === '&') {
              parser.state = S.TEXT_ENTITY
            } else {
              parser.textNode += c
            }
          }
          continue

        case S.SCRIPT:
          // only non-strict
          if (c === '<') {
            parser.state = S.SCRIPT_ENDING
          } else {
            parser.script += c
          }
          continue

        case S.SCRIPT_ENDING:
          if (c === '/') {
            parser.state = S.CLOSE_TAG
          } else {
            parser.script += '<' + c
            parser.state = S.SCRIPT
          }
          continue

        case S.OPEN_WAKA:
          // either a /, ?, !, or text is coming next.
          if (c === '!') {
            parser.state = S.SGML_DECL
            parser.sgmlDecl = ''
          } else if (is(whitespace, c)) {
            // wait for it...
          } else if (is(nameStart, c)) {
            parser.state = S.OPEN_TAG
            parser.tagName = c
          } else if (c === '/') {
            parser.state = S.CLOSE_TAG
            parser.tagName = ''
          } else if (c === '?') {
            parser.state = S.PROC_INST
            parser.procInstName = parser.procInstBody = ''
          } else {
            strictFail(parser, 'Unencoded <')
            // if there was some whitespace, then add that in.
            if (parser.startTagPosition + 1 < parser.position) {
              var pad = parser.position - parser.startTagPosition
              c = new Array(pad).join(' ') + c
            }
            parser.textNode += '<' + c
            parser.state = S.TEXT
          }
          continue

        case S.SGML_DECL:
          if ((parser.sgmlDecl + c).toUpperCase() === CDATA) {
            emitNode(parser, 'onopencdata')
            parser.state = S.CDATA
            parser.sgmlDecl = ''
            parser.cdata = ''
          } else if (parser.sgmlDecl + c === '--') {
            parser.state = S.COMMENT
            parser.comment = ''
            parser.sgmlDecl = ''
          } else if ((parser.sgmlDecl + c).toUpperCase() === DOCTYPE) {
            parser.state = S.DOCTYPE
            if (parser.doctype || parser.sawRoot) {
              strictFail(parser,
                'Inappropriately located doctype declaration')
            }
            parser.doctype = ''
            parser.sgmlDecl = ''
          } else if (c === '>') {
            emitNode(parser, 'onsgmldeclaration', parser.sgmlDecl)
            parser.sgmlDecl = ''
            parser.state = S.TEXT
          } else if (is(quote, c)) {
            parser.state = S.SGML_DECL_QUOTED
            parser.sgmlDecl += c
          } else {
            parser.sgmlDecl += c
          }
          continue

        case S.SGML_DECL_QUOTED:
          if (c === parser.q) {
            parser.state = S.SGML_DECL
            parser.q = ''
          }
          parser.sgmlDecl += c
          continue

        case S.DOCTYPE:
          if (c === '>') {
            parser.state = S.TEXT
            emitNode(parser, 'ondoctype', parser.doctype)
            parser.doctype = true // just remember that we saw it.
          } else {
            parser.doctype += c
            if (c === '[') {
              parser.state = S.DOCTYPE_DTD
            } else if (is(quote, c)) {
              parser.state = S.DOCTYPE_QUOTED
              parser.q = c
            }
          }
          continue

        case S.DOCTYPE_QUOTED:
          parser.doctype += c
          if (c === parser.q) {
            parser.q = ''
            parser.state = S.DOCTYPE
          }
          continue

        case S.DOCTYPE_DTD:
          parser.doctype += c
          if (c === ']') {
            parser.state = S.DOCTYPE
          } else if (is(quote, c)) {
            parser.state = S.DOCTYPE_DTD_QUOTED
            parser.q = c
          }
          continue

        case S.DOCTYPE_DTD_QUOTED:
          parser.doctype += c
          if (c === parser.q) {
            parser.state = S.DOCTYPE_DTD
            parser.q = ''
          }
          continue

        case S.COMMENT:
          if (c === '-') {
            parser.state = S.COMMENT_ENDING
          } else {
            parser.comment += c
          }
          continue

        case S.COMMENT_ENDING:
          if (c === '-') {
            parser.state = S.COMMENT_ENDED
            parser.comment = textopts(parser.opt, parser.comment)
            if (parser.comment) {
              emitNode(parser, 'oncomment', parser.comment)
            }
            parser.comment = ''
          } else {
            parser.comment += '-' + c
            parser.state = S.COMMENT
          }
          continue

        case S.COMMENT_ENDED:
          if (c !== '>') {
            strictFail(parser, 'Malformed comment')
            // allow <!-- blah -- bloo --> in non-strict mode,
            // which is a comment of " blah -- bloo "
            parser.comment += '--' + c
            parser.state = S.COMMENT
          } else {
            parser.state = S.TEXT
          }
          continue

        case S.CDATA:
          if (c === ']') {
            parser.state = S.CDATA_ENDING
          } else {
            parser.cdata += c
          }
          continue

        case S.CDATA_ENDING:
          if (c === ']') {
            parser.state = S.CDATA_ENDING_2
          } else {
            parser.cdata += ']' + c
            parser.state = S.CDATA
          }
          continue

        case S.CDATA_ENDING_2:
          if (c === '>') {
            if (parser.cdata) {
              emitNode(parser, 'oncdata', parser.cdata)
            }
            emitNode(parser, 'onclosecdata')
            parser.cdata = ''
            parser.state = S.TEXT
          } else if (c === ']') {
            parser.cdata += ']'
          } else {
            parser.cdata += ']]' + c
            parser.state = S.CDATA
          }
          continue

        case S.PROC_INST:
          if (c === '?') {
            parser.state = S.PROC_INST_ENDING
          } else if (is(whitespace, c)) {
            parser.state = S.PROC_INST_BODY
          } else {
            parser.procInstName += c
          }
          continue

        case S.PROC_INST_BODY:
          if (!parser.procInstBody && is(whitespace, c)) {
            continue
          } else if (c === '?') {
            parser.state = S.PROC_INST_ENDING
          } else {
            parser.procInstBody += c
          }
          continue

        case S.PROC_INST_ENDING:
          if (c === '>') {
            emitNode(parser, 'onprocessinginstruction', {
              name: parser.procInstName,
              body: parser.procInstBody
            })
            parser.procInstName = parser.procInstBody = ''
            parser.state = S.TEXT
          } else {
            parser.procInstBody += '?' + c
            parser.state = S.PROC_INST_BODY
          }
          continue

        case S.OPEN_TAG:
          if (is(nameBody, c)) {
            parser.tagName += c
          } else {
            newTag(parser)
            if (c === '>') {
              openTag(parser)
            } else if (c === '/') {
              parser.state = S.OPEN_TAG_SLASH
            } else {
              if (not(whitespace, c)) {
                strictFail(parser, 'Invalid character in tag name')
              }
              parser.state = S.ATTRIB
            }
          }
          continue

        case S.OPEN_TAG_SLASH:
          if (c === '>') {
            openTag(parser, true)
            closeTag(parser)
          } else {
            strictFail(parser, 'Forward-slash in opening tag not followed by >')
            parser.state = S.ATTRIB
          }
          continue

        case S.ATTRIB:
          // haven't read the attribute name yet.
          if (is(whitespace, c)) {
            continue
          } else if (c === '>') {
            openTag(parser)
          } else if (c === '/') {
            parser.state = S.OPEN_TAG_SLASH
          } else if (is(nameStart, c)) {
            parser.attribName = c
            parser.attribValue = ''
            parser.state = S.ATTRIB_NAME
          } else {
            strictFail(parser, 'Invalid attribute name')
          }
          continue

        case S.ATTRIB_NAME:
          if (c === '=') {
            parser.state = S.ATTRIB_VALUE
          } else if (c === '>') {
            strictFail(parser, 'Attribute without value')
            parser.attribValue = parser.attribName
            attrib(parser)
            openTag(parser)
          } else if (is(whitespace, c)) {
            parser.state = S.ATTRIB_NAME_SAW_WHITE
          } else if (is(nameBody, c)) {
            parser.attribName += c
          } else {
            strictFail(parser, 'Invalid attribute name')
          }
          continue

        case S.ATTRIB_NAME_SAW_WHITE:
          if (c === '=') {
            parser.state = S.ATTRIB_VALUE
          } else if (is(whitespace, c)) {
            continue
          } else {
            strictFail(parser, 'Attribute without value')
            parser.tag.attributes[parser.attribName] = ''
            parser.attribValue = ''
            emitNode(parser, 'onattribute', {
              name: parser.attribName,
              value: ''
            })
            parser.attribName = ''
            if (c === '>') {
              openTag(parser)
            } else if (is(nameStart, c)) {
              parser.attribName = c
              parser.state = S.ATTRIB_NAME
            } else {
              strictFail(parser, 'Invalid attribute name')
              parser.state = S.ATTRIB
            }
          }
          continue

        case S.ATTRIB_VALUE:
          if (is(whitespace, c)) {
            continue
          } else if (is(quote, c)) {
            parser.q = c
            parser.state = S.ATTRIB_VALUE_QUOTED
          } else {
            strictFail(parser, 'Unquoted attribute value')
            parser.state = S.ATTRIB_VALUE_UNQUOTED
            parser.attribValue = c
          }
          continue

        case S.ATTRIB_VALUE_QUOTED:
          if (c !== parser.q) {
            if (c === '&') {
              parser.state = S.ATTRIB_VALUE_ENTITY_Q
            } else {
              parser.attribValue += c
            }
            continue
          }
          attrib(parser)
          parser.q = ''
          parser.state = S.ATTRIB_VALUE_CLOSED
          continue

        case S.ATTRIB_VALUE_CLOSED:
          if (is(whitespace, c)) {
            parser.state = S.ATTRIB
          } else if (c === '>') {
            openTag(parser)
          } else if (c === '/') {
            parser.state = S.OPEN_TAG_SLASH
          } else if (is(nameStart, c)) {
            strictFail(parser, 'No whitespace between attributes')
            parser.attribName = c
            parser.attribValue = ''
            parser.state = S.ATTRIB_NAME
          } else {
            strictFail(parser, 'Invalid attribute name')
          }
          continue

        case S.ATTRIB_VALUE_UNQUOTED:
          if (not(attribEnd, c)) {
            if (c === '&') {
              parser.state = S.ATTRIB_VALUE_ENTITY_U
            } else {
              parser.attribValue += c
            }
            continue
          }
          attrib(parser)
          if (c === '>') {
            openTag(parser)
          } else {
            parser.state = S.ATTRIB
          }
          continue

        case S.CLOSE_TAG:
          if (!parser.tagName) {
            if (is(whitespace, c)) {
              continue
            } else if (not(nameStart, c)) {
              if (parser.script) {
                parser.script += '</' + c
                parser.state = S.SCRIPT
              } else {
                strictFail(parser, 'Invalid tagname in closing tag.')
              }
            } else {
              parser.tagName = c
            }
          } else if (c === '>') {
            closeTag(parser)
          } else if (is(nameBody, c)) {
            parser.tagName += c
          } else if (parser.script) {
            parser.script += '</' + parser.tagName
            parser.tagName = ''
            parser.state = S.SCRIPT
          } else {
            if (not(whitespace, c)) {
              strictFail(parser, 'Invalid tagname in closing tag')
            }
            parser.state = S.CLOSE_TAG_SAW_WHITE
          }
          continue

        case S.CLOSE_TAG_SAW_WHITE:
          if (is(whitespace, c)) {
            continue
          }
          if (c === '>') {
            closeTag(parser)
          } else {
            strictFail(parser, 'Invalid characters in closing tag')
          }
          continue

        case S.TEXT_ENTITY:
        case S.ATTRIB_VALUE_ENTITY_Q:
        case S.ATTRIB_VALUE_ENTITY_U:
          var returnState
          var buffer
          switch (parser.state) {
            case S.TEXT_ENTITY:
              returnState = S.TEXT
              buffer = 'textNode'
              break

            case S.ATTRIB_VALUE_ENTITY_Q:
              returnState = S.ATTRIB_VALUE_QUOTED
              buffer = 'attribValue'
              break

            case S.ATTRIB_VALUE_ENTITY_U:
              returnState = S.ATTRIB_VALUE_UNQUOTED
              buffer = 'attribValue'
              break
          }

          if (c === ';') {
            parser[buffer] += parseEntity(parser)
            parser.entity = ''
            parser.state = returnState
          } else if (is(parser.entity.length ? entityBody : entityStart, c)) {
            parser.entity += c
          } else {
            strictFail(parser, 'Invalid character in entity name')
            parser[buffer] += '&' + parser.entity + c
            parser.entity = ''
            parser.state = returnState
          }

          continue

        default:
          throw new Error(parser, 'Unknown state: ' + parser.state)
      }
    } // while

    if (parser.position >= parser.bufferCheckPosition) {
      checkBufferLength(parser)
    }
    return parser
  }

  /*! http://mths.be/fromcodepoint v0.1.0 by @mathias */
  if (!String.fromCodePoint) {
    (function () {
      var stringFromCharCode = String.fromCharCode
      var floor = Math.floor
      var fromCodePoint = function () {
        var MAX_SIZE = 0x4000
        var codeUnits = []
        var highSurrogate
        var lowSurrogate
        var index = -1
        var length = arguments.length
        if (!length) {
          return ''
        }
        var result = ''
        while (++index < length) {
          var codePoint = Number(arguments[index])
          if (
            !isFinite(codePoint) || // `NaN`, `+Infinity`, or `-Infinity`
            codePoint < 0 || // not a valid Unicode code point
            codePoint > 0x10FFFF || // not a valid Unicode code point
            floor(codePoint) !== codePoint // not an integer
          ) {
            throw RangeError('Invalid code point: ' + codePoint)
          }
          if (codePoint <= 0xFFFF) { // BMP code point
            codeUnits.push(codePoint)
          } else { // Astral code point; split in surrogate halves
            // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
            codePoint -= 0x10000
            highSurrogate = (codePoint >> 10) + 0xD800
            lowSurrogate = (codePoint % 0x400) + 0xDC00
            codeUnits.push(highSurrogate, lowSurrogate)
          }
          if (index + 1 === length || codeUnits.length > MAX_SIZE) {
            result += stringFromCharCode.apply(null, codeUnits)
            codeUnits.length = 0
          }
        }
        return result
      }
      if (Object.defineProperty) {
        Object.defineProperty(String, 'fromCodePoint', {
          value: fromCodePoint,
          configurable: true,
          writable: true
        })
      } else {
        String.fromCodePoint = fromCodePoint
      }
    }())
  }
})(typeof exports === 'undefined' ? this.sax = {} : exports)

}).call(this,require("buffer").Buffer)
},{"buffer":3,"stream":28,"string_decoder":29}],47:[function(require,module,exports){
const mathmlTags = require('../mathml-tags');

module.exports = class Dispatcher {
  constructor(el) {
    this.el = el;
  }

  dispatch() {
    const { name, value, attributes } = this.el;
    const children = this.el.children.map(el => new Dispatcher(el).dispatch());

    return mathmlTags[name] ?
      new mathmlTags[name]({ value, attributes, children }) :
      new mathmlTags['basetag']({ value, attributes, children });
  }
}
},{"../mathml-tags":79}],48:[function(require,module,exports){
const XmldomInterface = require('./interfaces/XmldomInterface');
const AsciimathInterface = require('./interfaces/AsciimathInterface');

module.exports = class Mathml2Asciimath {
  constructor(xml) {
    this.parsedXml = new XmldomInterface(xml).parse();
    this.parsedAscii = new AsciimathInterface(this.parsedXml).parse();
  }

  convert() {
    return this.parsedAscii.map(tag => tag.toAsciimath()).join('');
  }
}
},{"./interfaces/AsciimathInterface":49,"./interfaces/XmldomInterface":50}],49:[function(require,module,exports){
const Dispatcher = require('../dispatcher/Dispatcher');

module.exports = class AsciimathInterface {
  constructor(xmlDocument) {
    this.xmlDocument = xmlDocument;
  }

  parse() {
    return this.xmlDocument.map(el => this.dispatch(el));
  }

  dispatch(el) {
    return new Dispatcher(el).dispatch();
  }
}
},{"../dispatcher/Dispatcher":47}],50:[function(require,module,exports){
const xmldom = require('xmldom');

module.exports = class XmldomInterface {
  constructor(xml) {
    this.errorLocator = {};
    this.errors = [];
    
    this.xml = _removeLineBreaks(xml);
    this.xmlDocument = new xmldom.DOMParser({
      locator: this.errorLocator,
      errorHandler: this.errorHandler.bind(this),
    });
  }

  parse() {
    this.parsedDOM = this.parseElements(this.getMathTags());
    return this.parsedDOM;
  }

  parseElements(els) {
    const arrOfParsedElements = [];
    for (let i=0; i < els.length; i++) {
      let el = els[i];
      if(el.tagName != undefined) arrOfParsedElements.push(this.parseElement(el));
    } return arrOfParsedElements;
  }

  parseAttributes(attrs) {
    const parsedAttrs = {};
    for (let i=0; i < attrs.length; i++) {
      let attr = attrs[i];
      parsedAttrs[attr.nodeName] = attr.nodeValue;
    } return parsedAttrs;
  }

  parseElement(element) {
    return {
      name: element.tagName,
      attributes: element.attributes ? this.parseAttributes(element.attributes) : {},
      value: element.textContent,
      children: _hasChild(element) ? this.parseElements(element.childNodes) : [] 
    };
  }

  getMathTags() {
    const mathTags = this.xmlDocument.parseFromString(this.xml).getElementsByTagName('math');
    if (this.errors.length > 0) {
      this.errors = [];
      return this.getMathTags();
    } return mathTags;
  }

  errorHandler(msg) {
    if (_isMissingAttributeValueError(msg)) {
      const missingAttribute = msg.split("\"")[1];
      this.xml = _fixMissingAttribute(missingAttribute, this.xml);
      this.parse()
      this.errors.push(msg);
    }
  }
}

const LINE_BREAK = /\n|\r\n|\r/g;

const _matchAttr = attr => new RegExp(`(?<=\<.*)(${attr}=(?!(\"|\')))|(${attr}(?!(\"|\')))(?=.*\>)`, "g");
const _hasChild = el => el.childNodes && el.childNodes.length !== 0;
const _removeLineBreaks = str => str.replace(LINE_BREAK, '');
const _isMissingAttributeValueError = msg => {
  return msg.includes("attribute") && msg.includes("missed")
};
const _fixMissingAttribute = (missingAttribute, xml) => {
  return xml.replace(_matchAttr(missingAttribute), `${missingAttribute}='null'`);
}
},{"xmldom":91}],51:[function(require,module,exports){
module.exports = class BaseTag {
  constructor(tag) {
    this.tag = tag;
  }

  toAsciimath() {
    return this.mapChildrenToAsciimath().join('');
  }

  mapChildrenToAsciimath() {
    return this.tag.children.map(tag => tag.toAsciimath());
  }
}
},{}],52:[function(require,module,exports){
//https://www.w3.org/Math/draft-spec/mathml.html#chapter3_id.3.7.1.1

const BaseTag = require('./BaseTag');

module.exports = class MAction extends BaseTag {
  constructor(tag) {
    super(tag);
  }

  toAsciimath() {
    return this.mapChildrenToAsciimath().join('; ');
  }
}
},{"./BaseTag":51}],53:[function(require,module,exports){
const BaseTag = require('./BaseTag');

module.exports = class MEnclose extends BaseTag {
  constructor(tag) {
    super(tag);
    this.notation = this.tag.attributes.notation;
  }

  toAsciimath() {
    const childrenAsciimath = this.mapChildrenToAsciimath().join('');

    return {
      longdiv: `)bar(${childrenAsciimath})`,
      actuarial: `bar(${childrenAsciimath})|`,
      box: `|ul(bar(${childrenAsciimath}))|`,
      roundedbox: `(ul(bar(${childrenAsciimath})))`,
      circle: `(ul(bar(${childrenAsciimath})))`,
      left: `|${childrenAsciimath}`,
      right: `${childrenAsciimath}|`,
      top: `bar(${childrenAsciimath})`,
      bottom: `ul(${childrenAsciimath})`,
      updiagonalstrike: `cancel(${childrenAsciimath})`,
      downdiagonalstrike: `cancel(${childrenAsciimath})`,
      verticalstrike: `cancel(${childrenAsciimath})`,
      horizontalstrike: `cancel(${childrenAsciimath})`,
      madruwb: `ul(${childrenAsciimath})|`,
      updiagonalarrow: `cancel(${childrenAsciimath})|`,
      phasorangle: `\/ul(${childrenAsciimath})|`,
    }[this.notation] || childrenAsciimath;
  }
}
},{"./BaseTag":51}],54:[function(require,module,exports){
const BaseTag = require('./BaseTag');

module.exports = class MError extends BaseTag {
  constructor(tag) {
    super(tag);
  }

  toAsciimath() {
    return `color(red)(|ul(bar(${this.mapChildrenToAsciimath().join('')}))|)`;
  }
}
},{"./BaseTag":51}],55:[function(require,module,exports){
const BaseTag = require('./BaseTag');

module.exports = class MFenced extends BaseTag {
  constructor(tag) {
    super(tag);
    this.open = this.getFence(this.tag.attributes.open, '(');
    this.close = this.getFence(this.tag.attributes.close, ')');
    this.separators = this.tag.attributes.separators;
  }

  toAsciimath() {
    const asciimathChildren = this.mapChildrenToAsciimath().reduce((acc, val, index) => {
      return acc + val + this.getSeparatorFor(index);
    }, '');

    return this.open + asciimathChildren + this.close;
  }

  getFence(attr, defaultValue) {
    if (attr === '' || attr === 'null') return ':}'
    if (!attr) return defaultValue;
    return attr.trim();
  }

  getSeparatorFor(index) {
    if (index + 1 === this.tag.children.length || this.tag.children.length === 1) return '';
    if (!this.separators) return ',';
    
    const arrOfSeparators = this.separators.split('');
    return arrOfSeparators[index] || arrOfSeparators[arrOfSeparators.length - 1];
  }
}
},{"./BaseTag":51}],56:[function(require,module,exports){
const BaseTag = require('./BaseTag');
const addParenthesesIfIsMoreThanOneChar = require('../utils/addParenthesesIfIsMoreThanOneChar');

module.exports = class MFrac extends BaseTag {
  constructor(tag) {
    super(tag);
    this.bevelled = this.tag.attributes.bevelled == 'true';
  }

  toAsciimath() {
    const { children } = this.tag;

    if (children.length !== 2) {
      throw new Error('Wrong number of children for mfrac tag. It should have exactly 2.');
    }

    const num = children[0];
    const den = children[1];
    const numAscii = addParenthesesIfIsMoreThanOneChar(num.toAsciimath());
    const denAscii = addParenthesesIfIsMoreThanOneChar(den.toAsciimath());

    return numAscii + this.getSeparator() + denAscii;
  }

  getSeparator() {
    return this.bevelled ? '//' : '/';
  }
}
},{"../utils/addParenthesesIfIsMoreThanOneChar":84,"./BaseTag":51}],57:[function(require,module,exports){
//https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mglyph

const BaseTag = require('./BaseTag');

module.exports = class MGlyph extends BaseTag {
  constructor(tag) {
    super(tag);
  }

  toAsciimath() {
    return this.mapChildrenToAsciimath().join('');
  }
};
},{"./BaseTag":51}],58:[function(require,module,exports){
const BaseTag = require('./BaseTag');
const mathSymbols = require('../syntax/mathSymbols');

module.exports = class MI extends BaseTag {
  constructor(tag) {
    super(tag);
  }

  toAsciimath() {
    const { children, value } = this.tag;
    if (children.length > 0) return this.mapChildrenToAsciimath().join('');

    const normalizedValue = this.normalizeWhitespaces(value);
    if (normalizedValue === ' ') return '\\' + normalizedValue;

    const trimValue = value.trim();
    return this.getMathSymbol(trimValue) || trimValue;
  }

  getMathSymbol(trimValue) {
    return this.getMathSymbolBy('character', trimValue) ||
      this.getMathSymbolBy('glyph', trimValue);
  }

  getMathSymbolBy(type, trimValue) {
    const mathSymbolInfo = mathSymbols.find(op => op[type] === trimValue);
    return mathSymbolInfo ? mathSymbolInfo['asciimath'] || mathSymbolInfo['glyph'] : null;
  }

  normalizeWhitespaces(str){
    return str.replace(/\s+/g, ' ');
  }
}
},{"../syntax/mathSymbols":83,"./BaseTag":51}],59:[function(require,module,exports){
const BaseTag = require('./BaseTag');

module.exports = class MRow extends BaseTag {
  constructor(tag) {
    super(tag);
    this.flagChildrens();
  }

  flagChildrens() {
    const { children } = this.tag;
    let currentFlag = POS_SCRIPT_FLAG;
    for (let i = 1; i < children.length; i++) {
        if (children[i].constructor.name === "MPrescripts") currentFlag = PRE_SCRIPT_FLAG;
        else {
            children[i].tag.attributes.currentFlag = currentFlag;
            currentFlag = POS_SCRIPT_FLAG;
        }
    }
  }

  toAsciimath() {
    const { children } = this.tag;
    const base = children[0];
    const prescripts = findChildrenByFlag(children, PRE_SCRIPT_FLAG);
    const posScripts = findChildrenByFlag(children, POS_SCRIPT_FLAG);

    const prescriptsAnscii = prescripts.map(pre => pre.toAsciimath());
    const posScriptsAnscii = posScripts.map(pos => pos.toAsciimath());

    const prescriptString = isOnlyEmptySpaces(prescriptsAnscii) ? '' : `{::}_(${prescriptsAnscii.join(', ')})`;
    const posScriptString = isOnlyEmptySpaces(posScriptsAnscii) ? '' : `^(${posScriptsAnscii.join(', ')})`;

    return prescriptString + base.toAsciimath() + posScriptString;
  }
}

const POS_SCRIPT_FLAG = 'posScript';
const PRE_SCRIPT_FLAG = 'preScript';

function findChildrenByFlag(children, flag) {
    return children.filter(c => c.tag.attributes.currentFlag === flag);
}

function isOnlyEmptySpaces(arrOfStr) {
    return arrOfStr.join('').trim() === '';
}
},{"./BaseTag":51}],60:[function(require,module,exports){
const BaseTag = require('./BaseTag');

module.exports = class MO extends BaseTag {
  constructor(tag) {
    super(tag);
  }

  toAsciimath() {
    const { children, value } = this.tag;
    if (children.length > 0) throw new Error('MI tag should not have children');

    return value.trim();
  }
}
},{"./BaseTag":51}],61:[function(require,module,exports){
const BaseTag = require('./BaseTag');
const mathOperators = require('../syntax/allMathOperators');

module.exports = class MO extends BaseTag {
  constructor(tag) {
    super(tag);
  }

  toAsciimath() {
    const { children, value } = this.tag;
    if (children.length > 0) throw new Error('MO tag should not have children');

    const trimValue = value.trim();
    const mathOperator = this.getAsciimathOperator(trimValue);

    return mathOperator || trimValue;
  }

  getAsciimathOperator(trimValue) {
    return this.getAsciimathOperatorBy('character', trimValue) ||
      this.getAsciimathOperatorBy('glyph', trimValue);
  }

  getAsciimathOperatorBy(type, trimValue) {
    const mathOperatorInfo = mathOperators.find(op => op[type] === trimValue);
    return mathOperatorInfo ? mathOperatorInfo['asciimath'] || mathOperatorInfo['glyph'] : null;
  }
}
},{"../syntax/allMathOperators":80,"./BaseTag":51}],62:[function(require,module,exports){
const BaseTag = require('./BaseTag');
const asciimathAccents = require('../syntax/asciimathAccents');

module.exports = class MOver extends BaseTag {
  constructor(tag) {
    super(tag);
  }

  toAsciimath() {
    const { children } = this.tag;

    if (children.length !== 2) {
      throw new Error('Wrong number of children for mover tag. It should have exactly 2.');
    }

    const content = children[0];
    const brace = children[1];

    const contentAscii = content.toAsciimath();
    const braceAscii = brace.toAsciimath();

    return `${this.getOperator(braceAscii)}(${contentAscii})`; 
  }

  getOperator(brace) {
    return asciimathAccents.includes(brace) ? brace : `overset(${brace})`; 
  }
}
},{"../syntax/asciimathAccents":81,"./BaseTag":51}],63:[function(require,module,exports){
const MRow = require('./MRow');

module.exports = class MPadded extends MRow {
  constructor(tag) {
    super(tag);
  }
}
},{"./MRow":67}],64:[function(require,module,exports){
const BaseTag = require('./BaseTag');

module.exports = class MPhantom extends BaseTag {
  constructor(tag) {
    super(tag);
  }

  toAsciimath() {
    return this.mapChildrenToAsciimath().join('').replace(/./g,' ');
  }
}
},{"./BaseTag":51}],65:[function(require,module,exports){
const BaseTag = require('./BaseTag');

module.exports = class MPrescripts extends BaseTag {
  constructor(tag) {
    super(tag);
  }
}
},{"./BaseTag":51}],66:[function(require,module,exports){
const BaseTag = require('./BaseTag');

module.exports = class MRoot extends BaseTag {
  constructor(tag) {
    super(tag);
  }

  toAsciimath() {
    const { children } = this.tag;

    if (children.length !== 2) {
      new Error('Wrong number of children for mroot tag. It should have exactly 2.');
    }

    const base = children[0];
    const index = children[1];
    const baseAsciimath = base.toAsciimath();
    const indexAsciimath = index.toAsciimath();

    return `root(${indexAsciimath})(${baseAsciimath})`;
  }
}
},{"./BaseTag":51}],67:[function(require,module,exports){
const BaseTag = require('./BaseTag');

module.exports = class MRow extends BaseTag {
  constructor(tag) {
    super(tag);
  }

  toAsciimath() {
    return this.mapChildrenToAsciimath().join(' ');
  }
}
},{"./BaseTag":51}],68:[function(require,module,exports){
const BaseTag = require('./BaseTag');

module.exports = class MSqrt extends BaseTag {
  constructor(tag) {
    super(tag);
  }

  toAsciimath() {
    const { children } = this.tag;

    if (children.length > 1) throw new Error('Wrong number of children for msqrt tag. It should have only one.');

    return `sqrt(${children[0].toAsciimath()})`;
  }
}
},{"./BaseTag":51}],69:[function(require,module,exports){
const BaseTag = require('./BaseTag');
const addParenthesesIfThereIsEmptySpaces = require('../utils/addParenthesesIfThereIsEmptySpaces');

module.exports = class MSub extends BaseTag {
  constructor(tag) {
    super(tag);
  }

  toAsciimath() {
    const { children } = this.tag;

    if (children.length !== 2) {
      new Error('Wrong number of children for msup tag. It should have exactly 2');
    }

    const base = children[0];
    const exponent = children[1];
  
    return `${addParenthesesIfThereIsEmptySpaces(base.toAsciimath())}_(${exponent.toAsciimath()})`;
  }
}
},{"../utils/addParenthesesIfThereIsEmptySpaces":85,"./BaseTag":51}],70:[function(require,module,exports){
const BaseTag = require('./BaseTag');
const addParenthesesIfThereIsEmptySpaces = require('../utils/addParenthesesIfThereIsEmptySpaces');

module.exports = class MSubsup extends BaseTag {
  constructor(tag) {
    super(tag);
  }

  toAsciimath() {
    const { children } = this.tag;

    if (children.length !== 3) {
      throw new Error('Wrong number of children for msup tag. It should have exactly 3');
    }

    const base = children[0];
    const sub = children[1];
    const sup = children[2];
  
    return `${addParenthesesIfThereIsEmptySpaces(base.toAsciimath())}_(${sub.toAsciimath()})^(${sup.toAsciimath()})`;
  }
}
},{"../utils/addParenthesesIfThereIsEmptySpaces":85,"./BaseTag":51}],71:[function(require,module,exports){
const BaseTag = require('./BaseTag');
const addParenthesesIfThereIsEmptySpaces = require('../utils/addParenthesesIfThereIsEmptySpaces');


module.exports = class MSup extends BaseTag {
  constructor(tag) {
    super(tag);
  }

  toAsciimath() {
    const { children } = this.tag;

    if (children.length !== 2) {
      new Error('Wrong number of children for msup tag. It should have exactly 2');
    }

    const base = children[0];
    const exponent = children[1];
  
    return `${addParenthesesIfThereIsEmptySpaces(base.toAsciimath())}^(${exponent.toAsciimath()})`;
  }
}
},{"../utils/addParenthesesIfThereIsEmptySpaces":85,"./BaseTag":51}],72:[function(require,module,exports){
const BaseTag = require('./BaseTag');

module.exports = class MTable extends BaseTag {
  constructor(tag) {
    super(tag);
    this.markInnerMTables(this.tag.children);
  }

  markInnerMTables(children) {
    children.forEach(child => {
      this.markInnerMTables(child.tag.children);
      if (child.constructor.name === "MTable") child.tag.attributes.innerMTable = true;
    });
  }

  toAsciimath() {
    const { innerMTable } = this.tag.attributes;
    return innerMTable ? this.mapChildrenToAsciimath().join('') : this.mapChildrenToAsciimath().join(', ');
  }
}
},{"./BaseTag":51}],73:[function(require,module,exports){
const BaseTag = require('./BaseTag');

module.exports = class MTd extends BaseTag {
  constructor(tag) {
    super(tag);
  }

  toAsciimath() {
    return this.mapChildrenToAsciimath().join('');
  }
}
},{"./BaseTag":51}],74:[function(require,module,exports){
const BaseTag = require('./BaseTag');

module.exports = class MText extends BaseTag {
  constructor(tag) {
    super(tag);
  }

  toAsciimath() {
    const { children, value } = this.tag;
    if (children.length > 0) throw new Error('mtext tag should not have children');

    return `text(${value})`;
  }
}
},{"./BaseTag":51}],75:[function(require,module,exports){
const BaseTag = require('./BaseTag');

module.exports = class MTr extends BaseTag {
  constructor(tag) {
    super(tag);
  }

  toAsciimath() {
    return `(${this.mapChildrenToAsciimath().join(', ')})`;
  }
}
},{"./BaseTag":51}],76:[function(require,module,exports){
const BaseTag = require('./BaseTag');
const asciimathAccents = require('../syntax/asciimathAccents');
const especialMathOperators = require('../syntax/mathEspecialOperators');

module.exports = class MUnder extends BaseTag {
  constructor(tag) {
    super(tag);
  }

  toAsciimath() {
    const { children } = this.tag;

    if (children.length !== 2) {
      throw new Error('Wrong number of children for munder tag. It should have exactly 2.');
    }

    const base = children[0];
    const underscript = children[1];

    const baseAscii = base.toAsciimath();
    const underscriptAscii = underscript.toAsciimath();

    if (this.isEspecialMathOperatorAscimath(baseAscii)) return `${baseAscii}_(${underscriptAscii})`;

    return `${this.getOperator(underscriptAscii)}(${baseAscii})`; 
  }

  getOperator(underscript) {
    return asciimathAccents.includes(underscript) ? underscript : `underset(${underscript})`; 
  }

  isEspecialMathOperatorAscimath(operatorString) {
    return !!especialMathOperators.find(op => op['asciimath'] === operatorString);
  }
}
},{"../syntax/asciimathAccents":81,"../syntax/mathEspecialOperators":82,"./BaseTag":51}],77:[function(require,module,exports){
const BaseTag = require('./BaseTag');
const especialMathOperators = require('../syntax/mathEspecialOperators');

module.exports = class MUnderover extends BaseTag {
  constructor(tag) {
    super(tag);
  }

  toAsciimath() {
    const { children } = this.tag;

    if (children.length !== 3) {
      throw new Error('Wrong number of children for munder tag. It should have exactly 3.');
    }

    const base = children[0];
    const underContent = children[1];
    const overContent = children[2]; 

    const baseAscii = base.toAsciimath();
    const underContentAscii = underContent.toAsciimath();
    const overContentAscii = overContent.toAsciimath();

    if (this.isEspecialMathOperatorAscimath(baseAscii)) return `${baseAscii}_(${underContentAscii})^(${overContentAscii})`;

    return `underset(${underContentAscii})(overset(${overContentAscii})(${baseAscii}))`; 
  }

  isEspecialMathOperatorAscimath(operatorString) {
    return !!especialMathOperators.find(op => op['asciimath'] === operatorString);
  }
}
},{"../syntax/mathEspecialOperators":82,"./BaseTag":51}],78:[function(require,module,exports){
const BaseTag = require('./BaseTag');

module.exports = class Math extends BaseTag {
  constructor(tag) {
    super(tag);
  }

  toAsciimath() {
    return this.normalizeWhitespaces(this.mapChildrenToAsciimath().join(''));
  }

  normalizeWhitespaces(str){
    return str.replace(/\s+/g, ' ');
  }
}
},{"./BaseTag":51}],79:[function(require,module,exports){
const BaseTag = require('./BaseTag');
const MAction = require('./MAction');
const MathTag = require('./Math');
const MEnclose = require('./MEnclose');
const MError = require('./MError');
const MFenced = require('./MFenced');
const MFrac = require('./MFrac');
const MGlyph = require('./MGlyph');
const MI = require('./MI');
const MMultiscripts = require('./MMultiscripts');
const MN = require('./MN');
const MO = require('./MO');
const MOver = require('./MOver');
const MPadded = require('./MPadded');
const MPhantom = require('./MPhantom');
const MPrescripts = require('./MPrescripts');
const MRoot = require('./MRoot');
const MRow = require('./MRow');
const MSqrt = require('./MSqrt');
const MSub = require('./MSub');
const MSubsup = require('./MSubsup');
const MSup = require('./MSup');
const MTable = require('./MTable');
const MTd = require('./MTd');
const MText = require('./MText');
const MTr = require('./MTr');
const MUnder = require('./MUnder');
const MUnderover = require('./MUnderover');


module.exports = {
  'basetag': BaseTag,
  'maction': MAction,
  'math': MathTag,
  'menclose': MEnclose,
  'merror': MError,
  'mfenced': MFenced,
  'mfrac': MFrac,
  'mglyph': MGlyph,
  'mi': MI,
  'mmultiscripts': MMultiscripts,
  'mn': MN,
  'mo': MO,
  'mover': MOver,
  'mpadded': MPadded,
  'mphantom': MPhantom,
  'mprescripts': MPrescripts,
  'mroot': MRoot,
  'mrow': MRow,
  'msqrt': MSqrt,
  'msub': MSub,
  'msubsup': MSubsup,
  'msup': MSup,
  'mtable': MTable,
  'mtd': MTd,
  'mtext': MText,
  'mtr': MTr,
  'munder': MUnder,
  'munderover': MUnderover,
};
},{"./BaseTag":51,"./MAction":52,"./MEnclose":53,"./MError":54,"./MFenced":55,"./MFrac":56,"./MGlyph":57,"./MI":58,"./MMultiscripts":59,"./MN":60,"./MO":61,"./MOver":62,"./MPadded":63,"./MPhantom":64,"./MPrescripts":65,"./MRoot":66,"./MRow":67,"./MSqrt":68,"./MSub":69,"./MSubsup":70,"./MSup":71,"./MTable":72,"./MTd":73,"./MText":74,"./MTr":75,"./MUnder":76,"./MUnderover":77,"./Math":78}],80:[function(require,module,exports){
module.exports = mathOperators = [
  {
    "character": "&#x2018;",
    "glyph": "‘",
    "asciimath": "‘",
  },
  {
    "character": "&#x2019;",
    "glyph": "’",
    "asciimath": "’",
  },
  {
    "character": "&#x201C;",
    "glyph": "“",
    "asciimath": "",
  },
  {
    "character": "&#x201D;",
    "glyph": "”",
    "asciimath": "“",
  },
  {
    "character": "(",
    "glyph": "(",
    "asciimath": "(",
  },
  {
    "character": ")",
    "glyph": ")",
    "asciimath": ")",
  },
  {
    "character": "[",
    "glyph": "[",
    "asciimath": "[",
  },
  {
    "character": "]",
    "glyph": "]",
    "asciimath": "]",
  },
  {
    "character": "{",
    "glyph": "{",
    "asciimath": "{",
  },
  {
    "character": "|",
    "glyph": "|",
    "asciimath": "|",
  },
  {
    "character": "|",
    "glyph": "|",
    "asciimath": "|",
  },
  {
    "character": "||",
    "glyph": "||",
    "asciimath": "||",
  },
  {
    "character": "||",
    "glyph": "||",
    "asciimath": "||",
  },
  {
    "character": "|||",
    "glyph": "|||",
    "asciimath": "|||",
  },
  {
    "character": "|||",
    "glyph": "|||",
    "asciimath": "|||",
  },
  {
    "character": "}",
    "glyph": "}",
    "asciimath": "}",
  },
  {
    "character": "&#x2016;",
    "glyph": "‖",
    "asciimath": "||",
  },
  {
    "character": "&#x2016;",
    "glyph": "‖",
    "asciimath": "||",
  },
  {
    "character": "&#x2308;",
    "glyph": "⌈",
    "asciimath": "|~",
  },
  {
    "character": "&#x2309;",
    "glyph": "⌉",
    "asciimath": "~|",
  },
  {
    "character": "&#x230A;",
    "glyph": "⌊",
    "asciimath": "|__",
  },
  {
    "character": "&#x230B;",
    "glyph": "⌋",
    "asciimath": "__|",
  },
  {
    "character": "&#x2329;",
    "glyph": "〈",
    "asciimath": "(:",
  },
  {
    "character": "&#x232A;",
    "glyph": "〉",
    "asciimath": ":)",
  },
  {
    "character": "&#x2772;",
    "glyph": "❲",
    "asciimath": "[",
  },
  {
    "character": "&#x2773;",
    "glyph": "❳",
    "asciimath": "]",
  },
  {
    "character": "&#x27E6;",
    "glyph": "⟦",
    "asciimath": "[[",
  },
  {
    "character": "&#x27E7;",
    "glyph": "⟧",
    "asciimath": "]]",
  },
  {
    "character": "&#x27E8;",
    "glyph": "⟨",
    "asciimath": "<<",
  },
  {
    "character": "&#x27E9;",
    "glyph": "⟩",
    "asciimath": ">>",
  },
  {
    "character": "&#x27EA;",
    "glyph": "⟪",
    "asciimath": "<<<<",
  },
  {
    "character": "&#x27EB;",
    "glyph": "⟫",
    "asciimath": "<<<<",
  },
  {
    "character": "&#x27EC;",
    "glyph": "⟬",
    "asciimath": "(",
  },
  {
    "character": "&#x27ED;",
    "glyph": "⟭",
    "asciimath": ")",
  },
  {
    "character": "&#x27EE;",
    "glyph": "⟮",
    "asciimath": "(",
  },
  {
    "character": "&#x27EF;",
    "glyph": "⟯",
    "asciimath": ")",
  },
  {
    "character": "&#x2980;",
    "glyph": "⦀",
    "asciimath": "||",
  },
  {
    "character": "&#x2980;",
    "glyph": "⦀",
    "asciimath": "||",
  },
  {
    "character": "&#x2983;",
    "glyph": "⦃",
    "asciimath": "{|",
  },
  {
    "character": "&#x2984;",
    "glyph": "⦄",
    "asciimath": "|}",
  },
  {
    "character": "&#x2985;",
    "glyph": "⦅",
    "asciimath": "(|",
  },
  {
    "character": "&#x2986;",
    "glyph": "⦆",
    "asciimath": "|)",
  },
  {
    "character": "&#x2987;",
    "glyph": "⦇",
    "asciimath": "(|",
  },
  {
    "character": "&#x2988;",
    "glyph": "⦈",
    "asciimath": "|)",
  },
  {
    "character": "&#x2989;",
    "glyph": "⦉",
    "asciimath": "<<|",
  },
  {
    "character": "&#x298A;",
    "glyph": "⦊",
    "asciimath": "|>>",
  },
  {
    "character": "&#x298B;",
    "glyph": "⦋",
    "asciimath": "]",
  },
  {
    "character": "&#x298C;",
    "glyph": "⦌",
    "asciimath": "[",
  },
  {
    "character": "&#x298D;",
    "glyph": "⦍",
    "asciimath": "[",
  },
  {
    "character": "&#x298E;",
    "glyph": "⦎",
    "asciimath": "]",
  },
  {
    "character": "&#x298F;",
    "glyph": "⦏",
    "asciimath": "]",
  },
  {
    "character": "&#x2990;",
    "glyph": "⦐",
    "asciimath": "]",
  },
  {
    "character": "&#x2991;",
    "glyph": "⦑",
    "asciimath": "<<",
  },
  {
    "character": "&#x2992;",
    "glyph": "⦒",
    "asciimath": ">>",
  },
  {
    "character": "&#x2993;",
    "glyph": "⦓",
    "asciimath": "⦓",
  },
  {
    "character": "&#x2994;",
    "glyph": "⦔",
    "asciimath": "⦔",
  },
  {
    "character": "&#x2995;",
    "glyph": "⦕",
    "asciimath": "⦕",
  },
  {
    "character": "&#x2996;",
    "glyph": "⦖",
    "asciimath": "⦖",
  },
  {
    "character": "&#x2997;",
    "glyph": "⦗",
    "asciimath": "[",
  },
  {
    "character": "&#x2998;",
    "glyph": "⦘",
    "asciimath": "]",
  },
  {
    "character": "&#x29FC;",
    "glyph": "⧼",
    "asciimath": "-<",
  },
  {
    "character": "&#x29FD;",
    "glyph": "⧽",
    "asciimath": ">-",
  },
  {
    "character": ";",
    "glyph": ";",
    "asciimath": ";",
  },
  {
    "character": ",",
    "glyph": ",",
    "asciimath": ",",
  },
  {
    "character": "&#x2063;",
    "glyph": "⁣",
    "asciimath": "",
  },
  {
    "character": "&#x2234;",
    "glyph": "∴",
    "asciimath": ":.",
  },
  {
    "character": "&#x2235;",
    "glyph": "∵",
    "asciimath": ":'",
  },
  {
    "character": "->",
    "glyph": "->",
    "asciimath": "\\-\\>",
  },
  {
    "character": "..",
    "glyph": "..",
    "asciimath": "..",
  },
  {
    "character": "...",
    "glyph": "...",
    "asciimath": "...",
  },
  {
    "character": ":",
    "glyph": ":",
    "asciimath": ":",
  },
  {
    "character": "&#x3F6;",
    "glyph": "϶",
    "asciimath": "epsilon",
  },
  {
    "character": "&#x2026;",
    "glyph": "…",
    "asciimath": "...",
  },
  {
    "character": "&#x22EE;",
    "glyph": "⋮",
    "asciimath": "vdots",
  },
  {
    "character": "&#x22EF;",
    "glyph": "⋯",
    "asciimath": "...",
  },
  {
    "character": "&#x22F1;",
    "glyph": "⋱",
    "asciimath": "ddots",
  },
  {
    "character": "&#x220B;",
    "glyph": "∋",
    "asciimath": "epsilon",
  },
  {
    "character": "&#x22A2;",
    "glyph": "⊢",
    "asciimath": "|--",
  },
  {
    "character": "&#x22A3;",
    "glyph": "⊣",
    "asciimath": "",
  },
  {
    "character": "&#x22A4;",
    "glyph": "⊤",
    "asciimath": "",
  },
  {
    "character": "&#x22A8;",
    "glyph": "⊨",
    "asciimath": "|==",
  },
  {
    "character": "&#x22A9;",
    "glyph": "⊩",
    "asciimath": "||--",
  },
  {
    "character": "&#x22AC;",
    "glyph": "⊬",
    "asciimath": "",
  },
  {
    "character": "&#x22AD;",
    "glyph": "⊭",
    "asciimath": "",
  },
  {
    "character": "&#x22AE;",
    "glyph": "⊮",
    "asciimath": "",
  },
  {
    "character": "&#x22AF;",
    "glyph": "⊯",
    "asciimath": "cancel(|==)",
  },
  {
    "character": "&#x2228;",
    "glyph": "∨",
    "asciimath": "vee",
  },
  {
    "character": "&amp;&amp;",
    "glyph": "&&",
    "asciimath": "&&",
  },
  {
    "character": "&#x2227;",
    "glyph": "∧",
    "asciimath": "wedge",
  },
  {
    "character": "&#x2200;",
    "glyph": "∀",
    "asciimath": "forall",
  },
  {
    "character": "&#x2203;",
    "glyph": "∃",
    "asciimath": "EE",
  },
  {
    "character": "&#x2204;",
    "glyph": "∄",
    "asciimath": "cancel(EE)",
  },
  {
    "character": "&#x2201;",
    "glyph": "∁",
    "asciimath": "C",
  },
  {
    "character": "&#x2208;",
    "glyph": "∈",
    "asciimath": "in",
  },
  {
    "character": "&#x2209;",
    "glyph": "∉",
    "asciimath": "!in",
  },
  {
    "character": "&#x220C;",
    "glyph": "∌",
    "asciimath": "",
  },
  {
    "character": "&#x2282;",
    "glyph": "⊂",
    "asciimath": "sub",
  },
  {
    "character": "&#x2282;&#x20D2;",
    "glyph": "⊂⃒",
    "asciimath": "square",
  },
  {
    "character": "&#x2283;",
    "glyph": "⊃",
    "asciimath": "sup",
  },
  {
    "character": "&#x2283;&#x20D2;",
    "glyph": "⊃⃒",
    "asciimath": "square",
  },
  {
    "character": "&#x2284;",
    "glyph": "⊄",
    "asciimath": "cancel(sub)",
  },
  {
    "character": "&#x2285;",
    "glyph": "⊅",
    "asciimath": "cancel(sup)",
  },
  {
    "character": "&#x2286;",
    "glyph": "⊆",
    "asciimath": "sube",
  },
  {
    "character": "&#x2287;",
    "glyph": "⊇",
    "asciimath": "supe",
  },
  {
    "character": "&#x2288;",
    "glyph": "⊈",
    "asciimath": "cancel(sube)",
  },
  {
    "character": "&#x2289;",
    "glyph": "⊉",
    "asciimath": "cancel(supe)",
  },
  {
    "character": "&#x228A;",
    "glyph": "⊊",
    "asciimath": "",
  },
  {
    "character": "&#x228B;",
    "glyph": "⊋",
    "asciimath": "",
  },
  {
    "character": "&lt;=",
    "glyph": "<=",
    "asciimath": "\\<\\=",
  },
  {
    "character": "&#x2264;",
    "glyph": "≤",
    "asciimath": "le",
  },
  {
    "character": "&#x2265;",
    "glyph": "≥",
    "asciimath": "ge",
  },
  {
    "character": ">",
    "glyph": ">",
    "asciimath": ">",
  },
  {
    "character": ">=",
    "glyph": ">=",
    "asciimath": "\\>\\=",
  },
  {
    "character": "&#x226F;",
    "glyph": "≯",
    "asciimath": ">/",
  },
  {
    "character": "&lt;",
    "glyph": "<",
    "asciimath": "<",
  },
  {
    "character": "&#x226E;",
    "glyph": "≮",
    "asciimath": "</",
  },
  {
    "character": "&#x2248;",
    "glyph": "≈",
    "asciimath": "approx",
  },
  {
    "character": "&#x223C;",
    "glyph": "∼",
    "asciimath": "~//",
  },
  {
    "character": "&#x2249;",
    "glyph": "≉",
    "asciimath": "~~//",
  },
  {
    "character": "&#x2262;",
    "glyph": "≢",
    "asciimath": "equiv//",
  },
  {
    "character": "&#x2260;",
    "glyph": "≠",
    "asciimath": "!=",
  },
  {
    "character": "!=",
    "glyph": "!=",
    "asciimath": "!\\=",
  },
  {
    "character": "*=",
    "glyph": "*=",
    "asciimath": "*=",
  },
  {
    "character": "+=",
    "glyph": "+=",
    "asciimath": "+\\=",
  },
  {
    "character": "-=",
    "glyph": "-=",
    "asciimath": "-\\=",
  },
  {
    "character": "/=",
    "glyph": "/=",
    "asciimath": "//=",
  },
  {
    "character": ":=",
    "glyph": ":=",
    "asciimath": ":\\=",
  },
  {
    "character": "=",
    "glyph": "=",
    "asciimath": "=",
  },
  {
    "character": "==",
    "glyph": "==",
    "asciimath": "==",
  },
  {
    "character": "&#x221D;",
    "glyph": "∝",
    "asciimath": "|><",
  },
  {
    "character": "&#x2224;",
    "glyph": "∤",
    "asciimath": "cancel(|)",
  },
  {
    "character": "&#x2225;",
    "glyph": "∥",
    "asciimath": "||",
  },
  {
    "character": "&#x2226;",
    "glyph": "∦",
    "asciimath": "cancel(||)",
  },
  {
    "character": "&#x2241;",
    "glyph": "≁",
    "asciimath": "cancel(-)",
  },
  {
    "character": "&#x2243;",
    "glyph": "≃",
    "asciimath": "~=",
  },
  {
    "character": "&#x2244;",
    "glyph": "≄",
    "asciimath": "cancel(~=)",
  },
  {
    "character": "&#x2245;",
    "glyph": "≅",
    "asciimath": "~=",
  },
  {
    "character": "&#x2246;",
    "glyph": "≆",
    "asciimath": "",
  },
  {
    "character": "&#x2247;",
    "glyph": "≇",
    "asciimath": "",
  },
  {
    "character": "&#x224D;",
    "glyph": "≍",
    "asciimath": "",
  },
  {
    "character": "&#x2254;",
    "glyph": "≔",
    "asciimath": ":=",
  },
  {
    "character": "&#x2257;",
    "glyph": "≗",
    "asciimath": "overset(circ)(=)",
  },
  {
    "character": "&#x2259;",
    "glyph": "≙",
    "asciimath": "hat(=)",
  },
  {
    "character": "&#x225A;",
    "glyph": "≚",
    "asciimath": "overset(vee)(=)",
  },
  {
    "character": "&#x225B;",
    "glyph": "≛",
    "asciimath": "overset(***)(=)",
  },
  {
    "character": "&#x225C;",
    "glyph": "≜",
    "asciimath": "overset(/_\\)(=)",
  },
  {
    "character": "&#x225F;",
    "glyph": "≟",
    "asciimath": "overset(?)(=)",
  },
  {
    "character": "&#x2261;",
    "glyph": "≡",
    "asciimath": "equiv",
  },
  {
    "character": "&#x2268;",
    "glyph": "≨",
    "asciimath": "",
  },
  {
    "character": "&#x2269;",
    "glyph": "≩",
    "asciimath": "",
  },
  {
    "character": "&#x226A;",
    "glyph": "≪",
    "asciimath": "<<",
  },
  {
    "character": "&#x226A;&#x338;",
    "glyph": "≪̸",
    "asciimath": "cancel(<<)",
  },
  {
    "character": "&#x226B;",
    "glyph": "≫",
    "asciimath": ">>",
  },
  {
    "character": "&#x226B;&#x338;",
    "glyph": "≫̸",
    "asciimath": "cancel(>>)",
  },
  {
    "character": "&#x226D;",
    "glyph": "≭",
    "asciimath": "cancel(equiv)",
  },
  {
    "character": "&#x2270;",
    "glyph": "≰",
    "asciimath": "<=//",
  },
  {
    "character": "&#x2271;",
    "glyph": "≱",
    "asciimath": ">=//",
  },
  {
    "character": "&#x227A;",
    "glyph": "≺",
    "asciimath": "-<",
  },
  {
    "character": "&#x227B;",
    "glyph": "≻",
    "asciimath": ">-",
  },
  {
    "character": "&#x227C;",
    "glyph": "≼",
    "asciimath": "-<=",
  },
  {
    "character": "&#x227D;",
    "glyph": "≽",
    "asciimath": ">-=",
  },
  {
    "character": "&#x2280;",
    "glyph": "⊀",
    "asciimath": "cancel(-<)",
  },
  {
    "character": "&#x2281;",
    "glyph": "⊁",
    "asciimath": "cancel(>-)",
  },
  {
    "character": "&#x22A5;",
    "glyph": "⊥",
    "asciimath": "_|_",
  },
  {
    "character": "&#x22B4;",
    "glyph": "⊴",
    "asciimath": "",
  },
  {
    "character": "&#x22B5;",
    "glyph": "⊵",
    "asciimath": "",
  },
  {
    "character": "&#x22C9;",
    "glyph": "⋉",
    "asciimath": "|><",
  },
  {
    "character": "&#x22CA;",
    "glyph": "⋊",
    "asciimath": "><|",
  },
  {
    "character": "&#x22CB;",
    "glyph": "⋋",
    "asciimath": "",
  },
  {
    "character": "&#x22CC;",
    "glyph": "⋌",
    "asciimath": "",
  },
  {
    "character": "&#x22D4;",
    "glyph": "⋔",
    "asciimath": "",
  },
  {
    "character": "&#x22D6;",
    "glyph": "⋖",
    "asciimath": "<*",
  },
  {
    "character": "&#x22D7;",
    "glyph": "⋗",
    "asciimath": "*>",
  },
  {
    "character": "&#x22D8;",
    "glyph": "⋘",
    "asciimath": "<<<<<<",
  },
  {
    "character": "&#x22D9;",
    "glyph": "⋙",
    "asciimath": ">>>>>>",
  },
  {
    "character": "&#x22EA;",
    "glyph": "⋪",
    "asciimath": "",
  },
  {
    "character": "&#x22EB;",
    "glyph": "⋫",
    "asciimath": "",
  },
  {
    "character": "&#x22EC;",
    "glyph": "⋬",
    "asciimath": "",
  },
  {
    "character": "&#x22ED;",
    "glyph": "⋭",
    "asciimath": "",
  },
  {
    "character": "&#x25A0;",
    "glyph": "■",
    "asciimath": "",
  },
  {
    "character": "&#x25A1;",
    "glyph": "□",
    "asciimath": "square",
  },
  {
    "character": "&#x25AA;",
    "glyph": "▪",
    "asciimath": "",
  },
  {
    "character": "&#x25AB;",
    "glyph": "▫",
    "asciimath": "",
  },
  {
    "character": "&#x25AD;",
    "glyph": "▭",
    "asciimath": "",
  },
  {
    "character": "&#x25AE;",
    "glyph": "▮",
    "asciimath": "",
  },
  {
    "character": "&#x25AF;",
    "glyph": "▯",
    "asciimath": "",
  },
  {
    "character": "&#x25B0;",
    "glyph": "▰",
    "asciimath": "",
  },
  {
    "character": "&#x25B1;",
    "glyph": "▱",
    "asciimath": "",
  },
  {
    "character": "&#x25B3;",
    "glyph": "△",
    "asciimath": "/_\\",
  },
  {
    "character": "&#x25B4;",
    "glyph": "▴",
    "asciimath": "",
  },
  {
    "character": "&#x25B5;",
    "glyph": "▵",
    "asciimath": "/_\\",
  },
  {
    "character": "&#x25B6;",
    "glyph": "▶",
    "asciimath": "",
  },
  {
    "character": "&#x25B7;",
    "glyph": "▷",
    "asciimath": "",
  },
  {
    "character": "&#x25B8;",
    "glyph": "▸",
    "asciimath": "",
  },
  {
    "character": "&#x25B9;",
    "glyph": "▹",
    "asciimath": "",
  },
  {
    "character": "&#x25BC;",
    "glyph": "▼",
    "asciimath": "",
  },
  {
    "character": "&#x25BD;",
    "glyph": "▽",
    "asciimath": "",
  },
  {
    "character": "&#x25BE;",
    "glyph": "▾",
    "asciimath": "",
  },
  {
    "character": "&#x25BF;",
    "glyph": "▿",
    "asciimath": "",
  },
  {
    "character": "&#x25C0;",
    "glyph": "◀",
    "asciimath": "",
  },
  {
    "character": "&#x25C1;",
    "glyph": "◁",
    "asciimath": "",
  },
  {
    "character": "&#x25C2;",
    "glyph": "◂",
    "asciimath": "",
  },
  {
    "character": "&#x25C3;",
    "glyph": "◃",
    "asciimath": "",
  },
  {
    "character": "&#x25C4;",
    "glyph": "◄",
    "asciimath": "",
  },
  {
    "character": "&#x25C5;",
    "glyph": "◅",
    "asciimath": "",
  },
  {
    "character": "&#x25C6;",
    "glyph": "◆",
    "asciimath": "",
  },
  {
    "character": "&#x25C7;",
    "glyph": "◇",
    "asciimath": "",
  },
  {
    "character": "&#x25C8;",
    "glyph": "◈",
    "asciimath": "",
  },
  {
    "character": "&#x25C9;",
    "glyph": "◉",
    "asciimath": "",
  },
  {
    "character": "&#x25CC;",
    "glyph": "◌",
    "asciimath": "",
  },
  {
    "character": "&#x25CD;",
    "glyph": "◍",
    "asciimath": "",
  },
  {
    "character": "&#x25CE;",
    "glyph": "◎",
    "asciimath": "",
  },
  {
    "character": "&#x25CF;",
    "glyph": "●",
    "asciimath": "",
  },
  {
    "character": "&#x25D6;",
    "glyph": "◖",
    "asciimath": "",
  },
  {
    "character": "&#x25D7;",
    "glyph": "◗",
    "asciimath": "",
  },
  {
    "character": "&#x25E6;",
    "glyph": "◦",
    "asciimath": "",
  },
  {
    "character": "&#x29C0;",
    "glyph": "⧀",
    "asciimath": "",
  },
  {
    "character": "&#x29C1;",
    "glyph": "⧁",
    "asciimath": "",
  },
  {
    "character": "&#x29E3;",
    "glyph": "⧣",
    "asciimath": "",
  },
  {
    "character": "&#x29E4;",
    "glyph": "⧤",
    "asciimath": "",
  },
  {
    "character": "&#x29E5;",
    "glyph": "⧥",
    "asciimath": "",
  },
  {
    "character": "&#x29E6;",
    "glyph": "⧦",
    "asciimath": "",
  },
  {
    "character": "&#x29F3;",
    "glyph": "⧳",
    "asciimath": "",
  },
  {
    "character": "&#x2A87;",
    "glyph": "⪇",
    "asciimath": "",
  },
  {
    "character": "&#x2A88;",
    "glyph": "⪈",
    "asciimath": "",
  },
  {
    "character": "&#x2AAF;",
    "glyph": "⪯",
    "asciimath": "-<",
  },
  {
    "character": "&#x2AAF;&#x338;",
    "glyph": "⪯̸",
    "asciimath": "cancel(-<)",
  },
  {
    "character": "&#x2AB0;",
    "glyph": "⪰",
    "asciimath": ">-",
  },
  {
    "character": "&#x2AB0;&#x338;",
    "glyph": "⪰̸",
    "asciimath": "cancel(>-)",
  },
  {
    "character": "&#x2044;",
    "glyph": "⁄",
    "asciimath": "//",
  },
  {
    "character": "&#x2206;",
    "glyph": "∆",
    "asciimath": "Delta",
  },
  {
    "character": "&#x220A;",
    "glyph": "∊",
    "asciimath": "in",
  },
  {
    "character": "&#x220D;",
    "glyph": "∍",
    "asciimath": "",
  },
  {
    "character": "&#x220E;",
    "glyph": "∎",
    "asciimath": "",
  },
  {
    "character": "&#x2215;",
    "glyph": "∕",
    "asciimath": "//",
  },
  {
    "character": "&#x2217;",
    "glyph": "∗",
    "asciimath": "**",
  },
  {
    "character": "&#x2218;",
    "glyph": "∘",
    "asciimath": "*",
  },
  {
    "character": "&#x2219;",
    "glyph": "∙",
    "asciimath": "*",
  },
  {
    "character": "&#x221F;",
    "glyph": "∟",
    "asciimath": "|__",
  },
  {
    "character": "&#x2223;",
    "glyph": "∣",
    "asciimath": "|",
  },
  {
    "character": "&#x2236;",
    "glyph": "∶",
    "asciimath": ":",
  },
  {
    "character": "&#x2237;",
    "glyph": "∷",
    "asciimath": "::",
  },
  {
    "character": "&#x2238;",
    "glyph": "∸",
    "asciimath": "",
  },
  {
    "character": "&#x2239;",
    "glyph": "∹",
    "asciimath": "-\\:",
  },
  {
    "character": "&#x223A;",
    "glyph": "∺",
    "asciimath": "",
  },
  {
    "character": "&#x223B;",
    "glyph": "∻",
    "asciimath": "-:",
  },
  {
    "character": "&#x223D;",
    "glyph": "∽",
    "asciimath": "~",
  },
  {
    "character": "&#x223D;&#x331;",
    "glyph": "∽̱",
    "asciimath": "",
  },
  {
    "character": "&#x223E;",
    "glyph": "∾",
    "asciimath": "",
  },
  {
    "character": "&#x223F;",
    "glyph": "∿",
    "asciimath": "",
  },
  {
    "character": "&#x2242;",
    "glyph": "≂",
    "asciimath": "=",
  },
  {
    "character": "&#x2242;&#x338;",
    "glyph": "≂̸",
    "asciimath": "cancel(=)",
  },
  {
    "character": "&#x224A;",
    "glyph": "≊",
    "asciimath": "overset(~)(=)",
  },
  {
    "character": "&#x224B;",
    "glyph": "≋",
    "asciimath": "",
  },
  {
    "character": "&#x224C;",
    "glyph": "≌",
    "asciimath": "overset(~)(=)",
  },
  {
    "character": "&#x224E;",
    "glyph": "≎",
    "asciimath": "",
  },
  {
    "character": "&#x224E;&#x338;",
    "glyph": "≎̸",
    "asciimath": "",
  },
  {
    "character": "&#x224F;",
    "glyph": "≏",
    "asciimath": "",
  },
  {
    "character": "&#x224F;&#x338;",
    "glyph": "≏̸",
    "asciimath": "",
  },
  {
    "character": "&#x2250;",
    "glyph": "≐",
    "asciimath": "dot(=)",
  },
  {
    "character": "&#x2251;",
    "glyph": "≑",
    "asciimath": "",
  },
  {
    "character": "&#x2252;",
    "glyph": "≒",
    "asciimath": "",
  },
  {
    "character": "&#x2253;",
    "glyph": "≓",
    "asciimath": "",
  },
  {
    "character": "&#x2255;",
    "glyph": "≕",
    "asciimath": "",
  },
  {
    "character": "&#x2256;",
    "glyph": "≖",
    "asciimath": "",
  },
  {
    "character": "&#x2258;",
    "glyph": "≘",
    "asciimath": "",
  },
  {
    "character": "&#x225D;",
    "glyph": "≝",
    "asciimath": "",
  },
  {
    "character": "&#x225E;",
    "glyph": "≞",
    "asciimath": "",
  },
  {
    "character": "&#x2263;",
    "glyph": "≣",
    "asciimath": "",
  },
  {
    "character": "&#x2266;",
    "glyph": "≦",
    "asciimath": "",
  },
  {
    "character": "&#x2266;&#x338;",
    "glyph": "≦̸",
    "asciimath": "",
  },
  {
    "character": "&#x2267;",
    "glyph": "≧",
    "asciimath": "",
  },
  {
    "character": "&#x226C;",
    "glyph": "≬",
    "asciimath": "",
  },
  {
    "character": "&#x2272;",
    "glyph": "≲",
    "asciimath": "",
  },
  {
    "character": "&#x2273;",
    "glyph": "≳",
    "asciimath": "",
  },
  {
    "character": "&#x2274;",
    "glyph": "≴",
    "asciimath": "",
  },
  {
    "character": "&#x2275;",
    "glyph": "≵",
    "asciimath": "",
  },
  {
    "character": "&#x2276;",
    "glyph": "≶",
    "asciimath": "",
  },
  {
    "character": "&#x2277;",
    "glyph": "≷",
    "asciimath": "",
  },
  {
    "character": "&#x2278;",
    "glyph": "≸",
    "asciimath": "",
  },
  {
    "character": "&#x2279;",
    "glyph": "≹",
    "asciimath": "",
  },
  {
    "character": "&#x227E;",
    "glyph": "≾",
    "asciimath": "",
  },
  {
    "character": "&#x227F;",
    "glyph": "≿",
    "asciimath": "",
  },
  {
    "character": "&#x227F;&#x338;",
    "glyph": "≿̸",
    "asciimath": "",
  },
  {
    "character": "&#x228C;",
    "glyph": "⊌",
    "asciimath": "",
  },
  {
    "character": "&#x228D;",
    "glyph": "⊍",
    "asciimath": "",
  },
  {
    "character": "&#x228E;",
    "glyph": "⊎",
    "asciimath": "",
  },
  {
    "character": "&#x228F;",
    "glyph": "⊏",
    "asciimath": "",
  },
  {
    "character": "&#x228F;&#x338;",
    "glyph": "⊏̸",
    "asciimath": "",
  },
  {
    "character": "&#x2290;",
    "glyph": "⊐",
    "asciimath": "",
  },
  {
    "character": "&#x2290;&#x338;",
    "glyph": "⊐̸",
    "asciimath": "",
  },
  {
    "character": "&#x2291;",
    "glyph": "⊑",
    "asciimath": "",
  },
  {
    "character": "&#x2292;",
    "glyph": "⊒",
    "asciimath": "",
  },
  {
    "character": "&#x2293;",
    "glyph": "⊓",
    "asciimath": "",
  },
  {
    "character": "&#x2294;",
    "glyph": "⊔",
    "asciimath": "",
  },
  {
    "character": "&#x229A;",
    "glyph": "⊚",
    "asciimath": "odot",
  },
  {
    "character": "&#x229B;",
    "glyph": "⊛",
    "asciimath": "",
  },
  {
    "character": "&#x229C;",
    "glyph": "⊜",
    "asciimath": "",
  },
  {
    "character": "&#x229D;",
    "glyph": "⊝",
    "asciimath": "",
  },
  {
    "character": "&#x22A6;",
    "glyph": "⊦",
    "asciimath": "|--",
  },
  {
    "character": "&#x22A7;",
    "glyph": "⊧",
    "asciimath": "|==",
  },
  {
    "character": "&#x22AA;",
    "glyph": "⊪",
    "asciimath": "|||--",
  },
  {
    "character": "&#x22AB;",
    "glyph": "⊫",
    "asciimath": "||==",
  },
  {
    "character": "&#x22B0;",
    "glyph": "⊰",
    "asciimath": "",
  },
  {
    "character": "&#x22B1;",
    "glyph": "⊱",
    "asciimath": "",
  },
  {
    "character": "&#x22B2;",
    "glyph": "⊲",
    "asciimath": "",
  },
  {
    "character": "&#x22B3;",
    "glyph": "⊳",
    "asciimath": "",
  },
  {
    "character": "&#x22B6;",
    "glyph": "⊶",
    "asciimath": "",
  },
  {
    "character": "&#x22B7;",
    "glyph": "⊷",
    "asciimath": "",
  },
  {
    "character": "&#x22B9;",
    "glyph": "⊹",
    "asciimath": "",
  },
  {
    "character": "&#x22BA;",
    "glyph": "⊺",
    "asciimath": "",
  },
  {
    "character": "&#x22BB;",
    "glyph": "⊻",
    "asciimath": "",
  },
  {
    "character": "&#x22BC;",
    "glyph": "⊼",
    "asciimath": "",
  },
  {
    "character": "&#x22BD;",
    "glyph": "⊽",
    "asciimath": "",
  },
  {
    "character": "&#x22BE;",
    "glyph": "⊾",
    "asciimath": "",
  },
  {
    "character": "&#x22BF;",
    "glyph": "⊿",
    "asciimath": "",
  },
  {
    "character": "&#x22C4;",
    "glyph": "⋄",
    "asciimath": "diamond",
  },
  {
    "character": "&#x22C6;",
    "glyph": "⋆",
    "asciimath": "***",
  },
  {
    "character": "&#x22C7;",
    "glyph": "⋇",
    "asciimath": "",
  },
  {
    "character": "&#x22C8;",
    "glyph": "⋈",
    "asciimath": "|><|",
  },
  {
    "character": "&#x22CD;",
    "glyph": "⋍",
    "asciimath": "",
  },
  {
    "character": "&#x22CE;",
    "glyph": "⋎",
    "asciimath": "vv",
  },
  {
    "character": "&#x22CF;",
    "glyph": "⋏",
    "asciimath": "^^",
  },
  {
    "character": "&#x22D0;",
    "glyph": "⋐",
    "asciimath": "",
  },
  {
    "character": "&#x22D1;",
    "glyph": "⋑",
    "asciimath": "",
  },
  {
    "character": "&#x22D2;",
    "glyph": "⋒",
    "asciimath": "",
  },
  {
    "character": "&#x22D3;",
    "glyph": "⋓",
    "asciimath": "",
  },
  {
    "character": "&#x22D5;",
    "glyph": "⋕",
    "asciimath": "",
  },
  {
    "character": "&#x22DA;",
    "glyph": "⋚",
    "asciimath": "",
  },
  {
    "character": "&#x22DB;",
    "glyph": "⋛",
    "asciimath": "",
  },
  {
    "character": "&#x22DC;",
    "glyph": "⋜",
    "asciimath": "",
  },
  {
    "character": "&#x22DD;",
    "glyph": "⋝",
    "asciimath": "",
  },
  {
    "character": "&#x22DE;",
    "glyph": "⋞",
    "asciimath": "",
  },
  {
    "character": "&#x22DF;",
    "glyph": "⋟",
    "asciimath": "",
  },
  {
    "character": "&#x22E0;",
    "glyph": "⋠",
    "asciimath": "",
  },
  {
    "character": "&#x22E1;",
    "glyph": "⋡",
    "asciimath": "",
  },
  {
    "character": "&#x22E2;",
    "glyph": "⋢",
    "asciimath": "",
  },
  {
    "character": "&#x22E3;",
    "glyph": "⋣",
    "asciimath": "",
  },
  {
    "character": "&#x22E4;",
    "glyph": "⋤",
    "asciimath": "",
  },
  {
    "character": "&#x22E5;",
    "glyph": "⋥",
    "asciimath": "",
  },
  {
    "character": "&#x22E6;",
    "glyph": "⋦",
    "asciimath": "",
  },
  {
    "character": "&#x22E7;",
    "glyph": "⋧",
    "asciimath": "",
  },
  {
    "character": "&#x22E8;",
    "glyph": "⋨",
    "asciimath": "",
  },
  {
    "character": "&#x22E9;",
    "glyph": "⋩",
    "asciimath": "",
  },
  {
    "character": "&#x22F0;",
    "glyph": "⋰",
    "asciimath": "ddots",
  },
  {
    "character": "&#x22F2;",
    "glyph": "⋲",
    "asciimath": "in",
  },
  {
    "character": "&#x22F3;",
    "glyph": "⋳",
    "asciimath": "",
  },
  {
    "character": "&#x22F4;",
    "glyph": "⋴",
    "asciimath": "",
  },
  {
    "character": "&#x22F5;",
    "glyph": "⋵",
    "asciimath": "dot(in)",
  },
  {
    "character": "&#x22F6;",
    "glyph": "⋶",
    "asciimath": "bar(in)",
  },
  {
    "character": "&#x22F7;",
    "glyph": "⋷",
    "asciimath": "bar(in)",
  },
  {
    "character": "&#x22F8;",
    "glyph": "⋸",
    "asciimath": "ul(in)",
  },
  {
    "character": "&#x22F9;",
    "glyph": "⋹",
    "asciimath": "ul(in)",
  },
  {
    "character": "&#x22FA;",
    "glyph": "⋺",
    "asciimath": "",
  },
  {
    "character": "&#x22FB;",
    "glyph": "⋻",
    "asciimath": "",
  },
  {
    "character": "&#x22FC;",
    "glyph": "⋼",
    "asciimath": "",
  },
  {
    "character": "&#x22FD;",
    "glyph": "⋽",
    "asciimath": "",
  },
  {
    "character": "&#x22FE;",
    "glyph": "⋾",
    "asciimath": "",
  },
  {
    "character": "&#x22FF;",
    "glyph": "⋿",
    "asciimath": "EE",
  },
  {
    "character": "&#x25B2;",
    "glyph": "▲",
    "asciimath": "",
  },
  {
    "character": "&#x2758;",
    "glyph": "❘",
    "asciimath": "|",
  },
  {
    "character": "&#x2981;",
    "glyph": "⦁",
    "asciimath": "circle",
  },
  {
    "character": "&#x2982;",
    "glyph": "⦂",
    "asciimath": ":",
  },
  {
    "character": "&#x29A0;",
    "glyph": "⦠",
    "asciimath": "cancel(>)",
  },
  {
    "character": "&#x29A1;",
    "glyph": "⦡",
    "asciimath": "cancel(vv)",
  },
  {
    "character": "&#x29A2;",
    "glyph": "⦢",
    "asciimath": "",
  },
  {
    "character": "&#x29A3;",
    "glyph": "⦣",
    "asciimath": "",
  },
  {
    "character": "&#x29A4;",
    "glyph": "⦤",
    "asciimath": "",
  },
  {
    "character": "&#x29A5;",
    "glyph": "⦥",
    "asciimath": "",
  },
  {
    "character": "&#x29A6;",
    "glyph": "⦦",
    "asciimath": "",
  },
  {
    "character": "&#x29A7;",
    "glyph": "⦧",
    "asciimath": "",
  },
  {
    "character": "&#x29A8;",
    "glyph": "⦨",
    "asciimath": "",
  },
  {
    "character": "&#x29A9;",
    "glyph": "⦩",
    "asciimath": "",
  },
  {
    "character": "&#x29AA;",
    "glyph": "⦪",
    "asciimath": "",
  },
  {
    "character": "&#x29AB;",
    "glyph": "⦫",
    "asciimath": "",
  },
  {
    "character": "&#x29AC;",
    "glyph": "⦬",
    "asciimath": "",
  },
  {
    "character": "&#x29AD;",
    "glyph": "⦭",
    "asciimath": "",
  },
  {
    "character": "&#x29AE;",
    "glyph": "⦮",
    "asciimath": "",
  },
  {
    "character": "&#x29AF;",
    "glyph": "⦯",
    "asciimath": "",
  },
  {
    "character": "&#x29B0;",
    "glyph": "⦰",
    "asciimath": "O/",
  },
  {
    "character": "&#x29B1;",
    "glyph": "⦱",
    "asciimath": "bar(O/)",
  },
  {
    "character": "&#x29B2;",
    "glyph": "⦲",
    "asciimath": "dot(O/)",
  },
  {
    "character": "&#x29B3;",
    "glyph": "⦳",
    "asciimath": "vec(O/)",
  },
  {
    "character": "&#x29B4;",
    "glyph": "⦴",
    "asciimath": "",
  },
  {
    "character": "&#x29B5;",
    "glyph": "⦵",
    "asciimath": "",
  },
  {
    "character": "&#x29B6;",
    "glyph": "⦶",
    "asciimath": "",
  },
  {
    "character": "&#x29B7;",
    "glyph": "⦷",
    "asciimath": "",
  },
  {
    "character": "&#x29B8;",
    "glyph": "⦸",
    "asciimath": "",
  },
  {
    "character": "&#x29B9;",
    "glyph": "⦹",
    "asciimath": "",
  },
  {
    "character": "&#x29BA;",
    "glyph": "⦺",
    "asciimath": "",
  },
  {
    "character": "&#x29BB;",
    "glyph": "⦻",
    "asciimath": "ox",
  },
  {
    "character": "&#x29BC;",
    "glyph": "⦼",
    "asciimath": "ox",
  },
  {
    "character": "&#x29BD;",
    "glyph": "⦽",
    "asciimath": "",
  },
  {
    "character": "&#x29BE;",
    "glyph": "⦾",
    "asciimath": "o.",
  },
  {
    "character": "&#x29BF;",
    "glyph": "⦿",
    "asciimath": "o.",
  },
  {
    "character": "&#x29C2;",
    "glyph": "⧂",
    "asciimath": "",
  },
  {
    "character": "&#x29C3;",
    "glyph": "⧃",
    "asciimath": "",
  },
  {
    "character": "&#x29C4;",
    "glyph": "⧄",
    "asciimath": "",
  },
  {
    "character": "&#x29C5;",
    "glyph": "⧅",
    "asciimath": "",
  },
  {
    "character": "&#x29C6;",
    "glyph": "⧆",
    "asciimath": "",
  },
  {
    "character": "&#x29C7;",
    "glyph": "⧇",
    "asciimath": "",
  },
  {
    "character": "&#x29C8;",
    "glyph": "⧈",
    "asciimath": "",
  },
  {
    "character": "&#x29C9;",
    "glyph": "⧉",
    "asciimath": "",
  },
  {
    "character": "&#x29CA;",
    "glyph": "⧊",
    "asciimath": "dot(/_\\)",
  },
  {
    "character": "&#x29CB;",
    "glyph": "⧋",
    "asciimath": "ul(/_\\)",
  },
  {
    "character": "&#x29CC;",
    "glyph": "⧌",
    "asciimath": "",
  },
  {
    "character": "&#x29CD;",
    "glyph": "⧍",
    "asciimath": "/_\\",
  },
  {
    "character": "&#x29CE;",
    "glyph": "⧎",
    "asciimath": "",
  },
  {
    "character": "&#x29CF;",
    "glyph": "⧏",
    "asciimath": "",
  },
  {
    "character": "&#x29CF;&#x338;",
    "glyph": "⧏̸",
    "asciimath": "",
  },
  {
    "character": "&#x29D0;",
    "glyph": "⧐",
    "asciimath": "",
  },
  {
    "character": "&#x29D0;&#x338;",
    "glyph": "⧐̸",
    "asciimath": "",
  },
  {
    "character": "&#x29D1;",
    "glyph": "⧑",
    "asciimath": "|><|",
  },
  {
    "character": "&#x29D2;",
    "glyph": "⧒",
    "asciimath": "|><|",
  },
  {
    "character": "&#x29D3;",
    "glyph": "⧓",
    "asciimath": "|><|",
  },
  {
    "character": "&#x29D4;",
    "glyph": "⧔",
    "asciimath": "|><",
  },
  {
    "character": "&#x29D5;",
    "glyph": "⧕",
    "asciimath": "><|",
  },
  {
    "character": "&#x29D6;",
    "glyph": "⧖",
    "asciimath": "",
  },
  {
    "character": "&#x29D7;",
    "glyph": "⧗",
    "asciimath": "",
  },
  {
    "character": "&#x29D8;",
    "glyph": "⧘",
    "asciimath": "}",
  },
  {
    "character": "&#x29D9;",
    "glyph": "⧙",
    "asciimath": "{",
  },
  {
    "character": "&#x29DB;",
    "glyph": "⧛",
    "asciimath": "{{",
  },
  {
    "character": "&#x29DC;",
    "glyph": "⧜",
    "asciimath": "",
  },
  {
    "character": "&#x29DD;",
    "glyph": "⧝",
    "asciimath": "",
  },
  {
    "character": "&#x29DE;",
    "glyph": "⧞",
    "asciimath": "",
  },
  {
    "character": "&#x29E0;",
    "glyph": "⧠",
    "asciimath": "square",
  },
  {
    "character": "&#x29E1;",
    "glyph": "⧡",
    "asciimath": "",
  },
  {
    "character": "&#x29E2;",
    "glyph": "⧢",
    "asciimath": "",
  },
  {
    "character": "&#x29E7;",
    "glyph": "⧧",
    "asciimath": "",
  },
  {
    "character": "&#x29E8;",
    "glyph": "⧨",
    "asciimath": "",
  },
  {
    "character": "&#x29E9;",
    "glyph": "⧩",
    "asciimath": "",
  },
  {
    "character": "&#x29EA;",
    "glyph": "⧪",
    "asciimath": "",
  },
  {
    "character": "&#x29EB;",
    "glyph": "⧫",
    "asciimath": "",
  },
  {
    "character": "&#x29EC;",
    "glyph": "⧬",
    "asciimath": "",
  },
  {
    "character": "&#x29ED;",
    "glyph": "⧭",
    "asciimath": "",
  },
  {
    "character": "&#x29EE;",
    "glyph": "⧮",
    "asciimath": "",
  },
  {
    "character": "&#x29F0;",
    "glyph": "⧰",
    "asciimath": "",
  },
  {
    "character": "&#x29F1;",
    "glyph": "⧱",
    "asciimath": "",
  },
  {
    "character": "&#x29F2;",
    "glyph": "⧲",
    "asciimath": "",
  },
  {
    "character": "&#x29F5;",
    "glyph": "⧵",
    "asciimath": "\\\\",
  },
  {
    "character": "&#x29F6;",
    "glyph": "⧶",
    "asciimath": "",
  },
  {
    "character": "&#x29F7;",
    "glyph": "⧷",
    "asciimath": "",
  },
  {
    "character": "&#x29F8;",
    "glyph": "⧸",
    "asciimath": "//",
  },
  {
    "character": "&#x29F9;",
    "glyph": "⧹",
    "asciimath": "\\\\",
  },
  {
    "character": "&#x29FA;",
    "glyph": "⧺",
    "asciimath": "",
  },
  {
    "character": "&#x29FB;",
    "glyph": "⧻",
    "asciimath": "",
  },
  {
    "character": "&#x29FE;",
    "glyph": "⧾",
    "asciimath": "+",
  },
  {
    "character": "&#x29FF;",
    "glyph": "⧿",
    "asciimath": "=",
  },
  {
    "character": "&#x2A1D;",
    "glyph": "⨝",
    "asciimath": "|><|",
  },
  {
    "character": "&#x2A1E;",
    "glyph": "⨞",
    "asciimath": "<|",
  },
  {
    "character": "&#x2A1F;",
    "glyph": "⨟",
    "asciimath": "",
  },
  {
    "character": "&#x2A20;",
    "glyph": "⨠",
    "asciimath": ">>",
  },
  {
    "character": "&#x2A21;",
    "glyph": "⨡",
    "asciimath": "",
  },
  {
    "character": "&#x2A22;",
    "glyph": "⨢",
    "asciimath": "",
  },
  {
    "character": "&#x2A23;",
    "glyph": "⨣",
    "asciimath": "",
  },
  {
    "character": "&#x2A24;",
    "glyph": "⨤",
    "asciimath": "",
  },
  {
    "character": "&#x2A25;",
    "glyph": "⨥",
    "asciimath": "",
  },
  {
    "character": "&#x2A26;",
    "glyph": "⨦",
    "asciimath": "",
  },
  {
    "character": "&#x2A27;",
    "glyph": "⨧",
    "asciimath": "",
  },
  {
    "character": "&#x2A28;",
    "glyph": "⨨",
    "asciimath": "",
  },
  {
    "character": "&#x2A29;",
    "glyph": "⨩",
    "asciimath": "",
  },
  {
    "character": "&#x2A2A;",
    "glyph": "⨪",
    "asciimath": "",
  },
  {
    "character": "&#x2A2B;",
    "glyph": "⨫",
    "asciimath": "",
  },
  {
    "character": "&#x2A2C;",
    "glyph": "⨬",
    "asciimath": "",
  },
  {
    "character": "&#x2A2D;",
    "glyph": "⨭",
    "asciimath": "",
  },
  {
    "character": "&#x2A2E;",
    "glyph": "⨮",
    "asciimath": "",
  },
  {
    "character": "&#x2A30;",
    "glyph": "⨰",
    "asciimath": "dot(xx)",
  },
  {
    "character": "&#x2A31;",
    "glyph": "⨱",
    "asciimath": "ul(xx)",
  },
  {
    "character": "&#x2A32;",
    "glyph": "⨲",
    "asciimath": "",
  },
  {
    "character": "&#x2A33;",
    "glyph": "⨳",
    "asciimath": "",
  },
  {
    "character": "&#x2A34;",
    "glyph": "⨴",
    "asciimath": "",
  },
  {
    "character": "&#x2A35;",
    "glyph": "⨵",
    "asciimath": "",
  },
  {
    "character": "&#x2A36;",
    "glyph": "⨶",
    "asciimath": "",
  },
  {
    "character": "&#x2A37;",
    "glyph": "⨷",
    "asciimath": "",
  },
  {
    "character": "&#x2A38;",
    "glyph": "⨸",
    "asciimath": "",
  },
  {
    "character": "&#x2A39;",
    "glyph": "⨹",
    "asciimath": "",
  },
  {
    "character": "&#x2A3A;",
    "glyph": "⨺",
    "asciimath": "",
  },
  {
    "character": "&#x2A3B;",
    "glyph": "⨻",
    "asciimath": "",
  },
  {
    "character": "&#x2A3C;",
    "glyph": "⨼",
    "asciimath": "",
  },
  {
    "character": "&#x2A3D;",
    "glyph": "⨽",
    "asciimath": "",
  },
  {
    "character": "&#x2A3E;",
    "glyph": "⨾",
    "asciimath": "",
  },
  {
    "character": "&#x2A40;",
    "glyph": "⩀",
    "asciimath": "",
  },
  {
    "character": "&#x2A41;",
    "glyph": "⩁",
    "asciimath": "",
  },
  {
    "character": "&#x2A42;",
    "glyph": "⩂",
    "asciimath": "bar(uu)",
  },
  {
    "character": "&#x2A43;",
    "glyph": "⩃",
    "asciimath": "bar(nn)",
  },
  {
    "character": "&#x2A44;",
    "glyph": "⩄",
    "asciimath": "",
  },
  {
    "character": "&#x2A45;",
    "glyph": "⩅",
    "asciimath": "",
  },
  {
    "character": "&#x2A46;",
    "glyph": "⩆",
    "asciimath": "",
  },
  {
    "character": "&#x2A47;",
    "glyph": "⩇",
    "asciimath": "",
  },
  {
    "character": "&#x2A48;",
    "glyph": "⩈",
    "asciimath": "",
  },
  {
    "character": "&#x2A49;",
    "glyph": "⩉",
    "asciimath": "",
  },
  {
    "character": "&#x2A4A;",
    "glyph": "⩊",
    "asciimath": "",
  },
  {
    "character": "&#x2A4B;",
    "glyph": "⩋",
    "asciimath": "",
  },
  {
    "character": "&#x2A4C;",
    "glyph": "⩌",
    "asciimath": "",
  },
  {
    "character": "&#x2A4D;",
    "glyph": "⩍",
    "asciimath": "",
  },
  {
    "character": "&#x2A4E;",
    "glyph": "⩎",
    "asciimath": "",
  },
  {
    "character": "&#x2A4F;",
    "glyph": "⩏",
    "asciimath": "",
  },
  {
    "character": "&#x2A50;",
    "glyph": "⩐",
    "asciimath": "",
  },
  {
    "character": "&#x2A51;",
    "glyph": "⩑",
    "asciimath": "dot(^^)",
  },
  {
    "character": "&#x2A52;",
    "glyph": "⩒",
    "asciimath": "dot(vv)",
  },
  {
    "character": "&#x2A53;",
    "glyph": "⩓",
    "asciimath": "",
  },
  {
    "character": "&#x2A54;",
    "glyph": "⩔",
    "asciimath": "",
  },
  {
    "character": "&#x2A55;",
    "glyph": "⩕",
    "asciimath": "",
  },
  {
    "character": "&#x2A56;",
    "glyph": "⩖",
    "asciimath": "",
  },
  {
    "character": "&#x2A57;",
    "glyph": "⩗",
    "asciimath": "",
  },
  {
    "character": "&#x2A58;",
    "glyph": "⩘",
    "asciimath": "",
  },
  {
    "character": "&#x2A59;",
    "glyph": "⩙",
    "asciimath": "",
  },
  {
    "character": "&#x2A5A;",
    "glyph": "⩚",
    "asciimath": "",
  },
  {
    "character": "&#x2A5B;",
    "glyph": "⩛",
    "asciimath": "",
  },
  {
    "character": "&#x2A5C;",
    "glyph": "⩜",
    "asciimath": "",
  },
  {
    "character": "&#x2A5D;",
    "glyph": "⩝",
    "asciimath": "",
  },
  {
    "character": "&#x2A5E;",
    "glyph": "⩞",
    "asciimath": "overset(=)(^^)",
  },
  {
    "character": "&#x2A5F;",
    "glyph": "⩟",
    "asciimath": "bar(vv)",
  },
  {
    "character": "&#x2A60;",
    "glyph": "⩠",
    "asciimath": "overset(^^)(=)",
  },
  {
    "character": "&#x2A61;",
    "glyph": "⩡",
    "asciimath": "ul(vv)",
  },
  {
    "character": "&#x2A62;",
    "glyph": "⩢",
    "asciimath": "zd",
  },
  {
    "character": "&#x2A63;",
    "glyph": "⩣",
    "asciimath": "overset(=)(vv)",
  },
  {
    "character": "&#x2A64;",
    "glyph": "⩤",
    "asciimath": "",
  },
  {
    "character": "&#x2A65;",
    "glyph": "⩥",
    "asciimath": "",
  },
  {
    "character": "&#x2A66;",
    "glyph": "⩦",
    "asciimath": "underset(=)(*)",
  },
  {
    "character": "&#x2A67;",
    "glyph": "⩧",
    "asciimath": "dot(=)",
  },
  {
    "character": "&#x2A68;",
    "glyph": "⩨",
    "asciimath": "",
  },
  {
    "character": "&#x2A69;",
    "glyph": "⩩",
    "asciimath": "",
  },
  {
    "character": "&#x2A6A;",
    "glyph": "⩪",
    "asciimath": "dot(~)",
  },
  {
    "character": "&#x2A6B;",
    "glyph": "⩫",
    "asciimath": "",
  },
  {
    "character": "&#x2A6C;",
    "glyph": "⩬",
    "asciimath": "cancel(approx)",
  },
  {
    "character": "&#x2A6D;",
    "glyph": "⩭",
    "asciimath": "dot(approx)",
  },
  {
    "character": "&#x2A6E;",
    "glyph": "⩮",
    "asciimath": "overset(*)(=)",
  },
  {
    "character": "&#x2A6F;",
    "glyph": "⩯",
    "asciimath": "overset(^^)(approx)",
  },
  {
    "character": "&#x2A70;",
    "glyph": "⩰",
    "asciimath": "",
  },
  {
    "character": "&#x2A71;",
    "glyph": "⩱",
    "asciimath": "overset(=)(+)",
  },
  {
    "character": "&#x2A72;",
    "glyph": "⩲",
    "asciimath": "overset(+)(=)",
  },
  {
    "character": "&#x2A73;",
    "glyph": "⩳",
    "asciimath": "",
  },
  {
    "character": "&#x2A74;",
    "glyph": "⩴",
    "asciimath": "::==",
  },
  {
    "character": "&#x2A75;",
    "glyph": "⩵",
    "asciimath": "==",
  },
  {
    "character": "&#x2A76;",
    "glyph": "⩶",
    "asciimath": "===",
  },
  {
    "character": "&#x2A77;",
    "glyph": "⩷",
    "asciimath": "",
  },
  {
    "character": "&#x2A78;",
    "glyph": "⩸",
    "asciimath": "",
  },
  {
    "character": "&#x2A79;",
    "glyph": "⩹",
    "asciimath": "",
  },
  {
    "character": "&#x2A7A;",
    "glyph": "⩺",
    "asciimath": "",
  },
  {
    "character": "&#x2A7B;",
    "glyph": "⩻",
    "asciimath": "",
  },
  {
    "character": "&#x2A7C;",
    "glyph": "⩼",
    "asciimath": "",
  },
  {
    "character": "&#x2A7D;",
    "glyph": "⩽",
    "asciimath": "<=",
  },
  {
    "character": "&#x2A7D;&#x338;",
    "glyph": "⩽̸",
    "asciimath": "cancel(<=)",
  },
  {
    "character": "&#x2A7E;",
    "glyph": "⩾",
    "asciimath": ">=",
  },
  {
    "character": "&#x2A7E;&#x338;",
    "glyph": "⩾̸",
    "asciimath": "cancel(>=)",
  },
  {
    "character": "&#x2A7F;",
    "glyph": "⩿",
    "asciimath": "",
  },
  {
    "character": "&#x2A80;",
    "glyph": "⪀",
    "asciimath": "",
  },
  {
    "character": "&#x2A81;",
    "glyph": "⪁",
    "asciimath": "overset(*)(<=)",
  },
  {
    "character": "&#x2A82;",
    "glyph": "⪂",
    "asciimath": "overset(*)(>=)",
  },
  {
    "character": "&#x2A83;",
    "glyph": "⪃",
    "asciimath": "overset(*)(<=)",
  },
  {
    "character": "&#x2A84;",
    "glyph": "⪄",
    "asciimath": "overset(*)(>=)",
  },
  {
    "character": "&#x2A85;",
    "glyph": "⪅",
    "asciimath": "overset(<)(approx)",
  },
  {
    "character": "&#x2A86;",
    "glyph": "⪆",
    "asciimath": "overset(>)(approx)",
  },
  {
    "character": "&#x2A89;",
    "glyph": "⪉",
    "asciimath": "overset(<)(cancel(approx))",
  },
  {
    "character": "&#x2A8A;",
    "glyph": "⪊",
    "asciimath": "overset(>)(cancel(approx))",
  },
  {
    "character": "&#x2A8B;",
    "glyph": "⪋",
    "asciimath": "",
  },
  {
    "character": "&#x2A8C;",
    "glyph": "⪌",
    "asciimath": "",
  },
  {
    "character": "&#x2A8D;",
    "glyph": "⪍",
    "asciimath": "<=",
  },
  {
    "character": "&#x2A8E;",
    "glyph": "⪎",
    "asciimath": ">=",
  },
  {
    "character": "&#x2A8F;",
    "glyph": "⪏",
    "asciimath": "",
  },
  {
    "character": "&#x2A90;",
    "glyph": "⪐",
    "asciimath": "",
  },
  {
    "character": "&#x2A91;",
    "glyph": "⪑",
    "asciimath": "",
  },
  {
    "character": "&#x2A92;",
    "glyph": "⪒",
    "asciimath": "",
  },
  {
    "character": "&#x2A93;",
    "glyph": "⪓",
    "asciimath": "",
  },
  {
    "character": "&#x2A94;",
    "glyph": "⪔",
    "asciimath": "",
  },
  {
    "character": "&#x2A95;",
    "glyph": "⪕",
    "asciimath": "",
  },
  {
    "character": "&#x2A96;",
    "glyph": "⪖",
    "asciimath": "",
  },
  {
    "character": "&#x2A97;",
    "glyph": "⪗",
    "asciimath": "",
  },
  {
    "character": "&#x2A98;",
    "glyph": "⪘",
    "asciimath": "",
  },
  {
    "character": "&#x2A99;",
    "glyph": "⪙",
    "asciimath": "overset(=)(<)",
  },
  {
    "character": "&#x2A9A;",
    "glyph": "⪚",
    "asciimath": "overset(=)(>)",
  },
  {
    "character": "&#x2A9B;",
    "glyph": "⪛",
    "asciimath": "",
  },
  {
    "character": "&#x2A9C;",
    "glyph": "⪜",
    "asciimath": "",
  },
  {
    "character": "&#x2A9D;",
    "glyph": "⪝",
    "asciimath": "overset(~)(<)",
  },
  {
    "character": "&#x2A9E;",
    "glyph": "⪞",
    "asciimath": "overset(~)(>)",
  },
  {
    "character": "&#x2A9F;",
    "glyph": "⪟",
    "asciimath": "",
  },
  {
    "character": "&#x2AA0;",
    "glyph": "⪠",
    "asciimath": "",
  },
  {
    "character": "&#x2AA1;",
    "glyph": "⪡",
    "asciimath": "",
  },
  {
    "character": "&#x2AA1;&#x338;",
    "glyph": "⪡̸",
    "asciimath": "",
  },
  {
    "character": "&#x2AA2;",
    "glyph": "⪢",
    "asciimath": "",
  },
  {
    "character": "&#x2AA2;&#x338;",
    "glyph": "⪢̸",
    "asciimath": "",
  },
  {
    "character": "&#x2AA3;",
    "glyph": "⪣",
    "asciimath": "ul(<<)",
  },
  {
    "character": "&#x2AA4;",
    "glyph": "⪤",
    "asciimath": "",
  },
  {
    "character": "&#x2AA5;",
    "glyph": "⪥",
    "asciimath": "><",
  },
  {
    "character": "&#x2AA6;",
    "glyph": "⪦",
    "asciimath": "",
  },
  {
    "character": "&#x2AA7;",
    "glyph": "⪧",
    "asciimath": "",
  },
  {
    "character": "&#x2AA8;",
    "glyph": "⪨",
    "asciimath": "",
  },
  {
    "character": "&#x2AA9;",
    "glyph": "⪩",
    "asciimath": "",
  },
  {
    "character": "&#x2AAA;",
    "glyph": "⪪",
    "asciimath": "",
  },
  {
    "character": "&#x2AAB;",
    "glyph": "⪫",
    "asciimath": "",
  },
  {
    "character": "&#x2AAC;",
    "glyph": "⪬",
    "asciimath": "",
  },
  {
    "character": "&#x2AAD;",
    "glyph": "⪭",
    "asciimath": "",
  },
  {
    "character": "&#x2AAE;",
    "glyph": "⪮",
    "asciimath": "",
  },
  {
    "character": "&#x2AB1;",
    "glyph": "⪱",
    "asciimath": "",
  },
  {
    "character": "&#x2AB2;",
    "glyph": "⪲",
    "asciimath": "",
  },
  {
    "character": "&#x2AB3;",
    "glyph": "⪳",
    "asciimath": "overset(-<)(=)",
  },
  {
    "character": "&#x2AB4;",
    "glyph": "⪴",
    "asciimath": "overset(>-)(=)",
  },
  {
    "character": "&#x2AB5;",
    "glyph": "⪵",
    "asciimath": "",
  },
  {
    "character": "&#x2AB6;",
    "glyph": "⪶",
    "asciimath": "",
  },
  {
    "character": "&#x2AB7;",
    "glyph": "⪷",
    "asciimath": "",
  },
  {
    "character": "&#x2AB8;",
    "glyph": "⪸",
    "asciimath": "",
  },
  {
    "character": "&#x2AB9;",
    "glyph": "⪹",
    "asciimath": "",
  },
  {
    "character": "&#x2ABA;",
    "glyph": "⪺",
    "asciimath": "",
  },
  {
    "character": "&#x2ABB;",
    "glyph": "⪻",
    "asciimath": "<<",
  },
  {
    "character": "&#x2ABC;",
    "glyph": "⪼",
    "asciimath": ">>",
  },
  {
    "character": "&#x2ABD;",
    "glyph": "⪽",
    "asciimath": "",
  },
  {
    "character": "&#x2ABE;",
    "glyph": "⪾",
    "asciimath": "",
  },
  {
    "character": "&#x2ABF;",
    "glyph": "⪿",
    "asciimath": "underset(+)(sub)",
  },
  {
    "character": "&#x2AC0;",
    "glyph": "⫀",
    "asciimath": "underset(+)(sup)",
  },
  {
    "character": "&#x2AC1;",
    "glyph": "⫁",
    "asciimath": "underset(xx)(sub)",
  },
  {
    "character": "&#x2AC2;",
    "glyph": "⫂",
    "asciimath": "underset(xx)(sup)",
  },
  {
    "character": "&#x2AC3;",
    "glyph": "⫃",
    "asciimath": "bar(sube)",
  },
  {
    "character": "&#x2AC4;",
    "glyph": "⫄",
    "asciimath": "bar(supe)",
  },
  {
    "character": "&#x2AC5;",
    "glyph": "⫅",
    "asciimath": "underset(=)(sub)",
  },
  {
    "character": "&#x2AC6;",
    "glyph": "⫆",
    "asciimath": "underset(=)(sup)",
  },
  {
    "character": "&#x2AC7;",
    "glyph": "⫇",
    "asciimath": "underset(~)(sub)",
  },
  {
    "character": "&#x2AC8;",
    "glyph": "⫈",
    "asciimath": "underset(~)(sup)",
  },
  {
    "character": "&#x2AC9;",
    "glyph": "⫉",
    "asciimath": "underset(approx)(sub)",
  },
  {
    "character": "&#x2ACA;",
    "glyph": "⫊",
    "asciimath": "underset(approx)(sup)",
  },
  {
    "character": "&#x2ACB;",
    "glyph": "⫋",
    "asciimath": "underset(!=)(sub)",
  },
  {
    "character": "&#x2ACC;",
    "glyph": "⫌",
    "asciimath": "underset(!=)(sup)",
  },
  {
    "character": "&#x2ACD;",
    "glyph": "⫍",
    "asciimath": "",
  },
  {
    "character": "&#x2ACE;",
    "glyph": "⫎",
    "asciimath": "",
  },
  {
    "character": "&#x2ACF;",
    "glyph": "⫏",
    "asciimath": "",
  },
  {
    "character": "&#x2AD0;",
    "glyph": "⫐",
    "asciimath": "",
  },
  {
    "character": "&#x2AD1;",
    "glyph": "⫑",
    "asciimath": "",
  },
  {
    "character": "&#x2AD2;",
    "glyph": "⫒",
    "asciimath": "",
  },
  {
    "character": "&#x2AD3;",
    "glyph": "⫓",
    "asciimath": "",
  },
  {
    "character": "&#x2AD4;",
    "glyph": "⫔",
    "asciimath": "",
  },
  {
    "character": "&#x2AD5;",
    "glyph": "⫕",
    "asciimath": "",
  },
  {
    "character": "&#x2AD6;",
    "glyph": "⫖",
    "asciimath": "",
  },
  {
    "character": "&#x2AD7;",
    "glyph": "⫗",
    "asciimath": "",
  },
  {
    "character": "&#x2AD8;",
    "glyph": "⫘",
    "asciimath": "",
  },
  {
    "character": "&#x2AD9;",
    "glyph": "⫙",
    "asciimath": "",
  },
  {
    "character": "&#x2ADA;",
    "glyph": "⫚",
    "asciimath": "",
  },
  {
    "character": "&#x2ADB;",
    "glyph": "⫛",
    "asciimath": "",
  },
  {
    "character": "&#x2ADD;",
    "glyph": "⫝",
    "asciimath": "",
  },
  {
    "character": "&#x2ADD;&#x338;",
    "glyph": "⫝̸",
    "asciimath": "",
  },
  {
    "character": "&#x2ADE;",
    "glyph": "⫞",
    "asciimath": "",
  },
  {
    "character": "&#x2ADF;",
    "glyph": "⫟",
    "asciimath": "",
  },
  {
    "character": "&#x2AE0;",
    "glyph": "⫠",
    "asciimath": "",
  },
  {
    "character": "&#x2AE1;",
    "glyph": "⫡",
    "asciimath": "",
  },
  {
    "character": "&#x2AE2;",
    "glyph": "⫢",
    "asciimath": "",
  },
  {
    "character": "&#x2AE3;",
    "glyph": "⫣",
    "asciimath": "",
  },
  {
    "character": "&#x2AE4;",
    "glyph": "⫤",
    "asciimath": "",
  },
  {
    "character": "&#x2AE5;",
    "glyph": "⫥",
    "asciimath": "",
  },
  {
    "character": "&#x2AE6;",
    "glyph": "⫦",
    "asciimath": "",
  },
  {
    "character": "&#x2AE7;",
    "glyph": "⫧",
    "asciimath": "",
  },
  {
    "character": "&#x2AE8;",
    "glyph": "⫨",
    "asciimath": "",
  },
  {
    "character": "&#x2AE9;",
    "glyph": "⫩",
    "asciimath": "",
  },
  {
    "character": "&#x2AEA;",
    "glyph": "⫪",
    "asciimath": "",
  },
  {
    "character": "&#x2AEB;",
    "glyph": "⫫",
    "asciimath": "",
  },
  {
    "character": "&#x2AEC;",
    "glyph": "⫬",
    "asciimath": "",
  },
  {
    "character": "&#x2AED;",
    "glyph": "⫭",
    "asciimath": "",
  },
  {
    "character": "&#x2AEE;",
    "glyph": "⫮",
    "asciimath": "",
  },
  {
    "character": "&#x2AEF;",
    "glyph": "⫯",
    "asciimath": "",
  },
  {
    "character": "&#x2AF0;",
    "glyph": "⫰",
    "asciimath": "",
  },
  {
    "character": "&#x2AF1;",
    "glyph": "⫱",
    "asciimath": "",
  },
  {
    "character": "&#x2AF2;",
    "glyph": "⫲",
    "asciimath": "",
  },
  {
    "character": "&#x2AF3;",
    "glyph": "⫳",
    "asciimath": "",
  },
  {
    "character": "&#x2AF4;",
    "glyph": "⫴",
    "asciimath": "",
  },
  {
    "character": "&#x2AF5;",
    "glyph": "⫵",
    "asciimath": "",
  },
  {
    "character": "&#x2AF6;",
    "glyph": "⫶",
    "asciimath": "vdots",
  },
  {
    "character": "&#x2AF7;",
    "glyph": "⫷",
    "asciimath": "",
  },
  {
    "character": "&#x2AF8;",
    "glyph": "⫸",
    "asciimath": "",
  },
  {
    "character": "&#x2AF9;",
    "glyph": "⫹",
    "asciimath": "",
  },
  {
    "character": "&#x2AFA;",
    "glyph": "⫺",
    "asciimath": "",
  },
  {
    "character": "&#x2AFB;",
    "glyph": "⫻",
    "asciimath": "",
  },
  {
    "character": "&#x2AFD;",
    "glyph": "⫽",
    "asciimath": "",
  },
  {
    "character": "&#x2AFE;",
    "glyph": "⫾",
    "asciimath": "",
  },
  {
    "character": "|",
    "glyph": "|",
    "asciimath": "|",
  },
  {
    "character": "||",
    "glyph": "||",
    "asciimath": "||",
  },
  {
    "character": "|||",
    "glyph": "|||",
    "asciimath": "|||",
  },
  {
    "character": "&#x2190;",
    "glyph": "←",
    "asciimath": "larr",
  },
  {
    "character": "&#x2191;",
    "glyph": "↑",
    "asciimath": "uarr",
  },
  {
    "character": "&#x2192;",
    "glyph": "→",
    "asciimath": "rarr",
  },
  {
    "character": "&#x2193;",
    "glyph": "↓",
    "asciimath": "darr",
  },
  {
    "character": "&#x2194;",
    "glyph": "↔",
    "asciimath": "harr",
  },
  {
    "character": "&#x2195;",
    "glyph": "↕",
    "asciimath": "",
  },
  {
    "character": "&#x2196;",
    "glyph": "↖",
    "asciimath": "",
  },
  {
    "character": "&#x2197;",
    "glyph": "↗",
    "asciimath": "",
  },
  {
    "character": "&#x2198;",
    "glyph": "↘",
    "asciimath": "",
  },
  {
    "character": "&#x2199;",
    "glyph": "↙",
    "asciimath": "",
  },
  {
    "character": "&#x219A;",
    "glyph": "↚",
    "asciimath": "larr",
  },
  {
    "character": "&#x219B;",
    "glyph": "↛",
    "asciimath": "harr",
  },
  {
    "character": "&#x219C;",
    "glyph": "↜",
    "asciimath": "larr",
  },
  {
    "character": "&#x219D;",
    "glyph": "↝",
    "asciimath": "rarr",
  },
  {
    "character": "&#x219E;",
    "glyph": "↞",
    "asciimath": "larr",
  },
  {
    "character": "&#x219F;",
    "glyph": "↟",
    "asciimath": "uarr",
  },
  {
    "character": "&#x21A0;",
    "glyph": "↠",
    "asciimath": ">->>",
  },
  {
    "character": "&#x21A1;",
    "glyph": "↡",
    "asciimath": "darr",
  },
  {
    "character": "&#x21A2;",
    "glyph": "↢",
    "asciimath": "larr",
  },
  {
    "character": "&#x21A3;",
    "glyph": "↣",
    "asciimath": ">->",
  },
  {
    "character": "&#x21A4;",
    "glyph": "↤",
    "asciimath": "larr",
  },
  {
    "character": "&#x21A5;",
    "glyph": "↥",
    "asciimath": "uarr",
  },
  {
    "character": "&#x21A6;",
    "glyph": "↦",
    "asciimath": "|rarr",
  },
  {
    "character": "&#x21A7;",
    "glyph": "↧",
    "asciimath": "darr",
  },
  {
    "character": "&#x21A8;",
    "glyph": "↨",
    "asciimath": "",
  },
  {
    "character": "&#x21A9;",
    "glyph": "↩",
    "asciimath": "larr",
  },
  {
    "character": "&#x21AA;",
    "glyph": "↪",
    "asciimath": "rarr",
  },
  {
    "character": "&#x21AB;",
    "glyph": "↫",
    "asciimath": "larr",
  },
  {
    "character": "&#x21AC;",
    "glyph": "↬",
    "asciimath": "->",
  },
  {
    "character": "&#x21AD;",
    "glyph": "↭",
    "asciimath": "harr",
  },
  {
    "character": "&#x21AE;",
    "glyph": "↮",
    "asciimath": "harr//",
  },
  {
    "character": "&#x21AF;",
    "glyph": "↯",
    "asciimath": "darr",
  },
  {
    "character": "&#x21B0;",
    "glyph": "↰",
    "asciimath": "larr",
  },
  {
    "character": "&#x21B1;",
    "glyph": "↱",
    "asciimath": "->",
  },
  {
    "character": "&#x21B2;",
    "glyph": "↲",
    "asciimath": "larr",
  },
  {
    "character": "&#x21B3;",
    "glyph": "↳",
    "asciimath": "rarr",
  },
  {
    "character": "&#x21B4;",
    "glyph": "↴",
    "asciimath": "darr",
  },
  {
    "character": "&#x21B5;",
    "glyph": "↵",
    "asciimath": "larr",
  },
  {
    "character": "&#x21B6;",
    "glyph": "↶",
    "asciimath": "darr",
  },
  {
    "character": "&#x21B7;",
    "glyph": "↷",
    "asciimath": "darr",
  },
  {
    "character": "&#x21B8;",
    "glyph": "↸",
    "asciimath": "",
  },
  {
    "character": "&#x21B9;",
    "glyph": "↹",
    "asciimath": "",
  },
  {
    "character": "&#x21BA;",
    "glyph": "↺",
    "asciimath": "",
  },
  {
    "character": "&#x21BB;",
    "glyph": "↻",
    "asciimath": "",
  },
  {
    "character": "&#x21BC;",
    "glyph": "↼",
    "asciimath": "larr",
  },
  {
    "character": "&#x21BD;",
    "glyph": "↽",
    "asciimath": "larr",
  },
  {
    "character": "&#x21BE;",
    "glyph": "↾",
    "asciimath": "uarr",
  },
  {
    "character": "&#x21BF;",
    "glyph": "↿",
    "asciimath": "uarr",
  },
  {
    "character": "&#x21C0;",
    "glyph": "⇀",
    "asciimath": "rarr",
  },
  {
    "character": "&#x21C1;",
    "glyph": "⇁",
    "asciimath": "rarr",
  },
  {
    "character": "&#x21C2;",
    "glyph": "⇂",
    "asciimath": "darr",
  },
  {
    "character": "&#x21C3;",
    "glyph": "⇃",
    "asciimath": "darr",
  },
  {
    "character": "&#x21C4;",
    "glyph": "⇄",
    "asciimath": "harr",
  },
  {
    "character": "&#x21C5;",
    "glyph": "⇅",
    "asciimath": "",
  },
  {
    "character": "&#x21C6;",
    "glyph": "⇆",
    "asciimath": "harr",
  },
  {
    "character": "&#x21C7;",
    "glyph": "⇇",
    "asciimath": "larr",
  },
  {
    "character": "&#x21C8;",
    "glyph": "⇈",
    "asciimath": "uarr",
  },
  {
    "character": "&#x21C9;",
    "glyph": "⇉",
    "asciimath": "rarr",
  },
  {
    "character": "&#x21CA;",
    "glyph": "⇊",
    "asciimath": "darr",
  },
  {
    "character": "&#x21CB;",
    "glyph": "⇋",
    "asciimath": "harr",
  },
  {
    "character": "&#x21CC;",
    "glyph": "⇌",
    "asciimath": "harr",
  },
  {
    "character": "&#x21CD;",
    "glyph": "⇍",
    "asciimath": "cancel(lArr)",
  },
  {
    "character": "&#x21CE;",
    "glyph": "⇎",
    "asciimath": "cancel(hArr)",
  },
  {
    "character": "&#x21CF;",
    "glyph": "⇏",
    "asciimath": "cancel(rArr)",
  },
  {
    "character": "&#x21D0;",
    "glyph": "⇐",
    "asciimath": "lArr",
  },
  {
    "character": "&#x21D1;",
    "glyph": "⇑",
    "asciimath": "uarr",
  },
  {
    "character": "&#x21D2;",
    "glyph": "⇒",
    "asciimath": "rArr",
  },
  {
    "character": "&#x21D3;",
    "glyph": "⇓",
    "asciimath": "darr",
  },
  {
    "character": "&#x21D4;",
    "glyph": "⇔",
    "asciimath": "hArr",
  },
  {
    "character": "&#x21D5;",
    "glyph": "⇕",
    "asciimath": "",
  },
  {
    "character": "&#x21D6;",
    "glyph": "⇖",
    "asciimath": "",
  },
  {
    "character": "&#x21D7;",
    "glyph": "⇗",
    "asciimath": "",
  },
  {
    "character": "&#x21D8;",
    "glyph": "⇘",
    "asciimath": "",
  },
  {
    "character": "&#x21D9;",
    "glyph": "⇙",
    "asciimath": "",
  },
  {
    "character": "&#x21DA;",
    "glyph": "⇚",
    "asciimath": "lArr",
  },
  {
    "character": "&#x21DB;",
    "glyph": "⇛",
    "asciimath": "rArr",
  },
  {
    "character": "&#x21DC;",
    "glyph": "⇜",
    "asciimath": "larr",
  },
  {
    "character": "&#x21DD;",
    "glyph": "⇝",
    "asciimath": "rarr",
  },
  {
    "character": "&#x21DE;",
    "glyph": "⇞",
    "asciimath": "",
  },
  {
    "character": "&#x21DF;",
    "glyph": "⇟",
    "asciimath": "",
  },
  {
    "character": "&#x21E0;",
    "glyph": "⇠",
    "asciimath": "larr",
  },
  {
    "character": "&#x21E1;",
    "glyph": "⇡",
    "asciimath": "uarr",
  },
  {
    "character": "&#x21E2;",
    "glyph": "⇢",
    "asciimath": "rarr",
  },
  {
    "character": "&#x21E3;",
    "glyph": "⇣",
    "asciimath": "darr",
  },
  {
    "character": "&#x21E4;",
    "glyph": "⇤",
    "asciimath": "|larr",
  },
  {
    "character": "&#x21E5;",
    "glyph": "⇥",
    "asciimath": "rarr",
  },
  {
    "character": "&#x21E6;",
    "glyph": "⇦",
    "asciimath": "lArr",
  },
  {
    "character": "&#x21E7;",
    "glyph": "⇧",
    "asciimath": "uarr",
  },
  {
    "character": "&#x21E8;",
    "glyph": "⇨",
    "asciimath": "rArr",
  },
  {
    "character": "&#x21E9;",
    "glyph": "⇩",
    "asciimath": "darr",
  },
  {
    "character": "&#x21EA;",
    "glyph": "⇪",
    "asciimath": "uarr",
  },
  {
    "character": "&#x21EB;",
    "glyph": "⇫",
    "asciimath": "uarr",
  },
  {
    "character": "&#x21EC;",
    "glyph": "⇬",
    "asciimath": "uarr",
  },
  {
    "character": "&#x21ED;",
    "glyph": "⇭",
    "asciimath": "uarr",
  },
  {
    "character": "&#x21EE;",
    "glyph": "⇮",
    "asciimath": "uarr",
  },
  {
    "character": "&#x21EF;",
    "glyph": "⇯",
    "asciimath": "uarr",
  },
  {
    "character": "&#x21F0;",
    "glyph": "⇰",
    "asciimath": "rArr",
  },
  {
    "character": "&#x21F1;",
    "glyph": "⇱",
    "asciimath": "",
  },
  {
    "character": "&#x21F2;",
    "glyph": "⇲",
    "asciimath": "",
  },
  {
    "character": "&#x21F3;",
    "glyph": "⇳",
    "asciimath": "",
  },
  {
    "character": "&#x21F4;",
    "glyph": "⇴",
    "asciimath": "rarr",
  },
  {
    "character": "&#x21F5;",
    "glyph": "⇵",
    "asciimath": "",
  },
  {
    "character": "&#x21F6;",
    "glyph": "⇶",
    "asciimath": "rarr",
  },
  {
    "character": "&#x21F7;",
    "glyph": "⇷",
    "asciimath": "larr",
  },
  {
    "character": "&#x21F8;",
    "glyph": "⇸",
    "asciimath": "rarr",
  },
  {
    "character": "&#x21F9;",
    "glyph": "⇹",
    "asciimath": "harr",
  },
  {
    "character": "&#x21FA;",
    "glyph": "⇺",
    "asciimath": "larr",
  },
  {
    "character": "&#x21FB;",
    "glyph": "⇻",
    "asciimath": "harr",
  },
  {
    "character": "&#x21FC;",
    "glyph": "⇼",
    "asciimath": "harr",
  },
  {
    "character": "&#x21FD;",
    "glyph": "⇽",
    "asciimath": "larr",
  },
  {
    "character": "&#x21FE;",
    "glyph": "⇾",
    "asciimath": "rarr",
  },
  {
    "character": "&#x21FF;",
    "glyph": "⇿",
    "asciimath": "harr",
  },
  {
    "character": "&#x22B8;",
    "glyph": "⊸",
    "asciimath": "rarr",
  },
  {
    "character": "&#x27F0;",
    "glyph": "⟰",
    "asciimath": "uarr",
  },
  {
    "character": "&#x27F1;",
    "glyph": "⟱",
    "asciimath": "darr",
  },
  {
    "character": "&#x27F5;",
    "glyph": "⟵",
    "asciimath": "larr",
  },
  {
    "character": "&#x27F6;",
    "glyph": "⟶",
    "asciimath": "rarr",
  },
  {
    "character": "&#x27F7;",
    "glyph": "⟷",
    "asciimath": "harr",
  },
  {
    "character": "&#x27F8;",
    "glyph": "⟸",
    "asciimath": "lArr",
  },
  {
    "character": "&#x27F9;",
    "glyph": "⟹",
    "asciimath": "rArr",
  },
  {
    "character": "&#x27FA;",
    "glyph": "⟺",
    "asciimath": "hArr",
  },
  {
    "character": "&#x27FB;",
    "glyph": "⟻",
    "asciimath": "larr|",
  },
  {
    "character": "&#x27FC;",
    "glyph": "⟼",
    "asciimath": "|rightarrow",
  },
  {
    "character": "&#x27FD;",
    "glyph": "⟽",
    "asciimath": "lArr|",
  },
  {
    "character": "&#x27FE;",
    "glyph": "⟾",
    "asciimath": "rArr|",
  },
  {
    "character": "&#x27FF;",
    "glyph": "⟿",
    "asciimath": "rarr",
  },
  {
    "character": "&#x2900;",
    "glyph": "⤀",
    "asciimath": ">->>",
  },
  {
    "character": "&#x2901;",
    "glyph": "⤁",
    "asciimath": ">->>",
  },
  {
    "character": "&#x2902;",
    "glyph": "⤂",
    "asciimath": "larr",
  },
  {
    "character": "&#x2903;",
    "glyph": "⤃",
    "asciimath": "rarr",
  },
  {
    "character": "&#x2904;",
    "glyph": "⤄",
    "asciimath": "harr",
  },
  {
    "character": "&#x2905;",
    "glyph": "⤅",
    "asciimath": ">->>",
  },
  {
    "character": "&#x2906;",
    "glyph": "⤆",
    "asciimath": "lArr|",
  },
  {
    "character": "&#x2907;",
    "glyph": "⤇",
    "asciimath": "rArr|",
  },
  {
    "character": "&#x2908;",
    "glyph": "⤈",
    "asciimath": "",
  },
  {
    "character": "&#x2909;",
    "glyph": "⤉",
    "asciimath": "",
  },
  {
    "character": "&#x290A;",
    "glyph": "⤊",
    "asciimath": "uarr",
  },
  {
    "character": "&#x290B;",
    "glyph": "⤋",
    "asciimath": "darr",
  },
  {
    "character": "&#x290C;",
    "glyph": "⤌",
    "asciimath": "larr",
  },
  {
    "character": "&#x290D;",
    "glyph": "⤍",
    "asciimath": "rarr",
  },
  {
    "character": "&#x290E;",
    "glyph": "⤎",
    "asciimath": "larr",
  },
  {
    "character": "&#x290F;",
    "glyph": "⤏",
    "asciimath": "rarr",
  },
  {
    "character": "&#x2910;",
    "glyph": "⤐",
    "asciimath": ">->>",
  },
  {
    "character": "&#x2911;",
    "glyph": "⤑",
    "asciimath": "arr",
  },
  {
    "character": "&#x2912;",
    "glyph": "⤒",
    "asciimath": "uarr",
  },
  {
    "character": "&#x2913;",
    "glyph": "⤓",
    "asciimath": "darr",
  },
  {
    "character": "&#x2914;",
    "glyph": "⤔",
    "asciimath": ">->>",
  },
  {
    "character": "&#x2915;",
    "glyph": "⤕",
    "asciimath": ">->>",
  },
  {
    "character": "&#x2916;",
    "glyph": "⤖",
    "asciimath": ">->>",
  },
  {
    "character": "&#x2917;",
    "glyph": "⤗",
    "asciimath": ">->>",
  },
  {
    "character": "&#x2918;",
    "glyph": "⤘",
    "asciimath": ">->>",
  },
  {
    "character": "&#x2919;",
    "glyph": "⤙",
    "asciimath": "larr",
  },
  {
    "character": "&#x291A;",
    "glyph": "⤚",
    "asciimath": "rarr",
  },
  {
    "character": "&#x291B;",
    "glyph": "⤛",
    "asciimath": "larr",
  },
  {
    "character": "&#x291C;",
    "glyph": "⤜",
    "asciimath": "rarr",
  },
  {
    "character": "&#x291D;",
    "glyph": "⤝",
    "asciimath": "*larr",
  },
  {
    "character": "&#x291E;",
    "glyph": "⤞",
    "asciimath": "rarr*",
  },
  {
    "character": "&#x291F;",
    "glyph": "⤟",
    "asciimath": "*larr",
  },
  {
    "character": "&#x2920;",
    "glyph": "⤠",
    "asciimath": "rarr*",
  },
  {
    "character": "&#x2921;",
    "glyph": "⤡",
    "asciimath": "",
  },
  {
    "character": "&#x2922;",
    "glyph": "⤢",
    "asciimath": "",
  },
  {
    "character": "&#x2923;",
    "glyph": "⤣",
    "asciimath": "",
  },
  {
    "character": "&#x2924;",
    "glyph": "⤤",
    "asciimath": "",
  },
  {
    "character": "&#x2925;",
    "glyph": "⤥",
    "asciimath": "",
  },
  {
    "character": "&#x2926;",
    "glyph": "⤦",
    "asciimath": "",
  },
  {
    "character": "&#x2927;",
    "glyph": "⤧",
    "asciimath": "",
  },
  {
    "character": "&#x2928;",
    "glyph": "⤨",
    "asciimath": "",
  },
  {
    "character": "&#x2929;",
    "glyph": "⤩",
    "asciimath": "",
  },
  {
    "character": "&#x292A;",
    "glyph": "⤪",
    "asciimath": "",
  },
  {
    "character": "&#x292B;",
    "glyph": "⤫",
    "asciimath": "xx",
  },
  {
    "character": "&#x292C;",
    "glyph": "⤬",
    "asciimath": "xx",
  },
  {
    "character": "&#x292D;",
    "glyph": "⤭",
    "asciimath": "",
  },
  {
    "character": "&#x292E;",
    "glyph": "⤮",
    "asciimath": "",
  },
  {
    "character": "&#x292F;",
    "glyph": "⤯",
    "asciimath": "",
  },
  {
    "character": "&#x2930;",
    "glyph": "⤰",
    "asciimath": "",
  },
  {
    "character": "&#x2931;",
    "glyph": "⤱",
    "asciimath": "",
  },
  {
    "character": "&#x2932;",
    "glyph": "⤲",
    "asciimath": "",
  },
  {
    "character": "&#x2933;",
    "glyph": "⤳",
    "asciimath": "rarr",
  },
  {
    "character": "&#x2934;",
    "glyph": "⤴",
    "asciimath": "uarr",
  },
  {
    "character": "&#x2935;",
    "glyph": "⤵",
    "asciimath": "darr",
  },
  {
    "character": "&#x2936;",
    "glyph": "⤶",
    "asciimath": "larr",
  },
  {
    "character": "&#x2937;",
    "glyph": "⤷",
    "asciimath": "rarr",
  },
  {
    "character": "&#x2938;",
    "glyph": "⤸",
    "asciimath": "rarr",
  },
  {
    "character": "&#x2939;",
    "glyph": "⤹",
    "asciimath": "uarr",
  },
  {
    "character": "&#x293A;",
    "glyph": "⤺",
    "asciimath": "darr",
  },
  {
    "character": "&#x293B;",
    "glyph": "⤻",
    "asciimath": "uarr",
  },
  {
    "character": "&#x293C;",
    "glyph": "⤼",
    "asciimath": "rarr",
  },
  {
    "character": "&#x293D;",
    "glyph": "⤽",
    "asciimath": "larr",
  },
  {
    "character": "&#x293E;",
    "glyph": "⤾",
    "asciimath": "",
  },
  {
    "character": "&#x293F;",
    "glyph": "⤿",
    "asciimath": "",
  },
  {
    "character": "&#x2940;",
    "glyph": "⥀",
    "asciimath": "",
  },
  {
    "character": "&#x2941;",
    "glyph": "⥁",
    "asciimath": "",
  },
  {
    "character": "&#x2942;",
    "glyph": "⥂",
    "asciimath": "harr",
  },
  {
    "character": "&#x2943;",
    "glyph": "⥃",
    "asciimath": "harr",
  },
  {
    "character": "&#x2944;",
    "glyph": "⥄",
    "asciimath": "harr",
  },
  {
    "character": "&#x2945;",
    "glyph": "⥅",
    "asciimath": "larr",
  },
  {
    "character": "&#x2946;",
    "glyph": "⥆",
    "asciimath": "larr",
  },
  {
    "character": "&#x2947;",
    "glyph": "⥇",
    "asciimath": "rarr",
  },
  {
    "character": "&#x2948;",
    "glyph": "⥈",
    "asciimath": "harr",
  },
  {
    "character": "&#x2949;",
    "glyph": "⥉",
    "asciimath": "",
  },
  {
    "character": "&#x294A;",
    "glyph": "⥊",
    "asciimath": "harr",
  },
  {
    "character": "&#x294B;",
    "glyph": "⥋",
    "asciimath": "harr",
  },
  {
    "character": "&#x294C;",
    "glyph": "⥌",
    "asciimath": "",
  },
  {
    "character": "&#x294D;",
    "glyph": "⥍",
    "asciimath": "",
  },
  {
    "character": "&#x294E;",
    "glyph": "⥎",
    "asciimath": "harr",
  },
  {
    "character": "&#x294F;",
    "glyph": "⥏",
    "asciimath": "",
  },
  {
    "character": "&#x2950;",
    "glyph": "⥐",
    "asciimath": "harr",
  },
  {
    "character": "&#x2951;",
    "glyph": "⥑",
    "asciimath": "",
  },
  {
    "character": "&#x2952;",
    "glyph": "⥒",
    "asciimath": "larr",
  },
  {
    "character": "&#x2953;",
    "glyph": "⥓",
    "asciimath": "rarr",
  },
  {
    "character": "&#x2954;",
    "glyph": "⥔",
    "asciimath": "",
  },
  {
    "character": "&#x2955;",
    "glyph": "⥕",
    "asciimath": "",
  },
  {
    "character": "&#x2956;",
    "glyph": "⥖",
    "asciimath": "",
  },
  {
    "character": "&#x2957;",
    "glyph": "⥗",
    "asciimath": "",
  },
  {
    "character": "&#x2958;",
    "glyph": "⥘",
    "asciimath": "",
  },
  {
    "character": "&#x2959;",
    "glyph": "⥙",
    "asciimath": "",
  },
  {
    "character": "&#x295A;",
    "glyph": "⥚",
    "asciimath": "larr",
  },
  {
    "character": "&#x295B;",
    "glyph": "⥛",
    "asciimath": "rarr",
  },
  {
    "character": "&#x295C;",
    "glyph": "⥜",
    "asciimath": "",
  },
  {
    "character": "&#x295D;",
    "glyph": "⥝",
    "asciimath": "",
  },
  {
    "character": "&#x295E;",
    "glyph": "⥞",
    "asciimath": "",
  },
  {
    "character": "&#x295F;",
    "glyph": "⥟",
    "asciimath": "rarr",
  },
  {
    "character": "&#x2960;",
    "glyph": "⥠",
    "asciimath": "",
  },
  {
    "character": "&#x2961;",
    "glyph": "⥡",
    "asciimath": "",
  },
  {
    "character": "&#x2962;",
    "glyph": "⥢",
    "asciimath": "lArr",
  },
  {
    "character": "&#x2963;",
    "glyph": "⥣",
    "asciimath": "uarr",
  },
  {
    "character": "&#x2964;",
    "glyph": "⥤",
    "asciimath": "rArr",
  },
  {
    "character": "&#x2965;",
    "glyph": "⥥",
    "asciimath": "darr",
  },
  {
    "character": "&#x2966;",
    "glyph": "⥦",
    "asciimath": "harr",
  },
  {
    "character": "&#x2967;",
    "glyph": "⥧",
    "asciimath": "harr",
  },
  {
    "character": "&#x2968;",
    "glyph": "⥨",
    "asciimath": "harr",
  },
  {
    "character": "&#x2969;",
    "glyph": "⥩",
    "asciimath": "harr",
  },
  {
    "character": "&#x296A;",
    "glyph": "⥪",
    "asciimath": "harr",
  },
  {
    "character": "&#x296B;",
    "glyph": "⥫",
    "asciimath": "harr",
  },
  {
    "character": "&#x296C;",
    "glyph": "⥬",
    "asciimath": "harr",
  },
  {
    "character": "&#x296D;",
    "glyph": "⥭",
    "asciimath": "harr",
  },
  {
    "character": "&#x296E;",
    "glyph": "⥮",
    "asciimath": "",
  },
  {
    "character": "&#x296F;",
    "glyph": "⥯",
    "asciimath": "",
  },
  {
    "character": "&#x2970;",
    "glyph": "⥰",
    "asciimath": "",
  },
  {
    "character": "&#x2971;",
    "glyph": "⥱",
    "asciimath": "rarr",
  },
  {
    "character": "&#x2972;",
    "glyph": "⥲",
    "asciimath": "rarr",
  },
  {
    "character": "&#x2973;",
    "glyph": "⥳",
    "asciimath": "larr",
  },
  {
    "character": "&#x2974;",
    "glyph": "⥴",
    "asciimath": "rarr",
  },
  {
    "character": "&#x2975;",
    "glyph": "⥵",
    "asciimath": "rarr",
  },
  {
    "character": "&#x2976;",
    "glyph": "⥶",
    "asciimath": "larr",
  },
  {
    "character": "&#x2977;",
    "glyph": "⥷",
    "asciimath": "larr",
  },
  {
    "character": "&#x2978;",
    "glyph": "⥸",
    "asciimath": "rarr",
  },
  {
    "character": "&#x2979;",
    "glyph": "⥹",
    "asciimath": "rarr",
  },
  {
    "character": "&#x297A;",
    "glyph": "⥺",
    "asciimath": "larr",
  },
  {
    "character": "&#x297B;",
    "glyph": "⥻",
    "asciimath": "larr",
  },
  {
    "character": "&#x297C;",
    "glyph": "⥼",
    "asciimath": "larr",
  },
  {
    "character": "&#x297D;",
    "glyph": "⥽",
    "asciimath": "rarr",
  },
  {
    "character": "&#x297E;",
    "glyph": "⥾",
    "asciimath": "",
  },
  {
    "character": "&#x297F;",
    "glyph": "⥿",
    "asciimath": "",
  },
  {
    "character": "&#x2999;",
    "glyph": "⦙",
    "asciimath": "vdots",
  },
  {
    "character": "&#x299A;",
    "glyph": "⦚",
    "asciimath": "",
  },
  {
    "character": "&#x299B;",
    "glyph": "⦛",
    "asciimath": "",
  },
  {
    "character": "&#x299C;",
    "glyph": "⦜",
    "asciimath": "",
  },
  {
    "character": "&#x299D;",
    "glyph": "⦝",
    "asciimath": "",
  },
  {
    "character": "&#x299E;",
    "glyph": "⦞",
    "asciimath": "",
  },
  {
    "character": "&#x299F;",
    "glyph": "⦟",
    "asciimath": "",
  },
  {
    "character": "&#x29DF;",
    "glyph": "⧟",
    "asciimath": "",
  },
  {
    "character": "&#x29EF;",
    "glyph": "⧯",
    "asciimath": "",
  },
  {
    "character": "&#x29F4;",
    "glyph": "⧴",
    "asciimath": ":rarr",
  },
  {
    "character": "&#x2B45;",
    "glyph": "⭅",
    "asciimath": "lArr",
  },
  {
    "character": "&#x2B46;",
    "glyph": "⭆",
    "asciimath": "rArr",
  },
  {
    "character": "+",
    "glyph": "+",
    "asciimath": "",
  },
  {
    "character": "+",
    "glyph": "+",
    "asciimath": "",
  },
  {
    "character": "-",
    "glyph": "-",
    "asciimath": "",
  },
  {
    "character": "-",
    "glyph": "-",
    "asciimath": "",
  },
  {
    "character": "&#xB1;",
    "glyph": "±",
    "asciimath": "+-",
  },
  {
    "character": "&#xB1;",
    "glyph": "±",
    "asciimath": "+-",
  },
  {
    "character": "&#x2212;",
    "glyph": "−",
    "asciimath": "-",
  },
  {
    "character": "&#x2212;",
    "glyph": "−",
    "asciimath": "-",
  },
  {
    "character": "&#x2213;",
    "glyph": "∓",
    "asciimath": "+-",
  },
  {
    "character": "&#x2213;",
    "glyph": "∓",
    "asciimath": "+-",
  },
  {
    "character": "&#x2214;",
    "glyph": "∔",
    "asciimath": "",
  },
  {
    "character": "&#x229E;",
    "glyph": "⊞",
    "asciimath": "",
  },
  {
    "character": "&#x229F;",
    "glyph": "⊟",
    "asciimath": "",
  },
  {
    "character": "&#x2211;",
    "glyph": "∑",
    "asciimath": "sum",
  },
  {
    "character": "&#x2A0A;",
    "glyph": "⨊",
    "asciimath": "sum",
  },
  {
    "character": "&#x2A0B;",
    "glyph": "⨋",
    "asciimath": "",
  },
  {
    "character": "&#x222C;",
    "glyph": "∬",
    "asciimath": "intint",
  },
  {
    "character": "&#x222D;",
    "glyph": "∭",
    "asciimath": "intintint",
  },
  {
    "character": "&#x2295;",
    "glyph": "⊕",
    "asciimath": "o+",
  },
  {
    "character": "&#x2296;",
    "glyph": "⊖",
    "asciimath": "",
  },
  {
    "character": "&#x2298;",
    "glyph": "⊘",
    "asciimath": "",
  },
  {
    "character": "&#x2A01;",
    "glyph": "⨁",
    "asciimath": "o+",
  },
  {
    "character": "&#x222B;",
    "glyph": "∫",
    "asciimath": "int",
  },
  {
    "character": "&#x222E;",
    "glyph": "∮",
    "asciimath": "oint",
  },
  {
    "character": "&#x222F;",
    "glyph": "∯",
    "asciimath": "ointoint",
  },
  {
    "character": "&#x2230;",
    "glyph": "∰",
    "asciimath": "ointointoint",
  },
  {
    "character": "&#x2231;",
    "glyph": "∱",
    "asciimath": "int",
  },
  {
    "character": "&#x2232;",
    "glyph": "∲",
    "asciimath": "oint",
  },
  {
    "character": "&#x2233;",
    "glyph": "∳",
    "asciimath": "oint",
  },
  {
    "character": "&#x2A0C;",
    "glyph": "⨌",
    "asciimath": "intintintint",
  },
  {
    "character": "&#x2A0D;",
    "glyph": "⨍",
    "asciimath": "",
  },
  {
    "character": "&#x2A0E;",
    "glyph": "⨎",
    "asciimath": "",
  },
  {
    "character": "&#x2A0F;",
    "glyph": "⨏",
    "asciimath": "",
  },
  {
    "character": "&#x2A10;",
    "glyph": "⨐",
    "asciimath": "",
  },
  {
    "character": "&#x2A11;",
    "glyph": "⨑",
    "asciimath": "",
  },
  {
    "character": "&#x2A12;",
    "glyph": "⨒",
    "asciimath": "",
  },
  {
    "character": "&#x2A13;",
    "glyph": "⨓",
    "asciimath": "",
  },
  {
    "character": "&#x2A14;",
    "glyph": "⨔",
    "asciimath": "",
  },
  {
    "character": "&#x2A15;",
    "glyph": "⨕",
    "asciimath": "",
  },
  {
    "character": "&#x2A16;",
    "glyph": "⨖",
    "asciimath": "",
  },
  {
    "character": "&#x2A17;",
    "glyph": "⨗",
    "asciimath": "",
  },
  {
    "character": "&#x2A18;",
    "glyph": "⨘",
    "asciimath": "",
  },
  {
    "character": "&#x2A19;",
    "glyph": "⨙",
    "asciimath": "",
  },
  {
    "character": "&#x2A1A;",
    "glyph": "⨚",
    "asciimath": "",
  },
  {
    "character": "&#x2A1B;",
    "glyph": "⨛",
    "asciimath": "bar(int)",
  },
  {
    "character": "&#x2A1C;",
    "glyph": "⨜",
    "asciimath": "ul(int)",
  },
  {
    "character": "&#x22C3;",
    "glyph": "⋃",
    "asciimath": "uuu",
  },
  {
    "character": "&#x2A03;",
    "glyph": "⨃",
    "asciimath": "",
  },
  {
    "character": "&#x2A04;",
    "glyph": "⨄",
    "asciimath": "",
  },
  {
    "character": "&#x22C0;",
    "glyph": "⋀",
    "asciimath": "^^^",
  },
  {
    "character": "&#x22C1;",
    "glyph": "⋁",
    "asciimath": "vvv",
  },
  {
    "character": "&#x22C2;",
    "glyph": "⋂",
    "asciimath": "nnn",
  },
  {
    "character": "&#x2A00;",
    "glyph": "⨀",
    "asciimath": "",
  },
  {
    "character": "&#x2A02;",
    "glyph": "⨂",
    "asciimath": "",
  },
  {
    "character": "&#x2A05;",
    "glyph": "⨅",
    "asciimath": "",
  },
  {
    "character": "&#x2A06;",
    "glyph": "⨆",
    "asciimath": "",
  },
  {
    "character": "&#x2A07;",
    "glyph": "⨇",
    "asciimath": "",
  },
  {
    "character": "&#x2A08;",
    "glyph": "⨈",
    "asciimath": "",
  },
  {
    "character": "&#x2A09;",
    "glyph": "⨉",
    "asciimath": "",
  },
  {
    "character": "&#x2AFC;",
    "glyph": "⫼",
    "asciimath": "",
  },
  {
    "character": "&#x2AFF;",
    "glyph": "⫿",
    "asciimath": "",
  },
  {
    "character": "&#x2240;",
    "glyph": "≀",
    "asciimath": "",
  },
  {
    "character": "&#x220F;",
    "glyph": "∏",
    "asciimath": "prod",
  },
  {
    "character": "&#x2210;",
    "glyph": "∐",
    "asciimath": "",
  },
  {
    "character": "&#x2229;",
    "glyph": "∩",
    "asciimath": "nnn",
  },
  {
    "character": "&#x222A;",
    "glyph": "∪",
    "asciimath": "uuu",
  },
  {
    "character": "*",
    "glyph": "*",
    "asciimath": "**",
  },
  {
    "character": ".",
    "glyph": ".",
    "asciimath": ".",
  },
  {
    "character": "&#xD7;",
    "glyph": "×",
    "asciimath": "xx",
  },
  {
    "character": "&#x2022;",
    "glyph": "•",
    "asciimath": "*",
  },
  {
    "character": "&#x2043;",
    "glyph": "⁃",
    "asciimath": "",
  },
  {
    "character": "&#x2062;",
    "glyph": "⁢",
    "asciimath": "",
  },
  {
    "character": "&#x22A0;",
    "glyph": "⊠",
    "asciimath": "",
  },
  {
    "character": "&#x22A1;",
    "glyph": "⊡",
    "asciimath": "",
  },
  {
    "character": "&#x22C5;",
    "glyph": "⋅",
    "asciimath": "",
  },
  {
    "character": "&#x2A2F;",
    "glyph": "⨯",
    "asciimath": "",
  },
  {
    "character": "&#x2A3F;",
    "glyph": "⨿",
    "asciimath": "",
  },
  {
    "character": "&#xB7;",
    "glyph": "·",
    "asciimath": "",
  },
  {
    "character": "&#x2297;",
    "glyph": "⊗",
    "asciimath": "ox",
  },
  {
    "character": "%",
    "glyph": "%",
    "asciimath": "%",
  },
  {
    "character": "\\",
    "glyph": "\\",
    "asciimath": "\\\\",
  },
  {
    "character": "&#x2216;",
    "glyph": "∖",
    "asciimath": "",
  },
  {
    "character": "/",
    "glyph": "/",
    "asciimath": "//",
  },
  {
    "character": "&#xF7;",
    "glyph": "÷",
    "asciimath": "-:",
  },
  {
    "character": "&#x2220;",
    "glyph": "∠",
    "asciimath": "/_",
  },
  {
    "character": "&#x2221;",
    "glyph": "∡",
    "asciimath": "/_",
  },
  {
    "character": "&#x2222;",
    "glyph": "∢",
    "asciimath": "",
  },
  {
    "character": "&#xAC;",
    "glyph": "¬",
    "asciimath": "not",
  },
  {
    "character": "&#x2299;",
    "glyph": "⊙",
    "asciimath": "o.",
  },
  {
    "character": "&#x2202;",
    "glyph": "∂",
    "asciimath": "del",
  },
  {
    "character": "&#x2207;",
    "glyph": "∇",
    "asciimath": "grad",
  },
  {
    "character": "**",
    "glyph": "**",
    "asciimath": "**\\**",
  },
  {
    "character": "&lt;>",
    "glyph": "<>",
    "asciimath": "<>",
  },
  {
    "character": "^",
    "glyph": "^",
    "asciimath": "^",
  },
  {
    "character": "&#x2032;",
    "glyph": "′",
    "asciimath": "\\'",
  },
  {
    "character": "&#x266D;",
    "glyph": "♭",
    "asciimath": "",
  },
  {
    "character": "&#x266E;",
    "glyph": "♮",
    "asciimath": "",
  },
  {
    "character": "&#x266F;",
    "glyph": "♯",
    "asciimath": "#",
  },
  {
    "character": "!",
    "glyph": "!",
    "asciimath": "!",
  },
  {
    "character": "!!",
    "glyph": "!!",
    "asciimath": "!!",
  },
  {
    "character": "//",
    "glyph": "//",
    "asciimath": "//",
  },
  {
    "character": "@",
    "glyph": "@",
    "asciimath": "text(@)",
  },
  {
    "character": "?",
    "glyph": "?",
    "asciimath": "?",
  },
  {
    "character": "&#x2145;",
    "glyph": "ⅅ",
    "asciimath": "bbb\"D",
  },
  {
    "character": "&#x2146;",
    "glyph": "ⅆ",
    "asciimath": "bbb\"d",
  },
  {
    "character": "&#x221A;",
    "glyph": "√",
    "asciimath": "sqrt",
  },
  {
    "character": "&#x221B;",
    "glyph": "∛",
    "asciimath": "root(3)",
  },
  {
    "character": "&#x221C;",
    "glyph": "∜",
    "asciimath": "root(4)",
  },
  {
    "character": "&#x2061;",
    "asciimath": "text",
  },
  {
    "character": "",
    "glyph": "quotation mark",
    "asciimath": "text(\")",
  },
  {
    "character": "&amp;",
    "glyph": "&",
    "asciimath": "&",
  },
  {
    "character": "++",
    "glyph": "++",
    "asciimath": "++",
  },
  {
    "character": "--",
    "glyph": "--",
    "asciimath": "--",
  },
  {
    "character": "^",
    "glyph": "^",
    "asciimath": "^/",
  },
  {
    "character": "_",
    "glyph": "_",
    "asciimath": "_",
  },
  {
    "character": "`",
    "glyph": "`",
    "asciimath": "`",
  },
  {
    "character": "~",
    "glyph": "~",
    "asciimath": "~",
  },
  {
    "character": "&#xA8;",
    "glyph": "¨",
    "asciimath": "ddot",
  },
  {
    "character": "&#xAA;",
    "glyph": "ª",
    "asciimath": "ª",
  },
  {
    "character": "&#xAF;",
    "glyph": "¯",
    "asciimath": "bar\\",
  },
  {
    "character": "&#xB0;",
    "glyph": "°",
    "asciimath": "@",
  },
  {
    "character": "&#xB2;",
    "glyph": "²",
    "asciimath": "^2",
  },
  {
    "character": "&#xB3;",
    "glyph": "³",
    "asciimath": "^3",
  },
  {
    "character": "&#xB4;",
    "glyph": "´",
    "asciimath": "´",
  },
  {
    "character": "&#xB8;",
    "glyph": "¸",
    "asciimath": "¸",
  },
  {
    "character": "&#xB9;",
    "glyph": "¹",
    "asciimath": "^1",
  },
  {
    "character": "&#xBA;",
    "glyph": "º",
    "asciimath": "º",
  },
  {
    "character": "&#x2C6;",
    "glyph": "ˆ",
    "asciimath": "^",
  },
  {
    "character": "&#x2C7;",
    "glyph": "ˇ",
    "asciimath": "ˇ",
  },
  {
    "character": "&#x2C9;",
    "glyph": "ˉ",
    "asciimath": "ˉ",
  },
  {
    "character": "&#x2CA;",
    "glyph": "ˊ",
    "asciimath": "ˊ",
  },
  {
    "character": "&#x2CB;",
    "glyph": "ˋ",
    "asciimath": "ˋ",
  },
  {
    "character": "&#x2CD;",
    "glyph": "ˍ",
    "asciimath": "ˍ",
  },
  {
    "character": "&#x2D8;",
    "glyph": "˘",
    "asciimath": "˘",
  },
  {
    "character": "&#x2D9;",
    "glyph": "˙",
    "asciimath": "˙",
  },
  {
    "character": "&#x2DA;",
    "glyph": "˚",
    "asciimath": "˚",
  },
  {
    "character": "&#x2DC;",
    "glyph": "˜",
    "asciimath": "˜",
  },
  {
    "character": "&#x2DD;",
    "glyph": "˝",
    "asciimath": "˝",
  },
  {
    "character": "&#x2F7;",
    "glyph": "˷",
    "asciimath": "˷",
  },
  {
    "character": "&#x302;",
    "glyph": "^",
    "asciimath": "^",
  },
  {
    "character": "&#x311;",
    "glyph": "̑",
    "asciimath": "̑",
  },
  {
    "character": "&#x201A;",
    "glyph": "‚",
    "asciimath": "‚",
  },
  {
    "character": "&#x201B;",
    "glyph": "‛",
    "asciimath": "‛",
  },
  {
    "character": "&#x201E;",
    "glyph": "„",
    "asciimath": "„",
  },
  {
    "character": "&#x201F;",
    "glyph": "‟",
    "asciimath": "‟",
  },
  {
    "character": "&#x2033;",
    "glyph": "″",
    "asciimath": "″",
  },
  {
    "character": "&#x2034;",
    "glyph": "‴",
    "asciimath": "‴",
  },
  {
    "character": "&#x2035;",
    "glyph": "‵",
    "asciimath": "‵",
  },
  {
    "character": "&#x2036;",
    "glyph": "‶",
    "asciimath": "‶",
  },
  {
    "character": "&#x2037;",
    "glyph": "‷",
    "asciimath": "‷",
  },
  {
    "character": "&#x203E;",
    "glyph": "‾",
    "asciimath": "‾",
  },
  {
    "character": "&#x2057;",
    "glyph": "⁗",
    "asciimath": "⁗",
  },
  {
    "character": "&#x2064;",
    "glyph": "⁤",
    "asciimath": "",
  },
  {
    "character": "&#x20DB;",
    "glyph": "⃛",
    "asciimath": "{::}^(...)",
  },
  {
    "character": "&#x20DC;",
    "glyph": "⃜",
    "asciimath": "{::}^(...)",
  },
  {
    "character": "&#x23B4;",
    "glyph": "⎴",
    "asciimath": "obrace",
  },
  {
    "character": "&#x23B5;",
    "glyph": "⎵",
    "asciimath": "ubrace",
  },
  {
    "character": "&#x23DC;",
    "glyph": "⏜",
    "asciimath": "ubrace",
  },
  {
    "character": "&#x23DD;",
    "glyph": "⏝",
    "asciimath": "obrace",
  },
  {
    "character": "&#x23DE;",
    "glyph": "⏞",
    "asciimath": "obrace",
  },
  {
    "character": "&#x23DF;",
    "glyph": "⏟",
    "asciimath": "ubrace",
  },
  {
    "character": "&#x23E0;",
    "glyph": "⏠",
    "asciimath": "ubrace",
  },
  {
    "character": "&#x23E1;",
    "glyph": "⏡",
    "asciimath": "obrace",
  },
  {
    "character": "_",
    "glyph": "_",
    "asciimath": "\\_",
  }
];
},{}],81:[function(require,module,exports){
module.exports = asciimathAccents = [
  'hat',
  'bar',
  'ul',
  'vec',
  'dot',
  'ddot',
  'ubrace',
  'obrace',
];
},{}],82:[function(require,module,exports){
module.exports = mathOperators = [
    {
        "asciimath": "lim",
        "name": "limit operator",
    },
    {
        "asciimath": "int",
        "name": "integral operator",
    },
    {
        "asciimath": "intint",
        "name": "double integral operator",
    },
    {
        "asciimath": "intintint",
        "name": "triple integral operator",
    },
    {
        "asciimath": "intintintint",
        "name": "quadruple integral operator",
    },
    {
        "asciimath": "sum",
        "name": "sumatory operator",
    },
    {
        "asciimath": "oint",
        "name": "contour integral operator",
    },
    {
        "asciimath": "ointoint",
        "name": "surface integral operator",
    },
    {
        "asciimath": "ointointoint",
        "name": "volume integral operator",
    },
];
},{}],83:[function(require,module,exports){
module.exports = mathSymbols = [
    {
      "character": "&#x221E;",
      "glyph": "∞",
      "asciimath": "oo",
      "name": "infinity",
    },
    {
      "character": "&#x3B1;",
      "glyph": "α",
      "asciimath": "alpha",
      "name": "alpha greek letter",
    },
    {
      "character": "&#x3B2;",
      "glyph": "β",
      "asciimath": "beta",
      "name": "beta greek letter",
    },
    {
      "character": "&#x3B2;",
      "glyph": "β",
      "asciimath": "beta",
      "name": "beta greek letter",
    },
    {
      "character": "&#x3B3;",
      "glyph": "γ",
      "asciimath": "gamma",
      "name": "gamma greek letter",
    },
    {
      "character": "&#x393;",
      "glyph": "Γ",
      "asciimath": "Gamma",
      "name": "capital gamma greek letter",
    },
    {
      "character": "&#x3B4;",
      "glyph": "δ",
      "asciimath": "delta",
      "name": "delta greek letter",
    },
    {
      "character": "&#x394;",
      "glyph": "Δ",
      "asciimath": "Delta",
      "name": "capital delta greek letter",
    },
    {
      "character": "&#x3B5;",
      "glyph": "ε",
      "asciimath": "epsilon",
      "name": "epsilon greek letter",
    },
    {
      "character": "&#x25B;",
      "glyph": "ɛ",
      "asciimath": "varepsilon",
      "name": "varepsilon greek letter",
    },
    {
      "character": "&#x3B6;",
      "glyph": "ζ",
      "asciimath": "zeta",
      "name": "zeta greek letter",
    },
    {
      "character": "&#x3B7;",
      "glyph": "η",
      "asciimath": "eta",
      "name": "eta greek letter",
    },
    {
      "character": "&#x3B8;",
      "glyph": "θ",
      "asciimath": "theta",
      "name": "theta greek letter",
    },
    {
      "character": "&#x398;",
      "glyph": "Θ",
      "asciimath": "Theta",
      "name": "capital theta greek letter",
    },
    {
      "character": "&#x3D1;",
      "glyph": "ϑ",
      "asciimath": "vartheta",
      "name": "vartheta greek letter",
    },
    {
      "character": "&#x3B9;",
      "glyph": "ι",
      "asciimath": "iota",
      "name": "iota greek letter",
    },
    {
      "character": "&#x3BA;",
      "glyph": "κ",
      "asciimath": "kappa",
      "name": "kappa greek letter",
    },
    {
      "character": "&#x3BB;",
      "glyph": "λ",
      "asciimath": "lambda",
      "name": "lambda greek letter",
    },
    {
      "character": "&#x39B;",
      "glyph": "Λ",
      "asciimath": "Lambda",
      "name": "capital lambda greek letter",
    },
    {
      "character": "&#x3BC;",
      "glyph": "μ",
      "asciimath": "mu",
      "name": "mu greek letter",
    },
    {
      "character": "&#x3BD;",
      "glyph": "ν",
      "asciimath": "nu",
      "name": "nu greek letter",
    },
    {
      "character": "&#x3BE;",
      "glyph": "ξ",
      "asciimath": "xi",
      "name": "xi greek letter",
    },
    {
      "character": "&#x39E;",
      "glyph": "Ξ",
      "asciimath": "Xi",
      "name": "capital xi greek letter",
    },
    {
      "character": "&#x3C0;",
      "glyph": "π",
      "asciimath": "pi",
      "name": "pi greek letter",
    },
    {
      "character": "&#x3A0;",
      "glyph": "Π",
      "asciimath": "Pi",
      "name": "capital pi greek letter",
    },
    {
      "character": "&#x3C1;",
      "glyph": "ρ",
      "asciimath": "rho",
      "name": "rho greek letter",
    },
    {
      "character": "&#x3C3;",
      "glyph": "σ",
      "asciimath": "sigma",
      "name": "sigma greek letter",
    },
    {
      "character": "&#x3A3;",
      "glyph": "Σ",
      "asciimath": "Sigma",
      "name": "capital sigma greek letter",
    },
    {
      "character": "&#x3C4;",
      "glyph": "τ",
      "asciimath": "tau",
      "name": "tau greek letter",
    },
    {
      "character": "&#x3C5;",
      "glyph": "υ",
      "asciimath": "upsilon",
      "name": "upsilon greek letter",
    },
    {
      "character": "&#x3D5;",
      "glyph": "ϕ",
      "asciimath": "phi",
      "name": "phi greek letter",
    },
    {
      "character": "&#x3A6;",
      "glyph": "Φ",
      "asciimath": "Phi",
      "name": "capital phi greek letter",
    },
    {
      "character": "&#x3C6;",
      "glyph": "φ",
      "asciimath": "varphi",
      "name": "varphi greek letter",
    },
    {
      "character": "&#x3C7;",
      "glyph": "χ",
      "asciimath": "chi",
      "name": "chi greek letter",
    },
    {
      "character": "&#x3C8;",
      "glyph": "ψ",
      "asciimath": "psi",
      "name": "psi greek letter",
    },
    {
      "character": "&#x3A8;",
      "glyph": "Ψ",
      "asciimath": "Psi",
      "name": "capital psi greek letter",
    },
    {
      "character": "&#x3C9;",
      "glyph": "ω",
      "asciimath": "omega",
      "name": "omega greek letter",
    },
    {
      "character": "&#x3A9;",
      "glyph": "Ω",
      "asciimath": "Omega",
      "name": "capital omega greek letter",
    },
    {
      "character": "&#x22C5;",
      "glyph": "⋅",
      "asciimath": "*",
      "name": "center dot",
    },
    {
      "character": "&#x2217;",
      "glyph": "∗",
      "asciimath": "**",
      "name": "asterisk",
    },
    {
      "character": "&#x22C6;",
      "glyph": "⋆",
      "asciimath": "***",
      "name": "star",
    },
    {
      "character": "/",
      "glyph": "/",
      "asciimath": "//",
      "name": "slash",
    },
    {
      "character": "\\",
      "glyph": "\\",
      "asciimath": "\\",
      "name": "backslash",
    },
    {
      "character": "&#xD7;",
      "glyph": "×",
      "asciimath": "xx",
      "name": "times",
    },
    {
      "character": "&#xF7;",
      "glyph": "÷",
      "asciimath": "-:",
      "name": "division",
    },
    {
      "character": "&#x22C9;",
      "glyph": "⋉",
      "asciimath": "|><",
      "name": "left normal factor semidirect product",
    },
    {
      "character": "&#x22CA;",
      "glyph": "⋊",
      "asciimath": "><|",
      "name": "right normal factor semidirect product",
    },
    {
      "character": "&#x22C8;",
      "glyph": "⋈",
      "asciimath": "|><|",
      "name": "bowtie",
    },
    {
      "character": "&#x2218;",
      "glyph": "∘",
      "asciimath": "@",
      "name": "circuference",
    },
    {
      "character": "&#x2295;",
      "glyph": "⊕",
      "asciimath": "o+",
      "name": "circled plus",
    },
    {
      "character": "&#x2297;",
      "glyph": "⊗",
      "asciimath": "ox",
      "name": "circled times",
    },
    {
      "character": "&#x2299;",
      "glyph": "⊙",
      "asciimath": "o.",
      "name": "circled dot",
    },
    {
      "character": "&#x2211;",
      "glyph": "∑",
      "asciimath": "sum",
      "name": "summatory",
    },
    {
      "character": "&#x220F;",
      "glyph": "∏",
      "asciimath": "prod",
      "name": "productory",
    },
    {
      "character": "&#x2227;",
      "glyph": "∧",
      "asciimath": "^^",
      "name": "wedge",
    },
    {
      "character": "&#x22C0;",
      "glyph": "⋀",
      "asciimath": "^^^",
      "name": "big wedge",
    },
    {
      "character": "&#x2228;",
      "glyph": "∨",
      "asciimath": "vv",
      "name": "vee",
    },
    {
      "character": "&#x22C1;",
      "glyph": "⋁",
      "asciimath": "vvv",
      "name": "big vee",
    },
    {
      "character": "&#x2229;",
      "glyph": "∩",
      "asciimath": "nn",
      "name": "cap",
    },
    {
      "character": "&#x22C2;",
      "glyph": "⋂",
      "asciimath": "nnn",
      "name": "big cap",
    },
    {
      "character": "&#x222A;",
      "glyph": "∪",
      "asciimath": "uu",
      "name": "cup",
    },
    {
      "character": "&#x22C3;",
      "glyph": "⋃",
      "asciimath": "uuu",
      "name": "big cup",
    },
    {
      "character": "&#x222B;",
      "glyph": "∫",
      "asciimath": "int",
      "name": "integral",
    },
    {
      "character": "&#x222E;",
      "glyph": "∮",
      "asciimath": "oint",
      "name": "line integral",
    },
    {
      "character": "&#x2202;",
      "glyph": "∂",
      "asciimath": "del",
      "name": "partial derivative",
    },
    {
      "character": "&#x2207;",
      "glyph": "∇",
      "asciimath": "grad",
      "name": "nabla as gradient",
    },
    {
      "character": "&#xB1;",
      "glyph": "±",
      "asciimath": "+-",
      "name": "plus or minus",
    },
    {
      "character": "&#x2205;",
      "glyph": "∅",
      "asciimath": "O/",
      "name": "emptyset",
    },
    {
      "character": "&#x2135;",
      "glyph": "ℵ",
      "asciimath": "aleph",
      "name": "aleph",
    },
    {
      "character": "&#x2234;",
      "glyph": "∴",
      "asciimath": ":.",
      "name": "therefore",
    },
    {
      "character": "&#x2235;",
      "glyph": "∵",
      "asciimath": ":'",
      "name": "because",
    },
    {
      "character": "&#x22EE;",
      "glyph": "⋮",
      "asciimath": "vdots",
      "name": "vertical dots",
    },
    {
      "character": "&#x22F1;",
      "glyph": "⋱",
      "asciimath": "ddots",
      "name": "diagonal dots",
    },
    {
      "character": "&#x2220;",
      "glyph": "∠",
      "asciimath": "/_",
      "name": "angle",
    },
    {
      "character": "&#x2322;",
      "glyph": "⌢",
      "asciimath": "frown",
      "name": "frown",
    },
    {
      "character": "&#x25B3;",
      "glyph": "△",
      "asciimath": "triangle",
      "name": "triangle",
    },
    {
      "character": "&#x22C4;",
      "glyph": "⋄",
      "asciimath": "diamond",
      "name": "diamond",
    },
    {
      "character": "&#x25A1;",
      "glyph": "□",
      "asciimath": "square",
      "name": "square",
    },
    {
      "character": "&#x2102;",
      "asciimath": "CC",
      "name": "complex set",
    },
    {
      "character": "&#x2115;",
      "asciimath": "NN",
      "name": "natural set",
    },
    {
      "character": "&#x211A;",
      "asciimath": "QQ",
      "name": "rational set",
    },
    {
      "character": "&#x211D;",
      "asciimath": "RR",
      "name": "real set",
    },
    {
      "character": "&#x2124;",
      "asciimath": "ZZ",
      "name": "integer set",
    },
    {
      "character": "&#xAC;",
      "glyph": "¬",
      "asciimath": "not",
      "name": "not",
    },
    {
      "character": "&#x21D2;",
      "glyph": "⇒",
      "asciimath": "=>",
      "name": "implies",
    },
    {
      "character": "&#x21D4;",
      "glyph": "⇔",
      "asciimath": "<=>",
      "name": "if and only if",
    },
    {
      "character": "&#x2200;",
      "glyph": "∀",
      "asciimath": "AA",
      "name": "for all",
    },
    {
      "character": "&#x2203;",
      "glyph": "∃",
      "asciimath": "EE",
      "name": "exists",
    },
    {
      "character": "&#xA0;",
      "glyph": " ",
      "asciimath": "\\",
      "name": "empty space",
    },
];

},{}],84:[function(require,module,exports){
module.exports = addParenthesesIfIsMoreThanOneChar = str => {
  return str.length > 1 ? `(${str})` : str;
};
},{}],85:[function(require,module,exports){
module.exports = addParenthesesIfThereIsEmptySpaces = str => {
  return str.match(/\s+/g) ? `(${str})` : str;
};
},{}],86:[function(require,module,exports){

const Brackets = {
  left: ['(', '[', '{', '|', '‖', '⟨', '⌊', '⌈', '⌜'],
  right: [')', ']', '}', '|', '‖', '⟩', '⌋', '⌉', '⌝'],
  isPair: function(l, r){
    const idx = this.left.indexOf(l);
    return r === this.right[idx];
  },
  contains: function(it) {
    return this.isLeft(it) || this.isRight(it);
  },
  isLeft: function(it) {
    return this.left.indexOf(it) > -1
  },
  isRight: function(it) {
    return this.right.indexOf(it) > -1;
  },
  parseLeft: function(it, stretchy = true) {
    if(this.left.indexOf(it) < 0){ return it}
    let r = '';
    switch(it){
      case '(':
      case '[':
      case '|': r = `\\left${it}`;
        break;
      case '‖': r = '\\left\\|';
        break;
      case '{': r = '\\left\\{';
        break;
      case '⟨': r = '\\left\\langle ';
        break;
      case '⌊': r = '\\left\\lfloor ';
        break;
      case '⌈': r = '\\left\\lceil ';
        break;
      case '⌜': r = '\\left\\ulcorner ';
        break;
    }
    return (stretchy ? r : r.replace('\\left', ''));
  },

  parseRight: function(it, stretchy = true) {
    if(this.right.indexOf(it) < 0){ return it}
    let r = '';
    switch(it){
      case ')':
      case ']':
      case '|': r = `\\right${it}`;
        break;
      case '‖': r = '\\right\\|';
        break;
      case '}': r = '\\right\\}';
        break;
      case '⟩': r = ' \\right\\rangle';
        break;
      case '⌋': r = ' \\right\\rfloor';
        break;
      case '⌉': r = ' \\right\\rceil';
        break;
      case '⌝': r = ' \\right\\urcorner';
        break;
    }
    return (stretchy ? r : r.replace('\\right', ''));
  }
}

module.exports = Brackets;

},{}],87:[function(require,module,exports){

const elementTree = require('elementtree');
module.exports = {
  parseMath: function(html) {
    const math = elementTree.parse(html).getroot();
    this.setParent(math);
    return math;
  },
  getChildren: function(node) {
    return node.getchildren();
  },
  getNodeName: function(node) {
    return node.tag;
  },
  getNodeText: function(node) {
    return node.text;
  },
  getAttr: function(node, attrName, defaultValue) {
    return node.get(attrName, defaultValue);
  },
  getPrevNode: function(node) {
    return this.getNearNode(node, -1);
  },
  getNextNode: function(node) {
    return this.getNearNode(node, 1);
  },
  // private
  getNearNode: function(node, offsetIndex) {
    const nodes = node.parent.getchildren();
    const index = Array.prototype.indexOf.call(nodes, node);
    if(index > 0 && index < nodes.length - 1){
      return nodes[index + offsetIndex]
    } else {
      return null;
    }
  },
  setParent: function(node) {
    const children = node.getchildren();
    if(children && children.length > 0){
      Array.prototype.forEach.call(children, (child) => {
        child.parent = node;
        this.setParent(child);
      });
    }
  }
}

},{"elementtree":38}],88:[function(require,module,exports){
const initMathML2LaTeX = require('./mathml2latex');
const domTool = require('./dom-tool-server');

const MathML2LaTeX = initMathML2LaTeX(domTool);

module.exports = MathML2LaTeX;

},{"./dom-tool-server":87,"./mathml2latex":90}],89:[function(require,module,exports){

// @see https://en.wikibooks.org/wiki/LaTeX/Mathematics#List_of_mathematical_symbols
// @see https://www.andy-roberts.net/res/writing/latex/symbols.pdf   (more completed)
// @see http://www.rpi.edu/dept/arc/training/latex/LaTeX_symbols.pdf (wtf)
// https://oeis.org/wiki/List_of_LaTeX_mathematical_symbols

// accessed directly from keyboard
// + - = ! / ( ) [ ] < > | ' : *

const MathSymbol = {
  parseIdentifier: function(it) {
    if(it.length === 0){ return '' }
    if(it.length === 1){
      const charCode = it.charCodeAt(0);
      let index = this.greekLetter.decimals.indexOf(charCode)
      if ( index > -1) {
        return this.greekLetter.scripts[index] + ' ';
      } else {
        return it;
      }
    } else {
      return this.parseMathFunction(it);
    }
  },

  parseOperator: function(it) {
    if(it.length === 0){ return ''}
    if(it.length === 1){
      const charCode = it.charCodeAt(0);
      const opSymbols = [
        this.bigCommand,
        this.relation,
        this.binaryOperation,
        this.setAndLogic,
        this.delimiter,
        this.other
      ];

      const padSpaceBothSide = [false, true, true, false, false, false]

      for(let i = 0; i < opSymbols.length; i++){
        const opSymbol = opSymbols[i];
        const index = opSymbol.decimals.indexOf(charCode);
        if(index > -1) {
          if(padSpaceBothSide[i]){
            return [' ', opSymbol.scripts[index], ' '].join('');
          }else{
            return opSymbol.scripts[index] + ' ';
          }
        }
      }
      return it;
    } else {
      return this.parseMathFunction(it);
    }
  },

  parseMathFunction: function (it) {
    this.mathFunction.names.forEach((name, index) => {
      const regExp = new RegExp(name, 'g');
      if(it.match(regExp)){
        it = it.replace(regExp, this.mathFunction.scripts[index] + ' ');
      }
    });
    return it;
  },

  //FIXME COMPLETE ME
  overScript: {
    decimals: [9182],
    templates: [
      "\\overbrace{@v}",
    ]
  },

  //FIXME COMPLETE ME
  underScript: {
    decimals: [9183],
    templates: [
      "\\underbrace{@v}"
    ]
  },

  // sum, integral...
  bigCommand: {
    decimals: [8721, 8719, 8720, 10753, 10754, 10752, 8899, 8898, 10756, 10758, 8897, 8896, 8747, 8750, 8748, 8749, 10764, 8747],
    scripts: [
      "\\sum",
      "\\prod",
      "\\coprod",
      "\\bigoplus",
      "\\bigotimes",
      "\\bigodot",
      "\\bigcup",
      "\\bigcap",
      "\\biguplus",
      "\\bigsqcup",
      "\\bigvee",
      "\\bigwedge",
      "\\int",
      "\\oint",
      "\\iint",
      "\\iiint",
      "\\iiiint",
      "\\idotsint",
    ]
  },

  // mo
  relation: {
    decimals: [60, 62, 61, 8741, 8742, 8804, 8805, 8784, 8781, 8904, 8810, 8811, 8801, 8866, 8867, 8834, 8835, 8776, 8712, 8715, 8838, 8839, 8773, 8995, 8994, 8840, 8841, 8771, 8872, 8713, 8847, 8848, 126, 8764, 8869, 8739, 8849, 8850, 8733, 8826, 8827, 10927, 10928, 8800, 8738, 8737],
    scripts: [
      "<",
      ">",
      "=",
      "\\parallel",
      "\\nparallel",
      "\\leq",
      "\\geq",
      "\\doteq",
      "\\asymp",
      "\\bowtie",
      "\\ll",
      "\\gg",
      "\\equiv",
      "\\vdash",
      "\\dashv",
      "\\subset",
      "\\supset",
      "\\approx",
      "\\in",
      "\\ni",
      "\\subseteq",
      "\\supseteq",
      "\\cong",
      "\\smile",
      "\\frown",
      "\\nsubseteq",
      "\\nsupseteq",
      "\\simeq",
      "\\models",
      "\\notin",
      "\\sqsubset",
      "\\sqsupset",
      "\\sim",
      "\\sim",
      "\\perp",
      "\\mid",
      "\\sqsubseteq",
      "\\sqsupseteq",
      "\\propto",
      "\\prec",
      "\\succ",
      "\\preceq",
      "\\succeq",
      "\\neq",
      "\\sphericalangle",
      "\\measuredangle"
        ]
  },

  // complete
  binaryOperation: {
    decimals: [43, 45, 177, 8745, 8900, 8853, 8723, 8746, 9651, 8854, 215, 8846, 9661, 8855, 247, 8851, 9667, 8856, 8727, 8852, 9657, 8857, 8902, 8744, 9711, 8728, 8224, 8743, 8729, 8726, 8225, 8901, 8768, 10815],
    scripts: [
      "+",
      "-",
      "\\pm",
      "\\cap",
      "\\diamond",
      "\\oplus",
      "\\mp",
      "\\cup",
      "\\bigtriangleup",
      "\\ominus",
      "\\times",
      "\\uplus",
      "\\bigtriangledown",
      "\\otimes",
      "\\div",
      "\\sqcap",
      "\\triangleleft",
      "\\oslash",
      "\\ast",
      "\\sqcup",
      "\\triangleright",
      "\\odot",
      "\\star",
      "\\vee",
      "\\bigcirc",
      "\\circ",
      "\\dagger",
      "\\wedge",
      "\\bullet",
      "\\setminus",
      "\\ddagger",
      "\\cdot",
      "\\wr",
      "\\amalg"
        ]
  },

  setAndLogic: {
    decimals: [8707, 8594, 8594, 8708, 8592, 8592, 8704, 8614, 172, 10233, 8834, 8658, 10233, 8835, 8596, 8712, 10234, 8713, 8660, 8715, 8868, 8743, 8869, 8744, 8709, 8709],
    scripts: [
      "\\exists",
      "\\rightarrow",
      "\\to",
      "\\nexists",
      "\\leftarrow",
      "\\gets",
      "\\forall",
      "\\mapsto",
      "\\neg",
      "\\implies",
      "\\subset",
      "\\Rightarrow",
      "\\implies",
      "\\supset",
      "\\leftrightarrow",
      "\\in",
      "\\iff",
      "\\notin",
      "\\Leftrightarrow",
      "\\ni",
      "\\top",
      "\\land",
      "\\bot",
      "\\lor",
      "\\emptyset",
      "\\varnothing"
        ]
  },

  delimiter: {
    decimals: [124, 8739, 8214, 47, 8726, 123, 125, 10216, 10217, 8593, 8657, 8968, 8969, 8595, 8659, 8970, 8971],
    scripts: [
      "|",
      "\\mid",
      "\\|",
      "/",
      "\\backslash",
      "\\{",
      "\\}",
      "\\langle",
      "\\rangle",
      "\\uparrow",
      "\\Uparrow",
      "\\lceil",
      "\\rceil",
      "\\downarrow",
      "\\Downarrow",
      "\\lfloor",
      "\\rfloor"
    ]
  },

  greekLetter: {
    decimals: [ 913, 945, 925, 957, 914, 946, 926, 958, 915, 947, 927, 959, 916, 948, 928, 960, 982, 917, 1013, 949, 929, 961, 1009, 918, 950, 931, 963, 962, 919, 951, 932, 964, 920, 952, 977, 933, 965, 921, 953, 934, 981, 966, 922, 954, 1008, 935, 967, 923, 955, 936, 968, 924, 956, 937, 969 ],
    scripts: [
      "A"         , "\\alpha"   ,
      "N"         , "\\nu"      ,
      "B"         , "\\beta"    ,
      "\\Xi"      , "\\xi"      ,
      "\\Gamma"   , "\\gamma"   ,
      "O"         , "o"         ,
      "\\Delta"   , "\\delta"   ,
      "\\Pi"      , "\\pi"      , "\\varpi"      ,
      "E"         , "\\epsilon" , "\\varepsilon" ,
      "P"         , "\\rho"     , "\\varrho"     ,
      "Z"         , "\\zeta"    ,
      "\\Sigma"   , "\\sigma"   , "\\varsigma"   ,
      "H"         , "\\eta"     ,
      "T"         , "\\tau"     ,
      "\\Theta"   , "\\theta"   , "\\vartheta"   ,
      "\\Upsilon" , "\\upsilon" ,
      "I"         , "\\iota"    ,
      "\\Phi"     , "\\phi"     , "\\varphi"     ,
      "K"         , "\\kappa"   , "\\varkappa"   ,
      "X"         , "\\chi"     ,
      "\\Lambda"  , "\\lambda"  ,
      "\\Psi"     , "\\psi"     ,
      "M"         , "\\mu"      ,
      "\\Omega"   , "\\omega"
        ]
  },


  other: {
    decimals: [8706, 305, 8476, 8711, 8501, 240, 567, 8465, 9723, 8502, 8463, 8467, 8472, 8734, 8503],
    scripts: [
      "\\partial",
      "\\imath",
      "\\Re",
      "\\nabla",
      "\\aleph",
      "\\eth",
      "\\jmath",
      "\\Im",
      "\\Box",
      "\\beth",
      "\\hbar",
      "\\ell",
      "\\wp",
      "\\infty",
      "\\gimel"
    ]
  },

  // complete
  mathFunction: {

    names: [
      "sin", "arcsin", "sinh", "sec",
      "cos", "arccos", "cosh", "csc",
      "tan", "arctan", "tanh",
      "cot", "arccot", "coth",

      "exp" , "ker"    , "limsup" , "min" ,
      "deg" , "gcd"    , "lg"     , "ln"  ,
      "Pr"  , "sup"    , "det"    , "hom" ,
      "lim" , "log"    , "arg"    , "dim" ,
      "inf" , "liminf" , "max"
    ],
    scripts: [
      "\\sin", "\\arcsin", "\\sinh", "\\sec",
      "\\cos", "\\arccos", "\\cosh", "\\csc",
      "\\tan", "\\arctan", "\\tanh",
      "\\cot", "\\arccot", "\\coth",

      "\\exp" , "\\ker"    , "\\limsup" , "\\min" ,
      "\\deg" , "\\gcd"    , "\\lg"     , "\\ln"  ,
      "\\Pr"  , "\\sup"    , "\\det"    , "\\hom" ,
      "\\lim" , "\\log"    , "\\arg"    , "\\dim" ,
      "\\inf" , "\\liminf" , "\\max"
    ]
  }
};

module.exports = MathSymbol;

},{}],90:[function(require,module,exports){

"use strict";
// latex resource
// https://en.wikibooks.org/wiki/LaTeX/Mathematics
// https://en.wikibooks.org/wiki/LaTeX/Advanced_Mathematics
// https://www.andy-roberts.net/writing/latex/mathematics_1
// https://www.andy-roberts.net/writing/latex/mathematics_2

const Brackets = require('./brackets');
const MathSymbol = require('./math-symbol');
const initMathML2LaTeX = function(Tool){

  function convert(mathmlHtml){
    const math = Tool.parseMath(mathmlHtml);
    return toLatex(parse(math));
  }

  function toLatex(result) {
    // binomial coefficients
    result = result.replace(/\\left\(\\DELETE_BRACKET_L/g, '');
    result = result.replace(/\\DELETE_BRACKET_R\\right\)/g, '');
    result = result.replace(/\\DELETE_BRACKET_L/g, '');
    result = result.replace(/\\DELETE_BRACKET_R/g, '');
    return result;
  }

  function parse(node) {
    const children = Tool.getChildren(node);
    if (!children || children.length === 0) {
      return parseLeaf(node);
    } else {
      return parseContainer(node, children);
    }
  }

  // @see https://www.w3.org/TR/MathML3/chapter7.html
  function parseLeaf(node) {
    let r = '';
    const nodeName = Tool.getNodeName(node);
    switch(nodeName){
      case 'mi': r = parseElementMi(node);
        break;
      case 'mn': r = parseElementMn(node);
        break;
      case 'mo': r = parseOperator(node);
        break;
      case 'ms': r = parseElementMs(node);
        break;
      case 'mtext': r = parseElementMtext(node);
        break;
      case 'mglyph': r = parseElementMglyph(node);
        break;
      case 'mprescripts': r = '';
        break;
      case 'mspace': r = parseElementMspace(node);
      case 'none': r = '\\:';
      //TODO other usecase of 'none' ?
        break;
      default: r = escapeSpecialChars(Tool.getNodeText(node).trim());
        break;
    }
    return r;
  }

  // operator token, mathematical operators
  function parseOperator(node) {
    let it = Tool.getNodeText(node).trim();
    it = MathSymbol.parseOperator(it);
    return escapeSpecialChars(it);
  }

  // Math identifier
  function parseElementMi(node){
    let it = Tool.getNodeText(node).trim();
    it = MathSymbol.parseIdentifier(it);
    return escapeSpecialChars(it);
  }

  // Math Number
  function parseElementMn(node){
    let it = Tool.getNodeText(node).trim();
    return escapeSpecialChars(it);
  }

  // Math String
  function parseElementMs(node){
    const content = Tool.getNodeText(node).trimRight();
    const it = escapeSpecialChars(content);
    return ['"', it, '"'].join('');
  }

  // Math Text
  function parseElementMtext(node){
    const content = Tool.getNodeText(node)
    const it = escapeSpecialChars(content);
    return `\\text{${it}}`;
  }

  // Math glyph (image)
  function parseElementMglyph(node){
    const it = ['"', Tool.getAttr(node, 'alt', ''), '"'].join('');
    return escapeSpecialChars(it);
  }

  // TODO need or not
  function parseElementMspace(node){
    return '';
  }

  function escapeSpecialChars(text) {
    const specialChars = /\$|%|_|&|#|\{|\}/g;
    text = text.replace(specialChars, char => `\\${ char }`);
    return text;
  }


  function parseContainer(node, children) {
    const render = getRender(node);
    if(render){
      return render(node, children);
    } else {
      return parts.join('');
    }
  }

  function renderChildren(children) {
    const parts = [];
    let lefts = [];
    Array.prototype.forEach.call(children, (node) => {
      if(Tool.getNodeName(node) === 'mo'){
        const op = Tool.getNodeText(node).trim();
        if(Brackets.contains(op)){
          let stretchy = Tool.getAttr(node, 'stretchy', 'true');
          stretchy = ['', 'true'].indexOf(stretchy) > -1;
          // 操作符是括號
          if(Brackets.isRight(op)){
            const nearLeft = lefts[lefts.length - 1];
            if(nearLeft){
              if(Brackets.isPair(nearLeft, op)){
                parts.push(Brackets.parseRight(op, stretchy));
                lefts.pop();
              } else {
                // some brackets left side is same as right side.
                if(Brackets.isLeft(op)) {
                  parts.push(Brackets.parseLeft(op, stretchy));
                  lefts.push(op);
                } else {
                  console.error("bracket not match");
                }
              }
            }else{
              // some brackets left side is same as right side.
              if(Brackets.isLeft(op)) {
                parts.push(Brackets.parseLeft(op, stretchy));
                lefts.push(op);
              }else{
                console.error("bracket not match")
              }
            }
          } else {
            parts.push(Brackets.parseLeft(op, stretchy));
            lefts.push(op)
          }
        } else {
          parts.push(parseOperator(node));
        }
      } else {
        parts.push(parse(node));
      }
    });
    // 這裏非常不嚴謹
    if(lefts.length > 0){
      for(let i=0; i < lefts.length; i++){
        parts.push("\\right.");
      }
    }
    lefts = undefined;
    return parts;
  }


  function getRender(node) {
    let render = undefined;
    const nodeName = Tool.getNodeName(node);
    switch(nodeName){
      case 'msub':
        render = getRender_default("@1_{@2}");
        break;
      case 'msup':
        render = getRender_default("@1^{@2}");
        break;
      case 'msubsup':
        render = getRender_default("@1_{@2}^{@3}");
        break;
      case 'mover':
        render = renderMover;
        break;
      case 'munder':
        render = renderMunder;
        break;
      case 'munderover':
        render = getRender_default("@1\\limits_{@2}^{@3}");
        break;
      case 'mmultiscripts':
        render = renderMmultiscripts;
        break;
      case 'mroot':
        render = getRender_default("\\sqrt[@2]{@1}");
        break;
      case 'msqrt':
        render = getRender_joinSeparator("\\sqrt{@content}");
        break;
      case 'mtable':
        render = renderTable;
        break;
      case 'mtr':
        render = getRender_joinSeparator("@content\\\\", ' & ');
        break;
      case 'mtd':
        render = getRender_default("@1");
        break;
      case 'mfrac':
        render = renderMfrac;
        break;
      case 'mfenced':
        render = renderMfenced;
        break;
      case 'mi':
      case 'mn':
      case 'mo':
      case 'ms':
      case 'mtext':
        // they may contains <mglyph>
        render = getRender_joinSeparator("@content");
        break;
      case 'mphantom':
        render = renderMphantom;
        break;
      default:
        // math, mstyle, mrow
        render = getRender_joinSeparator("@content");
        break;
    }
    return render;
  }

  // TODO more test
  function renderTable(node, children) {
    const template = "\\begin{matrix} @content \\end{matrix}";
    const render = getRender_joinSeparator(template);
    return render(node, children);
  }

  function renderMfrac(node, children){
    const [linethickness, bevelled] = [
      Tool.getAttr(node, 'linethickness', 'medium'),
      Tool.getAttr(node, 'bevelled', 'false')
    ]

    let render = null;
    if(bevelled === 'true') {
      render = getRender_default("{}^{@1}/_{@2}");
    } else if(['0', '0px'].indexOf(linethickness) > -1) {
      const [prevNode, nextNode] = [
        Tool.getPrevNode(node),
        Tool.getNextNode(node)
      ];
      if((prevNode && Tool.getNodeText(prevNode).trim() === '(') &&
         (nextNode && Tool.getNodeText(nextNode).trim() === ')')
      ) {
        render = getRender_default("\\DELETE_BRACKET_L\\binom{@1}{@2}\\DELETE_BRACKET_R");
      } else {
        render = getRender_default("{}_{@2}^{@1}");
      }
    } else {
      render = getRender_default("\\frac{@1}{@2}");
    }
    return render(node, children);
  }

  function renderMfenced(node, children){
    const [open, close, separatorsStr] = [
      Tool.getAttr(node, 'open', '('),
      Tool.getAttr(node, 'close', ')'),
      Tool.getAttr(node, 'separators', ',')
    ];
    const [left, right] = [
      Brackets.parseLeft(open),
      Brackets.parseRight(close)
    ];

    const separators = separatorsStr.split('').filter((c) => c.trim().length === 1);
    const template = `${left}@content${right}`;
    const render = getRender_joinSeparators(template, separators);
    return render(node, children);
  }

  function renderMmultiscripts(node, children) {
    if(children.length === 0) { return '' }
    let sepIndex = -1;
    let mprescriptsNode = null;
    Array.prototype.forEach.call(children, (node) => {
      if(Tool.getNodeName(node) === 'mprescripts'){
        mprescriptsNode = node;
      }
    });
    if(mprescriptsNode) {
      sepIndex = Array.prototype.indexOf.call(children, mprescriptsNode);
    }
    const parts = renderChildren(children);

    const splitArray = (arr, index) => {
      return [arr.slice(0, index), arr.slice(index + 1, arr.length)]
    }
    const renderScripts = (items) => {
      if(items.length > 0) {
        const subs = [];
        const sups = [];
        items.forEach((item, index) => {
          // one render as sub script, one as super script
          if((index + 1) % 2 === 0){
            sups.push(item);
          } else {
            subs.push(item);
          }
        });
        return [
          (subs.length > 0 ? `_{${subs.join(' ')}}` : ''),
          (sups.length > 0 ? `^{${sups.join(' ')}}` : '')
        ].join('');
      } else {
        return '';
      }
    }
    const base = parts.shift();
    let prevScripts = [];
    let backScripts = [];
    if(sepIndex === -1){
      backScripts = parts;
    } else {
      [backScripts, prevScripts] = splitArray(parts, sepIndex - 1)
    }
    return [renderScripts(prevScripts), base, renderScripts(backScripts)].join('');
  }

  function renderMover(node, children){
    const nodes = flattenNodeTreeByNodeName(node, 'mover');
    let result = undefined;
    for(let i = 0; i < nodes.length - 1; i++) {
      if(!result){ result = parse(nodes[i]) }
      const over = parse(nodes[i + 1]);
      const template = getMatchValueByChar({
        decimals: MathSymbol.overScript.decimals,
        values: MathSymbol.overScript.templates,
        judgeChar: over,
        defaultValue: "@1\\limits^{@2}"
      })
      result = renderTemplate(template.replace("@v", "@1"), [result, over]);
    }
    return result;
  }

  function renderMunder(node, children){
    const nodes = flattenNodeTreeByNodeName(node, 'munder');
    let result = undefined;
    for(let i = 0; i < nodes.length - 1; i++) {
      if(!result){ result = parse(nodes[i]) }
      const under = parse(nodes[i + 1]);
      const template = getMatchValueByChar({
        decimals: MathSymbol.underScript.decimals,
        values: MathSymbol.underScript.templates,
        judgeChar: under,
        defaultValue: "@1\\limits_{@2}"
      })
      result =  renderTemplate(template.replace("@v", "@1"), [result, under]);
    }
    return result;
  }

  function flattenNodeTreeByNodeName(root, nodeName) {
    let result = [];
    const children = Tool.getChildren(root);
    Array.prototype.forEach.call(children, (node) => {
      if (Tool.getNodeName(node) === nodeName) {
        result = result.concat(flattenNodeTreeByNodeName(node, nodeName, result));
      } else {
        result.push(node);
      }
    });
    return result;
  }


  function getMatchValueByChar(params) {
    const {decimals, values, judgeChar, defaultValue=null} = params;
    if (judgeChar && judgeChar.length === 1) {
      const index = decimals.indexOf(judgeChar.charCodeAt(0));
      if (index > -1) {
        return values[index];
      }
    }
    return defaultValue;
  }

  // https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mphantom
  // FIXME :)
  function renderMphantom(node, children) {
      return '';
  }



  function getRender_default(template) {
    return function(node, children) {
      const parts = renderChildren(children);
      return renderTemplate(template, parts)
    }
  }

  function renderTemplate(template, values) {
    return template.replace(/\@\d+/g, (m) => {
      const idx = parseInt(m.substring(1, m.length)) - 1;
      return values[idx];
    });
  }

  function getRender_joinSeparator(template, separator = '') {
    return function(node, children) {
      const parts = renderChildren(children);
      return template.replace("@content", parts.join(separator));
    }
  }

  function getRender_joinSeparators(template, separators) {
    return function(node, children) {
      const parts = renderChildren(children);
      let content = '';
      if(separators.length === 0){
        content = parts.join('');
      } else {
        content =  parts.reduce((accumulator, part, index) => {
          accumulator += part;
          if(index < parts.length - 1){
            accumulator += (separators[index] || separators[separators.length - 1]);
          }
          return accumulator;
        }, '');
      }
      return template.replace("@content", content);
    }
  }

  return {convert: convert}
};

module.exports = initMathML2LaTeX;

},{"./brackets":86,"./math-symbol":89}],91:[function(require,module,exports){
function DOMParser(options){
	this.options = options ||{locator:{}};
	
}

DOMParser.prototype.parseFromString = function(source,mimeType){
	var options = this.options;
	var sax =  new XMLReader();
	var domBuilder = options.domBuilder || new DOMHandler();//contentHandler and LexicalHandler
	var errorHandler = options.errorHandler;
	var locator = options.locator;
	var defaultNSMap = options.xmlns||{};
	var isHTML = /\/x?html?$/.test(mimeType);//mimeType.toLowerCase().indexOf('html') > -1;
  	var entityMap = isHTML?htmlEntity.entityMap:{'lt':'<','gt':'>','amp':'&','quot':'"','apos':"'"};
	if(locator){
		domBuilder.setDocumentLocator(locator)
	}
	
	sax.errorHandler = buildErrorHandler(errorHandler,domBuilder,locator);
	sax.domBuilder = options.domBuilder || domBuilder;
	if(isHTML){
		defaultNSMap['']= 'http://www.w3.org/1999/xhtml';
	}
	defaultNSMap.xml = defaultNSMap.xml || 'http://www.w3.org/XML/1998/namespace';
	if(source){
		sax.parse(source,defaultNSMap,entityMap);
	}else{
		sax.errorHandler.error("invalid doc source");
	}
	return domBuilder.doc;
}
function buildErrorHandler(errorImpl,domBuilder,locator){
	if(!errorImpl){
		if(domBuilder instanceof DOMHandler){
			return domBuilder;
		}
		errorImpl = domBuilder ;
	}
	var errorHandler = {}
	var isCallback = errorImpl instanceof Function;
	locator = locator||{}
	function build(key){
		var fn = errorImpl[key];
		if(!fn && isCallback){
			fn = errorImpl.length == 2?function(msg){errorImpl(key,msg)}:errorImpl;
		}
		errorHandler[key] = fn && function(msg){
			fn('[xmldom '+key+']\t'+msg+_locator(locator));
		}||function(){};
	}
	build('warning');
	build('error');
	build('fatalError');
	return errorHandler;
}

//console.log('#\n\n\n\n\n\n\n####')
/**
 * +ContentHandler+ErrorHandler
 * +LexicalHandler+EntityResolver2
 * -DeclHandler-DTDHandler 
 * 
 * DefaultHandler:EntityResolver, DTDHandler, ContentHandler, ErrorHandler
 * DefaultHandler2:DefaultHandler,LexicalHandler, DeclHandler, EntityResolver2
 * @link http://www.saxproject.org/apidoc/org/xml/sax/helpers/DefaultHandler.html
 */
function DOMHandler() {
    this.cdata = false;
}
function position(locator,node){
	node.lineNumber = locator.lineNumber;
	node.columnNumber = locator.columnNumber;
}
/**
 * @see org.xml.sax.ContentHandler#startDocument
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ContentHandler.html
 */ 
DOMHandler.prototype = {
	startDocument : function() {
    	this.doc = new DOMImplementation().createDocument(null, null, null);
    	if (this.locator) {
        	this.doc.documentURI = this.locator.systemId;
    	}
	},
	startElement:function(namespaceURI, localName, qName, attrs) {
		var doc = this.doc;
	    var el = doc.createElementNS(namespaceURI, qName||localName);
	    var len = attrs.length;
	    appendElement(this, el);
	    this.currentElement = el;
	    
		this.locator && position(this.locator,el)
	    for (var i = 0 ; i < len; i++) {
	        var namespaceURI = attrs.getURI(i);
	        var value = attrs.getValue(i);
	        var qName = attrs.getQName(i);
			var attr = doc.createAttributeNS(namespaceURI, qName);
			this.locator &&position(attrs.getLocator(i),attr);
			attr.value = attr.nodeValue = value;
			el.setAttributeNode(attr)
	    }
	},
	endElement:function(namespaceURI, localName, qName) {
		var current = this.currentElement
		var tagName = current.tagName;
		this.currentElement = current.parentNode;
	},
	startPrefixMapping:function(prefix, uri) {
	},
	endPrefixMapping:function(prefix) {
	},
	processingInstruction:function(target, data) {
	    var ins = this.doc.createProcessingInstruction(target, data);
	    this.locator && position(this.locator,ins)
	    appendElement(this, ins);
	},
	ignorableWhitespace:function(ch, start, length) {
	},
	characters:function(chars, start, length) {
		chars = _toString.apply(this,arguments)
		//console.log(chars)
		if(chars){
			if (this.cdata) {
				var charNode = this.doc.createCDATASection(chars);
			} else {
				var charNode = this.doc.createTextNode(chars);
			}
			if(this.currentElement){
				this.currentElement.appendChild(charNode);
			}else if(/^\s*$/.test(chars)){
				this.doc.appendChild(charNode);
				//process xml
			}
			this.locator && position(this.locator,charNode)
		}
	},
	skippedEntity:function(name) {
	},
	endDocument:function() {
		this.doc.normalize();
	},
	setDocumentLocator:function (locator) {
	    if(this.locator = locator){// && !('lineNumber' in locator)){
	    	locator.lineNumber = 0;
	    }
	},
	//LexicalHandler
	comment:function(chars, start, length) {
		chars = _toString.apply(this,arguments)
	    var comm = this.doc.createComment(chars);
	    this.locator && position(this.locator,comm)
	    appendElement(this, comm);
	},
	
	startCDATA:function() {
	    //used in characters() methods
	    this.cdata = true;
	},
	endCDATA:function() {
	    this.cdata = false;
	},
	
	startDTD:function(name, publicId, systemId) {
		var impl = this.doc.implementation;
	    if (impl && impl.createDocumentType) {
	        var dt = impl.createDocumentType(name, publicId, systemId);
	        this.locator && position(this.locator,dt)
	        appendElement(this, dt);
	    }
	},
	/**
	 * @see org.xml.sax.ErrorHandler
	 * @link http://www.saxproject.org/apidoc/org/xml/sax/ErrorHandler.html
	 */
	warning:function(error) {
		console.warn('[xmldom warning]\t'+error,_locator(this.locator));
	},
	error:function(error) {
		console.error('[xmldom error]\t'+error,_locator(this.locator));
	},
	fatalError:function(error) {
		console.error('[xmldom fatalError]\t'+error,_locator(this.locator));
	    throw error;
	}
}
function _locator(l){
	if(l){
		return '\n@'+(l.systemId ||'')+'#[line:'+l.lineNumber+',col:'+l.columnNumber+']'
	}
}
function _toString(chars,start,length){
	if(typeof chars == 'string'){
		return chars.substr(start,length)
	}else{//java sax connect width xmldom on rhino(what about: "? && !(chars instanceof String)")
		if(chars.length >= start+length || start){
			return new java.lang.String(chars,start,length)+'';
		}
		return chars;
	}
}

/*
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/LexicalHandler.html
 * used method of org.xml.sax.ext.LexicalHandler:
 *  #comment(chars, start, length)
 *  #startCDATA()
 *  #endCDATA()
 *  #startDTD(name, publicId, systemId)
 *
 *
 * IGNORED method of org.xml.sax.ext.LexicalHandler:
 *  #endDTD()
 *  #startEntity(name)
 *  #endEntity(name)
 *
 *
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/DeclHandler.html
 * IGNORED method of org.xml.sax.ext.DeclHandler
 * 	#attributeDecl(eName, aName, type, mode, value)
 *  #elementDecl(name, model)
 *  #externalEntityDecl(name, publicId, systemId)
 *  #internalEntityDecl(name, value)
 * @link http://www.saxproject.org/apidoc/org/xml/sax/ext/EntityResolver2.html
 * IGNORED method of org.xml.sax.EntityResolver2
 *  #resolveEntity(String name,String publicId,String baseURI,String systemId)
 *  #resolveEntity(publicId, systemId)
 *  #getExternalSubset(name, baseURI)
 * @link http://www.saxproject.org/apidoc/org/xml/sax/DTDHandler.html
 * IGNORED method of org.xml.sax.DTDHandler
 *  #notationDecl(name, publicId, systemId) {};
 *  #unparsedEntityDecl(name, publicId, systemId, notationName) {};
 */
"endDTD,startEntity,endEntity,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,resolveEntity,getExternalSubset,notationDecl,unparsedEntityDecl".replace(/\w+/g,function(key){
	DOMHandler.prototype[key] = function(){return null}
})

/* Private static helpers treated below as private instance methods, so don't need to add these to the public API; we might use a Relator to also get rid of non-standard public properties */
function appendElement (hander,node) {
    if (!hander.currentElement) {
        hander.doc.appendChild(node);
    } else {
        hander.currentElement.appendChild(node);
    }
}//appendChild and setAttributeNS are preformance key

//if(typeof require == 'function'){
var htmlEntity = require('./entities');
var XMLReader = require('./sax').XMLReader;
var DOMImplementation = exports.DOMImplementation = require('./dom').DOMImplementation;
exports.XMLSerializer = require('./dom').XMLSerializer ;
exports.DOMParser = DOMParser;
//}

},{"./dom":92,"./entities":93,"./sax":94}],92:[function(require,module,exports){
/*
 * DOM Level 2
 * Object DOMException
 * @see http://www.w3.org/TR/REC-DOM-Level-1/ecma-script-language-binding.html
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/ecma-script-binding.html
 */

function copy(src,dest){
	for(var p in src){
		dest[p] = src[p];
	}
}
/**
^\w+\.prototype\.([_\w]+)\s*=\s*((?:.*\{\s*?[\r\n][\s\S]*?^})|\S.*?(?=[;\r\n]));?
^\w+\.prototype\.([_\w]+)\s*=\s*(\S.*?(?=[;\r\n]));?
 */
function _extends(Class,Super){
	var pt = Class.prototype;
	if(!(pt instanceof Super)){
		function t(){};
		t.prototype = Super.prototype;
		t = new t();
		copy(pt,t);
		Class.prototype = pt = t;
	}
	if(pt.constructor != Class){
		if(typeof Class != 'function'){
			console.error("unknow Class:"+Class)
		}
		pt.constructor = Class
	}
}
var htmlns = 'http://www.w3.org/1999/xhtml' ;
// Node Types
var NodeType = {}
var ELEMENT_NODE                = NodeType.ELEMENT_NODE                = 1;
var ATTRIBUTE_NODE              = NodeType.ATTRIBUTE_NODE              = 2;
var TEXT_NODE                   = NodeType.TEXT_NODE                   = 3;
var CDATA_SECTION_NODE          = NodeType.CDATA_SECTION_NODE          = 4;
var ENTITY_REFERENCE_NODE       = NodeType.ENTITY_REFERENCE_NODE       = 5;
var ENTITY_NODE                 = NodeType.ENTITY_NODE                 = 6;
var PROCESSING_INSTRUCTION_NODE = NodeType.PROCESSING_INSTRUCTION_NODE = 7;
var COMMENT_NODE                = NodeType.COMMENT_NODE                = 8;
var DOCUMENT_NODE               = NodeType.DOCUMENT_NODE               = 9;
var DOCUMENT_TYPE_NODE          = NodeType.DOCUMENT_TYPE_NODE          = 10;
var DOCUMENT_FRAGMENT_NODE      = NodeType.DOCUMENT_FRAGMENT_NODE      = 11;
var NOTATION_NODE               = NodeType.NOTATION_NODE               = 12;

// ExceptionCode
var ExceptionCode = {}
var ExceptionMessage = {};
var INDEX_SIZE_ERR              = ExceptionCode.INDEX_SIZE_ERR              = ((ExceptionMessage[1]="Index size error"),1);
var DOMSTRING_SIZE_ERR          = ExceptionCode.DOMSTRING_SIZE_ERR          = ((ExceptionMessage[2]="DOMString size error"),2);
var HIERARCHY_REQUEST_ERR       = ExceptionCode.HIERARCHY_REQUEST_ERR       = ((ExceptionMessage[3]="Hierarchy request error"),3);
var WRONG_DOCUMENT_ERR          = ExceptionCode.WRONG_DOCUMENT_ERR          = ((ExceptionMessage[4]="Wrong document"),4);
var INVALID_CHARACTER_ERR       = ExceptionCode.INVALID_CHARACTER_ERR       = ((ExceptionMessage[5]="Invalid character"),5);
var NO_DATA_ALLOWED_ERR         = ExceptionCode.NO_DATA_ALLOWED_ERR         = ((ExceptionMessage[6]="No data allowed"),6);
var NO_MODIFICATION_ALLOWED_ERR = ExceptionCode.NO_MODIFICATION_ALLOWED_ERR = ((ExceptionMessage[7]="No modification allowed"),7);
var NOT_FOUND_ERR               = ExceptionCode.NOT_FOUND_ERR               = ((ExceptionMessage[8]="Not found"),8);
var NOT_SUPPORTED_ERR           = ExceptionCode.NOT_SUPPORTED_ERR           = ((ExceptionMessage[9]="Not supported"),9);
var INUSE_ATTRIBUTE_ERR         = ExceptionCode.INUSE_ATTRIBUTE_ERR         = ((ExceptionMessage[10]="Attribute in use"),10);
//level2
var INVALID_STATE_ERR        	= ExceptionCode.INVALID_STATE_ERR        	= ((ExceptionMessage[11]="Invalid state"),11);
var SYNTAX_ERR               	= ExceptionCode.SYNTAX_ERR               	= ((ExceptionMessage[12]="Syntax error"),12);
var INVALID_MODIFICATION_ERR 	= ExceptionCode.INVALID_MODIFICATION_ERR 	= ((ExceptionMessage[13]="Invalid modification"),13);
var NAMESPACE_ERR            	= ExceptionCode.NAMESPACE_ERR           	= ((ExceptionMessage[14]="Invalid namespace"),14);
var INVALID_ACCESS_ERR       	= ExceptionCode.INVALID_ACCESS_ERR      	= ((ExceptionMessage[15]="Invalid access"),15);


function DOMException(code, message) {
	if(message instanceof Error){
		var error = message;
	}else{
		error = this;
		Error.call(this, ExceptionMessage[code]);
		this.message = ExceptionMessage[code];
		if(Error.captureStackTrace) Error.captureStackTrace(this, DOMException);
	}
	error.code = code;
	if(message) this.message = this.message + ": " + message;
	return error;
};
DOMException.prototype = Error.prototype;
copy(ExceptionCode,DOMException)
/**
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-536297177
 * The NodeList interface provides the abstraction of an ordered collection of nodes, without defining or constraining how this collection is implemented. NodeList objects in the DOM are live.
 * The items in the NodeList are accessible via an integral index, starting from 0.
 */
function NodeList() {
};
NodeList.prototype = {
	/**
	 * The number of nodes in the list. The range of valid child node indices is 0 to length-1 inclusive.
	 * @standard level1
	 */
	length:0, 
	/**
	 * Returns the indexth item in the collection. If index is greater than or equal to the number of nodes in the list, this returns null.
	 * @standard level1
	 * @param index  unsigned long 
	 *   Index into the collection.
	 * @return Node
	 * 	The node at the indexth position in the NodeList, or null if that is not a valid index. 
	 */
	item: function(index) {
		return this[index] || null;
	},
	toString:function(isHTML,nodeFilter){
		for(var buf = [], i = 0;i<this.length;i++){
			serializeToString(this[i],buf,isHTML,nodeFilter);
		}
		return buf.join('');
	}
};
function LiveNodeList(node,refresh){
	this._node = node;
	this._refresh = refresh
	_updateLiveList(this);
}
function _updateLiveList(list){
	var inc = list._node._inc || list._node.ownerDocument._inc;
	if(list._inc != inc){
		var ls = list._refresh(list._node);
		//console.log(ls.length)
		__set__(list,'length',ls.length);
		copy(ls,list);
		list._inc = inc;
	}
}
LiveNodeList.prototype.item = function(i){
	_updateLiveList(this);
	return this[i];
}

_extends(LiveNodeList,NodeList);
/**
 * 
 * Objects implementing the NamedNodeMap interface are used to represent collections of nodes that can be accessed by name. Note that NamedNodeMap does not inherit from NodeList; NamedNodeMaps are not maintained in any particular order. Objects contained in an object implementing NamedNodeMap may also be accessed by an ordinal index, but this is simply to allow convenient enumeration of the contents of a NamedNodeMap, and does not imply that the DOM specifies an order to these Nodes.
 * NamedNodeMap objects in the DOM are live.
 * used for attributes or DocumentType entities 
 */
function NamedNodeMap() {
};

function _findNodeIndex(list,node){
	var i = list.length;
	while(i--){
		if(list[i] === node){return i}
	}
}

function _addNamedNode(el,list,newAttr,oldAttr){
	if(oldAttr){
		list[_findNodeIndex(list,oldAttr)] = newAttr;
	}else{
		list[list.length++] = newAttr;
	}
	if(el){
		newAttr.ownerElement = el;
		var doc = el.ownerDocument;
		if(doc){
			oldAttr && _onRemoveAttribute(doc,el,oldAttr);
			_onAddAttribute(doc,el,newAttr);
		}
	}
}
function _removeNamedNode(el,list,attr){
	//console.log('remove attr:'+attr)
	var i = _findNodeIndex(list,attr);
	if(i>=0){
		var lastIndex = list.length-1
		while(i<lastIndex){
			list[i] = list[++i]
		}
		list.length = lastIndex;
		if(el){
			var doc = el.ownerDocument;
			if(doc){
				_onRemoveAttribute(doc,el,attr);
				attr.ownerElement = null;
			}
		}
	}else{
		throw DOMException(NOT_FOUND_ERR,new Error(el.tagName+'@'+attr))
	}
}
NamedNodeMap.prototype = {
	length:0,
	item:NodeList.prototype.item,
	getNamedItem: function(key) {
//		if(key.indexOf(':')>0 || key == 'xmlns'){
//			return null;
//		}
		//console.log()
		var i = this.length;
		while(i--){
			var attr = this[i];
			//console.log(attr.nodeName,key)
			if(attr.nodeName == key){
				return attr;
			}
		}
	},
	setNamedItem: function(attr) {
		var el = attr.ownerElement;
		if(el && el!=this._ownerElement){
			throw new DOMException(INUSE_ATTRIBUTE_ERR);
		}
		var oldAttr = this.getNamedItem(attr.nodeName);
		_addNamedNode(this._ownerElement,this,attr,oldAttr);
		return oldAttr;
	},
	/* returns Node */
	setNamedItemNS: function(attr) {// raises: WRONG_DOCUMENT_ERR,NO_MODIFICATION_ALLOWED_ERR,INUSE_ATTRIBUTE_ERR
		var el = attr.ownerElement, oldAttr;
		if(el && el!=this._ownerElement){
			throw new DOMException(INUSE_ATTRIBUTE_ERR);
		}
		oldAttr = this.getNamedItemNS(attr.namespaceURI,attr.localName);
		_addNamedNode(this._ownerElement,this,attr,oldAttr);
		return oldAttr;
	},

	/* returns Node */
	removeNamedItem: function(key) {
		var attr = this.getNamedItem(key);
		_removeNamedNode(this._ownerElement,this,attr);
		return attr;
		
		
	},// raises: NOT_FOUND_ERR,NO_MODIFICATION_ALLOWED_ERR
	
	//for level2
	removeNamedItemNS:function(namespaceURI,localName){
		var attr = this.getNamedItemNS(namespaceURI,localName);
		_removeNamedNode(this._ownerElement,this,attr);
		return attr;
	},
	getNamedItemNS: function(namespaceURI, localName) {
		var i = this.length;
		while(i--){
			var node = this[i];
			if(node.localName == localName && node.namespaceURI == namespaceURI){
				return node;
			}
		}
		return null;
	}
};
/**
 * @see http://www.w3.org/TR/REC-DOM-Level-1/level-one-core.html#ID-102161490
 */
function DOMImplementation(/* Object */ features) {
	this._features = {};
	if (features) {
		for (var feature in features) {
			 this._features = features[feature];
		}
	}
};

DOMImplementation.prototype = {
	hasFeature: function(/* string */ feature, /* string */ version) {
		var versions = this._features[feature.toLowerCase()];
		if (versions && (!version || version in versions)) {
			return true;
		} else {
			return false;
		}
	},
	// Introduced in DOM Level 2:
	createDocument:function(namespaceURI,  qualifiedName, doctype){// raises:INVALID_CHARACTER_ERR,NAMESPACE_ERR,WRONG_DOCUMENT_ERR
		var doc = new Document();
		doc.implementation = this;
		doc.childNodes = new NodeList();
		doc.doctype = doctype;
		if(doctype){
			doc.appendChild(doctype);
		}
		if(qualifiedName){
			var root = doc.createElementNS(namespaceURI,qualifiedName);
			doc.appendChild(root);
		}
		return doc;
	},
	// Introduced in DOM Level 2:
	createDocumentType:function(qualifiedName, publicId, systemId){// raises:INVALID_CHARACTER_ERR,NAMESPACE_ERR
		var node = new DocumentType();
		node.name = qualifiedName;
		node.nodeName = qualifiedName;
		node.publicId = publicId;
		node.systemId = systemId;
		// Introduced in DOM Level 2:
		//readonly attribute DOMString        internalSubset;
		
		//TODO:..
		//  readonly attribute NamedNodeMap     entities;
		//  readonly attribute NamedNodeMap     notations;
		return node;
	}
};


/**
 * @see http://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/core.html#ID-1950641247
 */

function Node() {
};

Node.prototype = {
	firstChild : null,
	lastChild : null,
	previousSibling : null,
	nextSibling : null,
	attributes : null,
	parentNode : null,
	childNodes : null,
	ownerDocument : null,
	nodeValue : null,
	namespaceURI : null,
	prefix : null,
	localName : null,
	// Modified in DOM Level 2:
	insertBefore:function(newChild, refChild){//raises 
		return _insertBefore(this,newChild,refChild);
	},
	replaceChild:function(newChild, oldChild){//raises 
		this.insertBefore(newChild,oldChild);
		if(oldChild){
			this.removeChild(oldChild);
		}
	},
	removeChild:function(oldChild){
		return _removeChild(this,oldChild);
	},
	appendChild:function(newChild){
		return this.insertBefore(newChild,null);
	},
	hasChildNodes:function(){
		return this.firstChild != null;
	},
	cloneNode:function(deep){
		return cloneNode(this.ownerDocument||this,this,deep);
	},
	// Modified in DOM Level 2:
	normalize:function(){
		var child = this.firstChild;
		while(child){
			var next = child.nextSibling;
			if(next && next.nodeType == TEXT_NODE && child.nodeType == TEXT_NODE){
				this.removeChild(next);
				child.appendData(next.data);
			}else{
				child.normalize();
				child = next;
			}
		}
	},
  	// Introduced in DOM Level 2:
	isSupported:function(feature, version){
		return this.ownerDocument.implementation.hasFeature(feature,version);
	},
    // Introduced in DOM Level 2:
    hasAttributes:function(){
    	return this.attributes.length>0;
    },
    lookupPrefix:function(namespaceURI){
    	var el = this;
    	while(el){
    		var map = el._nsMap;
    		//console.dir(map)
    		if(map){
    			for(var n in map){
    				if(map[n] == namespaceURI){
    					return n;
    				}
    			}
    		}
    		el = el.nodeType == ATTRIBUTE_NODE?el.ownerDocument : el.parentNode;
    	}
    	return null;
    },
    // Introduced in DOM Level 3:
    lookupNamespaceURI:function(prefix){
    	var el = this;
    	while(el){
    		var map = el._nsMap;
    		//console.dir(map)
    		if(map){
    			if(prefix in map){
    				return map[prefix] ;
    			}
    		}
    		el = el.nodeType == ATTRIBUTE_NODE?el.ownerDocument : el.parentNode;
    	}
    	return null;
    },
    // Introduced in DOM Level 3:
    isDefaultNamespace:function(namespaceURI){
    	var prefix = this.lookupPrefix(namespaceURI);
    	return prefix == null;
    }
};


function _xmlEncoder(c){
	return c == '<' && '&lt;' ||
         c == '>' && '&gt;' ||
         c == '&' && '&amp;' ||
         c == '"' && '&quot;' ||
         '&#'+c.charCodeAt()+';'
}


copy(NodeType,Node);
copy(NodeType,Node.prototype);

/**
 * @param callback return true for continue,false for break
 * @return boolean true: break visit;
 */
function _visitNode(node,callback){
	if(callback(node)){
		return true;
	}
	if(node = node.firstChild){
		do{
			if(_visitNode(node,callback)){return true}
        }while(node=node.nextSibling)
    }
}



function Document(){
}
function _onAddAttribute(doc,el,newAttr){
	doc && doc._inc++;
	var ns = newAttr.namespaceURI ;
	if(ns == 'http://www.w3.org/2000/xmlns/'){
		//update namespace
		el._nsMap[newAttr.prefix?newAttr.localName:''] = newAttr.value
	}
}
function _onRemoveAttribute(doc,el,newAttr,remove){
	doc && doc._inc++;
	var ns = newAttr.namespaceURI ;
	if(ns == 'http://www.w3.org/2000/xmlns/'){
		//update namespace
		delete el._nsMap[newAttr.prefix?newAttr.localName:'']
	}
}
function _onUpdateChild(doc,el,newChild){
	if(doc && doc._inc){
		doc._inc++;
		//update childNodes
		var cs = el.childNodes;
		if(newChild){
			cs[cs.length++] = newChild;
		}else{
			//console.log(1)
			var child = el.firstChild;
			var i = 0;
			while(child){
				cs[i++] = child;
				child =child.nextSibling;
			}
			cs.length = i;
		}
	}
}

/**
 * attributes;
 * children;
 * 
 * writeable properties:
 * nodeValue,Attr:value,CharacterData:data
 * prefix
 */
function _removeChild(parentNode,child){
	var previous = child.previousSibling;
	var next = child.nextSibling;
	if(previous){
		previous.nextSibling = next;
	}else{
		parentNode.firstChild = next
	}
	if(next){
		next.previousSibling = previous;
	}else{
		parentNode.lastChild = previous;
	}
	_onUpdateChild(parentNode.ownerDocument,parentNode);
	return child;
}
/**
 * preformance key(refChild == null)
 */
function _insertBefore(parentNode,newChild,nextChild){
	var cp = newChild.parentNode;
	if(cp){
		cp.removeChild(newChild);//remove and update
	}
	if(newChild.nodeType === DOCUMENT_FRAGMENT_NODE){
		var newFirst = newChild.firstChild;
		if (newFirst == null) {
			return newChild;
		}
		var newLast = newChild.lastChild;
	}else{
		newFirst = newLast = newChild;
	}
	var pre = nextChild ? nextChild.previousSibling : parentNode.lastChild;

	newFirst.previousSibling = pre;
	newLast.nextSibling = nextChild;
	
	
	if(pre){
		pre.nextSibling = newFirst;
	}else{
		parentNode.firstChild = newFirst;
	}
	if(nextChild == null){
		parentNode.lastChild = newLast;
	}else{
		nextChild.previousSibling = newLast;
	}
	do{
		newFirst.parentNode = parentNode;
	}while(newFirst !== newLast && (newFirst= newFirst.nextSibling))
	_onUpdateChild(parentNode.ownerDocument||parentNode,parentNode);
	//console.log(parentNode.lastChild.nextSibling == null)
	if (newChild.nodeType == DOCUMENT_FRAGMENT_NODE) {
		newChild.firstChild = newChild.lastChild = null;
	}
	return newChild;
}
function _appendSingleChild(parentNode,newChild){
	var cp = newChild.parentNode;
	if(cp){
		var pre = parentNode.lastChild;
		cp.removeChild(newChild);//remove and update
		var pre = parentNode.lastChild;
	}
	var pre = parentNode.lastChild;
	newChild.parentNode = parentNode;
	newChild.previousSibling = pre;
	newChild.nextSibling = null;
	if(pre){
		pre.nextSibling = newChild;
	}else{
		parentNode.firstChild = newChild;
	}
	parentNode.lastChild = newChild;
	_onUpdateChild(parentNode.ownerDocument,parentNode,newChild);
	return newChild;
	//console.log("__aa",parentNode.lastChild.nextSibling == null)
}
Document.prototype = {
	//implementation : null,
	nodeName :  '#document',
	nodeType :  DOCUMENT_NODE,
	doctype :  null,
	documentElement :  null,
	_inc : 1,
	
	insertBefore :  function(newChild, refChild){//raises 
		if(newChild.nodeType == DOCUMENT_FRAGMENT_NODE){
			var child = newChild.firstChild;
			while(child){
				var next = child.nextSibling;
				this.insertBefore(child,refChild);
				child = next;
			}
			return newChild;
		}
		if(this.documentElement == null && newChild.nodeType == ELEMENT_NODE){
			this.documentElement = newChild;
		}
		
		return _insertBefore(this,newChild,refChild),(newChild.ownerDocument = this),newChild;
	},
	removeChild :  function(oldChild){
		if(this.documentElement == oldChild){
			this.documentElement = null;
		}
		return _removeChild(this,oldChild);
	},
	// Introduced in DOM Level 2:
	importNode : function(importedNode,deep){
		return importNode(this,importedNode,deep);
	},
	// Introduced in DOM Level 2:
	getElementById :	function(id){
		var rtv = null;
		_visitNode(this.documentElement,function(node){
			if(node.nodeType == ELEMENT_NODE){
				if(node.getAttribute('id') == id){
					rtv = node;
					return true;
				}
			}
		})
		return rtv;
	},
	
	//document factory method:
	createElement :	function(tagName){
		var node = new Element();
		node.ownerDocument = this;
		node.nodeName = tagName;
		node.tagName = tagName;
		node.childNodes = new NodeList();
		var attrs	= node.attributes = new NamedNodeMap();
		attrs._ownerElement = node;
		return node;
	},
	createDocumentFragment :	function(){
		var node = new DocumentFragment();
		node.ownerDocument = this;
		node.childNodes = new NodeList();
		return node;
	},
	createTextNode :	function(data){
		var node = new Text();
		node.ownerDocument = this;
		node.appendData(data)
		return node;
	},
	createComment :	function(data){
		var node = new Comment();
		node.ownerDocument = this;
		node.appendData(data)
		return node;
	},
	createCDATASection :	function(data){
		var node = new CDATASection();
		node.ownerDocument = this;
		node.appendData(data)
		return node;
	},
	createProcessingInstruction :	function(target,data){
		var node = new ProcessingInstruction();
		node.ownerDocument = this;
		node.tagName = node.target = target;
		node.nodeValue= node.data = data;
		return node;
	},
	createAttribute :	function(name){
		var node = new Attr();
		node.ownerDocument	= this;
		node.name = name;
		node.nodeName	= name;
		node.localName = name;
		node.specified = true;
		return node;
	},
	createEntityReference :	function(name){
		var node = new EntityReference();
		node.ownerDocument	= this;
		node.nodeName	= name;
		return node;
	},
	// Introduced in DOM Level 2:
	createElementNS :	function(namespaceURI,qualifiedName){
		var node = new Element();
		var pl = qualifiedName.split(':');
		var attrs	= node.attributes = new NamedNodeMap();
		node.childNodes = new NodeList();
		node.ownerDocument = this;
		node.nodeName = qualifiedName;
		node.tagName = qualifiedName;
		node.namespaceURI = namespaceURI;
		if(pl.length == 2){
			node.prefix = pl[0];
			node.localName = pl[1];
		}else{
			//el.prefix = null;
			node.localName = qualifiedName;
		}
		attrs._ownerElement = node;
		return node;
	},
	// Introduced in DOM Level 2:
	createAttributeNS :	function(namespaceURI,qualifiedName){
		var node = new Attr();
		var pl = qualifiedName.split(':');
		node.ownerDocument = this;
		node.nodeName = qualifiedName;
		node.name = qualifiedName;
		node.namespaceURI = namespaceURI;
		node.specified = true;
		if(pl.length == 2){
			node.prefix = pl[0];
			node.localName = pl[1];
		}else{
			//el.prefix = null;
			node.localName = qualifiedName;
		}
		return node;
	}
};
_extends(Document,Node);


function Element() {
	this._nsMap = {};
};
Element.prototype = {
	nodeType : ELEMENT_NODE,
	hasAttribute : function(name){
		return this.getAttributeNode(name)!=null;
	},
	getAttribute : function(name){
		var attr = this.getAttributeNode(name);
		return attr && attr.value || '';
	},
	getAttributeNode : function(name){
		return this.attributes.getNamedItem(name);
	},
	setAttribute : function(name, value){
		var attr = this.ownerDocument.createAttribute(name);
		attr.value = attr.nodeValue = "" + value;
		this.setAttributeNode(attr)
	},
	removeAttribute : function(name){
		var attr = this.getAttributeNode(name)
		attr && this.removeAttributeNode(attr);
	},
	
	//four real opeartion method
	appendChild:function(newChild){
		if(newChild.nodeType === DOCUMENT_FRAGMENT_NODE){
			return this.insertBefore(newChild,null);
		}else{
			return _appendSingleChild(this,newChild);
		}
	},
	setAttributeNode : function(newAttr){
		return this.attributes.setNamedItem(newAttr);
	},
	setAttributeNodeNS : function(newAttr){
		return this.attributes.setNamedItemNS(newAttr);
	},
	removeAttributeNode : function(oldAttr){
		//console.log(this == oldAttr.ownerElement)
		return this.attributes.removeNamedItem(oldAttr.nodeName);
	},
	//get real attribute name,and remove it by removeAttributeNode
	removeAttributeNS : function(namespaceURI, localName){
		var old = this.getAttributeNodeNS(namespaceURI, localName);
		old && this.removeAttributeNode(old);
	},
	
	hasAttributeNS : function(namespaceURI, localName){
		return this.getAttributeNodeNS(namespaceURI, localName)!=null;
	},
	getAttributeNS : function(namespaceURI, localName){
		var attr = this.getAttributeNodeNS(namespaceURI, localName);
		return attr && attr.value || '';
	},
	setAttributeNS : function(namespaceURI, qualifiedName, value){
		var attr = this.ownerDocument.createAttributeNS(namespaceURI, qualifiedName);
		attr.value = attr.nodeValue = "" + value;
		this.setAttributeNode(attr)
	},
	getAttributeNodeNS : function(namespaceURI, localName){
		return this.attributes.getNamedItemNS(namespaceURI, localName);
	},
	
	getElementsByTagName : function(tagName){
		return new LiveNodeList(this,function(base){
			var ls = [];
			_visitNode(base,function(node){
				if(node !== base && node.nodeType == ELEMENT_NODE && (tagName === '*' || node.tagName == tagName)){
					ls.push(node);
				}
			});
			return ls;
		});
	},
	getElementsByTagNameNS : function(namespaceURI, localName){
		return new LiveNodeList(this,function(base){
			var ls = [];
			_visitNode(base,function(node){
				if(node !== base && node.nodeType === ELEMENT_NODE && (namespaceURI === '*' || node.namespaceURI === namespaceURI) && (localName === '*' || node.localName == localName)){
					ls.push(node);
				}
			});
			return ls;
			
		});
	}
};
Document.prototype.getElementsByTagName = Element.prototype.getElementsByTagName;
Document.prototype.getElementsByTagNameNS = Element.prototype.getElementsByTagNameNS;


_extends(Element,Node);
function Attr() {
};
Attr.prototype.nodeType = ATTRIBUTE_NODE;
_extends(Attr,Node);


function CharacterData() {
};
CharacterData.prototype = {
	data : '',
	substringData : function(offset, count) {
		return this.data.substring(offset, offset+count);
	},
	appendData: function(text) {
		text = this.data+text;
		this.nodeValue = this.data = text;
		this.length = text.length;
	},
	insertData: function(offset,text) {
		this.replaceData(offset,0,text);
	
	},
	appendChild:function(newChild){
		throw new Error(ExceptionMessage[HIERARCHY_REQUEST_ERR])
	},
	deleteData: function(offset, count) {
		this.replaceData(offset,count,"");
	},
	replaceData: function(offset, count, text) {
		var start = this.data.substring(0,offset);
		var end = this.data.substring(offset+count);
		text = start + text + end;
		this.nodeValue = this.data = text;
		this.length = text.length;
	}
}
_extends(CharacterData,Node);
function Text() {
};
Text.prototype = {
	nodeName : "#text",
	nodeType : TEXT_NODE,
	splitText : function(offset) {
		var text = this.data;
		var newText = text.substring(offset);
		text = text.substring(0, offset);
		this.data = this.nodeValue = text;
		this.length = text.length;
		var newNode = this.ownerDocument.createTextNode(newText);
		if(this.parentNode){
			this.parentNode.insertBefore(newNode, this.nextSibling);
		}
		return newNode;
	}
}
_extends(Text,CharacterData);
function Comment() {
};
Comment.prototype = {
	nodeName : "#comment",
	nodeType : COMMENT_NODE
}
_extends(Comment,CharacterData);

function CDATASection() {
};
CDATASection.prototype = {
	nodeName : "#cdata-section",
	nodeType : CDATA_SECTION_NODE
}
_extends(CDATASection,CharacterData);


function DocumentType() {
};
DocumentType.prototype.nodeType = DOCUMENT_TYPE_NODE;
_extends(DocumentType,Node);

function Notation() {
};
Notation.prototype.nodeType = NOTATION_NODE;
_extends(Notation,Node);

function Entity() {
};
Entity.prototype.nodeType = ENTITY_NODE;
_extends(Entity,Node);

function EntityReference() {
};
EntityReference.prototype.nodeType = ENTITY_REFERENCE_NODE;
_extends(EntityReference,Node);

function DocumentFragment() {
};
DocumentFragment.prototype.nodeName =	"#document-fragment";
DocumentFragment.prototype.nodeType =	DOCUMENT_FRAGMENT_NODE;
_extends(DocumentFragment,Node);


function ProcessingInstruction() {
}
ProcessingInstruction.prototype.nodeType = PROCESSING_INSTRUCTION_NODE;
_extends(ProcessingInstruction,Node);
function XMLSerializer(){}
XMLSerializer.prototype.serializeToString = function(node,isHtml,nodeFilter){
	return nodeSerializeToString.call(node,isHtml,nodeFilter);
}
Node.prototype.toString = nodeSerializeToString;
function nodeSerializeToString(isHtml,nodeFilter){
	var buf = [];
	var refNode = this.nodeType == 9 && this.documentElement || this;
	var prefix = refNode.prefix;
	var uri = refNode.namespaceURI;
	
	if(uri && prefix == null){
		//console.log(prefix)
		var prefix = refNode.lookupPrefix(uri);
		if(prefix == null){
			//isHTML = true;
			var visibleNamespaces=[
			{namespace:uri,prefix:null}
			//{namespace:uri,prefix:''}
			]
		}
	}
	serializeToString(this,buf,isHtml,nodeFilter,visibleNamespaces);
	//console.log('###',this.nodeType,uri,prefix,buf.join(''))
	return buf.join('');
}
function needNamespaceDefine(node,isHTML, visibleNamespaces) {
	var prefix = node.prefix||'';
	var uri = node.namespaceURI;
	if (!prefix && !uri){
		return false;
	}
	if (prefix === "xml" && uri === "http://www.w3.org/XML/1998/namespace" 
		|| uri == 'http://www.w3.org/2000/xmlns/'){
		return false;
	}
	
	var i = visibleNamespaces.length 
	//console.log('@@@@',node.tagName,prefix,uri,visibleNamespaces)
	while (i--) {
		var ns = visibleNamespaces[i];
		// get namespace prefix
		//console.log(node.nodeType,node.tagName,ns.prefix,prefix)
		if (ns.prefix == prefix){
			return ns.namespace != uri;
		}
	}
	//console.log(isHTML,uri,prefix=='')
	//if(isHTML && prefix ==null && uri == 'http://www.w3.org/1999/xhtml'){
	//	return false;
	//}
	//node.flag = '11111'
	//console.error(3,true,node.flag,node.prefix,node.namespaceURI)
	return true;
}
function serializeToString(node,buf,isHTML,nodeFilter,visibleNamespaces){
	if(nodeFilter){
		node = nodeFilter(node);
		if(node){
			if(typeof node == 'string'){
				buf.push(node);
				return;
			}
		}else{
			return;
		}
		//buf.sort.apply(attrs, attributeSorter);
	}
	switch(node.nodeType){
	case ELEMENT_NODE:
		if (!visibleNamespaces) visibleNamespaces = [];
		var startVisibleNamespaces = visibleNamespaces.length;
		var attrs = node.attributes;
		var len = attrs.length;
		var child = node.firstChild;
		var nodeName = node.tagName;
		
		isHTML =  (htmlns === node.namespaceURI) ||isHTML 
		buf.push('<',nodeName);
		
		
		
		for(var i=0;i<len;i++){
			// add namespaces for attributes
			var attr = attrs.item(i);
			if (attr.prefix == 'xmlns') {
				visibleNamespaces.push({ prefix: attr.localName, namespace: attr.value });
			}else if(attr.nodeName == 'xmlns'){
				visibleNamespaces.push({ prefix: '', namespace: attr.value });
			}
		}
		for(var i=0;i<len;i++){
			var attr = attrs.item(i);
			if (needNamespaceDefine(attr,isHTML, visibleNamespaces)) {
				var prefix = attr.prefix||'';
				var uri = attr.namespaceURI;
				var ns = prefix ? ' xmlns:' + prefix : " xmlns";
				buf.push(ns, '="' , uri , '"');
				visibleNamespaces.push({ prefix: prefix, namespace:uri });
			}
			serializeToString(attr,buf,isHTML,nodeFilter,visibleNamespaces);
		}
		// add namespace for current node		
		if (needNamespaceDefine(node,isHTML, visibleNamespaces)) {
			var prefix = node.prefix||'';
			var uri = node.namespaceURI;
			var ns = prefix ? ' xmlns:' + prefix : " xmlns";
			buf.push(ns, '="' , uri , '"');
			visibleNamespaces.push({ prefix: prefix, namespace:uri });
		}
		
		if(child || isHTML && !/^(?:meta|link|img|br|hr|input)$/i.test(nodeName)){
			buf.push('>');
			//if is cdata child node
			if(isHTML && /^script$/i.test(nodeName)){
				while(child){
					if(child.data){
						buf.push(child.data);
					}else{
						serializeToString(child,buf,isHTML,nodeFilter,visibleNamespaces);
					}
					child = child.nextSibling;
				}
			}else
			{
				while(child){
					serializeToString(child,buf,isHTML,nodeFilter,visibleNamespaces);
					child = child.nextSibling;
				}
			}
			buf.push('</',nodeName,'>');
		}else{
			buf.push('/>');
		}
		// remove added visible namespaces
		//visibleNamespaces.length = startVisibleNamespaces;
		return;
	case DOCUMENT_NODE:
	case DOCUMENT_FRAGMENT_NODE:
		var child = node.firstChild;
		while(child){
			serializeToString(child,buf,isHTML,nodeFilter,visibleNamespaces);
			child = child.nextSibling;
		}
		return;
	case ATTRIBUTE_NODE:
		return buf.push(' ',node.name,'="',node.value.replace(/[<&"]/g,_xmlEncoder),'"');
	case TEXT_NODE:
		return buf.push(node.data.replace(/[<&]/g,_xmlEncoder));
	case CDATA_SECTION_NODE:
		return buf.push( '<![CDATA[',node.data,']]>');
	case COMMENT_NODE:
		return buf.push( "<!--",node.data,"-->");
	case DOCUMENT_TYPE_NODE:
		var pubid = node.publicId;
		var sysid = node.systemId;
		buf.push('<!DOCTYPE ',node.name);
		if(pubid){
			buf.push(' PUBLIC "',pubid);
			if (sysid && sysid!='.') {
				buf.push( '" "',sysid);
			}
			buf.push('">');
		}else if(sysid && sysid!='.'){
			buf.push(' SYSTEM "',sysid,'">');
		}else{
			var sub = node.internalSubset;
			if(sub){
				buf.push(" [",sub,"]");
			}
			buf.push(">");
		}
		return;
	case PROCESSING_INSTRUCTION_NODE:
		return buf.push( "<?",node.target," ",node.data,"?>");
	case ENTITY_REFERENCE_NODE:
		return buf.push( '&',node.nodeName,';');
	//case ENTITY_NODE:
	//case NOTATION_NODE:
	default:
		buf.push('??',node.nodeName);
	}
}
function importNode(doc,node,deep){
	var node2;
	switch (node.nodeType) {
	case ELEMENT_NODE:
		node2 = node.cloneNode(false);
		node2.ownerDocument = doc;
		//var attrs = node2.attributes;
		//var len = attrs.length;
		//for(var i=0;i<len;i++){
			//node2.setAttributeNodeNS(importNode(doc,attrs.item(i),deep));
		//}
	case DOCUMENT_FRAGMENT_NODE:
		break;
	case ATTRIBUTE_NODE:
		deep = true;
		break;
	//case ENTITY_REFERENCE_NODE:
	//case PROCESSING_INSTRUCTION_NODE:
	////case TEXT_NODE:
	//case CDATA_SECTION_NODE:
	//case COMMENT_NODE:
	//	deep = false;
	//	break;
	//case DOCUMENT_NODE:
	//case DOCUMENT_TYPE_NODE:
	//cannot be imported.
	//case ENTITY_NODE:
	//case NOTATION_NODE：
	//can not hit in level3
	//default:throw e;
	}
	if(!node2){
		node2 = node.cloneNode(false);//false
	}
	node2.ownerDocument = doc;
	node2.parentNode = null;
	if(deep){
		var child = node.firstChild;
		while(child){
			node2.appendChild(importNode(doc,child,deep));
			child = child.nextSibling;
		}
	}
	return node2;
}
//
//var _relationMap = {firstChild:1,lastChild:1,previousSibling:1,nextSibling:1,
//					attributes:1,childNodes:1,parentNode:1,documentElement:1,doctype,};
function cloneNode(doc,node,deep){
	var node2 = new node.constructor();
	for(var n in node){
		var v = node[n];
		if(typeof v != 'object' ){
			if(v != node2[n]){
				node2[n] = v;
			}
		}
	}
	if(node.childNodes){
		node2.childNodes = new NodeList();
	}
	node2.ownerDocument = doc;
	switch (node2.nodeType) {
	case ELEMENT_NODE:
		var attrs	= node.attributes;
		var attrs2	= node2.attributes = new NamedNodeMap();
		var len = attrs.length
		attrs2._ownerElement = node2;
		for(var i=0;i<len;i++){
			node2.setAttributeNode(cloneNode(doc,attrs.item(i),true));
		}
		break;;
	case ATTRIBUTE_NODE:
		deep = true;
	}
	if(deep){
		var child = node.firstChild;
		while(child){
			node2.appendChild(cloneNode(doc,child,deep));
			child = child.nextSibling;
		}
	}
	return node2;
}

function __set__(object,key,value){
	object[key] = value
}
//do dynamic
try{
	if(Object.defineProperty){
		Object.defineProperty(LiveNodeList.prototype,'length',{
			get:function(){
				_updateLiveList(this);
				return this.$$length;
			}
		});
		Object.defineProperty(Node.prototype,'textContent',{
			get:function(){
				return getTextContent(this);
			},
			set:function(data){
				switch(this.nodeType){
				case ELEMENT_NODE:
				case DOCUMENT_FRAGMENT_NODE:
					while(this.firstChild){
						this.removeChild(this.firstChild);
					}
					if(data || String(data)){
						this.appendChild(this.ownerDocument.createTextNode(data));
					}
					break;
				default:
					//TODO:
					this.data = data;
					this.value = data;
					this.nodeValue = data;
				}
			}
		})
		
		function getTextContent(node){
			switch(node.nodeType){
			case ELEMENT_NODE:
			case DOCUMENT_FRAGMENT_NODE:
				var buf = [];
				node = node.firstChild;
				while(node){
					if(node.nodeType!==7 && node.nodeType !==8){
						buf.push(getTextContent(node));
					}
					node = node.nextSibling;
				}
				return buf.join('');
			default:
				return node.nodeValue;
			}
		}
		__set__ = function(object,key,value){
			//console.log(value)
			object['$$'+key] = value
		}
	}
}catch(e){//ie8
}

//if(typeof require == 'function'){
	exports.DOMImplementation = DOMImplementation;
	exports.XMLSerializer = XMLSerializer;
//}

},{}],93:[function(require,module,exports){
exports.entityMap = {
       lt: '<',
       gt: '>',
       amp: '&',
       quot: '"',
       apos: "'",
       Agrave: "À",
       Aacute: "Á",
       Acirc: "Â",
       Atilde: "Ã",
       Auml: "Ä",
       Aring: "Å",
       AElig: "Æ",
       Ccedil: "Ç",
       Egrave: "È",
       Eacute: "É",
       Ecirc: "Ê",
       Euml: "Ë",
       Igrave: "Ì",
       Iacute: "Í",
       Icirc: "Î",
       Iuml: "Ï",
       ETH: "Ð",
       Ntilde: "Ñ",
       Ograve: "Ò",
       Oacute: "Ó",
       Ocirc: "Ô",
       Otilde: "Õ",
       Ouml: "Ö",
       Oslash: "Ø",
       Ugrave: "Ù",
       Uacute: "Ú",
       Ucirc: "Û",
       Uuml: "Ü",
       Yacute: "Ý",
       THORN: "Þ",
       szlig: "ß",
       agrave: "à",
       aacute: "á",
       acirc: "â",
       atilde: "ã",
       auml: "ä",
       aring: "å",
       aelig: "æ",
       ccedil: "ç",
       egrave: "è",
       eacute: "é",
       ecirc: "ê",
       euml: "ë",
       igrave: "ì",
       iacute: "í",
       icirc: "î",
       iuml: "ï",
       eth: "ð",
       ntilde: "ñ",
       ograve: "ò",
       oacute: "ó",
       ocirc: "ô",
       otilde: "õ",
       ouml: "ö",
       oslash: "ø",
       ugrave: "ù",
       uacute: "ú",
       ucirc: "û",
       uuml: "ü",
       yacute: "ý",
       thorn: "þ",
       yuml: "ÿ",
       nbsp: " ",
       iexcl: "¡",
       cent: "¢",
       pound: "£",
       curren: "¤",
       yen: "¥",
       brvbar: "¦",
       sect: "§",
       uml: "¨",
       copy: "©",
       ordf: "ª",
       laquo: "«",
       not: "¬",
       shy: "­­",
       reg: "®",
       macr: "¯",
       deg: "°",
       plusmn: "±",
       sup2: "²",
       sup3: "³",
       acute: "´",
       micro: "µ",
       para: "¶",
       middot: "·",
       cedil: "¸",
       sup1: "¹",
       ordm: "º",
       raquo: "»",
       frac14: "¼",
       frac12: "½",
       frac34: "¾",
       iquest: "¿",
       times: "×",
       divide: "÷",
       forall: "∀",
       part: "∂",
       exist: "∃",
       empty: "∅",
       nabla: "∇",
       isin: "∈",
       notin: "∉",
       ni: "∋",
       prod: "∏",
       sum: "∑",
       minus: "−",
       lowast: "∗",
       radic: "√",
       prop: "∝",
       infin: "∞",
       ang: "∠",
       and: "∧",
       or: "∨",
       cap: "∩",
       cup: "∪",
       'int': "∫",
       there4: "∴",
       sim: "∼",
       cong: "≅",
       asymp: "≈",
       ne: "≠",
       equiv: "≡",
       le: "≤",
       ge: "≥",
       sub: "⊂",
       sup: "⊃",
       nsub: "⊄",
       sube: "⊆",
       supe: "⊇",
       oplus: "⊕",
       otimes: "⊗",
       perp: "⊥",
       sdot: "⋅",
       Alpha: "Α",
       Beta: "Β",
       Gamma: "Γ",
       Delta: "Δ",
       Epsilon: "Ε",
       Zeta: "Ζ",
       Eta: "Η",
       Theta: "Θ",
       Iota: "Ι",
       Kappa: "Κ",
       Lambda: "Λ",
       Mu: "Μ",
       Nu: "Ν",
       Xi: "Ξ",
       Omicron: "Ο",
       Pi: "Π",
       Rho: "Ρ",
       Sigma: "Σ",
       Tau: "Τ",
       Upsilon: "Υ",
       Phi: "Φ",
       Chi: "Χ",
       Psi: "Ψ",
       Omega: "Ω",
       alpha: "α",
       beta: "β",
       gamma: "γ",
       delta: "δ",
       epsilon: "ε",
       zeta: "ζ",
       eta: "η",
       theta: "θ",
       iota: "ι",
       kappa: "κ",
       lambda: "λ",
       mu: "μ",
       nu: "ν",
       xi: "ξ",
       omicron: "ο",
       pi: "π",
       rho: "ρ",
       sigmaf: "ς",
       sigma: "σ",
       tau: "τ",
       upsilon: "υ",
       phi: "φ",
       chi: "χ",
       psi: "ψ",
       omega: "ω",
       thetasym: "ϑ",
       upsih: "ϒ",
       piv: "ϖ",
       OElig: "Œ",
       oelig: "œ",
       Scaron: "Š",
       scaron: "š",
       Yuml: "Ÿ",
       fnof: "ƒ",
       circ: "ˆ",
       tilde: "˜",
       ensp: " ",
       emsp: " ",
       thinsp: " ",
       zwnj: "‌",
       zwj: "‍",
       lrm: "‎",
       rlm: "‏",
       ndash: "–",
       mdash: "—",
       lsquo: "‘",
       rsquo: "’",
       sbquo: "‚",
       ldquo: "“",
       rdquo: "”",
       bdquo: "„",
       dagger: "†",
       Dagger: "‡",
       bull: "•",
       hellip: "…",
       permil: "‰",
       prime: "′",
       Prime: "″",
       lsaquo: "‹",
       rsaquo: "›",
       oline: "‾",
       euro: "€",
       trade: "™",
       larr: "←",
       uarr: "↑",
       rarr: "→",
       darr: "↓",
       harr: "↔",
       crarr: "↵",
       lceil: "⌈",
       rceil: "⌉",
       lfloor: "⌊",
       rfloor: "⌋",
       loz: "◊",
       spades: "♠",
       clubs: "♣",
       hearts: "♥",
       diams: "♦"
};
//for(var  n in exports.entityMap){console.log(exports.entityMap[n].charCodeAt())}
},{}],94:[function(require,module,exports){
//[4]   	NameStartChar	   ::=   	":" | [A-Z] | "_" | [a-z] | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x2FF] | [#x370-#x37D] | [#x37F-#x1FFF] | [#x200C-#x200D] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
//[4a]   	NameChar	   ::=   	NameStartChar | "-" | "." | [0-9] | #xB7 | [#x0300-#x036F] | [#x203F-#x2040]
//[5]   	Name	   ::=   	NameStartChar (NameChar)*
var nameStartChar = /[A-Z_a-z\xC0-\xD6\xD8-\xF6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]///\u10000-\uEFFFF
var nameChar = new RegExp("[\\-\\.0-9"+nameStartChar.source.slice(1,-1)+"\\u00B7\\u0300-\\u036F\\u203F-\\u2040]");
var tagNamePattern = new RegExp('^'+nameStartChar.source+nameChar.source+'*(?:\:'+nameStartChar.source+nameChar.source+'*)?$');
//var tagNamePattern = /^[a-zA-Z_][\w\-\.]*(?:\:[a-zA-Z_][\w\-\.]*)?$/
//var handlers = 'resolveEntity,getExternalSubset,characters,endDocument,endElement,endPrefixMapping,ignorableWhitespace,processingInstruction,setDocumentLocator,skippedEntity,startDocument,startElement,startPrefixMapping,notationDecl,unparsedEntityDecl,error,fatalError,warning,attributeDecl,elementDecl,externalEntityDecl,internalEntityDecl,comment,endCDATA,endDTD,endEntity,startCDATA,startDTD,startEntity'.split(',')

//S_TAG,	S_ATTR,	S_EQ,	S_ATTR_NOQUOT_VALUE
//S_ATTR_SPACE,	S_ATTR_END,	S_TAG_SPACE, S_TAG_CLOSE
var S_TAG = 0;//tag name offerring
var S_ATTR = 1;//attr name offerring 
var S_ATTR_SPACE=2;//attr name end and space offer
var S_EQ = 3;//=space?
var S_ATTR_NOQUOT_VALUE = 4;//attr value(no quot value only)
var S_ATTR_END = 5;//attr value end and no space(quot end)
var S_TAG_SPACE = 6;//(attr value end || tag end ) && (space offer)
var S_TAG_CLOSE = 7;//closed el<el />

function XMLReader(){
	
}

XMLReader.prototype = {
	parse:function(source,defaultNSMap,entityMap){
		var domBuilder = this.domBuilder;
		domBuilder.startDocument();
		_copy(defaultNSMap ,defaultNSMap = {})
		parse(source,defaultNSMap,entityMap,
				domBuilder,this.errorHandler);
		domBuilder.endDocument();
	}
}
function parse(source,defaultNSMapCopy,entityMap,domBuilder,errorHandler){
	function fixedFromCharCode(code) {
		// String.prototype.fromCharCode does not supports
		// > 2 bytes unicode chars directly
		if (code > 0xffff) {
			code -= 0x10000;
			var surrogate1 = 0xd800 + (code >> 10)
				, surrogate2 = 0xdc00 + (code & 0x3ff);

			return String.fromCharCode(surrogate1, surrogate2);
		} else {
			return String.fromCharCode(code);
		}
	}
	function entityReplacer(a){
		var k = a.slice(1,-1);
		if(k in entityMap){
			return entityMap[k]; 
		}else if(k.charAt(0) === '#'){
			return fixedFromCharCode(parseInt(k.substr(1).replace('x','0x')))
		}else{
			errorHandler.error('entity not found:'+a);
			return a;
		}
	}
	function appendText(end){//has some bugs
		if(end>start){
			var xt = source.substring(start,end).replace(/&#?\w+;/g,entityReplacer);
			locator&&position(start);
			domBuilder.characters(xt,0,end-start);
			start = end
		}
	}
	function position(p,m){
		while(p>=lineEnd && (m = linePattern.exec(source))){
			lineStart = m.index;
			lineEnd = lineStart + m[0].length;
			locator.lineNumber++;
			//console.log('line++:',locator,startPos,endPos)
		}
		locator.columnNumber = p-lineStart+1;
	}
	var lineStart = 0;
	var lineEnd = 0;
	var linePattern = /.*(?:\r\n?|\n)|.*$/g
	var locator = domBuilder.locator;
	
	var parseStack = [{currentNSMap:defaultNSMapCopy}]
	var closeMap = {};
	var start = 0;
	while(true){
		try{
			var tagStart = source.indexOf('<',start);
			if(tagStart<0){
				if(!source.substr(start).match(/^\s*$/)){
					var doc = domBuilder.doc;
	    			var text = doc.createTextNode(source.substr(start));
	    			doc.appendChild(text);
	    			domBuilder.currentElement = text;
				}
				return;
			}
			if(tagStart>start){
				appendText(tagStart);
			}
			switch(source.charAt(tagStart+1)){
			case '/':
				var end = source.indexOf('>',tagStart+3);
				var tagName = source.substring(tagStart+2,end);
				var config = parseStack.pop();
				if(end<0){
					
	        		tagName = source.substring(tagStart+2).replace(/[\s<].*/,'');
	        		//console.error('#@@@@@@'+tagName)
	        		errorHandler.error("end tag name: "+tagName+' is not complete:'+config.tagName);
	        		end = tagStart+1+tagName.length;
	        	}else if(tagName.match(/\s</)){
	        		tagName = tagName.replace(/[\s<].*/,'');
	        		errorHandler.error("end tag name: "+tagName+' maybe not complete');
	        		end = tagStart+1+tagName.length;
				}
				//console.error(parseStack.length,parseStack)
				//console.error(config);
				var localNSMap = config.localNSMap;
				var endMatch = config.tagName == tagName;
				var endIgnoreCaseMach = endMatch || config.tagName&&config.tagName.toLowerCase() == tagName.toLowerCase()
		        if(endIgnoreCaseMach){
		        	domBuilder.endElement(config.uri,config.localName,tagName);
					if(localNSMap){
						for(var prefix in localNSMap){
							domBuilder.endPrefixMapping(prefix) ;
						}
					}
					if(!endMatch){
		            	errorHandler.fatalError("end tag name: "+tagName+' is not match the current start tagName:'+config.tagName );
					}
		        }else{
		        	parseStack.push(config)
		        }
				
				end++;
				break;
				// end elment
			case '?':// <?...?>
				locator&&position(tagStart);
				end = parseInstruction(source,tagStart,domBuilder);
				break;
			case '!':// <!doctype,<![CDATA,<!--
				locator&&position(tagStart);
				end = parseDCC(source,tagStart,domBuilder,errorHandler);
				break;
			default:
				locator&&position(tagStart);
				var el = new ElementAttributes();
				var currentNSMap = parseStack[parseStack.length-1].currentNSMap;
				//elStartEnd
				var end = parseElementStartPart(source,tagStart,el,currentNSMap,entityReplacer,errorHandler);
				var len = el.length;
				
				
				if(!el.closed && fixSelfClosed(source,end,el.tagName,closeMap)){
					el.closed = true;
					if(!entityMap.nbsp){
						errorHandler.warning('unclosed xml attribute');
					}
				}
				if(locator && len){
					var locator2 = copyLocator(locator,{});
					//try{//attribute position fixed
					for(var i = 0;i<len;i++){
						var a = el[i];
						position(a.offset);
						a.locator = copyLocator(locator,{});
					}
					//}catch(e){console.error('@@@@@'+e)}
					domBuilder.locator = locator2
					if(appendElement(el,domBuilder,currentNSMap)){
						parseStack.push(el)
					}
					domBuilder.locator = locator;
				}else{
					if(appendElement(el,domBuilder,currentNSMap)){
						parseStack.push(el)
					}
				}
				
				
				
				if(el.uri === 'http://www.w3.org/1999/xhtml' && !el.closed){
					end = parseHtmlSpecialContent(source,end,el.tagName,entityReplacer,domBuilder)
				}else{
					end++;
				}
			}
		}catch(e){
			errorHandler.error('element parse error: '+e)
			//errorHandler.error('element parse error: '+e);
			end = -1;
			//throw e;
		}
		if(end>start){
			start = end;
		}else{
			//TODO: 这里有可能sax回退，有位置错误风险
			appendText(Math.max(tagStart,start)+1);
		}
	}
}
function copyLocator(f,t){
	t.lineNumber = f.lineNumber;
	t.columnNumber = f.columnNumber;
	return t;
}

/**
 * @see #appendElement(source,elStartEnd,el,selfClosed,entityReplacer,domBuilder,parseStack);
 * @return end of the elementStartPart(end of elementEndPart for selfClosed el)
 */
function parseElementStartPart(source,start,el,currentNSMap,entityReplacer,errorHandler){
	var attrName;
	var value;
	var p = ++start;
	var s = S_TAG;//status
	while(true){
		var c = source.charAt(p);
		switch(c){
		case '=':
			if(s === S_ATTR){//attrName
				attrName = source.slice(start,p);
				s = S_EQ;
			}else if(s === S_ATTR_SPACE){
				s = S_EQ;
			}else{
				//fatalError: equal must after attrName or space after attrName
				throw new Error('attribute equal must after attrName');
			}
			break;
		case '\'':
		case '"':
			if(s === S_EQ || s === S_ATTR //|| s == S_ATTR_SPACE
				){//equal
				if(s === S_ATTR){
					errorHandler.warning('attribute value must after "="')
					attrName = source.slice(start,p)
				}
				start = p+1;
				p = source.indexOf(c,start)
				if(p>0){
					value = source.slice(start,p).replace(/&#?\w+;/g,entityReplacer);
					el.add(attrName,value,start-1);
					s = S_ATTR_END;
				}else{
					//fatalError: no end quot match
					throw new Error('attribute value no end \''+c+'\' match');
				}
			}else if(s == S_ATTR_NOQUOT_VALUE){
				value = source.slice(start,p).replace(/&#?\w+;/g,entityReplacer);
				//console.log(attrName,value,start,p)
				el.add(attrName,value,start);
				//console.dir(el)
				errorHandler.warning('attribute "'+attrName+'" missed start quot('+c+')!!');
				start = p+1;
				s = S_ATTR_END
			}else{
				//fatalError: no equal before
				throw new Error('attribute value must after "="');
			}
			break;
		case '/':
			switch(s){
			case S_TAG:
				el.setTagName(source.slice(start,p));
			case S_ATTR_END:
			case S_TAG_SPACE:
			case S_TAG_CLOSE:
				s =S_TAG_CLOSE;
				el.closed = true;
			case S_ATTR_NOQUOT_VALUE:
			case S_ATTR:
			case S_ATTR_SPACE:
				break;
			//case S_EQ:
			default:
				throw new Error("attribute invalid close char('/')")
			}
			break;
		case ''://end document
			//throw new Error('unexpected end of input')
			errorHandler.error('unexpected end of input');
			if(s == S_TAG){
				el.setTagName(source.slice(start,p));
			}
			return p;
		case '>':
			switch(s){
			case S_TAG:
				el.setTagName(source.slice(start,p));
			case S_ATTR_END:
			case S_TAG_SPACE:
			case S_TAG_CLOSE:
				break;//normal
			case S_ATTR_NOQUOT_VALUE://Compatible state
			case S_ATTR:
				value = source.slice(start,p);
				if(value.slice(-1) === '/'){
					el.closed  = true;
					value = value.slice(0,-1)
				}
			case S_ATTR_SPACE:
				if(s === S_ATTR_SPACE){
					value = attrName;
				}
				if(s == S_ATTR_NOQUOT_VALUE){
					errorHandler.warning('attribute "'+value+'" missed quot(")!!');
					el.add(attrName,value.replace(/&#?\w+;/g,entityReplacer),start)
				}else{
					if(currentNSMap[''] !== 'http://www.w3.org/1999/xhtml' || !value.match(/^(?:disabled|checked|selected)$/i)){
						errorHandler.warning('attribute "'+value+'" missed value!! "'+value+'" instead!!')
					}
					el.add(value,value,start)
				}
				break;
			case S_EQ:
				throw new Error('attribute value missed!!');
			}
//			console.log(tagName,tagNamePattern,tagNamePattern.test(tagName))
			return p;
		/*xml space '\x20' | #x9 | #xD | #xA; */
		case '\u0080':
			c = ' ';
		default:
			if(c<= ' '){//space
				switch(s){
				case S_TAG:
					el.setTagName(source.slice(start,p));//tagName
					s = S_TAG_SPACE;
					break;
				case S_ATTR:
					attrName = source.slice(start,p)
					s = S_ATTR_SPACE;
					break;
				case S_ATTR_NOQUOT_VALUE:
					var value = source.slice(start,p).replace(/&#?\w+;/g,entityReplacer);
					errorHandler.warning('attribute "'+value+'" missed quot(")!!');
					el.add(attrName,value,start)
				case S_ATTR_END:
					s = S_TAG_SPACE;
					break;
				//case S_TAG_SPACE:
				//case S_EQ:
				//case S_ATTR_SPACE:
				//	void();break;
				//case S_TAG_CLOSE:
					//ignore warning
				}
			}else{//not space
//S_TAG,	S_ATTR,	S_EQ,	S_ATTR_NOQUOT_VALUE
//S_ATTR_SPACE,	S_ATTR_END,	S_TAG_SPACE, S_TAG_CLOSE
				switch(s){
				//case S_TAG:void();break;
				//case S_ATTR:void();break;
				//case S_ATTR_NOQUOT_VALUE:void();break;
				case S_ATTR_SPACE:
					var tagName =  el.tagName;
					if(currentNSMap[''] !== 'http://www.w3.org/1999/xhtml' || !attrName.match(/^(?:disabled|checked|selected)$/i)){
						errorHandler.warning('attribute "'+attrName+'" missed value!! "'+attrName+'" instead2!!')
					}
					el.add(attrName,attrName,start);
					start = p;
					s = S_ATTR;
					break;
				case S_ATTR_END:
					errorHandler.warning('attribute space is required"'+attrName+'"!!')
				case S_TAG_SPACE:
					s = S_ATTR;
					start = p;
					break;
				case S_EQ:
					s = S_ATTR_NOQUOT_VALUE;
					start = p;
					break;
				case S_TAG_CLOSE:
					throw new Error("elements closed character '/' and '>' must be connected to");
				}
			}
		}//end outer switch
		//console.log('p++',p)
		p++;
	}
}
/**
 * @return true if has new namespace define
 */
function appendElement(el,domBuilder,currentNSMap){
	var tagName = el.tagName;
	var localNSMap = null;
	//var currentNSMap = parseStack[parseStack.length-1].currentNSMap;
	var i = el.length;
	while(i--){
		var a = el[i];
		var qName = a.qName;
		var value = a.value;
		var nsp = qName.indexOf(':');
		if(nsp>0){
			var prefix = a.prefix = qName.slice(0,nsp);
			var localName = qName.slice(nsp+1);
			var nsPrefix = prefix === 'xmlns' && localName
		}else{
			localName = qName;
			prefix = null
			nsPrefix = qName === 'xmlns' && ''
		}
		//can not set prefix,because prefix !== ''
		a.localName = localName ;
		//prefix == null for no ns prefix attribute 
		if(nsPrefix !== false){//hack!!
			if(localNSMap == null){
				localNSMap = {}
				//console.log(currentNSMap,0)
				_copy(currentNSMap,currentNSMap={})
				//console.log(currentNSMap,1)
			}
			currentNSMap[nsPrefix] = localNSMap[nsPrefix] = value;
			a.uri = 'http://www.w3.org/2000/xmlns/'
			domBuilder.startPrefixMapping(nsPrefix, value) 
		}
	}
	var i = el.length;
	while(i--){
		a = el[i];
		var prefix = a.prefix;
		if(prefix){//no prefix attribute has no namespace
			if(prefix === 'xml'){
				a.uri = 'http://www.w3.org/XML/1998/namespace';
			}if(prefix !== 'xmlns'){
				a.uri = currentNSMap[prefix || '']
				
				//{console.log('###'+a.qName,domBuilder.locator.systemId+'',currentNSMap,a.uri)}
			}
		}
	}
	var nsp = tagName.indexOf(':');
	if(nsp>0){
		prefix = el.prefix = tagName.slice(0,nsp);
		localName = el.localName = tagName.slice(nsp+1);
	}else{
		prefix = null;//important!!
		localName = el.localName = tagName;
	}
	//no prefix element has default namespace
	var ns = el.uri = currentNSMap[prefix || ''];
	domBuilder.startElement(ns,localName,tagName,el);
	//endPrefixMapping and startPrefixMapping have not any help for dom builder
	//localNSMap = null
	if(el.closed){
		domBuilder.endElement(ns,localName,tagName);
		if(localNSMap){
			for(prefix in localNSMap){
				domBuilder.endPrefixMapping(prefix) 
			}
		}
	}else{
		el.currentNSMap = currentNSMap;
		el.localNSMap = localNSMap;
		//parseStack.push(el);
		return true;
	}
}
function parseHtmlSpecialContent(source,elStartEnd,tagName,entityReplacer,domBuilder){
	if(/^(?:script|textarea)$/i.test(tagName)){
		var elEndStart =  source.indexOf('</'+tagName+'>',elStartEnd);
		var text = source.substring(elStartEnd+1,elEndStart);
		if(/[&<]/.test(text)){
			if(/^script$/i.test(tagName)){
				//if(!/\]\]>/.test(text)){
					//lexHandler.startCDATA();
					domBuilder.characters(text,0,text.length);
					//lexHandler.endCDATA();
					return elEndStart;
				//}
			}//}else{//text area
				text = text.replace(/&#?\w+;/g,entityReplacer);
				domBuilder.characters(text,0,text.length);
				return elEndStart;
			//}
			
		}
	}
	return elStartEnd+1;
}
function fixSelfClosed(source,elStartEnd,tagName,closeMap){
	//if(tagName in closeMap){
	var pos = closeMap[tagName];
	if(pos == null){
		//console.log(tagName)
		pos =  source.lastIndexOf('</'+tagName+'>')
		if(pos<elStartEnd){//忘记闭合
			pos = source.lastIndexOf('</'+tagName)
		}
		closeMap[tagName] =pos
	}
	return pos<elStartEnd;
	//} 
}
function _copy(source,target){
	for(var n in source){target[n] = source[n]}
}
function parseDCC(source,start,domBuilder,errorHandler){//sure start with '<!'
	var next= source.charAt(start+2)
	switch(next){
	case '-':
		if(source.charAt(start + 3) === '-'){
			var end = source.indexOf('-->',start+4);
			//append comment source.substring(4,end)//<!--
			if(end>start){
				domBuilder.comment(source,start+4,end-start-4);
				return end+3;
			}else{
				errorHandler.error("Unclosed comment");
				return -1;
			}
		}else{
			//error
			return -1;
		}
	default:
		if(source.substr(start+3,6) == 'CDATA['){
			var end = source.indexOf(']]>',start+9);
			domBuilder.startCDATA();
			domBuilder.characters(source,start+9,end-start-9);
			domBuilder.endCDATA() 
			return end+3;
		}
		//<!DOCTYPE
		//startDTD(java.lang.String name, java.lang.String publicId, java.lang.String systemId) 
		var matchs = split(source,start);
		var len = matchs.length;
		if(len>1 && /!doctype/i.test(matchs[0][0])){
			var name = matchs[1][0];
			var pubid = len>3 && /^public$/i.test(matchs[2][0]) && matchs[3][0]
			var sysid = len>4 && matchs[4][0];
			var lastMatch = matchs[len-1]
			domBuilder.startDTD(name,pubid && pubid.replace(/^(['"])(.*?)\1$/,'$2'),
					sysid && sysid.replace(/^(['"])(.*?)\1$/,'$2'));
			domBuilder.endDTD();
			
			return lastMatch.index+lastMatch[0].length
		}
	}
	return -1;
}



function parseInstruction(source,start,domBuilder){
	var end = source.indexOf('?>',start);
	if(end){
		var match = source.substring(start,end).match(/^<\?(\S*)\s*([\s\S]*?)\s*$/);
		if(match){
			var len = match[0].length;
			domBuilder.processingInstruction(match[1], match[2]) ;
			return end+2;
		}else{//error
			return -1;
		}
	}
	return -1;
}

/**
 * @param source
 */
function ElementAttributes(source){
	
}
ElementAttributes.prototype = {
	setTagName:function(tagName){
		if(!tagNamePattern.test(tagName)){
			throw new Error('invalid tagName:'+tagName)
		}
		this.tagName = tagName
	},
	add:function(qName,value,offset){
		if(!tagNamePattern.test(qName)){
			throw new Error('invalid attribute:'+qName)
		}
		this[this.length++] = {qName:qName,value:value,offset:offset}
	},
	length:0,
	getLocalName:function(i){return this[i].localName},
	getLocator:function(i){return this[i].locator},
	getQName:function(i){return this[i].qName},
	getURI:function(i){return this[i].uri},
	getValue:function(i){return this[i].value}
//	,getIndex:function(uri, localName)){
//		if(localName){
//			
//		}else{
//			var qName = uri
//		}
//	},
//	getValue:function(){return this.getValue(this.getIndex.apply(this,arguments))},
//	getType:function(uri,localName){}
//	getType:function(i){},
}



function split(source,start){
	var match;
	var buf = [];
	var reg = /'[^']+'|"[^"]+"|[^\s<>\/=]+=?|(\/?\s*>|<)/g;
	reg.lastIndex = start;
	reg.exec(source);//skip <
	while(match = reg.exec(source)){
		buf.push(match);
		if(match[1])return buf;
	}
}

exports.XMLReader = XMLReader;


},{}]},{},[35]);
