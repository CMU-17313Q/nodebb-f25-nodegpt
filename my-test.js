/* eslint-env es6 */
/* eslint parserOptions: { "sourceType": "module" } */

import http from 'k6/http';
import { sleep } from 'k6';
import { expect } from "https://jslib.k6.io/k6-testing/0.5.0/index.js";

export const options = {
  vus: 10,
  duration: '30s',
};

export default function() {
  // Use the actual domain - the server can reach itself via the domain name
  let res = http.get('https://crs-17313-nodegpt.qatar.cmu.edu/');
  expect.soft(res.status).toBe(200);
  sleep(1);
}