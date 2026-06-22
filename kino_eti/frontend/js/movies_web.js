function saveToken(token) {
  if (token) localStorage.setItem('token', token);
}

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

/////  UI: carousel / drobne funkcje  /////
function rozwin(){
  const a = document.getElementById("zaw");
  if (!a) return;
  a.style.display = (a.style.display === "flex") ? "none" : "flex";
}

const track = document.querySelector('.carousel-track');
const btnPrev = document.querySelector('.carousel-btn.prev');
const btnNext = document.querySelector('.carousel-btn.next');

if (btnNext && track) {
  btnNext.addEventListener('click', () => {
    track.scrollBy({ left: 300, behavior: 'smooth' });
  });
}
if (btnPrev && track) {
  btnPrev.addEventListener('click', () => {
    track.scrollBy({ left: -300, behavior: 'smooth' });
  });
}

let autoScroll;
if (track) {
  autoScroll = setInterval(() => {
    track.scrollBy({ left: 300, behavior: 'smooth' });
  }, 3000);

  track.addEventListener('mouseenter', () => clearInterval(autoScroll));
  track.addEventListener('mouseleave', () => {
    autoScroll = setInterval(() => {
      track.scrollBy({ left: 300, behavior: 'smooth' });
    }, 3000);
  });
}

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
// pobierz id z URL: /movies.html?id=123
const params = new URLSearchParams(window.location.search);
const movieId = params.get('id');

if (!movieId) {
    showNotification('Brak identyfikatora filmu w URL.');
} else {
    fetch(`/movies/movie/${encodeURIComponent(movieId)}`)
        .then(res => {
            if (!res.ok) throw new Error('Błąd sieci');
            return res.json();
        })
        .then(data => {
            if (!data.success) {
                showNotification(data.message || 'Nie znaleziono filmu.');
                return;
            }
            const m = data.movie;
            document.getElementById('movieTitle').textContent = m.title || 'Brak tytułu';
            document.getElementById('moviePoster').src = m.poster || '/img/logo.png';
            const year = m.release_date ? new Date(m.release_date).getFullYear() : '?';
            document.getElementById('movieMeta').innerHTML = `
                <strong>Gatunek:</strong> ${m.genre || '?'} • 
                <strong>Rok:</strong> ${year}
            `;
            document.getElementById('movieDesc').innerHTML = `<p>${m.description || 'Brak opisu.'}</p>`;

              fetch(`/movies/movie/${encodeURIComponent(movieId)}/showings`)
                .then(r => r.json())
                .then(showData => {
                    if (showData.success && showData.showings.length) {
                        const container = document.getElementById('movieShowings');
                        showData.showings.forEach(show => {
                            const div = document.createElement('div');
                            div.classList.add('showing');
                            div.innerHTML = `
                                <span>${new Date(show.start_time).toLocaleString()}</span> • 
                                <span>${show.name}</span> • 
                                <span>${show.price} zł</span>
                                <button class="reserveBtn">Rezerwuj</button>
                            `;
                           
                            div.querySelector('.reserveBtn').addEventListener('click', () => {

                                       const token = getToken();

                                    
                                    if (!token || isTokenExpired(token)) {
                                      
                                      const notification = document.getElementById('regNotification');
                                      function showNotification(msg, type = 'success') {
                                      if (!notification) return;
                                      notification.textContent = msg;
                                      notification.style.backgroundColor = type === 'success' ? '#4CAF50' : '#f44336';
                                      notification.classList.add('show');
                                      setTimeout(() => {
                                        notification.classList.remove('show');
                                      }, 3000);

                                    }
                                      showNotification("Proszę się zalogować, aby kontynuować.", "warning");

                                      const loginForm = document.getElementById('login');
                                      const registerForm = document.getElementById('register');

                                      if (registerForm) registerForm.style.display = 'none';
                                      if (loginForm) loginForm.style.display = 'block';

                                      return;
                                    }
                                
                                const showTime = encodeURIComponent(show.start_time);
                                    const onScreenId = show.id;
                                    window.location.href = `/reservation.html?movieId=${movieId}&onScreenId=${onScreenId}`;
                            });
                            container.appendChild(div);
                        });
                    }
                    else{
                        const container1 = document.getElementById('movieShowings');
                       div.innerHTML = `<span>Brak seansów</span>`;
                       container1.appendChild(div);
                    }
                });
        })
        .catch(err => {
            console.error(err);
            showNotification('Błąd podczas pobierania szczegółów filmu.');
        });
}


//Sprawdzenie 

