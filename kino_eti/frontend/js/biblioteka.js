
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
  const role = getUserRoleFromToken();
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

  if (openResBtn){
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

//// Ustawienia konta
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
let allMovies = [];

//  POBIERANIE FILMÓW 
async function loadMovies() {
    try {
        const res = await fetch("/movies/movies_all");
        const data = await res.json();
        if (!data.success) return;

        allMovies = data.movies_all;
        initFilters(allMovies);
        
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
            window.location.href = `/movies.html?id=${encodeURIComponent(movie.id)}`;
        });

        movieList.appendChild(div);
    });
}


//  INICJALIZACJA FILTRÓW 
function initFilters(movies) {
    // gatunki po '/'
    const genresSet = new Set();
    movies.forEach(m => {
        if (m.genre) {
            m.genre.split('/').forEach(g => genresSet.add(g.trim()));
        }
    });
    const genres = [...genresSet].sort();

    const genreSelect = document.getElementById("genreFilter");
    const yearSelect = document.getElementById("yearFilter");

    // gatunki
    genres.forEach(g => {
        genreSelect.innerHTML += `<option value="${g}">${g}</option>`;
    });

    // lata od 1900 do teraz
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 1900; y--) {
        yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
    }

    document.getElementById("searchInput").oninput = applyFilters;
    genreSelect.onchange = applyFilters;
    yearSelect.onchange = applyFilters;

}
function applyFilters() {
    let filtered = playingMode ? [...moviesPlaying] : [...allMovies];

    const searchValue = document.getElementById("searchInput").value.toLowerCase();
    if (searchValue) {
        filtered = filtered.filter(m =>
            m.title && m.title.toLowerCase().includes(searchValue)
        );
    }

    const genre = document.getElementById("genreFilter").value;
    if (genre) {
        filtered = filtered.filter(m => {
            if (!m.genre) return false;
            return m.genre.split('/').map(g => g.trim()).includes(genre);
        });
    }

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
//  FILTROWANIE 
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
    removeToken(); 
    window.location.replace('biblioteka_bez.html'); 
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
      window.location.replace('biblioteka_bez.html');
      document.body.style.display="none";
    }
    else{
         document.body.style.display="block";
    }
  } catch (err) {
    console.error('Błąd sprawdzania tokenu:', err);
    removeToken();
    window.location.replace('biblioteka_bez.html');
    document.body.style.display="none";
  }
};

document.addEventListener('DOMContentLoaded', () => { const bodyStyle = window.getComputedStyle(document.body); if (bodyStyle && bodyStyle.display === 'none') { checkLoginAndShowBody2(); } });


 ////  TRYB "AKTUALNIE W KINIE"



let playingMode = true; 

let moviesPlaying = [];         


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
        document.body.style.display = 'block'; // Pokaż stronę nawet przy błędzie
    }
});

const playingToggleBtn = document.getElementById("playingToggle");
if (playingToggleBtn) {
    playingToggleBtn.onclick = togglePlayingMode; 
}