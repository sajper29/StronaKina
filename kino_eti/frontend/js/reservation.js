const movieTitleEl = document.getElementById("movieTitle");
const seatsContainer = document.getElementById("seatsContainer");
const reserveButton = document.getElementById("reserveButton");

const params = new URLSearchParams(window.location.search);
const onScreenId = params.get("movieId");
const onScreenId1 = params.get("onScreenId");
let selectedSeats = [];
let seatsData = [];
let movieTitle = "";
let onScreenIdForSeats;
function getUserRoleFromToken() {
  const token = getToken();
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.role || null;
  } catch (e) {
    return null;
  }
}
async function loadSeats() {
    try {
        
        const res1 = await fetch('/movies/all_showings');
        const data1 = await res1.json();

if (data1.success) {
    
    const showing = data1.showings.find(s => s.movie_id == onScreenId);
    if (showing) {
        movieTitleEl.textContent = `Film: ${showing.title}`;
        onScreenIdForSeats = showing.on_screen_id;
    
        const res2 = await fetch(`/reservations/seats/${onScreenId1}`);
        const data2 = await res2.json();

        if (!data2.success) {
            alert("Błąd pobierania miejsc");
            return;
        }

        seatsData = data2.seats;
        renderSeats();
    }}} catch (err) {
        console.error(err);
        alert("Błąd podczas pobierania danych");
    }
}

// Wyświetlanie miejsc w rzędach
function renderSeats() {
    seatsContainer.innerHTML = "";

    const rows = {};
    seatsData.forEach(seat => {
        console.log(seat.seat_row)
        if (!rows[seat.seat_row]) rows[seat.seat_row] = [];
        rows[seat.seat_row].push(seat);
        
    });
    Object.keys(rows).sort().forEach(rowLabel => {
        const rowDiv = document.createElement("div");
        rowDiv.classList.add("seat-row");
        
       
        const rowLabelDiv = document.createElement("div");
        rowLabelDiv.textContent = rowLabel;
        rowDiv.appendChild(rowLabelDiv);

        
        rows[rowLabel].forEach(seat => {
            const seatDiv = document.createElement("div");
            seatDiv.classList.add("seat");

            if (seat.taken === 1) {
                seatDiv.classList.add("taken");
            } else {
                seatDiv.classList.add("free");
                seatDiv.addEventListener("click", () => toggleSeat(seat.id, seatDiv));
            }

            seatDiv.textContent = seat.seat_number;
            rowDiv.appendChild(seatDiv);
        });

        seatsContainer.appendChild(rowDiv);
    });
}


function toggleSeat(id, element) {
    if (element.classList.contains("selected")) {
        element.classList.remove("selected");
        selectedSeats = selectedSeats.filter(s => s !== id);
    } else {
        element.classList.add("selected");
        selectedSeats.push(id);
    }
}


reserveButton.addEventListener("click", async () => {
    if (selectedSeats.length === 0) {
        showNotification("Wybierz przynajmniej jedno miejsce!", "error");
        return;
    }

    const confirmed = await showConfirm(`Czy na pewno chcesz zarezerwować te miejsca (${selectedSeats.length})?`);
    if (!confirmed) return;

    const token = localStorage.getItem("token");

    try {
        const res = await fetch("/reservations/reserve", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                onScreenId: onScreenId1,
                seats: selectedSeats
            })
        });

        const data = await res.json();

        if (data.success) {
            showNotification("Miejsce zostało zarezerwowane!", "success");

            setTimeout(() => {
                window.location.reload();
            }, 2000);
            
        } else {
            showNotification("Błąd: " + data.msg, "error");
        }
    } catch (err) {
        console.error(err);
        showNotification("Wystąpił błąd połączenia.", "error");
    }
});
loadSeats();

/////  Wylogowanie  /////

async function logout() {
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

const logoutBtn = document.getElementById('wyloguj');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    logout();
  });
}
const logoutBtnMobile = document.getElementById('wylogujMobile');
if (logoutBtnMobile) {
  logoutBtnMobile.addEventListener('click', () => {
    logout();
  });
}

