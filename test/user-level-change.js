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

const cookie_uploader = 's:C0LIrsxGtHOGHld8Nv2jedjL4evGgEHo.GMsWD5Vveq0vBt7/4rGeoH5Xx7Dd2pgZR9DvhKCyDTY';
const cookie_plain = 's:yleQfdYnkh-sbj9Ez--_TWHVhXeXNEgq.qRmINNdkRuJ+iHGg5woRa9ydziuJ+DzFG9GnAZRvaaM';
const cookie_admin = 's:hJRjapOTVCEvlMYCb8BXovAOi2PEOC4i.IEPb0lmtGojn2cVk2edRuomIEanX6Ddz87egE5Pe8UM';
const cookie_editor = 's:xWHihqZq6jEAObwbfowO5IwdnBxohM7z.VxqsRC5A1VqJVspChcxVPuzEKtRE+aKLF8k3nvCcZ8g';

describe('Editing user levels', () => {

    let userid_plain = '0000-0000-0000-0001';
    let user_url = global.test_host + '/api/v1/user/' + userid_plain;

    describe('PATCH ' + user_url + ' for plain user by editor', () => {
        let j = request.jar();
        let ck = request.cookie('connect.sid=' + cookie_editor);
        j.setCookie(ck, global.test_host);

        let new_level = Math.floor(Math.random() * 100);

        it('should response with HTTP 200 OK', (done) => {
            request({ url: user_url + '?level=' + new_level, jar: j, method: "PATCH" }, (err, res) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 200);
                done();
            });
        });
        it('should respond with a valid JSON document', (done) => {
            request({ url: user_url + '?level=' + new_level, jar: j, method: "PATCH" }, (err, res, body) => {
                assert.ifError(err);
                assert.isObject(JSON.parse(body));
                done();
            });
        });
        it('should respond with document containing updated level', (done) => {
            request({ url: user_url + '?level=' + new_level, jar: j, method: "PATCH" }, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.property(response, 'id');
                assert.property(response, 'name');
                assert.property(response, 'level');
                assert.propertyVal(response, 'id', userid_plain);
                assert.propertyVal(response, 'level', new_level);
                done();
            });
        });
        it('should respond with HTTP 400 if level is not a number', (done) => {
            request({ url: user_url + '?level=thousand', jar: j, method: "PATCH" }, (err, res) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 400);
                done();
            });
        });
        it('should respond with valid JSON containing error message if level is not a number', (done) => {
            request({ url: user_url + '?level=thousand', jar: j, method: "PATCH" }, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.isObject(response);
                assert.property(response, 'error');
                done();
            });
        });
    });

    describe('PATCH non-existing user id by editor', () => {
        let j = request.jar();
        let ck = request.cookie('connect.sid=' + cookie_editor);
        j.setCookie(ck, global.test_host);

        it('should respond with HTTP 400 if user id does not exist', (done) => {
            request({ url: global.test_host + '/api/v1/user/1234-1234' + '?level=42', jar: j, method: "PATCH" }, (err, res, body) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 400);
                done();
            });
        });

        it('should respond with valid JSON containing error message if user id does not exist', (done) => {
            request({ url: global.test_host + '/api/v1/user/1234-1234' + '?level=42', jar: j, method: "PATCH" }, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.isObject(response);
                assert.property(response, 'error');
                done();
            });
        });
    });


    describe('PATCH ' + user_url + ' for plain user by admin', () => {
        let j = request.jar();
        let ck = request.cookie('connect.sid=' + cookie_admin);
        j.setCookie(ck, global.test_host);

        let new_level = Math.floor(Math.random() * 100);

        it('should respond with HTTP 200 and a valid document containing updated level', (done) => {
            request({ url: user_url + '?level=' + new_level, jar: j, method: "PATCH" }, (err, res, body) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 200);
                let response = JSON.parse(body);
                assert.isObject(response);
                assert.property(response, 'id');
                assert.property(response, 'name');
                assert.property(response, 'level');
                assert.propertyVal(response, 'id', userid_plain);
                assert.propertyVal(response, 'level', new_level);
                done();
            });
        });
    });

    describe('PATCH ' + user_url + ' for plain user by plain user herself', () => {
        let j = request.jar();
        let ck = request.cookie('connect.sid=' + cookie_plain);
        j.setCookie(ck, global.test_host);

        it('should response with HTTP 403', (done) => {
            request({ url: user_url + '?level=' + 9999, jar: j, method: "PATCH" }, (err, res) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 403);
                done();
            });
        });
        it('should respond with a valid JSON document containing error messsage', (done) => {
            request({ url: user_url + '?level=' + 9999, jar: j, method: "PATCH" }, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.isObject(response);
                assert.property(response, 'error');
                done();
            });
        });
    });

    describe('PATCH ' + user_url + ' for not logged-in user', () => {
        it('should response with HTTP 401', (done) => {
            request({ url: user_url + '?level=' + 9999, method: "PATCH" }, (err, res) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 401);
                done();
            });
        });
        it('should respond with a valid JSON document containing error messsage', (done) => {
            request({ url: user_url + '?level=' + 9999, method: "PATCH" }, (err, res, body) => {
                assert.ifError(err);
                let response = JSON.parse(body);
                assert.isObject(response);
                assert.property(response, 'error');
                done();
            });
        });
    });
});

