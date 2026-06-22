//  Inicjalizacja i Bezpieczeństwo 
document.body.style.display = 'block';
const token = localStorage.getItem('token');

if (!token || isTokenExpired(token)) {
    window.location.href = '/index.html';
}

function getToken() { return localStorage.getItem('token'); }
function removeToken() { localStorage.removeItem('token'); }

function isTokenExpired(token) {
    if (!token) return true;
    try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        return decoded.exp * 1000 < Date.now();
    } catch (e) { return true; }
}

async function fetchAPI(url, options = {}) {
    const currentToken = getToken();
    options.headers = {
        ...(options.headers || {}),
        'Authorization': 'Bearer ' + currentToken
    };
    const resp = await fetch(url, options);
    return await resp.json();
}

//  SYSTEM UI (Powiadomienia i Modale) 

function showNotification(message, type = 'error', duration = 3000) {
    const container = document.getElementById('notification-container');
    if (!container) return;

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

function showConfirm(message = 'Czy na pewno chcesz to zrobić?') {
    return new Promise((resolve) => {
        const container = document.getElementById('confirm-container');
        const msgEl = document.getElementById('confirm-message');
        const yesBtn = document.getElementById('confirm-yes');
        const noBtn = document.getElementById('confirm-no');

        if (!container || !msgEl) {
            resolve(confirm(message)); 
            return;
        }

        msgEl.textContent = message;
        container.style.display = 'flex';

        function cleanUp() {
            container.style.display = 'none';
            yesBtn.removeEventListener('click', onYes);
            noBtn.removeEventListener('click', onNo);
        }

        function onYes() { cleanUp(); resolve(true); }
        function onNo() { cleanUp(); resolve(false); }

        yesBtn.addEventListener('click', onYes);
        noBtn.addEventListener('click', onNo);
    });
}

//  ZARZĄDZANIE UŻYTKOWNIKAMI 

const loadUsers = async () => {
    try {
        const res = await fetchAPI('/admin_control/users/all');
        const usersList = document.getElementById('usersList');
        if (res.success) {
            usersList.innerHTML = '';
            res.users.forEach(u => {
    const userDiv = document.createElement('div');
    userDiv.className = 'user-card'; // nowa klasa
    userDiv.innerHTML = `
        <div class="user-info">
            <span class="user-name">${u.username}</span>
            <span class="user-email">${u.email}</span>
        </div>
        <div class="user-actions">
            <button class="edit-btn" onclick="window.location.href='user_edit.html?id=${u.id}'">
                Edytuj / Szczegóły
            </button>
            <button class="delete-btn" onclick="window.deleteUser(${u.id})">
                Usuń
            </button>
        </div>
    `;
    usersList.appendChild(userDiv);
});
        }
    } catch (err) {
        console.error('Błąd loadUsers:', err);
    }
};

window.deleteUser = async (id) => {
    const confirmed = await showConfirm('Czy na pewno chcesz permanentnie usunąć tego użytkownika?');
    if (!confirmed) return;

    try {
        const res = await fetchAPI(`/admin_control/users/${id}`, { method: 'DELETE' });
        if (res.success) {
            showNotification('Użytkownik został usunięty z bazy', 'success');
            loadUsers();
        } else {
            showNotification(res.message, 'error');
        }
    } catch (err) {
        showNotification('Błąd połączenia z serwerem', 'error');
    }
};

// ZARZĄDZANIE SEANSAMI (Filmy w kinie) 

async function loadOnScreenMovies() {
    try {
        const data = await fetchAPI('/admin_control/on_screen');
        const onScreenMoviesDiv = document.getElementById('onScreenMovies');
        onScreenMoviesDiv.innerHTML = '';
        
        data.forEach(m => {
            const div = document.createElement('div');
            div.className = 'movie-card';
            
  
            const dateObj = new Date(m.start_time);
            const dateStr = dateObj.toLocaleDateString('pl-PL');
            const timeStr = dateObj.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

      
            div.innerHTML = `
                <img src="${m.poster}" alt="${m.title}">
                <div>
                    <strong>${m.title}</strong>
                    <div class="details-text">
                        Sala: ${m.screen_name} <br>
                        Data: ${dateStr} | Godz: <span class="highlight-time">${timeStr}</span><br>
                        Cena: ${m.price} zł
                    </div>
                    <button class="delete-btn" onclick="window.deleteOnScreen(${m.id})">Usuń</button>
                </div>
            `;
            onScreenMoviesDiv.appendChild(div);
        });
    } catch (err) {
        console.error('Błąd loadOnScreenMovies:', err);
    }
}


window.deleteOnScreen = async (id) => {
    const confirmed = await showConfirm('Czy na pewno usunąć ten seans z bazy danych?');
    if (!confirmed) return;

    const res = await fetchAPI(`/admin_control/on_screen/${id}`, { method: 'DELETE' });
    
    if (res.success) {
        showNotification('Seans został usunięty', 'success');
        loadOnScreenMovies();
        loadHistoryMovies(); 
    } else {
        showNotification('Błąd przy usuwaniu seansu: ' + (res.message || ''), 'error');
    }
};

// ZARZĄDZANIE REZERWACJAMI 

function groupByUser(data) {
    const map = {};
    data.forEach(r => {
        if (!map[r.username]) map[r.username] = { reserved: [], paid: [], ended: [] };
        map[r.username][r.status]?.push(r);
    });
    return map;
}

async function loadReservations() {
    try {
        const data = await fetchAPI('/admin_control/reservations/all');
        const listReserved = document.getElementById('list-reserved');
        const listPaid = document.getElementById('list-paid');
        const listEnded = document.getElementById('list-ended');

        listReserved.innerHTML = ''; listPaid.innerHTML = ''; listEnded.innerHTML = '';
        const users = groupByUser(data);

        Object.entries(users).forEach(([username, res]) => {
            const createUserBlock = (list, reservationsArray) => {
                if (!reservationsArray.length) return;
                const header = document.createElement('div');
                header.className = 'user-group-header';
                header.textContent = username;

                const container = document.createElement('div');
                container.className = 'user-reservations';
                container.style.display = 'none';

                reservationsArray.forEach(r => {
                    const div = document.createElement('div');
                    div.className = 'reservation-card-v2';
                    let actionBtn = '';
                    if (r.status === 'reserved') actionBtn = `<button class="btn-cancel" onclick="window.deleteReservation(${r.id})">Anuluj</button>`;
                    else if (r.status === 'ended') actionBtn = `<button class="btn-delete" onclick="window.deleteReservation(${r.id})">Usuń</button>`;

                    div.innerHTML = `
                        <div class="res-info">
                            <span>${r.movie_title}</span><br>
                            <small>Sala: ${r.screen_name} | Miejsce: ${r.seat_row}${r.seat_number}</small>
                        </div>
                        <div class="res-actions">${actionBtn}</div>
                    `;
                    container.appendChild(div);
                });

                header.addEventListener('click', () => {
                    header.classList.toggle('active');
                    container.style.display = container.style.display === 'block' ? 'none' : 'block';
                });
                list.appendChild(header); list.appendChild(container);
            };
            createUserBlock(listReserved, res.reserved);
            createUserBlock(listPaid, res.paid);
            createUserBlock(listEnded, res.ended);
        });
    } catch (err) {
        console.error("Błąd ładowania rezerwacji:", err);
    }
}

window.deleteReservation = async function(id) {
    const confirmed = await showConfirm('Czy na pewno chcesz usunąć tę rezerwację?');
    if (!confirmed) return;

    const res = await fetchAPI(`/admin_control/reservations/${id}`, { method: 'DELETE' });
    if (res.success) {
        showNotification('Rezerwacja została usunięta', 'success');
        loadReservations();
    } else {
        showNotification('Błąd: ' + res.message, 'error');
    }
};

// DODAWANIE SEANSU (Autocomplete i Formularz) 

const movieSearch = document.getElementById('movieSearch');
const movieSuggestions = document.getElementById('movieSuggestions');
let allMovies = [];

async function loadMoviesAndScreens() {
    const [movies, screens] = await Promise.all([
        fetchAPI('/admin_control/movies'),
        fetchAPI('/admin_control/screens')
    ]);
    allMovies = movies;
    const screenSelect = document.querySelector('form#addOnScreenForm select[name="screen_id"]');
    if (screenSelect) {
        screenSelect.innerHTML = '<option value="">Wybierz salę</option>' + 
            screens.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }
}

movieSearch?.addEventListener('input', () => {
    const query = movieSearch.value.toLowerCase();
    movieSuggestions.innerHTML = '';
    if (!query) return;
    
    allMovies.filter(m => m.title.toLowerCase().includes(query)).forEach(m => {
        const li = document.createElement('li');
        li.textContent = m.title;
        li.onclick = () => {
            movieSearch.value = m.title;
            movieSearch.dataset.movieId = m.id;
            movieSuggestions.innerHTML = '';
        };
        movieSuggestions.appendChild(li);
    });
});

document.getElementById('addOnScreenForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const movieId = movieSearch.dataset.movieId;
    if (!movieId) return showNotification('Wybierz film z listy podpowiedzi!', 'error');

    const fullStartTime = `${e.target.screening_date.value} ${e.target.start_time.value}:00`;

    const res = await fetchAPI('/admin_control/on_screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            movie_id: movieId, 
            screen_id: e.target.screen_id.value, 
            start_time: fullStartTime, 
            price: e.target.price.value 
        })
    });

    if (res.success) {
        showNotification('Seans dodany pomyślnie!', 'success');
        e.target.reset();
        movieSearch.dataset.movieId = '';
        loadOnScreenMovies();
    } else {
        showNotification('Błąd: ' + (res.message || 'Nieznany błąd'), 'error');
    }
});

