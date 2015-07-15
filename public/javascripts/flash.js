function flash(messages, options) {
  options = options || {};
  var reset = options.reset || false;
  var className = options.className || false;
  var flashBox = document.getElementById('flash');
  if (reset && flashBox) flashBox.parentNode.removeChild(flashBox);
  if (reset || !flashBox) {
    flashBox = document.createElement('div');
    flashBox.id = 'flash';
    var mainbar = document.getElementById('mainbar'); 
    var form = mainbar.querySelector('form');
    var parent = form.parentNode;
    parent.insertBefore(flashBox, form);        
  }
  if (reset) flashBox.innerHTML = '';
  var messageList = flashBox.querySelector('li') || document.createElement('ul');
  if (typeof messages === 'string') {
    var li = document.createElement('li');
    li.textContent = messages;
    if (className) li.classList.add(className);
    messageList.appendChild(li);
  } else if (Array.isArray(messages)) {
    messages.forEach(function(message) {
      var li = document.createElement('li');
      li.textContent = message;
      if (className) li.classList.add(className);
      messageList.appendChild(li);
    });
  }
  flashBox.appendChild(messageList);
}