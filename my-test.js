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
  // Use localhost since we're running ON the server
  let res = http.get('https://localhost/');
  expect.soft(res.status).toBe(200);
  sleep(1);
}