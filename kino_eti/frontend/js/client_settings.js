function saveToken(token) {
  if (token) localStorage.setItem('token', token);
}

function getToken() {
  return localStorage.getItem('token');
}

function removeToken() {
  localStorage.removeItem('token');
}

function authHeaders(extra = {}) {
  const token = getToken();
  const headers = { ...extra };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return headers;
}

function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    if (!decoded.exp) return false;
    return decoded.exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
}

async function safeFetch(url, opts = {}) {
  opts.headers = opts.headers || {};
  const token = getToken();
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, opts);
}
// Pobieranie tokenu
const token = localStorage.getItem("token");
if (!token) window.location.href = "index.html";

//  Wylogowanie 
    async function forceLogout() {
  const token = getToken();
  if (!token) return;

  try {
    await fetch('/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    });
  } catch (err) {
    console.error('Błąd wylogowania:', err);
  } finally {
    removeToken();
    window.location.replace('index.html');
    window.location.reload(true);
  }
}

//  Pokaz powiadomienie 
function showMsg(element, msg, success = true) {
    element.textContent = msg;
    element.style.color = success ? "green" : "red";
    element.classList.add("show");
    setTimeout(() => element.classList.remove("show"), 3000);
}

//  Pobranie danych użytkownika 
async function loadUser() {
    const res = await fetch("/users/account", {
        headers: { Authorization: "Bearer " + token }
    });
    const data = await res.json();
    if (!data.success) return forceLogout();

    document.getElementById("infoUsername").textContent = data.user.username;
    document.getElementById("infoEmail").textContent = data.user.email;
}

loadUser();

//  Wysyłanie update 
async function updateUser(body, msgElement) {
    const res = await fetch("/users/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    showMsg(msgElement, data.message, data.success);
    if (data.forceLogout) setTimeout(forceLogout, 1500);
}

//  Formularz zmiany username 
document.getElementById("formUsername").addEventListener("submit", e => {
    e.preventDefault();
    const oldPass = document.getElementById("currentPasswordUser").value;
    const newU = document.getElementById("newUsername").value;
    const confirmU = document.getElementById("confirmNewUsername").value;

    if (newU !== confirmU) return showMsg(document.getElementById("noteUser"), "Nowa nazwa nie pasuje!", false);

    updateUser({ username: newU, currentPassword: oldPass }, document.getElementById("noteUser"));
});

//  Formularz zmiany email 
document.getElementById("formEmail").addEventListener("submit", e => {
    e.preventDefault();
    const oldPass = document.getElementById("currentPasswordEmail").value;
    const newE = document.getElementById("newEmail").value;
    const confirmE = document.getElementById("confirmNewEmail").value;

    if (newE !== confirmE) return showMsg(document.getElementById("noteEmail"), "Nowy email nie pasuje!", false);

    updateUser({ email: newE, currentPassword: oldPass }, document.getElementById("noteEmail"));
});

//  Formularz zmiany hasła 
document.getElementById("formPassword").addEventListener("submit", e => {
    e.preventDefault();
    const oldPass = document.getElementById("currentPasswordPass").value;
    const newP = document.getElementById("newPassword").value;
    const confirmP = document.getElementById("confirmNewPassword").value;

    if (newP !== confirmP) return showMsg(document.getElementById("notePass"), "Nowe hasła nie pasują!", false);

    updateUser({ currentPassword: oldPass, newPassword: newP, confirmPassword: confirmP }, document.getElementById("notePass"));
});

async function checkLoginAndShowBody() {
  const token = getToken();
  if (!token || isTokenExpired(token)) {
    removeToken();
    window.location.replace('index.html');
    return;
  }

  try {
    const resp = await safeFetch('/users/account', { method: 'GET' });
    const data = await resp.json();
    if (!resp.ok || !data.success) {
      removeToken();
      window.location.replace('index.html');
    } else {
      document.body.style.display = 'block';
    }
  } catch (err) {
    console.error('Błąd autoryzacji:', err);
    removeToken();
    window.location.replace('index.html');
  }
}

document.addEventListener('DOMContentLoaded', () => { const bodyStyle = window.getComputedStyle(document.body); if (bodyStyle && bodyStyle.display === 'none') { checkLoginAndShowBody(); } });