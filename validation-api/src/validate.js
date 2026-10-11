'use strict';

// OneBlink hosted-API SERVER-VALIDATION handler for the demo contact form.
// Contract: module.exports = { post }, post(req, res).
//   req.body === { submission: { <elementName>: value, ... } }
//   PASS -> res.setStatusCode(200)
//   FAIL -> res.setStatusCode(400).setPayload({ message })  (shown to the user)
//
// This is the check the task asks the SERVER to enforce: the `message` element
// is NOT required on the form, but server validation rejects an empty message.
// Thin wrapper over the pure validateSubmission() logic.

const { validateSubmission } = require('./validate-submission');

function post(req, res) {
  const body = req && req.body ? req.body : {};
  const submission = body.submission || {};

  const result = validateSubmission(submission);
  if (result.ok) {
    return res.setStatusCode(200);
  }
  return res.setStatusCode(400).setPayload({ message: result.message });
}

module.exports = { post };
