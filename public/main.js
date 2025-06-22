const socket = io();
const usernameInput = document.getElementById('username');
const codeInput     = document.getElementById('code-input');
const lobbyMsg      = document.getElementById('lobby-msg');
const btnCreate     = document.getElementById('btn-create');
const btnJoin       = document.getElementById('btn-join');

const lobbySection = document.getElementById('lobby');
const chatSection  = document.getElementById('chat');
const roomTitle    = document.getElementById('room-title');
const messages     = document.getElementById('messages');
const msgForm      = document.getElementById('msg-form');
const msgInput     = document.getElementById('msg-input');

// helper to append <li>
function addMessage(html) {
  const li = document.createElement('li');
  li.innerHTML = html;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}

// CREATE ROOM
btnCreate.onclick = () => {
  const username = usernameInput.value.trim();
  if (!username) return alert('Enter your name first');
  socket.emit('create room', { roomName: username + "'s room" });
};

socket.on('room created', ({ code, roomName }) => {
  lobbyMsg.innerHTML = `Room <strong>${roomName}</strong> created: code <kbd>${code}</kbd>`;
});

// JOIN ROOM
btnJoin.onclick = () => {
  const username = usernameInput.value.trim();
  const code     = codeInput.value.trim();
  if (!username || !code) return alert('Name and code required');
  socket.emit('join room', { username, code }, res => {
    if (res.error) return lobbyMsg.textContent = res.error;
    // switch to chat UI
    lobbySection.style.display = 'none';
    chatSection.style.display  = 'block';
    roomTitle.textContent = `Room: ${res.roomName}`;
  });
};

// load history
socket.on('history', history => {
  messages.innerHTML = '';
  history.forEach(m => {
    addMessage(`<strong>${m.from}</strong>: ${m.text}`);
  });
});

// user join/leave
socket.on('user joined', ({ username }) => {
  addMessage(`<em>${username} joined</em>`);
});
socket.on('user left', ({ username }) => {
  addMessage(`<em>${username} left</em>`);
});

// receive chat
socket.on('chat message', m => {
  addMessage(`<strong>${m.from}</strong>: ${m.text}`);
});

// send chat
msgForm.addEventListener('submit', e => {
  e.preventDefault();
  const text = msgInput.value.trim();
  if (!text) return;
  socket.emit('chat message', text);
  msgInput.value = '';
});
