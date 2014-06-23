/**
 * @file vopros_chat.module.js
 *
 * Node JS Chat Server extension.
 */
var crypto = require('crypto');

exports.setup = function (config) {
  publishMessageToChannel = config.publishMessageToChannel;
  addClientToChannel = config.addClientToChannel;

  process.on('client-message', function (sessionId, message) {
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
          publishMessageToChannel(message);
          break;

      }
    }
  });
};
