/**
 * @file vopros_chat.module.js
 *
 * Node JS Chat Server extension.
 */
var crypto = require('crypto'),
    drupal = require('drupal'),
    hashish = require('hashish');

exports.setup = function (config) {
  publishMessageToChannel = config.publishMessageToChannel;
  addClientToChannel = config.addClientToChannel;

  var adminChannel = 'vopros_channel_admin_status';

  var timestamp = function() {
    return (new Date()).getTime() / 1000;
  };

  var updateStatus = function(channelName, refTime) {
    var channel = config.channels[channelName];
    if (channelName == adminChannel ||
        !channel ||
        !hashish(channel).has('timestamp')) {
      return;
    }

    if (!config.channels[adminChannel]) {
      console.log("Creating admin channel.");
      config.channels[adminChannel] = {'sessionIds': {}};
    }

    if (refTime === undefined) {
      refTime = timestamp();
    }

    var adminUsers = 0;
    adminUsers = hashish(channel.sessionIds).filter(function (sessionId) {
      return hashish(config.channels[adminChannel].sessionIds).has(sessionId);
    }).length;

    var message = {
      'channel': adminChannel,
      'channel_name': channelName,
      'users': Object.keys(channel.sessionIds).length,
      'admin_users': adminUsers,
      'timestamp': channel.timestamp,
      'ref_time': refTime
    };

    publishMessageToChannel(message);
  };

  var connectToDatabase = function(config) {
    // Filter out empty values, and extract only the ones we need.
    options = hashish(config.settings.database)
      .filter(function (x) {return x !== '';})
      .extract(['host', 'port', 'username', 'password', 'database'])
      .compact.end;

    // We use 'username', mysql class use 'user'.
    if (options.hasOwnProperty('username')) {
      options.user = options.username;
      delete options.username;
    }

    // Connect to the database.
    drupal.db.connect(options);
  };
  connectToDatabase(config);

  var checkHash = function(message) {
    // First compare hash value of question id.
    question_id = message.channel.split('__')[1].split('_')[0];
    question_hash_from_url = message.channel.split('__')[1].split('_')[1];
    question_hash_calculated = crypto
      .createHash('sha256')
      .update(config.settings.serviceKey + question_id)
      .digest('hex');

    // Only add client to channel if hash values match.
    if (question_hash_calculated == question_hash_from_url) {
      return true;
    }
    console.log('Vopros Chat extension received wrong hash of question id.');
    return false;
  };

  var logMessageToDatabase = function(message) {
    var questionId = message.channel.split('__')[1].split('_')[0];
    var table = config.settings.database_tables['{vopros_chat_log}'];
    var timestamp = Math.floor(Date.now() / 1000);
    drupal.db.query("INSERT INTO `" + table + "` (timestamp, question_id, uid, name, session_id, msg) VALUES (?, ?, ?, ?, ?, ?)", [timestamp, questionId, message.data.uid, message.data.name, message.data.sessionId, message.data.msg], function (err, rows) {
      if (err) {
        console.log(err);
      }
    });
  }

  process.on('client-message', function (sessionId, message) {
    // Check message type. Prevents the extension from forwarding any message
    // that is not from the vopros_chat module.
    if (message.type == 'vopros_chat') {
      console.log('Vopros Chat extension received a "client-message" event. Action: ' + message.action);
      switch (message.action) {
        // When chat is initialised, user needs to be added to the chat Channel.
      case 'chat_init':

        // Error out if hash in channel name does not validate.
        if (!checkHash(message)) {
          return false;
        }

        addClientToChannel(sessionId, message.channel);

        if (config.channels.hasOwnProperty(message.channel)) {
          config.channels[message.channel].timestamp = timestamp();
        }
        updateStatus(message.channel);

        // When entering a chat channel, the client might have sent a message
        // so that users know about this.
        publishMessageToChannel(message);
        break;

        // Usual message transmission.
      case 'chat_message':
        if (config.channels.hasOwnProperty(message.channel)) {
          config.channels[message.channel].timestamp = timestamp();
        }
        updateStatus(message.channel);

        publishMessageToChannel(message);
        logMessageToDatabase(message);
        break;

      }
    }

    // Messages for admin status.
    if (message.type == 'vopros_chat_admin') {
      switch (message.action) {
      case 'list_all':
        addClientToChannel(sessionId, adminChannel);
        var time = timestamp();
        hashish(config.channels).forEach(function(channel, channelId) {
          // Only update channels we have touched.
          if (hashish(channel).has('timestamp')) {
            updateStatus(channelId, time);
          }
        });
        break;
      }
    }
  });

  process.on('client-disconnect', function (sessionId) {
    // Update status for all channels this connection was part of
    // (should really just be one).

    var updateChannels = [];

    hashish(config.channels).forEach(function (channel, channelId) {
      if (hashish(channel.sessionIds).has(sessionId)) {
        updateChannels.push(channelId);
      }
    });

    // Send the updates after a one second timeout, to give
    // cleanupSocket time to remove the socket from the channels.
    setTimeout(function(channels) {
      var time = timestamp();
      hashish(channels).forEach(function (channel, channelId) {
        if (hashish(channels).has(channelId)) {
          updateStatus(channel, time);
        }
      });
    }, 1000, updateChannels);
  });
};