async function checkLoginAndShowBody() {
  const token = getToken();
  if (!token || isTokenExpired(token)) {
    removeToken();
    window.location.replace('index.html');
    return;
  }
  const role = getUserRoleFromToken();


  if (!token || isTokenExpired(token) || !role) {
    removeToken();
    window.location.replace('index.html');
    return;
  }

  document.body.style.display = 'block';

 if(role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
      } else {
        document.querySelectorAll('.user-only').forEach(el => el.style.display = 'block');
      }
}
//Ustawienia konta
const role = getUserRoleFromToken();
document.addEventListener('DOMContentLoaded', () => {
    const settingsBtn = document.getElementById('openSettingsClient');
    if (settingsBtn && role === 'user') {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'client_settings.html';
        });
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const settingsBtn = document.getElementById('openSettingsAdmin');
    if (settingsBtn && role === 'admin') {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'admin_panel.html';
        });
    }
});
document.addEventListener('DOMContentLoaded', () => { const bodyStyle = window.getComputedStyle(document.body); if (bodyStyle && bodyStyle.display === 'none') { checkLoginAndShowBody(); } });

async function loadAccountName() {
  const nickEl = document.querySelector('#accountDropdown .account-nick');
  if (!nickEl) return;

  const token = getToken();
  if (!token || isTokenExpired(token)) {
    nickEl.textContent = '—';
    return;
  }

  try {
    const response = await safeFetch('/users/account', { method: 'GET' });
    const data = await response.json();
    if (response.ok && data.success) {
      nickEl.textContent = data.user.username;
    } else {
      nickEl.textContent = '—';
    }
  } catch (err) {
    console.error('Błąd pobierania konta:', err);
    nickEl.textContent = 'Błąd';
  }
}
document.addEventListener('DOMContentLoaded', loadAccountName);


/////  Account dropdown behavior (UI)  /////

function closeAccountDropdown() {
  const dd = document.getElementById('accountDropdown');
  if (dd) {
    dd.style.display = 'none';
    dd.setAttribute('aria-hidden', 'true');
  }
}
function openAccountDropdown() {
  const dd = document.getElementById('accountDropdown');
  if (dd) {
    dd.style.display = 'block';
    dd.setAttribute('aria-hidden', 'false');
  }
}
function toggleAccountDropdown() {
  const dd = document.getElementById('accountDropdown');
  if (!dd) return;
  if (dd.style.display === 'block') closeAccountDropdown();
  else openAccountDropdown();
}

function goToReservations() {
  closeAccountDropdown();
  window.location.href = 'user_reservations.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const accountBtn = document.getElementById('accountBtn');
  const openResBtn = document.getElementById('openReservations');
  const logoutSmallBtn = document.getElementById('smallLogout');
  const dropdown = document.getElementById('accountDropdown');

  if (accountBtn) {
    accountBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleAccountDropdown();
    });
  }

  if (openResBtn) {
    openResBtn.addEventListener('click', (e) => {
      e.preventDefault();
      goToReservations();
    });
  }

  if (logoutSmallBtn) {
    logoutSmallBtn.addEventListener('click', (e) => {
      e.preventDefault();
      removeToken();
      window.location.href = 'index.html';
    });
  }

  document.addEventListener('click', (e) => {
    const dd = document.getElementById('accountDropdown');
    const btn = document.getElementById('accountBtn');
    if (!dd || !btn) return;
    if (!dd.contains(e.target) && !btn.contains(e.target)) {
      closeAccountDropdown();
    }
  });

  if (dropdown) {
    dropdown.style.display = 'none';
    dropdown.setAttribute('aria-hidden', 'true');
  }
});

document.addEventListener('DOMContentLoaded', loadAccountName);

function showNotification(text, isError = true) {
    const n = document.getElementById('error');
    n.style.display = 'block';
    n.style.backgroundColor = isError ? '#ff6b6b' : '#4CAF50';
    n.textContent = text;
}

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



function showConfirm(message = 'Czy na pewno chcesz zarezerwować wybrane miejsca?') {
  return new Promise((resolve) => {
    const container = document.getElementById('confirm-container');
    const msgEl = document.getElementById('confirm-message');
    const yesBtn = document.getElementById('confirm-yes');
    const noBtn = document.getElementById('confirm-no');

    msgEl.textContent = message;
    container.style.display = 'flex';

    function cleanUp() {
      container.style.display = 'none';
      yesBtn.removeEventListener('click', onYes);
      noBtn.removeEventListener('click', onNo);
    }

    function onYes() {
      cleanUp();
      resolve(true);
    }

    function onNo() {
      cleanUp();
      resolve(false);
    }

    yesBtn.addEventListener('click', onYes);
    noBtn.addEventListener('click', onNo);
  });
}
function showNotification(message, type = 'success', duration = 3000) {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notif = document.createElement('div');
    notif.classList.add('notification', type);
    notif.textContent = message;

    container.appendChild(notif);

    // Małe opóźnienie, aby animacja zadziałała
    setTimeout(() => notif.classList.add('show'), 10);

    // Usuwanie powiadomienia
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 300);
    }, duration);
}