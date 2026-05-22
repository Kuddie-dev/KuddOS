
const appsContainer = document.getElementById("apps");
const modal = document.getElementById("appModal");
const windowContainer = document.getElementById("windowContainer");

let apps = JSON.parse(localStorage.getItem("kudd_apps")) || [];

const defaultApps = [
  {name: "Notes", icon: "📝", type: "notes"},
  {name: "Music", icon: "🎵", type: "music"}
];

function unlockOS() {
  document.getElementById("lockscreen").classList.add("hidden");
  document.getElementById("desktop").classList.remove("hidden");
}

function renderApps() {
  appsContainer.innerHTML = "";

  [...defaultApps, ...apps].forEach((app, index) => {
    const div = document.createElement("div");
    div.className = "app-icon";
    div.innerHTML = `
      <div class="emoji">${app.icon}</div>
      <div>${app.name}</div>
    `;

    div.onclick = () => openApp(app, index);
    appsContainer.appendChild(div);
  });
}

function openApp(app, index) {
  const windowDiv = document.createElement("div");
  windowDiv.className = "window";

  const header = document.createElement("div");
  header.className = "window-header";

  const title = document.createElement("span");
  title.textContent = app.name;

  const close = document.createElement("button");
  close.textContent = "X";
  close.onclick = () => windowDiv.remove();

  header.appendChild(title);
  header.appendChild(close);

  windowDiv.appendChild(header);

  if (app.type === "notes") {
    const textarea = document.createElement("textarea");
    textarea.className = "note-area";
    textarea.value = localStorage.getItem("kudd_notes") || "";
    textarea.oninput = () => {
      localStorage.setItem("kudd_notes", textarea.value);
    };
    windowDiv.appendChild(textarea);
  } else if (app.type === "music") {
    const container = document.createElement("div");
    container.className = "music-list";

    const upload = document.createElement("input");
    upload.type = "file";
    upload.accept = "video/*,audio/*";

    const audio = document.createElement("audio");
    audio.controls = true;

    upload.onchange = (e) => {
      const file = e.target.files[0];
      if(file){
        const url = URL.createObjectURL(file);
        audio.src = url;
        audio.play();
      }
    };

    container.appendChild(upload);
    container.appendChild(audio);
    windowDiv.appendChild(container);
  } else {
    const iframe = document.createElement("iframe");
    iframe.src = app.url;
    windowDiv.appendChild(iframe);
  }

  windowContainer.appendChild(windowDiv);
}

document.getElementById("addAppBtn").onclick = () => {
  modal.classList.remove("hidden");
};

function closeModal() {
  modal.classList.add("hidden");
}

function saveApp() {
  const name = document.getElementById("appName").value;
  const icon = document.getElementById("appIcon").value;
  const url = document.getElementById("appURL").value;

  if(!name || !icon || !url){
    alert("Please fill all fields.");
    return;
  }

  apps.push({
    name,
    icon,
    url,
    type: "web"
  });

  localStorage.setItem("kudd_apps", JSON.stringify(apps));
  renderApps();
  closeModal();
}

document.getElementById("wallpaperInput").addEventListener("change", function(e){
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function(event){
    document.body.style.backgroundImage = `url(${event.target.result})`;
    localStorage.setItem("kudd_wallpaper", event.target.result);
  };

  if(file){
    reader.readAsDataURL(file);
  }
});

const savedWallpaper = localStorage.getItem("kudd_wallpaper");
if(savedWallpaper){
  document.body.style.backgroundImage = `url(${savedWallpaper})`;
}

renderApps();
