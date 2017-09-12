/*
 * (C) Copyright 2016 o2r project
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

require("./setup")

const cookie_uploader = 's:C0LIrsxGtHOGHld8Nv2jedjL4evGgEHo.GMsWD5Vveq0vBt7/4rGeoH5Xx7Dd2pgZR9DvhKCyDTY';
const cookie_plain = 's:yleQfdYnkh-sbj9Ez--_TWHVhXeXNEgq.qRmINNdkRuJ+iHGg5woRa9ydziuJ+DzFG9GnAZRvaaM';
const cookie_admin = 's:hJRjapOTVCEvlMYCb8BXovAOi2PEOC4i.IEPb0lmtGojn2cVk2edRuomIEanX6Ddz87egE5Pe8UM';
const cookie_editor = 's:xWHihqZq6jEAObwbfowO5IwdnBxohM7z.VxqsRC5A1VqJVspChcxVPuzEKtRE+aKLF8k3nvCcZ8g';

describe.skip('Reading microservices status page', () => {
    let status_url = global.test_host + '/status';

    describe('GET /status for admin user', () => {
        let j = request.jar();
        let ck = request.cookie('connect.sid=' + cookie_admin);
        j.setCookie(ck, global.test_host);

        it('should response with HTTP 200 OK', (done) => {
            request({ url: status_url, jar: j }, (err, res) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 200);
                done();
            });
        });
        it('should respond with a valid JSON document', (done) => {
            request({ url: status_url, jar: j }, (err, res, body) => {
                assert.ifError(err);
                assert.isObject(JSON.parse(body));
                done();
            });
        });
        it('should respond with document containing version and service', (done) => {
            request({ url: status_url, jar: j }, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response, 'service');
                assert.property(response, 'version');
                assert.propertyVal(response, 'version', config.version);
                done();
            });
        });
    });

    describe('GET /status for editor user', () => {
        let j = request.jar();
        let ck = request.cookie('connect.sid=' + cookie_editor);
        j.setCookie(ck, global.test_host);

        it('should response with HTTP 401', (done) => {
            request({ url: status_url, jar: j }, (err, res) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 401);
                done();
            });
        });
        it('should respond with a valid JSON document', (done) => {
            request({ url: status_url, jar: j }, (err, res, body) => {
                assert.ifError(err);
                assert.isObject(JSON.parse(body));
                done();
            });
        });
        it('should respond with document containing error message', (done) => {
            request({ url: status_url, jar: j }, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response, 'error');
                done();
            });
        });
    });

    describe('GET /status for not logged-in in user', () => {
        // no cookie for this user!

        it('should response with HTTP 401', (done) => {
            request(status_url, (err, res) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 401);
                done();
            });
        });
        it('should respond with a valid JSON document', (done) => {
            request(status_url, (err, res, body) => {
                assert.ifError(err);
                assert.isObject(JSON.parse(body));
                done();
            });
        });
        it('should respond with document containing error message', (done) => {
            request(status_url, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response, 'error');
                done();
            });
        });
    });

    describe('GET /status for plain user', () => {
        let j = request.jar();
        let ck = request.cookie('connect.sid=' + cookie_plain);
        j.setCookie(ck, global.test_host);

        it('should response with HTTP 401', (done) => {
            request({ url: status_url, jar: j }, (err, res) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 401);
                done();
            });
        });
        it('should respond with a valid JSON document', (done) => {
            request({ url: status_url, jar: j }, (err, res, body) => {
                assert.ifError(err);
                assert.isObject(JSON.parse(body));
                done();
            });
        });
        it('should respond with document containing error message', (done) => {
            request({ url: status_url, jar: j }, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response, 'error');
                done();
            });
        });
    });

    describe('GET /status for regular user (uploader)', () => {
        let j = request.jar();
        let ck = request.cookie('connect.sid=' + cookie_uploader);
        j.setCookie(ck, global.test_host);

        it('should response with HTTP 401', (done) => {
            request({ url: status_url, jar: j }, (err, res) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 401);
                done();
            });
        });
        it('should respond with a valid JSON document', (done) => {
            request({ url: status_url, jar: j }, (err, res, body) => {
                assert.ifError(err);
                assert.isObject(JSON.parse(body));
                done();
            });
        });
        it('should respond with document containing error message', (done) => {
            request({ url: status_url, jar: j }, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response, 'error');
                done();
            });
        });
    });
});