async function checkLoginAndShowBody2() {
  
  const token = getToken();

    const currentPath = window.location.pathname;
    const currentSearch = window.location.search; 
 
  if (!token || isTokenExpired(token)) {
    removeToken(); 
        if (currentPath.includes('movies')) {
        
        window.location.replace(`movies_bez.html${currentSearch}`);
    } else {
        window.location.replace('biblioteka_bez.html');
    }
    document.body.style.display="none";
    return;
  }
  else{
    document.body.style.display="block";
  }
  try {
    const response = await safeFetch('/users/account', { method: 'GET' });
    const data = await response.json();
    if (!response.ok || !data.success) {
      removeToken();
          if (currentPath.includes('movies')) {
        
        window.location.replace(`movies_bez.html${currentSearch}`);
    } else {
        window.location.replace('biblioteka_bez.html');
    }
      document.body.style.display="none";
    }
    else{
         document.body.style.display="block";
    }
  } catch (err) {
    console.error('Błąd sprawdzania tokenu:', err);
    removeToken();
        if (currentPath.includes('movies')) {
        
        window.location.replace(`movies_bez.html${currentSearch}`);
    } else {
        window.location.replace('biblioteka_bez.html');
    }
    document.body.style.display="none";
  }
};

document.addEventListener('DOMContentLoaded', () => { const bodyStyle = window.getComputedStyle(document.body); if (bodyStyle && bodyStyle.display === 'none') { checkLoginAndShowBody2(); } });

//  KOMENTARZE  //
let currentPage = 1;
let COMMENTS_PER_PAGE = 10;

async function loadComments(page = 1) {
  const container = document.getElementById('commentsList');
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  const pageNumbers = document.getElementById('pageNumbers');

  container.innerHTML = 'Ładowanie komentarzy...';
  pageNumbers.innerHTML = '';

  try {
    const response = await safeFetch(`/movies/movie/${movieId}/comments`);
    const data = await response.json();

    if (!data.success || !data.comments) {
      container.innerHTML = '<p>Brak komentarzy.</p>';
      prevBtn.style.display = nextBtn.style.display = 'none';
      return;
    }

    const comments = data.comments;
    const totalPages = Math.ceil(comments.length / COMMENTS_PER_PAGE);

    if (comments.length === 0) {
      container.innerHTML = '<p>Brak komentarzy.</p>';
      prevBtn.style.display = nextBtn.style.display = 'none';
      return;
    }

    currentPage = Math.min(Math.max(page, 1), totalPages); 
    const start = (currentPage - 1) * COMMENTS_PER_PAGE;
    const end = start + COMMENTS_PER_PAGE;
    const pageComments = comments.slice(start, end);

    container.innerHTML = '';
    pageComments.forEach(c => {
      const div = document.createElement('div');
      div.classList.add('comment');
      div.innerHTML = `
        <strong>${c.username}</strong> <span class="commentDate">(${new Date(c.created_at).toLocaleString()})</span>
        <p>${c.content}</p>
      `;
      container.appendChild(div);
    });

    // Przyciski Poprzednia / Następna
    prevBtn.style.display = currentPage > 1 ? 'inline-block' : 'none';
    nextBtn.style.display = currentPage < totalPages ? 'inline-block' : 'none';
    prevBtn.onclick = () => loadComments(currentPage - 1);
    nextBtn.onclick = () => loadComments(currentPage + 1);

    // Numery stron (4 przed i 4 po aktualnej)
    const startPage = Math.max(currentPage - 4, 1);
    const endPage = Math.min(currentPage + 4, totalPages);

    for (let i = startPage; i <= endPage; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.classList.add('header-btn');
      if (i === currentPage) {
        btn.style.backgroundColor = '#ffb80a';
        btn.style.color = '#001d3d';
      }
      btn.onclick = () => loadComments(i);
      pageNumbers.appendChild(btn);
    }

  } catch (err) {
    console.error('Błąd pobierania komentarzy:', err);
    container.innerHTML = '<p>Błąd podczas ładowania komentarzy.</p>';
    prevBtn.style.display = nextBtn.style.display = 'none';
  }
}



async function addComment() {
  const textEl = document.getElementById('commentText');
  const text = textEl.value.trim();
  if (!text) return;

  const token = getToken();
  if (!token || isTokenExpired(token)) {
    alert('Musisz być zalogowany, aby dodać komentarz.');
    return;
  }

  try {
    const response = await safeFetch(`/movies/movie/${movieId}/comments_add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await response.json();
    if (!data.success) {
      alert(data.message || 'Nie udało się dodać komentarza.');
      return;
    }
    textEl.value = '';
    document.getElementById('charCount').textContent = '0 / 300';
    loadComments(1); 
  } catch (err) {
    console.error('Błąd dodawania komentarza:', err);
    alert('Błąd podczas dodawania komentarza.');
  }
}


document.addEventListener('DOMContentLoaded', () => {
  loadComments();
  const submitBtn = document.getElementById('submitComment');
  if (submitBtn) {
    submitBtn.addEventListener('click', addComment);
  }
});


//// Comment tekst

document.addEventListener('DOMContentLoaded', () => {
  const textEl = document.getElementById('commentText');
  const countEl = document.getElementById('charCount');

  if (textEl && countEl) {
    textEl.addEventListener('input', () => {
      const len = textEl.value.length;
      countEl.textContent = `${len} / 300`;
    });
  }
});


document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('commentsPerPageSelect');
  if (select) {
    select.value = COMMENTS_PER_PAGE;
    select.addEventListener('change', () => {
      COMMENTS_PER_PAGE = parseInt(select.value);
      loadComments(1); 
    });
  }
});
