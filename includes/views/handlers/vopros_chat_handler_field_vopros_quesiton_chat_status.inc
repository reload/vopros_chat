<?php

/**
 * @file
 * Views handler for a virtual chat status field.
 */

class vopros_chat_handler_field_vopros_quesiton_chat_status extends views_handler_field {

  /**
   * {@inheritdoc}
   */
  public function construct() {
    parent::construct();
    $this->additional_fields += array(
      'user_answer_preference' => 'user_answer_preference',
    );
    $this->real_field = 'question_id';
  }

  /**
   * {@inheritdoc}
   */
  public function render($values) {
    if ($this->get_value($values, 'user_answer_preference') == 'chat') {
      return '<span class="chat-status" data-channel-name="' . vopros_chat_get_channel_name_from_question_id($this->get_value($values)) . '"></span>';
    }

    return t('N/A');
  }
}
