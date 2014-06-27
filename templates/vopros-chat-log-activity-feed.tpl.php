<?php
/**
 * @file
 * Render a chat log activity feed item.
 */
?>
<div class="log-feed-item feed-item">
  <div class="log-header"><?php echo t('Chat with @user_name on !date', array(
               '@user_name' => $variables['log']['#question']->user_name,
               '!date' => format_date($variables['log']['#question']->created, 'short'),
             )) ?></div>
  <div class="log-content vopros-chat">
    <?php echo render($variables['log']['#chatlog']) ?>
  </div>
</div>
