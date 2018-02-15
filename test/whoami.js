/*
 * (C) Copyright 2017 o2r project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

/* eslint-env mocha */
const assert = require('chai').assert;
const request = require('request');
const config = require('../config/config');
const chai = require('chai');

require("./setup");

const cookie_o2r = 's:C0LIrsxGtHOGHld8Nv2jedjL4evGgEHo.GMsWD5Vveq0vBt7/4rGeoH5Xx7Dd2pgZR9DvhKCyDTY';
const cookie_plain = 's:yleQfdYnkh-sbj9Ez--_TWHVhXeXNEgq.qRmINNdkRuJ+iHGg5woRa9ydziuJ+DzFG9GnAZRvaaM';
const cookie_admin = 's:hJRjapOTVCEvlMYCb8BXovAOi2PEOC4i.IEPb0lmtGojn2cVk2edRuomIEanX6Ddz87egE5Pe8UM';
const cookie_editor = 's:xWHihqZq6jEAObwbfowO5IwdnBxohM7z.VxqsRC5A1VqJVspChcxVPuzEKtRE+aKLF8k3nvCcZ8g';

describe('Reading whoami page', () => {
    let whoami_url = global.test_host + '/api/v1/auth/whoami';

    describe('GET ' + whoami_url + ' for regular known user', () => {
        let j = request.jar();
        let ck = request.cookie('connect.sid=' + cookie_o2r);
        j.setCookie(ck, global.test_host);

        it('should response with HTTP 200 OK', (done) => {
            request({ url: whoami_url, jar: j }, (err, res) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 200);
                done();
            });
        });
        it('should respond with a valid JSON document', (done) => {
            request({ url: whoami_url, jar: j }, (err, res, body) => {
                assert.ifError(err);
                assert.isObject(JSON.parse(body));
                done();
            });
        });
        it('should respond with document containing name and orcid', (done) => {
            request({ url: whoami_url, jar: j }, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response, 'name');
                assert.property(response, 'orcid');
                assert.propertyVal(response, 'name', 'o2r-testuser');
                assert.propertyVal(response, 'orcid', '0000-0001-6021-1617');
                done();
            });
        });
    });

    describe('GET ' + whoami_url + ' for not logged-in in user', () => {
        // no cookie for this user!

        it('should response with HTTP 401', (done) => {
            request(whoami_url, (err, res) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 401);
                done();
            });
        });
        it('should respond with a valid JSON document', (done) => {
            request(whoami_url, (err, res, body) => {
                assert.ifError(err);
                assert.isObject(JSON.parse(body));
                done();
            });
        });
        it('should respond with document containing error message', (done) => {
            request(whoami_url, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response, 'error');
                done();
            });
        });
    });

});

