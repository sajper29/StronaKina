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


let allMovies = [];

//  POBIERANIE FILMÓW 
async function loadMovies() {
    try {
        const res = await fetch("/movies/movies_all");
        const data = await res.json();
        if (!data.success) return;

        allMovies = data.movies_all;
        initFilters(allMovies);
        
        // Zmiana z renderMovies(allMovies) na:
        applyFilters(); 

    } catch (err) {
        console.error("Błąd pobierania filmów:", err);
    }
}

//  RENDEROWANIE FILMÓW 
function renderMovies(movies) {
    const movieList = document.getElementById("movieList");
    movieList.innerHTML = "";

    movies.forEach(movie => {
        const div = document.createElement("div");
        div.classList.add("movie-wrapper");
        div.innerHTML = `
        <div class="movie-card" style="cursor:pointer;" data-id="${movie.id}">
            <img src="${movie.poster}" alt="${movie.title}">
            <div class="movie-text">
                <h3 class="movie-title">${movie.title}</h3>
                <div class="movie-meta">
                    ${movie.genre ? movie.genre : "?"} • 
                    ${movie.release_date ? new Date(movie.release_date).getFullYear() : "?"} 
                </div>
                <p class="movie-desc">${movie.description || "Brak opisu."}</p>
            </div>
        </div>`;

        div.querySelector('.movie-card').addEventListener('click', () => {
            window.location.href = `/movies_bez.html?id=${encodeURIComponent(movie.id)}`;
        });

        movieList.appendChild(div);
    });
}


//  INICJALIZACJA FILTRÓW 
function initFilters(movies) {
    const genresSet = new Set();
    movies.forEach(m => {
        if (m.genre) {
            m.genre.split('/').forEach(g => genresSet.add(g.trim()));
        }
    });
    const genres = [...genresSet].sort();

    const genreSelect = document.getElementById("genreFilter");
    const yearSelect = document.getElementById("yearFilter");

    genres.forEach(g => {
        genreSelect.innerHTML += `<option value="${g}">${g}</option>`;
    });

    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 1900; y--) {
        yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
    }
    document.getElementById("searchInput").oninput = applyFilters;
    genreSelect.onchange = applyFilters;
    yearSelect.onchange = applyFilters;

}

//  FILTROWANIE 
function applyFilters() {

    let filtered = playingMode ? [...moviesPlaying] : [...allMovies];

    const searchValue = document.getElementById("searchInput").value.toLowerCase();
    if (searchValue) {
        filtered = filtered.filter(m =>
            m.title && m.title.toLowerCase().includes(searchValue)
        );
    }

    // GATUNEK
    const genre = document.getElementById("genreFilter").value;
    if (genre) {
        filtered = filtered.filter(m => {
            if (!m.genre) return false;
            return m.genre.split('/').map(g => g.trim()).includes(genre);
        });
    }

    // ROK
    const year = document.getElementById("yearFilter").value;
    if (year) {
        const yearNum = Number(year);
        filtered = filtered.filter(m => {
            if (!m.release_date) return false;
            const movieYear = new Date(m.release_date).getFullYear();
            return movieYear === yearNum;
        });
    }

    renderMovies(filtered);
}




//  TRYBY WIDOKU 
document.getElementById("gridViewBtn").onclick = () => {
    movieList.classList.remove("view-list");
    movieList.classList.add("view-grid");

    gridViewBtn.classList.add("active");
    listViewBtn.classList.remove("active");
};

document.getElementById("listViewBtn").onclick = () => {
    movieList.classList.add("view-list");
    movieList.classList.remove("view-grid");

    listViewBtn.classList.add("active");
    gridViewBtn.classList.remove("active");
};

//  START 
document.addEventListener('DOMContentLoaded', loadMovies);

// Sprawdzenie czy dobra

async function checkLoginAndShowBody2() {
    
  const token = getToken();

  if (!token || isTokenExpired(token)) {
    document.body.style.display="block";
    return;
  }
  else{
    document.body.style.display="none"; 
    window.location.replace('biblioteka.html');
   
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
        window.location.replace('biblioteka.html'); 

    }
  } catch (err) {
    console.error('Błąd sprawdzania tokenu:', err);

    document.body.style.display="block";
  }
};
document.addEventListener('DOMContentLoaded', () => { const bodyStyle = window.getComputedStyle(document.body); if (bodyStyle && bodyStyle.display === 'none') { checkLoginAndShowBody2(); } });


/////  Rejestracja  /////



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
          window.location.href = "biblioteka.html";
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



 ////  TRYB "AKTUALNIE W KINIE" ////




let playingMode = true; 

let moviesPlaying = [];          

// pobiera filmy które są obecnie grane
async function loadPlayingMovies() {
    try {
        const res = await fetch("/movies/movies_playing");
        const data = await res.json();

        if (data.success) {
            moviesPlaying = data.movies_playing.map(m => ({
                id: m.id,
                title: m.title,
                poster: m.poster,
                description: m.description,
                genre: m.genre,    
                release_date: m.release_date, 
                rating: m.rating     
            }));
        }
    } catch (err) {
        console.error("Błąd pobierania aktualnych filmów:", err);
    }
}

// przełącza tryb wyświetlania
async function togglePlayingMode() {
    playingMode = !playingMode;

    const title = document.getElementById("playingTitle");
    const switchEl = document.getElementById("playingSwitch");

    if (playingMode) {
        title.textContent = "Aktualnie w kinie — WŁ.";
        switchEl.classList.add("active");
        
        if (moviesPlaying.length === 0) {
            await loadPlayingMovies();
        }
    } else {
        title.textContent = "Aktualnie w kinie — WYŁ.";
        switchEl.classList.remove("active");
    }
    applyFilters(); 
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await loadMovies(); 
        await loadPlayingMovies();

        playingMode = true;
        const title = document.getElementById("playingTitle");
        const switchEl = document.getElementById("playingSwitch");
        
        if (title && switchEl) {
            title.textContent = "Aktualnie w kinie — WŁ.";
            switchEl.classList.add("active");
        }

        renderMovies(moviesPlaying);


        if (typeof initFilters === "function") {
            initFilters(allMovies);
        }


        document.body.style.display = 'block';

    } catch (err) {
        console.error("Błąd podczas inicjalizacji strony:", err);
        document.body.style.display = 'block';
    }
});

const playingToggleBtn = document.getElementById("playingToggle");
if (playingToggleBtn) {
    playingToggleBtn.onclick = togglePlayingMode; 
}

