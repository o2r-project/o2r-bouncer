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

require("./setup");;

const cookie_o2r = 's:C0LIrsxGtHOGHld8Nv2jedjL4evGgEHo.GMsWD5Vveq0vBt7/4rGeoH5Xx7Dd2pgZR9DvhKCyDTY';
const cookie_plain = 's:yleQfdYnkh-sbj9Ez--_TWHVhXeXNEgq.qRmINNdkRuJ+iHGg5woRa9ydziuJ+DzFG9GnAZRvaaM';
const cookie_admin = 's:hJRjapOTVCEvlMYCb8BXovAOi2PEOC4i.IEPb0lmtGojn2cVk2edRuomIEanX6Ddz87egE5Pe8UM';
const cookie_editor = 's:xWHihqZq6jEAObwbfowO5IwdnBxohM7z.VxqsRC5A1VqJVspChcxVPuzEKtRE+aKLF8k3nvCcZ8g';

describe.only('User list pagination', () => {
    describe('illegal pagination parameters', () => {
        
        it('should response with HTTP 400 and valid JSON error when start is too small', (done) => {
            request(global.test_host + '/api/v1/user?start=-1', (err, res, body) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 400);
                assert.isObject(JSON.parse(body));
                let response = JSON.parse(body);
                assert.property(response, 'error');
                assert.notProperty(response, 'results');
                assert.include(response.error, 'start');
                assert.notInclude(response.error, 'limit');
                done();
            });
        });
        
        it('should response with HTTP 400 and valid JSON error when start is text', (done) => {
            request(global.test_host + '/api/v1/user?start=start', (err, res, body) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 400);
                assert.isObject(JSON.parse(body));
                let response = JSON.parse(body);
                assert.property(response, 'error');
                assert.notProperty(response, 'results');
                assert.include(response.error, 'start');
                assert.notInclude(response.error, 'limit');
                done();
            });
        });

        it('should response with HTTP 400 and valid JSON error when limit is too small', (done) => {
            request(global.test_host + '/api/v1/user?limit=0', (err, res, body) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 400);
                assert.isObject(JSON.parse(body));
                let response = JSON.parse(body);
                assert.property(response, 'error');
                assert.notProperty(response, 'results');
                assert.include(response.error, 'limit');
                assert.notInclude(response.error, 'start');
                done();
            });
        });
        
        it('should response with HTTP 400 and valid JSON error when limit is text', (done) => {
            request(global.test_host + '/api/v1/user?limit=limit', (err, res, body) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 400);
                assert.isObject(JSON.parse(body));
                let response = JSON.parse(body);
                assert.property(response, 'error');
                assert.notProperty(response, 'results');
                assert.include(response.error, 'limit');
                assert.notInclude(response.error, 'start');
                done();
            });
        });
        
        it('should quietly handle non-integer numbers for start', (done) => {
            request(global.test_host + '/api/v1/user?start=3^3', (err, res, body) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 200);
                assert.isObject(JSON.parse(body));
                let response = JSON.parse(body);
                assert.property(response, 'results');
                assert.notProperty(response, 'error');
                assert.lengthOf(response.results, 3);
                done();
            });
        });
        
        it('should quietly handle non-integer numbers for limit', (done) => {
            request(global.test_host + '/api/v1/user?limit=3.1742', (err, res, body) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 200);
                assert.isObject(JSON.parse(body));
                let response = JSON.parse(body);
                assert.property(response, 'results');
                assert.notProperty(response, 'error');
                assert.lengthOf(response.results, 3);
                done();
            });
        });
    });

    describe('pagination cases', () => {
        let all_users = []

        before(function(done) {
            request(global.test_host + '/api/v1/user', (err, res, body) => {
                assert.ifError(err);
                all_users = JSON.parse(body).results;
                done();
            });
        });

        it('should return the first two users when limit is 2', (done) => {
            request(global.test_host + '/api/v1/user?limit=2', (err, res, body) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 200);
                assert.isObject(JSON.parse(body));
                let response = JSON.parse(body);
                assert.property(response, 'results');
                assert.notProperty(response, 'error');
                assert.lengthOf(response.results, 2);
                assert.includeMembers(response.results, all_users.slice(0,1));
                done();
            });
        });
        
        it('should return the last 2 users of 5 when start is 3 and limit is 3', (done) => {
            request(global.test_host + '/api/v1/user?start=4&limit=3', (err, res, body) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 200);
                assert.isObject(JSON.parse(body));
                let response = JSON.parse(body);
                assert.property(response, 'results');
                assert.notProperty(response, 'error');
                assert.lengthOf(response.results, 2);
                assert.includeMembers(response.results, all_users.slice(3,4));
                done();
            });
        });
        
        it('should return one user when start ist 4 and limit is 1', (done) => {
            request(global.test_host + '/api/v1/user?start=4&limit=1', (err, res, body) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 200);
                assert.isObject(JSON.parse(body));
                let response = JSON.parse(body);
                assert.property(response, 'results');
                assert.notProperty(response, 'error');
                assert.lengthOf(response.results, 1);
                assert.deepEqual(response.results, all_users.slice(3,4));
                assert.notIncludeDeepOrderedMembers(response.results, all_users.slice(0,3));
                done();
            });
        });
        
        it('should return empty list when start is larger than number of users', (done) => {
            request(global.test_host + '/api/v1/user?start=42', (err, res, body) => {
                assert.ifError(err);
                assert.equal(res.statusCode, 200);
                assert.isObject(JSON.parse(body));
                let response = JSON.parse(body);
                assert.property(response, 'results');
                assert.notProperty(response, 'error');
                done();
            });
        });
    });
});

