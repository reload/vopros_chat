/**
 * @file vopros_chat.module.js
 *
 * Node JS Chat Server extension.
 */
var crypto = require('crypto');

exports.setup = function (config) {
  publishMessageToChannel = config.publishMessageToChannel;
  addClientToChannel = config.addClientToChannel;

  var channelStatus = {};

  var timestamp = function() {
    return (new Date()).getTime() / 1000;
  }

  var updateStatus = function(channelName, refTime) {
    var channel = channelStatus[channelName];
    if (!channel) {
      return;
    }

    if (refTime === undefined) {
      refTime = timestamp();
    }

    var users = 0;
    if (config.channels[channelName]) {
      console.dir(config.channels[channelName].sessionIds);
      users = Object.keys(config.channels[channelName].sessionIds).length;
    }

    var message = {
      'channel': 'vopros_channel_admin_status',
      'channel_name': channelName,
      'users': users,
      'timestamp': channel.timestamp,
      'ref_time': refTime
    };

    if (!config.channels[message.channel]) {
      console.log("Creating admin channel.");
      config.channels[message.channel] = {'sessionIds': {}};
    }
    publishMessageToChannel(message);
  }

  process.on('client-message', function (sessionId, message) {
    console.dir(message);
    // Check message type. Prevents the extension from forwarding any message
    // that is not from the vopros_chat module.
    if (message.type == 'vopros_chat') {
      console.log('Vopros Chat extension received a "client-message" event. Action: ' + message.action);
      switch (message.action) {
        // When chat is initialised, user needs to be added to the chat Channel.
      case 'chat_init':

        // First compare hash value of question id.
        question_id = message.channel.split('__')[1].split('_')[0];
        question_hash_from_url = message.channel.split('__')[1].split('_')[1];
        question_hash_calculated = crypto
          .createHash('sha256')
          .update(config.settings.serviceKey + question_id)
          .digest('hex');

        // Only add client to channel if hash values match.
        if (question_hash_calculated == question_hash_from_url) {
          addClientToChannel(sessionId, message.channel);
          channelStatus[message.channel] = channelStatus[message.channel] || {'users' : 0, 'timestamp': 0};
          // channelStatus[message.channel].users++;
          channelStatus[message.channel].timestamp = timestamp();
          updateStatus(message.channel);
        }
        else {
          console.log('Vopros Chat extension received wrong hash of question id.');
          return false;
        }

        // When entering a chat channel, the client might have sent a message
        // so that users know about this.
        publishMessageToChannel(message);
        break;

        // Usual message transmission.
      case 'chat_message':
        channelStatus[message.channel].timestamp = timestamp();
        updateStatus(message.channel);
        publishMessageToChannel(message);
        break;

      }
    }

    // Messages for admin status.
    if (message.type == 'vopros_chat_admin') {
      switch (message.action) {
      case 'subscribe':
        addClientToChannel(sessionId, 'vopros_channel_admin_status');
        for (var channelId in channelStatus) {
          updateStatus(channelId, timestamp());
        }
        break;
      }
    }
  });
};
