'use strict';

// Pure server-validation logic for the demo AU contact form (example 2).
// The thin req/res wrapper (validate.js) imports validateSubmission() from here.
// ASCII-only on purpose (parses under PowerShell 5.1 / constrained runtimes).
//
// THE KEY RULE this file demonstrates:
//   The `message` form element is NOT marked required on the form itself.
//   The SERVER enforces that it must not be empty. So a submission with a blank
//   message is accepted by the browser form but REJECTED here at submit time.
//
// The address fields are validated too (standard AU address shape) so the
// example shows a realistic server-side gate, but the headline rule is the
// non-empty `message`.

// Element NAMES are the keys in submission (snake_case of the form labels).
// These must match the form element names created in example 2.
const REQUIRED_NON_EMPTY = ['full_name', 'email', 'street_address', 'suburb', 'state', 'postcode', 'message'];
// NB: `message` is deliberately in this list even though the FORM does not mark
// it required - server validation is the stricter gate the task asked for.

const AU_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'];
const POSTCODE_RE = /^\d{4}$/;

function isEmpty(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

/**
 * Validate a contact-form submission.
 * @param {Record<string, unknown>} submission - keyed by form element names.
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
function validateSubmission(submission) {
  const problems = [];
  const data = submission && typeof submission === 'object' ? submission : {};

  // 1. Each required-non-null field present and non-empty (includes `message`).
  for (const field of REQUIRED_NON_EMPTY) {
    if (isEmpty(data[field])) {
      problems.push(field + ' must not be null');
    }
  }

  // 2. state must be one of the 8 AU codes (only check when supplied).
  if (!isEmpty(data.state)) {
    const state = String(data.state).trim().toUpperCase();
    if (!AU_STATES.includes(state)) {
      problems.push('state must be one of ' + AU_STATES.join(', '));
    }
  }

  // 3. postcode must be a 4-digit AU postcode (only check when supplied).
  if (!isEmpty(data.postcode)) {
    const postcode = String(data.postcode).trim();
    if (!POSTCODE_RE.test(postcode)) {
      problems.push('postcode must be exactly 4 digits');
    }
  }

  if (problems.length > 0) {
    return { ok: false, message: 'Submission invalid: ' + problems.join('; ') + '.' };
  }
  return { ok: true };
}

module.exports = { validateSubmission, REQUIRED_NON_EMPTY, AU_STATES };
