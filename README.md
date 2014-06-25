Vopros Chat
===========

Imlements chatting with Vopros editors.

Starting the server
-------------------

Simply run `drush vopros-chat-start` to start a server. Add the
`--node-debug` option to get more debugging output from node.

Internals
---------

To install/update the node modules used by the server from the nodejs
module, symlink the package.json file into the server directory and
run npm install/update.

Then also run `npm install drupal` from the server directory.

Or simply run `drush vopros-chat-package-json` which will generate a
package.json file in the server directory for you.
