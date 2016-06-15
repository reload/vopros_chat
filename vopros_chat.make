api = 2
core = 7.x

projects[nodejs][version] = 1.8
; Fix missing session. https://www.drupal.org/node/2288625
projects[nodejs][patch][] = https://www.drupal.org/files/issues/sessionid.patch
; Revive checkChannel. https://www.drupal.org/node/2288629
projects[nodejs][patch][] = https://www.drupal.org/files/issues/check-channel-url.patch
; Fix up socket.io transports. https://www.drupal.org/node/2288897
projects[nodejs][patch][] = https://www.drupal.org/files/issues/tranports.patch
; Fix https server start. https://www.drupal.org/node/2280989
projects[nodejs][patch][] = http://cgit.drupalcode.org/nodejs/patch/?id=4c4e8c5d89395097c32e0d060caab96a050e1081
; Add passphrase option to HTTPS server. https://www.drupal.org/node/2295635
projects[nodejs][patch][] = https://www.drupal.org/files/issues/0001-Add-passphrase-option-to-HTTPS-server.patch
; Allow extensions to alter settings. https://www.drupal.org/node/2295635
projects[nodejs][patch][] = https://www.drupal.org/files/issues/0002-Allow-extensions-to-alter-settings.patch

;;; Libraries

libraries[autolinker][download][type] = get
libraries[autolinker][download][url] = https://github.com/gregjacobs/Autolinker.js/archive/0.11.0.zip
libraries[autolinker][directory_name] = autolinker
libraries[autolinker][destination] = libraries

libraries[date_format][download][type] = get
libraries[date_format][download][url] = https://raw.githubusercontent.com/jacwright/date.format/8f74b32d065bdcc5ffbc547985c576ef78e1d148/date.format.js
libraries[date_format][directory_name] = date_format
libraries[date_format][destination] = libraries

libraries[jquery_color][download][type] = get
libraries[jquery_color][download][url] = http://code.jquery.com/color/jquery.color-2.1.2.min.js
libraries[jquery_color][directory_name] = jquery_color
libraries[jquery_color][destination] = libraries

libraries[jquery_pulse][download][type] = get
libraries[jquery_pulse][download][url] = https://raw.githubusercontent.com/jsoverson/jquery.pulse.js/master/jquery.pulse.min.js
libraries[jquery_pulse][directory_name] = jquery_pulse
libraries[jquery_pulse][destination] = libraries

libraries[notificationjs][download][type] = git
libraries[notificationjs][download][url] = https://github.com/MrSwitch/notification.js
libraries[notificationjs][revision] = 38217ab84bd9ddc4ba0fef565a188bbbde6e930f
libraries[notificationjs][directory_name] = notificationjs
libraries[notificationjs][destination] = libraries

libraries[playsound][download][type] = get
libraries[playsound][download][url] = https://raw.githubusercontent.com/admsev/jquery-play-sound/8159c920b1ec75cd367ef78b01a20385d0d65df8/jquery.playSound.js
libraries[playsound][directory_name] = playsound
libraries[playsound][destination] = libraries
