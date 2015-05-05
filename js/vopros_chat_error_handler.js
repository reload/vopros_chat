/**
 * @file vopros_chat_error_handler.js
 *
 *
 */

window.onerror = function(msg, url, line) {
  alert("JavaScript error.\nPlease check that your browser isn't running in compatibility view.\nMessage: " + msg + "\n in " + url);
  // Returning true should suppress any browser error dialogs
  // (primarily old versions of IE).
  return true;
};
