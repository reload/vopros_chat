<?php
/**
 * @file
 * The Vopros Chat class.
 */

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
  public function __construct($channel, $name = 'Vopros Chat', $active = TRUE) {
    // Channel name should be filtered, but make sure.
    $this->channel = preg_replace('/[^(_|a-zA-Z0-9)]/', '_', $channel);

    // Check if chat channel exists.
    if (!nodejs_get_check_channel($this->channel)) {
      // It doesn't, so try to add it.
      if (nodejs_get_add_channel($this->channel)) {
        drupal_set_message(t('Chat channel created successfully'));
      }
      // In case of error, let the caller know.
      // @todo this is broken, you cannot return false from a constructor.
      else {
        drupal_set_message(t("The Chat channel couldn\'t be created"), 'error');
        return FALSE;
      }
    }

    // Set the chat name.
    $this->name = $name;

    $this->active = $active;
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
        'id' => $this->channel,
        'class' => array(
          'vopros-chat',
        ),
      ),
    );

    // Initialize chat window with existing chat log.
    $question_id = preg_replace('/.*__([0-9]+)_.*/', '\1', $this->channel);
    if (is_numeric($question_id)) {
      $path = drupal_get_path('module', 'vopros_chat') . '/templates';
      $form['vopros_chat']['chat_log'] = array(
        '#log' => vopros_chat_log_load($question_id),
        '#path' => $path,
        '#template' => 'vopros-chat-log-activity-feed-items',
        '#theme' => 'vopros_chat_log_activity_feed_items',
        '#prefix' => '<div class="chat-log" id="chat-log-' . $this->channel . '">',
        '#suffix' => '</div>',
        '#question' => vopros_question_load($question_id),
        '#attached' => array(
          'css' => array(drupal_get_path('module', 'vopros_chat') . '/css/vopros_chat.css'),
          'js' => array(
            'chat-log' => array(
              'type' => 'file',
              'data' => drupal_get_path('module', 'vopros_chat') . '/js/vopros_chat_log.js',
            ),
          ),
          'libraries_load' => array(array('date_format')),
        ),
      );
    }
    else {
      $form['vopros_chat']['chat_log'] = array(
        '#markup' => '<div class="chat-log">Chat log is empty. Start writing! =): </div>',
      );
    }

    if ($this->active) {
      $form['vopros_chat']['chat_entry_box'] = array(
        '#type' => 'textarea',
        '#title' => t('Enter your message here:'),
        '#value' => '',
        '#rows' => 2,
      );

      $form['vopros_chat']['submit'] = array(
        '#type' => 'submit',
        '#value' => t('Send Message'),
      );
    }

    return $form;
  }

  /**
   * Add the assert needed to the page.
   */
  public function loadAssets() {
    if ($this->active) {
      // Add JavaScript.
      drupal_add_js(drupal_get_path('module', 'vopros_chat') . '/js/vopros_chat.js');
    }

    // Add CSS.
    drupal_add_css(drupal_get_path('module', 'vopros_chat') . '/css/vopros_chat.css');

    // Add general chat settings.
    $chat_settings = array(
      $this->channel => array(
        'channel' => $this->channel,
      ),
    );
    drupal_add_js(array('vopros_chat' => array('chats' => $chat_settings)), 'setting');

    // Current user settings.
    global $user;
    $question_id = preg_replace('/.*__([0-9]+)_.*/', '\1', $this->channel);
    if (is_numeric($question_id)) {
      $question = vopros_question_load($question_id);
      $username = $question->user_name;
    }
    else {
      $username = t('User');
    }
    $current_user = array(
      'uid' => $user->uid,
      // @todo Customizable names for authenticated users?
      'name' => $user->uid ? variable_get('site_name', t('Watch')) : $username,
    );
    drupal_add_js(array('vopros_chat' => array('currentUser' => $current_user)), 'setting');
  }
}
