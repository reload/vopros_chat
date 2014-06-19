<?php

/**
 * Vopros Chat class
 */
class VoprosChat {

  /**
   * Chat Name. Human name to be displayed as markup (e.g the chat Title).
   */
  protected $name;

  /**
   * A chat needs at least a channel to (send / receive) messages (to / from).
   *
   * The channel should be generated within the class, instead of passing it
   * as an argument, to avoid calls to the channel creation function from
   * different places in different ways. That will ensure unique channels for
   * different chats, which will ultimately affect the chat behavior on the
   * browser as well, given the channels are used as CSS IDs for each possible
   * chat on the page.
   */
  protected $channel;

  /**
   * Javascript settings to be sent to the browser.
   */
  protected $settings;

  /**
   * Users on the chat, stored as User IDs
   */
  protected $userIds;

  /**
   * Chat render array
   */
  protected $form;

  /**
   * Basic constructor, just with the socket.io channel assigned.
   */
  public function __construct($channel, $name = 'Vopros Chat', $settings = array()) {
    // Make sure the channel name generated is unique within the page request.
    $unique_id = &drupal_static(__METHOD__);
    if (!isset($unique_id)) {
      $unique_id = 0;
    }
    $unique_id++;
    $unique_channel = __CLASS__ . '__' . $channel . '_' . $unique_id;

    // Some filtering to avoid unwanted characters on the channel_name.
    $this->channel = preg_replace('/[^(_|a-zA-Z0-9)]/', '_', $unique_channel);


    // Check if chat channel exists.
    if (!nodejs_get_check_channel($this->channel)) {
      // It doesn't, so try to add it.
      if (nodejs_get_add_channel($this->channel)) {
        drupal_set_message(t('Chat channel created successfully'));
      }
      // In case of error, let the caller know.
      else {
        drupal_set_message(t("The Chat channel couldn\'t be created"), 'error');
        return FALSE;
      }
    }

    // Set the chat name.
    $this->name = $name;

    // Store any settings passed on to the constructor.
    $this->settings = $settings;
  }

  /**
   * Wrapper function to call sequential steps to render a functional chat.
   */
  public function render() {
    // Generate form.
    $this->form = $this->renderArray();
    // Add assets to the page.
    $this->loadAssets();

    // Render the form.
    return drupal_render($this->form);
  }

  /**
   * Generate render array for the chat form.
   */
  public function renderArray() {
    // If the render array has already been generated, return it.
    if (isset($this->form)) {
      return $this->form;
    }
    // Otherwise, generate it.
    $form = array();

    $form['vopros_chat'] = array(
      '#type' => 'fieldset',
      '#title' => $this->name,
      '#attributes' => array(
         // Assuming channel comes transliterated as a valid CSS ID.
        'id' => 'vopros_chat_' . $this->channel,
        'class' => array(
          'vopros-chat',
        ),
      ),
    );
    $form['vopros_chat']['chat_log'] = array(
      '#markup' => '<div class="chat-log">Chat log is empty. Start writing! =): </div>',
    );
    $form['vopros_chat']['chat_entry_box'] = array(
      '#type' => 'textarea',
      '#title' => t('Enter your message here: '),
      '#value' => '',
      '#rows' => 2,
      '#attributes' => array(
        'id' => 'chat-entry-box',
      ),
    );
    $form['vopros_chat']['submit'] = array(
      '#type' => 'submit',
      '#value' => t('Send Message'),
    );

    return $form;
  }

  /**
   * Add the assert needed to the page.
   */
  public function loadAssets() {
    // Javascript Assets.
    drupal_add_js(drupal_get_path('module', 'vopros_chat') . '/vopros_chat.js');

    // This is not the best place to do this, but for now it does the job to
    // allow a dev to choose whether the chat messages will go through drupal,
    // or through the nodejs server extension (directly through sockets).
    if (isset($this->settings['messageTransmission']) && $this->settings['messageTransmission'] == 'drupal') {
      $this->settings['postMessagePath'] = url('vopros-chat/message/post', array('absolute' => TRUE));
    }

    // Add general chat settings.
    $chat_settings = array(
      $this->channel => array(
        'channel' => $this->channel,
        'settings' => $this->settings,
      ),
    );
    drupal_add_js(array('vopros_chat' => array('chats' => $chat_settings)), 'setting');

    // Add global settings. TODO: This should be overridable.
    $global_settings = array(
      'defaultAvatar' => '/' . variable_get('user_picture_default', ''),
    );
    drupal_add_js(array('vopros_chat' => array('globalSettings' => $global_settings)), 'setting');

    // Current user settings.
    global $user;
    $current_user = array(
      'uid' => $user->uid,
      // @todo What name to use?
      'name' => $user->uid ? $user->name : t('User'),
    );
    drupal_add_js(array('vopros_chat' => array('currentUser' => $current_user)), 'setting');

    // CSS Assets TODO: Make this optional, through a setting option maybe?.
    drupal_add_css(drupal_get_path('module', 'vopros_chat') . '/css/vopros_chat.css');
  }

  }
}
