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
      'nodemon' => 'Run with nodemon.',
    ),
  );

  $items['vopros-chat-package-json'] = array(
    'description' => 'Generate Vopros chat package.json.',
    'bootstrap' => DRUSH_BOOTSTRAP_DRUPAL,
  );

  return $items;
}

/**
 * Command callback for starting server.
 */
function drush_vopros_chat_start() {
  $node_bin = drush_get_option('nodemon', FALSE) ? 'nodemon' : 'node';
  $nodejs_path = getcwd() . '/' . drupal_get_path('module', 'nodejs');
  $vopros_chat_path = getcwd() . '/' . drupal_get_path('module', 'vopros_chat');

  chdir(drupal_get_path('module', 'vopros_chat') . '/server');
  $config_file = vopros_chat_create_chat_config();
  $command = 'NODE_PATH=%s/server/node_modules %s %s/server.js %s';

  if (drush_get_option('node-debug', FALSE)) {
    $command = 'DEBUG=* ' . $command;
  }

  printf($command . "\n", $vopros_chat_path, $node_bin, $nodejs_path, $config_file);
  drush_shell_exec_interactive($command, $vopros_chat_path, $node_bin, $nodejs_path, $config_file, TRUE);
}

/**
 * Command callback for generating package.json.
 */
function drush_vopros_chat_package_json() {
  $nodejs_path = getcwd() . '/' . drupal_get_path('module', 'nodejs');
  $vopros_chat_path = getcwd() . '/' . drupal_get_path('module', 'vopros_chat');
  $info = drupal_parse_info_file($vopros_chat_path . '/vopros_chat.info');

  // Read package.json from nodejs.module.
  $package_json = json_decode(file_get_contents($nodejs_path . '/package.json'));

  // Fix some entries.
  $package_json->name = 'Vopros_Chat';
  $package_json->homepage = 'https://github.com/reload/vopros_chat';
  $package_json->description = $info['description'];
  if (!empty($info['version'])) {
    $package_json->version = preg_replace('/x-/', '', $info['version']);
  }
  $package_json->dependencies->drupal = '0.5.2';
  $package_json->dependencies->hashish = '0.0.4';
  $package_json->dependencies->execSync = '1.0.1-pre';

  // Write it as our own package.json.
  file_put_contents($vopros_chat_path . '/server/package.json', drupal_json_encode($package_json));
}
