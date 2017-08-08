/*
 * (C) Copyright 2017 o2r project.
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

const config = require('../config/config');
const slack = require('slack');
const debug = require('debug')('bouncer:slack');
const orcid = require('identifiers-orcid');
const request = require('request');
const User = require('./model/user');

// start listening to the slack team associated to the token
exports.start = function (err, done) {
  if (config.slack.verification_token == 'undefined' || config.slack.bot_token == 'undefined') {
    debug('Slack bot token and verification token not properly configured: %s | %s', config.slack.bot_token, config.slack.verification_token);
    err(new Error('Required Slack environment variables not available.'));
    return;
  }

  bot2r = slack.rtm.client();

  bot2r.started(function (payload) {
    debug('Started... payload from rtm.start: %s', JSON.stringify(payload));
  });

  bot2r.channel_joined(function (payload) {
    debug('payload from channel joined', JSON.stringify(payload));
  });

  bot2r.message(function (payload) {
    debug('[message] Incoming message: %s', JSON.stringify(payload));
  });

  bot2r.goodbye(function (payload) {
    debug('[goodbye] Server wants to close the connection soon... %s', JSON.stringify(payload));
  });

  bot2r.hello(function (payload) {
    debug('[hello] connected to server: %s', JSON.stringify(payload));

    joinChannelAndSayHello(err, done);
  });

  // connect!
  bot2r.listen({ token: config.slack.bot_token });
  //debug("bot2r: %s", Object.keys(bot2r));
};

joinChannelAndSayHello = function (err, done) {
  // bot is added to channel during adding the bot the the organisation
  //slack.channels.join({
  //  token: config.slack.bot_token,
  //  name: config.slack.channel.status
  //}, (err, data) => {
  //  if (err)
  //    debug(err);
  //  else
  //    debug('Response on joining channel %s: %s', config.slack.channel.status, JSON.stringify(data));
  //});

  slack.chat.postMessage({
    token: config.slack.bot_token,
    channel: config.slack.channel.status,
    text: 'I am now online from *badger* with callback URL `' + config.oauth.default.callbackURL + '`.'
  }, (e, data) => {
    if (e) {
      debug(e);
      err(e);
    }
    else {
      debug('Response on posting startup message to %s: %s', config.slack.channel.status, JSON.stringify(data));
      done(data);
    }
  });
}

exports.newOrcidUser = function (orcid) {
  let user_link = 'https://orcid.org/' + orcid;
  debug('Starting newUser chat for user %s', orcid);

  slack.chat.postMessage({
    token: config.slack.bot_token,
    channel: config.slack.channel.userevents,
    text: '<!here> A new ORCID user just registered: ' + user_link,
    attachments: [
      {
        title: 'New user registration: ' + orcid,
        title_link: user_link, // important "data", do not remove
        text: "What user level should the new user get?",
        fallback: "0",
        callback_id: "user_level",
        color: "#004286",
        footer: "bot2r created this for bouncer at " + config.oauth.default.callbackURL,
        ts: (new Date).getTime(),
        footer_icon: "http://o2r.info/favicon-16x16.png",
        attachment_type: "default",
        actions: [
          {
            "name": "user_level",
            "text": "Stay new user",
            "type": "button",
            "value": "0"
          },
          {
            "name": "user_level",
            "text": "Known user",
            "type": "button",
            "value": config.user.level.known
          },
          {
            "name": "user_level",
            "text": "Editor",
            "type": "button",
            "value": config.user.level.editor,
            "style": "danger",
            "confirm": {
              "title": "Are you sure?",
              "text": "This user will become *editor*.",
              "ok_text": "Yes",
              "dismiss_text": "No"
            }
          },
          {
            "name": "user_level",
            "text": "Admin",
            "type": "button",
            "value": config.user.level.admin,
            "style": "danger",
            "confirm": {
              "title": "Are you sure?",
              "text": "This user will become *admin*.",
              "ok_text": "Yes",
              "dismiss_text": "No"
            }
          }
        ]
      }
    ]
  }, (err, data) => {
    if (err) {
      debug('Error posting new user message: %s', err);
    }
    else {
      if (data.ok) {
        debug('Message send was OK');
      } else {
        debug('Message send NOT OK. Response for posting new user message: %s', JSON.stringify(data));
      }
    }
  });
};

exports.incomingAction = (req, res) => {
  let payload = JSON.parse(req.body.payload);
  debug('[action] %s', JSON.stringify(payload));

  // immediately acknowledge, use response URL for updates
  res.status(200).send();

  if (payload.token !== config.slack.verification_token) {
    debug('[action] Incorrect verification token, not processing this incoming action further!');
    // "If they do not match, do not respond to the request with a 200 OK or other message."
    //res.status(200).send({
    //  token: config.slack.bot_token,
    //  replace_original: true,
    //  text: '*Incorrect verification token* provided by Slack message, NOT continueing further. Original message: "' + payload.original_message.text + '"'
    //});
    return;
  }

  // immediately reply with a message what will happen
  if (payload.actions.length > 1)
    debug('Received %s actions but can only handle first one.', payload.actions.length);

  let response_url = payload.response_url; // use up to 5 times within 30 minutes
  let action = payload.actions[0].name;
  let new_level = payload.actions[0].value;

  let message = {
    text: 'Thanks! User _' + payload.user.name + '_ wants to change ' + action + ' to `' + new_level + '`.',
    replace_original: false
  }
  sendMessageToSlackResponseURL(response_url, message, function (result) {
    // apply the action using the response URL
    if (action === 'user_level') {
      let target_user = orcid.extract(payload.original_message.text);
      userLevelAction(payload.user.name, new_level, target_user, response_url);
    }
  });
};

// https://api.slack.com/tutorials/intro-to-message-buttons
function sendMessageToSlackResponseURL(responseURL, msg, done) {
  debug('Posting to slack response URL: %s\n%s', responseURL, JSON.stringify(msg));

  var options = {
    uri: responseURL,
    method: 'POST',
    headers: {
      'Content-type': 'application/json'
    },
    json: msg
  }

  request(options, (err, response, body) => {
    if (err) {
      debug('Error posting to slack response URL: %s', toString(err));
      done(err);
    } else {
      debug('Posted message to response URL: %s', JSON.stringify(body));
      done(body);
    }
  });
}

userLevelAction = (authorizing_user, new_level, target_user, response_url) => {
  debug('[action] %s wants to set %s\'s user level to %s', authorizing_user, target_user, new_level);

  if (!config.slack.allowedUsers.test(authorizing_user)) {
    debug('[action] User %s is not allowed to change user levels via Slack messages.', authorizing_user);
    sendMessageToSlackResponseURL(response_url, {
      text: '*User ' + authorizing_user + " is not allowed to do this.*",
      replace_original: false
    }, function (result) {
      debug(result);
    });
    return;
  }

  User.findOne({ orcid: target_user }).exec((err, user) => {
    // eslint-disable-next-line no-eq-null, eqeqeq
    if (err || user == null) {
      debug('No user with id %s.', target_user);
    } else {
      user.level = new_level;

      user.save(function (err) {
        if (err) {
          debug('Could not save level change of user: %s', err);
          sendMessageToSlackResponseURL(response_url, err, function (result) {
            debug(result);
          });
        } else {
          debug('Updated user level of %s to %s', user.orcid, new_level);

          // notify user
          let message = {
            text: 'Level updated! :rocket:',
            replace_original: false
          }
          sendMessageToSlackResponseURL(response_url, message, function (result) {
            debug(result);
          });

          // notify all users in channel
          slack.chat.postMessage({
            token: config.slack.bot_token,
            channel: config.slack.channel.status,
            text: authorizing_user + ' updated the level of user _' + user.name + '_ to `' + new_level + '`.',
          }, (e, data) => {
            if (e) {
              debug(e);
            }
            else {
              debug('Response on posting level change message to %s: %s', config.slack.channel.status, JSON.stringify(data));
            }
          });
        }
      });
    }
  });
}

exports.optionsLoad = (req, res) => {
  //let payload = JSON.parse(req.body.payload);
  debug('[options-load] %s', req);
  let answer = {};
  res.status(200).send(answer);
};