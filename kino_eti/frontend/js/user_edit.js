//  INIT 
document.body.style.display = 'block';

const token = localStorage.getItem('token');
if (!token) window.location.href = '/index.html';

const params = new URLSearchParams(window.location.search);
const userId = params.get('id');
if (!userId) {
    alert('Brak ID użytkownika');
    window.location.href = 'index.html';
}

//  POWIADOMIENIA 
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

//  MODAL POTWIERDZENIA 
function showConfirm(message = 'Czy na pewno chcesz wykonać tę akcję?') {
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

//  ELEMENTY 
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const commentsList = document.getElementById('commentsList');
const reservationsList = document.getElementById('reservationsList');

function fetchAPI(url, options = {}) {
    options.headers = {
        ...(options.headers || {}),
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
    };
    if (options.body && typeof options.body !== 'string') {
        options.body = JSON.stringify(options.body);
    }
    return fetch(url, options).then(r => r.json());
}

//  WYCZYTYWANIE UŻYTKOWNIKA 
async function loadUser() {
    const res = await fetchAPI(`/admin_control/users/${userId}/full-details`);
    if (!res.success) return showNotification(res.message, 'error');

    usernameInput.value = res.user.username;
    emailInput.value = res.user.email;

    //  KOMENTARZE 
    commentsList.innerHTML = '';
    const groupedComments = {};
    res.comments.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
        .forEach(c => {
            const movie = c.movie_title?.trim() ? c.movie_title : 'Usunięty film';
            if(!groupedComments[movie]) groupedComments[movie] = [];
            groupedComments[movie].push(c);
        });

    Object.entries(groupedComments).forEach(([movieTitle, comments]) => {
        const movieHeader = document.createElement('h4');
        movieHeader.textContent = movieTitle;
        movieHeader.classList.add('movie-header');
        commentsList.appendChild(movieHeader);

        const movieContainer = document.createElement('div');
        movieContainer.classList.add('movie-comments');
        commentsList.appendChild(movieContainer);

        comments.forEach(c => {
            const div = document.createElement('div');
            div.classList.add('comment-card');

            const contentDiv = document.createElement('div');
            contentDiv.classList.add('comment-content');
            contentDiv.innerHTML = `
                <p>${c.content}</p>
                <small>${new Date(c.created_at).toLocaleString()}</small>
            `;

            const btn = document.createElement('button');
            btn.textContent = 'Usuń';
            btn.classList.add('btn-delete');
            btn.onclick = () => deleteComment(c.id);

            div.appendChild(contentDiv);
            div.appendChild(btn);
            movieContainer.appendChild(div);
        });

        movieHeader.addEventListener('click', () => {
            movieHeader.classList.toggle('active');
            movieContainer.style.display = movieContainer.style.display === 'block' ? 'none' : 'block';
        });
    });

    //  REZERWACJE 
    reservationsList.innerHTML = '';
    const grouped = { reserved: {}, paid: {}, ended: {} };
    res.reservations.forEach(r => {
        const status = r.status;
        const movie = r.movie_title?.trim() ? r.movie_title : 'Usunięty film';
        if (!grouped[status][movie]) grouped[status][movie] = [];
        grouped[status][movie].push(r);
    });

    Object.entries(grouped).forEach(([status, moviesMap]) => {
        const statusHeader = document.createElement('h3');
        statusHeader.textContent = status.toUpperCase();
        statusHeader.classList.add('status-header');
        reservationsList.appendChild(statusHeader);

        const statusContainer = document.createElement('div');
        statusContainer.classList.add('status-container');
        reservationsList.appendChild(statusContainer);

        const movieTitles = Object.keys(moviesMap);
        if(movieTitles.length === 0){
            const emptyMsg = document.createElement('div');
            emptyMsg.classList.add('reservation-card');
            emptyMsg.textContent = 'Brak rezerwacji';
            statusContainer.appendChild(emptyMsg);
        }

        movieTitles.forEach(movieTitle => {
            const movieHeader = document.createElement('h4');
            movieHeader.textContent = movieTitle;
            movieHeader.classList.add('movie-header');
            statusContainer.appendChild(movieHeader);

            const movieContainer = document.createElement('div');
            movieContainer.classList.add('movie-reservations');
            statusContainer.appendChild(movieContainer);

            moviesMap[movieTitle].forEach(r => {
                const div = document.createElement('div');
                div.classList.add('reservation-card');

                const infoDiv = document.createElement('div');
                infoDiv.innerHTML = `
                    Sala: ${r.screen_name || '-'}<br>
                    Miejsce: ${r.seat_row || '-'}${r.seat_number || ''}<br>
                    <small>${r.start_time ? new Date(r.start_time).toLocaleString() : ''}</small>
                `;

                const btnDiv = document.createElement('div');

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Usuń';
                deleteBtn.classList.add('btn-delete');
                deleteBtn.onclick = () => deleteReservation(r.id);
                btnDiv.appendChild(deleteBtn);

                if(r.status === 'reserved'){
                    const payBtn = document.createElement('button');
                    payBtn.textContent = 'Opłać';
                    payBtn.classList.add('btn-cancel');
                    payBtn.onclick = () => payReservation(r.id);
                    btnDiv.appendChild(payBtn);
                }

                div.appendChild(infoDiv);
                div.appendChild(btnDiv);
                movieContainer.appendChild(div);
            });

            movieHeader.addEventListener('click', () => {
                movieHeader.classList.toggle('active');
                movieContainer.style.display = movieContainer.style.display === 'block' ? 'none' : 'block';
            });
        });

        statusHeader.addEventListener('click', () => {
            statusHeader.classList.toggle('active');
            statusContainer.style.display = statusContainer.style.display === 'block' ? 'none' : 'block';
        });
    });
}

//  FUNKCJE AKCJI 
async function deleteComment(id) {
    const confirmed = await showConfirm('Czy na pewno chcesz usunąć komentarz?');
    if (!confirmed) return;
    const res = await fetchAPI(`/admin_control/comments/${id}`, { method: 'DELETE' });
    if (res.success) {
        showNotification('Komentarz usunięty', 'success');
        loadUser();
    } else {
        showNotification(res.message || 'Błąd przy usuwaniu komentarza', 'error');
    }
}

async function deleteReservation(id) {
    const confirmed = await showConfirm('Czy na pewno chcesz usunąć tę rezerwację?');
    if (!confirmed) return;
    const res = await fetchAPI(`/admin_control/reservations/${id}`, { method: 'DELETE' });
    if (res.success) {
        showNotification('Rezerwacja usunięta', 'success');
        loadUser();
    } else {
        showNotification(res.message || 'Nie udało się usunąć rezerwacji', 'error');
    }
}

async function payReservation(id) {
    const res = await fetchAPI(`/admin_control/reservations/${id}/pay`, { method: 'POST' });
    if (res.success) {
        showNotification('Rezerwacja opłacona', 'success');
        loadUser();
    } else {
        showNotification(res.message || 'Nie udało się opłacić rezerwacji', 'error');
    }
}

//  FORMULARZ AKTUALIZACJI 
document.getElementById('userForm').addEventListener('submit', async e => {
    e.preventDefault();

    const payload = { username: usernameInput.value, email: emailInput.value };
    if (passwordInput.value) payload.password = passwordInput.value;

    const res = await fetchAPI(`/admin_control/users/${userId}/update`, {
        method: 'PUT',
        body: payload
    });

    showNotification(res.message, res.success ? 'success' : 'error');
    passwordInput.value = '';
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

//  PRZYCISK POWROTU 
document.getElementById('backBtn').onclick = () => {
    window.location.href = 'admin_panel.html';
};

//  START 
loadUser();
