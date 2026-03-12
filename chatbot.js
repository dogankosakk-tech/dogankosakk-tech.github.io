(function () {
  var panel = document.getElementById('chatbot-panel');
  var toggle = document.getElementById('chatbot-toggle');
  var closeBtn = document.getElementById('chatbot-close');
  var messagesEl = document.getElementById('chatbot-messages');
  var input = document.getElementById('chatbot-input');
  var sendBtn = document.getElementById('chatbot-send');
  var widget = document.getElementById('chatbot-widget');

  var sessionId = localStorage.getItem('casagaz_chat_session') || 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem('casagaz_chat_session', sessionId);

  var STORAGE_KEY = 'casagaz_chat_messages_' + sessionId;
  var messages = [];

  var ws = null;
  var wsReconnectTimer = null;
  var typingHideTimer = null;
  var TYPING_DURATION_MS = 1500;

  function t(key) {
    return (window.i18n && window.i18n.t(key)) || key;
  }

  function getStoredMessages() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveStoredMessages() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {}
  }

  function appendMessage(text, type, options) {
    var skipSave = options && options.skipSave;
    var div = document.createElement('div');
    div.className = 'chatbot-msg ' + type;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    if (!skipSave) {
      messages.push({ type: type, text: text });
      saveStoredMessages();
    }
  }

  function showTyping() {
    var div = document.createElement('div');
    div.className = 'chatbot-msg bot typing';
    div.textContent = ' ';
    div.id = 'chatbot-typing';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById('chatbot-typing');
    if (el) el.remove();
    if (typingHideTimer) {
      clearTimeout(typingHideTimer);
      typingHideTimer = null;
    }
  }

  function scheduleHideTyping() {
    if (typingHideTimer) clearTimeout(typingHideTimer);
    typingHideTimer = setTimeout(function () {
      hideTyping();
    }, TYPING_DURATION_MS);
  }

  function loadHistory() {
    messages = getStoredMessages();
    messagesEl.innerHTML = '';
    messages.forEach(function (m) {
      var div = document.createElement('div');
      div.className = 'chatbot-msg ' + m.type;
      div.textContent = m.text;
      messagesEl.appendChild(div);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function ensureWelcome() {
    if (messages.length > 0) return;
    var welcomeText = t('chatbot.welcome');
    appendMessage(welcomeText, 'bot');
  }

  function connectWs() {
    var protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    var url = protocol + '//' + window.location.host + '/chat';
    try {
      ws = new WebSocket(url);
      ws.onopen = function () {
        ws.send(JSON.stringify({ type: 'register', sessionId: sessionId }));
      };
      ws.onmessage = function (ev) {
        try {
          var data = JSON.parse(ev.data);
          if (data.type === 'reply' && data.text) {
            hideTyping();
            appendMessage(data.text, 'bot');
          }
        } catch (e) {}
      };
      ws.onclose = function () {
        ws = null;
        if (widget && widget.classList.contains('open')) wsReconnectTimer = setTimeout(connectWs, 3000);
      };
      ws.onerror = function () {};
    } catch (e) {}
  }

  toggle.addEventListener('click', function () {
    widget.classList.add('open');
    ensureWelcome();
    if (!ws || ws.readyState !== WebSocket.OPEN) connectWs();
    input.focus();
  });
  closeBtn.addEventListener('click', function () { widget.classList.remove('open'); });

  function sendMessage() {
    var text = (input.value || '').trim();
    if (!text) return;
    input.value = '';
    appendMessage(text, 'user');
    showTyping();
    scheduleHideTyping();
    sendBtn.disabled = true;
    sendBtn.textContent = t('chatbot.sending');

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionId, message: text }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        sendBtn.disabled = false;
        sendBtn.textContent = t('chatbot.send');
        if (data.autoReply) {
          hideTyping();
          appendMessage(data.autoReply, 'bot');
        } else {
          hideTyping();
        }
      })
      .catch(function () {
        sendBtn.disabled = false;
        sendBtn.textContent = t('chatbot.send');
        hideTyping();
        appendMessage(t('chatbot.replyFromTeam'), 'bot');
      });
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  loadHistory();
})();