//  Wylogowanie i Nawigacja 
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

async function logout() {
    try {
        await fetch('/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });
    } catch (err) {
        console.error('Błąd wylogowania:', err);
    } finally {
        removeToken();
        window.location.replace('index.html');
    }
}

document.getElementById('logoutBtn')?.addEventListener('click', logout);
document.getElementById('backBtn')?.addEventListener('click', () => {
    window.location.href = 'index.html';
});

async function loadHistoryMovies() {
    try {
        const data = await fetchAPI('/admin_control/history');
        const historyContainer = document.getElementById('historyMovies');
        
        if (!historyContainer) return;

        historyContainer.innerHTML = '';
        
        if (data.length === 0) {
            historyContainer.innerHTML = '<p style="color: #888;">Brak zakończonych seansów.</p>';
            return;
        }

        data.forEach(m => {
            const dateObj = new Date(m.start_time);
            const dateStr = dateObj.toLocaleDateString('pl-PL');
            const timeStr = dateObj.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

            const div = document.createElement('div');
            div.className = 'movie-card';
            
   

            
            div.innerHTML = `
                <img src="${m.poster}" alt="${m.title}" style="filter: grayscale(60%);">
                <div>
                    <strong>${m.title}</strong>
                    <div class="details-text">
                        Data: ${dateStr} | Godz: <span class="highlight-time">${timeStr}</span><br>
                        Cena: <b>${m.price} zł</b><br>
                        Sala: ${m.screen_name}
                    </div>
                    <button class="delete-btn" onclick="window.deleteOnScreen(${m.id})">Usuń z bazy</button>
                </div>
            `;
            historyContainer.appendChild(div);
        });
    } catch (err) {
        console.error('Błąd loadHistoryMovies:', err);
    }
}
//  START 
loadOnScreenMovies();
loadUsers();
loadReservations();
loadMoviesAndScreens();
loadHistoryMovies();