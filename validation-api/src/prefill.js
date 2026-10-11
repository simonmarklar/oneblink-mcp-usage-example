'use strict';

// OneBlink hosted-API PERSONALISATION (prefill) handler for the demo contact
// form. Contract: module.exports = { post }, post(req, res).
//
// Personalisation runs on form LOAD (before the user fills it). It returns
//   { submission: { <elementName>: value } }
// and OneBlink prefills by matching those keys to form element `name`s.
//
// Here we prefill the `message` element - its element name on the form is
// `message` (snake_case of the "Message" label). The value matches the task.
// ASCII-only on purpose.

function post(req, res) {
  return res.setStatusCode(200).setPayload({
    submission: {
      message: 'OneBlink is awesome!',
    },
  });
}

module.exports = { post };
