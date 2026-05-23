function openApp(id){
  document.getElementById(id).classList.remove('hidden');
}

function closeApp(id){
  document.getElementById(id).classList.add('hidden');
}

function updateClock(){
  const now = new Date();
  document.getElementById('clock').innerText =
    now.toLocaleTimeString();
}
setInterval(updateClock,1000);
updateClock();

/* NOTES */

function saveNote(){
  const text = document.getElementById('noteText').value;
  localStorage.setItem('kudd_note', text);
  alert('Note saved!');
}

document.getElementById('noteText').value =
  localStorage.getItem('kudd_note') || '';

function createFolder(){
  const folderName = document.getElementById('folderName').value;
  if(!folderName) return;

  let folders = JSON.parse(localStorage.getItem('kudd_folders') || '[]');
  folders.push(folderName);
  localStorage.setItem('kudd_folders', JSON.stringify(folders));

  renderFolders();
}

function renderFolders(){
  const container = document.getElementById('folders');
  container.innerHTML = '';

  let folders = JSON.parse(localStorage.getItem('kudd_folders') || '[]');

  folders.forEach(f=>{
    const div = document.createElement('div');
    div.className = 'folder';
    div.innerText = '📁 ' + f;
    container.appendChild(div);
  });
}
renderFolders();

/* MUSIC */

let currentAudio = document.getElementById('audioPlayer');

function uploadMusic(){
  const file = document.getElementById('musicUpload').files[0];
  if(!file) return;

  const url = URL.createObjectURL(file);

  let songs = JSON.parse(localStorage.getItem('kudd_music') || '[]');

  songs.push({
    name:file.name,
    url:url
  });

  localStorage.setItem('kudd_music', JSON.stringify(songs));
  renderMusic();
}

function renderMusic(){
  const list = document.getElementById('musicList');
  list.innerHTML = '';

  let songs = JSON.parse(localStorage.getItem('kudd_music') || '[]');

  songs.forEach(song=>{
    const div = document.createElement('div');
    div.className = 'music-item';

    div.innerHTML = `
      <span>${song.name}</span>
      <div>
        <button onclick="playSong('${song.url}')">Play</button>
        <button onclick="stopSong()">Stop</button>
      </div>
    `;

    list.appendChild(div);
  });
}

function playSong(url){
  currentAudio.src = url;
  currentAudio.play();
}

function stopSong(){
  currentAudio.pause();
  currentAudio.currentTime = 0;
}

renderMusic();

/* APPS */

function addWebApp(){
  const name = document.getElementById('appName').value;
  const emoji = document.getElementById('appEmoji').value;
  const link = document.getElementById('appLink').value;

  if(!name || !emoji || !link) return;

  let apps = JSON.parse(localStorage.getItem('kudd_apps') || '[]');

  apps.push({
    name,
    emoji,
    link
  });

  localStorage.setItem('kudd_apps', JSON.stringify(apps));
  renderApps();
}

function renderApps(){
  const desktop = document.getElementById('dynamicApps');
  desktop.innerHTML = '';

  let apps = JSON.parse(localStorage.getItem('kudd_apps') || '[]');

  apps.forEach(app=>{
    const div = document.createElement('div');
    div.className = 'app';

    div.innerHTML = `
      <div class="icon">${app.emoji}</div>
      <span>${app.name}</span>
    `;

    div.onclick = ()=>{
      document.getElementById('webviewTitle').innerText = app.emoji + ' ' + app.name;
      document.getElementById('webFrame').src = app.link;
      openApp('webviewApp');
    };

    desktop.appendChild(div);
  });
}

renderApps();

/* WALLPAPER */

function saveWallpaper(){
  const url = document.getElementById('wallpaperInput').value;
  if(!url) return;

  localStorage.setItem('kudd_wallpaper', url);
  applyWallpaper();
}

function applyWallpaper(){
  const saved = localStorage.getItem('kudd_wallpaper');

  if(saved){
    document.getElementById('wallpaper').style.backgroundImage =
      `url('${saved}')`;
  }
}

applyWallpaper();
