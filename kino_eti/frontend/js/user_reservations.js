// Funkcja obsługująca modal potwierdzenia (Promise-based)
function showConfirm(message = 'Czy na pewno chcesz anulować rezerwację?') {
  return new Promise((resolve) => {
    const container = document.getElementById('confirm-container');
    const msgEl = document.getElementById('confirm-message');
    const yesBtn = document.getElementById('confirm-yes');
    const noBtn = document.getElementById('confirm-no');

    // Ustawienie treści wiadomości
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

//  Kontenery i token 
const reservationsContainer = document.getElementById('reservationsContainer');

function getToken() {
  return localStorage.getItem('token');
}

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

function removeToken() {
  localStorage.removeItem('token');
}

//  Wczytywanie rezerwacji 
async function loadReservations() {
  const token = getToken();
  if (!token) {
    window.location.replace('index.html');
    return;
  }

  try {
    const res = await fetch('/reservations/my', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();

    if (!data.success) {
      showNotification('Błąd pobierania rezerwacji', 'error');
      return;
    }

    displayReservations(data.reservations);
  } catch (err) {
    console.error(err);
    showNotification('Błąd serwera', 'error');
  }
}

//  Wyświetlanie rezerwacji 
function displayReservations(reservations) {
  reservationsContainer.innerHTML = '';

  const moviesMap = {};
  reservations.forEach(r => {
    if (!moviesMap[r.title]) moviesMap[r.title] = [];
    moviesMap[r.title].push(r);
  });

  for (const [title, resList] of Object.entries(moviesMap)) {
    const movieCard = document.createElement('div');
    movieCard.classList.add('movie-card');

    const header = document.createElement('div');
    header.classList.add('movie-header');
    header.innerHTML = `<h2>${title}</h2><span>▶</span>`;
    movieCard.appendChild(header);

    const list = document.createElement('div');
    list.classList.add('reservation-list');

    resList.forEach(r => {
      const statusMap = {
        reserved: 'Zarezerwowana',
        paid: 'Opłacona',
        ended: 'Seans zakończony'
      };

      const statusClassMap = {
        reserved: 'status-zarezerwowana',
        paid: 'status-oplacona',
        ended: 'status-ended'
      };

      const statusText = statusMap[r.status] || 'Nieznany';
      const statusClass = statusClassMap[r.status] || '';

      const item = document.createElement('div');
      item.classList.add('reservation-item');
      item.innerHTML = `
        <div><span>Rząd:</span> ${r.seat_row}</div>
        <div><span>Miejsce:</span> ${r.seat_number}</div>
        <div><span>Seans:</span> ${new Date(r.start_time).toLocaleString()}</div>
        <div><span>Sala:</span> ${r.screen_name}</div>
        <div><span>Status:</span> <span class="status ${statusClass}">${statusText}</span></div>
      `;

      const actions = document.createElement('div');
      actions.classList.add('reservation-actions');

      if (r.status === 'reserved') {
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Anuluj';
        cancelBtn.classList.add('action-btn', 'cancel-btn');
        cancelBtn.addEventListener('click', () => cancelReservation(r.id, item, movieCard, list));

        const payBtn = document.createElement('button');
        payBtn.textContent = 'Opłać';
        payBtn.classList.add('action-btn', 'pay-btn');
        payBtn.addEventListener('click', () => payReservation(r.id, item, cancelBtn, payBtn));

        actions.appendChild(cancelBtn);
        actions.appendChild(payBtn);
      } else if (r.status === 'ended') {
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Usuń';
        deleteBtn.classList.add('action-btn', 'cancel-btn');
        deleteBtn.addEventListener('click', () => deleteReservation(r.id, item, movieCard, list));
        actions.appendChild(deleteBtn);
      }

      if (actions.childElementCount > 0) item.appendChild(actions);
      list.appendChild(item);
    });

    movieCard.appendChild(list);
    reservationsContainer.appendChild(movieCard);

    // Toggle rozwijania
    header.addEventListener('click', () => {
      header.classList.toggle('active');
      list.style.display = list.style.display === 'block' ? 'none' : 'block';
    });
  }
}

//  Akcje rezerwacji 

// ANULOWANIE REZERWACJI (z modalem)
async function cancelReservation(reservationId, itemElement, movieCard, list) {
  const token = localStorage.getItem('token');
  if (!token) return;

  // Wywołanie modala z domyślną wiadomością lub własną
  const confirmed = await showConfirm('Czy na pewno chcesz anulować rezerwację?');
  if (!confirmed) return;

  try {
    const res = await fetch(`/reservations/cancel/${reservationId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();

    if (data.success) {
      itemElement.remove();
      if (list.querySelectorAll('.reservation-item').length === 0) {
        movieCard.remove();
      }
      showNotification('Rezerwacja anulowana', 'success');
    } else {
      showNotification('Nie udało się anulować rezerwacji', 'error');
    }
  } catch (err) {
    console.error(err);
    showNotification('Błąd serwera', 'error');
  }
}

// USUWANIE ZAKOŃCZONEJ REZERWACJI (zaktualizowane o modal)
async function deleteReservation(reservationId, itemElement, movieCard, list) {
  const token = localStorage.getItem('token');
  if (!token) return;

  // ZMIANA: Użycie showConfirm zamiast systemowego confirm()
  const confirmed = await showConfirm('Czy na pewno chcesz usunąć historię tej rezerwacji?');
  if (!confirmed) return;

  try {
    const res = await fetch(`/reservations/delete/${reservationId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();

    if (data.success) {
      itemElement.remove(); 
      if (list.querySelectorAll('.reservation-item').length === 0) {
        movieCard.remove();
      }

      showNotification('Rezerwacja usunięta', 'success');
    } else {
      showNotification('Nie udało się usunąć rezerwacji', 'error');
    }
  } catch (err) {
    console.error(err);
    showNotification('Błąd serwera', 'error');
  }
}

async function payReservation(id, item) {
  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`/reservations/pay/${id}`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();

    if (data.success) {
      const statusSpan = item.querySelector('.status');
      statusSpan.textContent = 'Opłacona';
      statusSpan.classList.remove('status-zarezerwowana');
      statusSpan.classList.add('status-oplacona');

      const actions = item.querySelector('.reservation-actions');
      if (actions) actions.remove();

      showNotification('Rezerwacja opłacona', 'success');
    } else {
      showNotification('Nie udało się opłacić rezerwacji', 'error');
    }
  } catch (err) {
    console.error(err);
    showNotification('Błąd serwera', 'error');
  }
}

//  Start 
document.addEventListener('DOMContentLoaded', loadReservations);

///// Wylogowanie  /////

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
  window.location.href = 'client_reservation.html';
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

function showNotification(message, type = 'error', duration = 3000) {
  const container = document.getElementById('notification-container');
  if (!container) return; // zabezpieczenie

  const notif = document.createElement('div');
  notif.classList.add('notification', type);
  notif.textContent = message;

  container.appendChild(notif);

  setTimeout(() => notif.classList.add('show'), 10);

  setTimeout(() => {
    notif.classList.remove('show');
    setTimeout(() => notif.remove(), 300);
  }, duration);
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