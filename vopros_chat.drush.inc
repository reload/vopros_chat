<?php

/**
 * @file
 * Drush commands for the Vopros chat module.
 */

/**
 * Implements hook_drush_command().
 */
function vopros_chat_drush_command() {
  $items = array();

  $items['vopros-chat-start'] = array(
    'description' => 'Start Vopros chat server.',
    'bootstrap' => DRUSH_BOOTSTRAP_DRUPAL,
    'options' => array(
      'node-debug' => 'Show debugging output.',
    ),
  );

  return $items;
}

/**
 * Command callback for starting server.
 */
function drush_vopros_chat_start() {
  $nodejs_path = getcwd() . '/' . drupal_get_path('module', 'nodejs');
  $vopros_chat_path = getcwd() . '/' . drupal_get_path('module', 'vopros_chat');

  chdir(drupal_get_path('module', 'vopros_chat') . '/server');
  $config_file = vopros_chat_create_chat_config();
  $command = 'NODE_PATH=%s/server/node_modules node %s/server.js %s';

  if (drush_get_option('node-debug', FALSE)) {
    $command = 'DEBUG=* ' . $command;
  }

  printf($command . "\n", $vopros_chat_path, $nodejs_path, $config_file);
  drush_shell_exec_interactive($command, $vopros_chat_path, $nodejs_path, $config_file, TRUE);
}
