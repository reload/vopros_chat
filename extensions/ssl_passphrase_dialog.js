/**
 * @file
 * ssl_passphrase_dialog.js
 *
 * Node JS SSL PassPhrase Dialog extension.
 *
 * This implements something similar to Apaches
 *
 * SSLPassPhraseDialog exec:/path/to/script
 */

var exec = require('sync-exec');
exports.settingsAlter = function(settings) {
  if (settings.sslPassPhraseDialog) {
    settings.sslPassPhrase = exec(settings.sslPassPhraseDialog).stdout.trim();
  }
};
