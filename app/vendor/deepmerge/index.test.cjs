const assert = require('node:assert/strict')
const test = require('node:test')
const deepmerge = require('./index.js')

test('merge keeps prototype keys off the returned object', () => {
  const source = JSON.parse('{"__proto__":{"polluted":true}}')
  const result = deepmerge(Object.create(null), source)

  assert.equal(result.polluted, undefined)
  assert.equal(Object.prototype.polluted, undefined)

  const plain = deepmerge({}, { mainFields: ['module'], nested: { a: 1 } })
  assert.deepEqual(plain.mainFields, ['module'])
  assert.equal(plain.nested.a, 1)
})
