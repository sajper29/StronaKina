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


function showNotification(text, isError = true) {
    const n = document.getElementById('error');
    n.style.display = 'block';
    n.style.backgroundColor = isError ? '#ff6b6b' : '#4CAF50';
    n.textContent = text;
}

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
// Sprawdzenie czy dobra

async function checkLoginAndShowBody2() {
    
  const token = getToken();

  if (!token || isTokenExpired(token)) {
    document.body.style.display="block";
    return;
  }
  else{
    document.body.style.display="none"; 
    window.location.replace('movies.html');
   
  }
  try {
    const response = await safeFetch('/users/account', { method: 'GET' });
    const data = await response.json();
    if (!response.ok || !data.success) {
      document.body.style.display="block";
    }
    else
    {
        document.body.style.display="none";
        window.location.replace('movies.html'); 

    }
  } catch (err) {
    console.error('Błąd sprawdzania tokenu:', err);

    document.body.style.display="block";
  }
};
document.addEventListener('DOMContentLoaded', () => { const bodyStyle = window.getComputedStyle(document.body); if (bodyStyle && bodyStyle.display === 'none') { checkLoginAndShowBody2(); } });

///// Rejestracja  /////



document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('registerForm');
  const btn = document.getElementById('registerBtn');
  const errorBox = document.getElementById('regError');



  if (btn && form) {
    btn.addEventListener('click', async function() {
  if (errorBox) errorBox.textContent = "";

  const unameEl = form.querySelector('[name="uname"]');
  const emailEl = form.querySelector('[name="email"]');
  const pswEl = form.querySelector('[name="psw"]');
  const pswConfirmEl = form.querySelector('[name="pswConfirm"]');

  const uname = unameEl ? unameEl.value.trim() : '';
  const email = emailEl ? emailEl.value.trim() : '';
  const psw = pswEl ? pswEl.value : '';
  const pswConfirm = pswConfirmEl ? pswConfirmEl.value : '';

  if (psw !== pswConfirm) {
      if (errorBox) errorBox.textContent = "Hasła nie są identyczne.";
      return;
  }

  try {
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uname, email, psw, confirmPassword: pswConfirm })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      showNotification(data.message, 'success');
      if (document.getElementById('register')) document.getElementById('register').style.display = 'none';
      form.reset();
    } else {
      if (errorBox) errorBox.textContent = data.message || "Wystąpił błąd rejestracji.";
    }
  } catch (err) {
    if (errorBox) errorBox.textContent = "Błąd połączenia z serwerem.";
    console.error(err);
  }
});
  }
});

/////  Logowanie  /////
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const loginError = document.getElementById('loginError');

  if (loginForm && loginBtn) {
     const currentPath = window.location.pathname; 
    const currentSearch = window.location.search; 
    loginBtn.addEventListener('click', async () => {
      if (loginError) loginError.textContent = "Trwa logowanie...";

      const unameEl = loginForm.querySelector('[name="uname"]');
      const pswEl = loginForm.querySelector('[name="psw"]');

      const uname = unameEl ? unameEl.value.trim() : '';
      const psw = pswEl ? pswEl.value : '';

      try {
        const response = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uname, psw })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          if (data.token) saveToken(data.token);
          if (loginError) loginError.textContent = "";
          if (currentPath.includes('movies')) {

        window.location.replace(`movies.html${currentSearch}`);
    } else {
        window.location.replace('biblioteka.html');
    }
        } else {
          if (loginError) loginError.textContent = data.message || "Nie udało się zalogować.";
        }

      } catch (err) {
        if (loginError) loginError.textContent = "Błąd połączenia z serwerem.";
        console.error(err);
      }
    });
  }
});

/////  Szybkie mapowanie przycisków log/register z index.html  /////

function toggleForm(formId) {
  const login = document.getElementById('login');
  const register = document.getElementById('register');

  if (formId === 'login') {
    if (login) login.style.display = 'block';
    if (register) register.style.display = 'none';
  }

  if (formId === 'register') {
    if (register) register.style.display = 'block';
    if (login) login.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('logbutton');
  const registerBtn = document.getElementById('regbutton');

  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      const loginForm = document.getElementById('login');
      const registerForm = document.getElementById('register');
      if (loginForm) loginForm.style.display = 'block';
      if (registerForm) registerForm.style.display = 'none';
    });
  }

  if (registerBtn) {
    registerBtn.addEventListener('click', () => {
      const loginForm = document.getElementById('login');
      const registerForm = document.getElementById('register');
      if (registerForm) registerForm.style.display = 'block';
      if (loginForm) loginForm.style.display = 'none';
    });
  }
});

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


//Comment tekst

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