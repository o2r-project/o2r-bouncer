/*
 * (C) Copyright 2016 o2r project.
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

var c = require('../config/config');
var debug = require('debug')('user');

var User = require('../lib/model/user');

exports.viewSingle = (req, res) => {
  var id = req.params.id;
  var answer = { id };

  debug('User information about %s requested.', id);

  User.findOne({ orcid: id }).exec((err, user) => {
    // eslint-disable-next-line no-eq-null, eqeqeq
    if (err || user == null) {
      res.status(404).send(JSON.stringify({ error: 'no user with this id' }));
    } else {
      // show public information
      answer.name = user.name;

      // show level and lastseen only to editor users and the user herself
      if (req.isAuthenticated()
        && (req.user.level >= c.user.level.userEdit
          || user.orcid === id)) {
        answer.level = user.level;
        answer.lastseen = user.lastseenAt;
      }

      res.status(200).send(JSON.stringify(answer));
    }
  });
};

exports.view = (req, res) => {
  var answer = {};
  var limit = parseInt(req.query.limit || c.list_limit, 10);
  var start = parseInt(req.query.start || 1, 10) - 1;

  if (start > 1) {
    answer.previous = req.route.path + '?limit=' + limit + '&start=' + start;
  }

  User.find().select('orcid').skip(start * limit).limit(limit).exec((err, users) => {
    if (err) {
      res.status(500).send(JSON.stringify({ error: 'query failed' }));
    } else {
      var count = users.length;
      if (count <= 0) {
        res.status(404).send(JSON.stringify({ error: 'no compendium found' }));
      } else {
        if (count >= limit) {
          answer.next = req.route.path + '?limit=' + limit + '&start=' + (start + 2);
        }

        answer.results = users.map(user => {
          return user.orcid;
        });
        res.status(200).send(JSON.stringify(answer));
      }
    }
  });
};

exports.patchLevel = (req, res) => {
  var id = req.params.id;

  // check user level
  if (!req.isAuthenticated()) {
    res.status(401).send('{"error":"user is not authenticated"}');
    return;
  }
  if (req.user.level < c.user.level.userEdit) {
    res.status(401).send('{"error":"user level does not allow edit"}');
    return;
  }

  debug('User %s should be patch with %s by user %s', id, req.query, req.user);

  var newLevel = parseInt(req.query.level, 10);

  if (isNaN(newLevel)) {
    res.status(400).send('{"error":"parameter \'level\' could not be parsed as an integer"}');
    return;
  }

  User.findOne({ orcid: id }).exec((err, user) => {
    // eslint-disable-next-line no-eq-null, eqeqeq
    if (err || user == null) {
      res.status(404).send(JSON.stringify({ error: 'no user with this id' }));
    } else {
      user.level = newLevel;

      user.save(function (err) {
        if (err) {
          res.status(500).send(JSON.stringify({ error: 'could not save edit' }));
          return;
        }

        debug('Updated user level of %s to %s', id, newLevel);
        let answer = { id };
        answer.name = user.name;
        answer.level = user.level;
        answer.lastseen = user.lastseenAt;

        res.status(200).send(JSON.stringify(answer));
      });
    }
  });
};