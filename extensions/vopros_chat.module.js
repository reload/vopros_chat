/**
 * @file vopros_chat.module.js
 *
 * Node JS Chat Server extension.
 */
var crypto = require('crypto'),
    drupal = require('drupal');

exports.setup = function (config) {
  publishMessageToChannel = config.publishMessageToChannel;
  addClientToChannel = config.addClientToChannel;

  var adminChannel = 'vopros_channel_admin_status';

  var timestamp = function() {
    return (new Date()).getTime() / 1000;
  };

  var updateStatus = function(channelName, refTime) {
    var channel = config.channels[channelName];
    if (!channel || !channel.hasOwnProperty('timestamp')) {
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
    for (var sessionId in channel.sessionIds) {
      if (config.channels[adminChannel].sessionIds.hasOwnProperty(sessionId)) {
        adminUsers++;
      }
    }

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
    options = config.settings.database;
    // We need to rename the username property to user.
    options.user = options.username;
    delete options.username;

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
    questionId = message.channel.split('__')[1].split('_')[0];
    drupal.db.query("INSERT INTO vopros_chat_log (timestamp, question_id, uid, name, session_id, msg) VALUES (?, ?, ?, ?, ?, ?)", [Math.floor(Date.now() / 1000), questionId, message.data.uid, message.data.name, message.data.sessionId, message.data.msg], function (err, rows) {});
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
      case 'subscribe':
        addClientToChannel(sessionId, 'vopros_channel_admin_status');
        var time = timestamp();
        for (var channelId in config.channels) {
          // Only update channels we have touched.
          if (config.channels[channelId].hasOwnProperty('timestamp')) {
            updateStatus(channelId, time);
          }
        }
        break;
      }
    }
  });

  process.on('client-disconnect', function (sessionId) {
    // Update status for all channels this connection was part of
    // (should really just be one).

    var updateChannels = [];

    for (var channelId in config.channels) {
      if (config.channels[channelId].sessionIds[sessionId]) {
        updateChannels.push(channelId);
      }
    }

    // Send the updates after a one second timeout, to give
    // cleanupSocket time to remove the socket from the channels.
    setTimeout(function(channels) {
      var time = timestamp();
      for (var index in channels) {
        if (channels.hasOwnProperty(index)) {
          updateStatus(channels[index], time);
        }
      }
    }, 1000, updateChannels);
  });
};
