'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateSubmission } = require('../src/validate-submission');

const valid = {
  full_name: 'Ada Lovelace',
  email: 'ada@example.com',
  street_address: '1 Analytical Way',
  suburb: 'Sydney',
  state: 'NSW',
  postcode: '2000',
  message: 'OneBlink is awesome!',
};

test('a fully valid submission passes', () => {
  assert.deepEqual(validateSubmission(valid), { ok: true });
});

test('empty message is REJECTED by the server (even though the form does not require it)', () => {
  const r = validateSubmission({ ...valid, message: '   ' });
  assert.equal(r.ok, false);
  assert.match(r.message, /message must not be null/);
});

test('missing message is rejected', () => {
  const { message, ...noMessage } = valid;
  const r = validateSubmission(noMessage);
  assert.equal(r.ok, false);
  assert.match(r.message, /message must not be null/);
});

test('bad state is rejected', () => {
  const r = validateSubmission({ ...valid, state: 'ZZ' });
  assert.equal(r.ok, false);
  assert.match(r.message, /state must be one of/);
});

test('non-4-digit postcode is rejected', () => {
  const r = validateSubmission({ ...valid, postcode: '20' });
  assert.equal(r.ok, false);
  assert.match(r.message, /postcode must be exactly 4 digits/);
});

test('state is case-insensitive', () => {
  assert.deepEqual(validateSubmission({ ...valid, state: 'nsw' }), { ok: true });
});
