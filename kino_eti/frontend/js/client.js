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


  if (!role) {
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


// Filmy

    const containers = {
      family: document.getElementById('family'),
      classic: document.getElementById('action'),
      coming_soon: document.getElementById('coming_soon'),
      now_playing: document.getElementById('now_playing')
    };
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await safeFetch('/movies/movies_playing', { method: 'GET' });
    const data = await response.json();

    if (!data.success || !data.movies_playing || data.movies_playing.length === 0) {
      console.warn('Brak filmów do wyświetlenia.');
      return;
    }

    const targetContainer = document.getElementById('now_playing');

    data.movies_playing.forEach(movie => {
      console.log(`Dodaję film: ${movie.title} do kategorii now_playing`);

      if (targetContainer) {
        const slide = document.createElement('div');
        slide.classList.add('carousel-slide');


        const img = document.createElement('img');
        img.src = movie.poster;
        img.alt = movie.title;
        img.title = movie.title;
        img.style.cursor = 'pointer';


        img.addEventListener('click', () => {
          window.location.href = `movies.html?id=${movie.id}`;
        });

        slide.appendChild(img);
        targetContainer.appendChild(slide);
      } else {
        console.warn('Nie znaleziono kontenera now_playing');
      }
    });
    initCarousel(containers.now_playing.closest('.film-carousel'));
  } catch (err) {
    console.error('Błąd pobierania filmów:', err);
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await safeFetch('/movies/movies_all', { method: 'GET' });
    const data = await response.json();

    if (!data.success || !data.movies_all || data.movies_all.length === 0) {
      console.warn('Brak filmów do wyświetlenia.');
      return;
    }


    data.movies_all.forEach(movie => {
      if (!movie.genre) return;

      let targetContainer = null;
      const genreLower = movie.genre.toLowerCase();
const now = new Date();
      if (movie.release_date && new Date(movie.release_date) > now) {
        targetContainer = containers.coming_soon
      } else if (genreLower.includes('action')) {
        targetContainer = containers.classic;
      } else if (genreLower.includes('animation') && genreLower.includes('family')) {
        targetContainer = containers.family;
      }

      if (targetContainer) {
        const slide = document.createElement('div');
        slide.classList.add('carousel-slide');

        const img = document.createElement('img');
        img.src = movie.poster;
        img.alt = movie.title;
        img.title = movie.title;
        img.style.cursor = 'pointer';

        img.addEventListener('click', () => {
          window.location.href = `movies.html?id=${movie.id}`;
        });

        slide.appendChild(img);
        targetContainer.appendChild(slide);

        console.log(`Dodano film: ${movie.title} do sekcji: ${targetContainer.id}`);
      }
    });
        Object.values(containers).forEach(container => {
        initCarousel(container.closest('.film-carousel'));
        });
  } catch (err) {
    console.error('Błąd pobierania filmów:', err);
  }
});

document.querySelectorAll('.film-carousel').forEach(section => {
  const track = section.querySelector('.carousel-track');
  const btnPrev = section.querySelector('.carousel-btn.prev');
  const btnNext = section.querySelector('.carousel-btn.next');

  if (!track || !btnPrev || !btnNext) return;

  const slides = track.querySelectorAll('.carousel-slide');
  if (slides.length === 0) return;

  const slideWidth = slides[0].offsetWidth;

  // Kliknięcia przycisków
  btnNext.addEventListener('click', () => {
    track.scrollBy({ left: slideWidth, behavior: 'smooth' });
  });

  btnPrev.addEventListener('click', () => {
    track.scrollBy({ left: -slideWidth, behavior: 'smooth' });
  });

});

//// Kupowanie////

function zmien() {
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
  window.location.href = "biblioteka.html";
}

//// BIblioteka przejście ////

  document.addEventListener('DOMContentLoaded', () => {
    const libraryLink = document.getElementById('libraryLink');

    libraryLink.addEventListener('click', (e) => {
      e.preventDefault();

      const token = getToken();
      if (token && !isTokenExpired(token)) {

        window.location.href = 'biblioteka.html';
      } else {

        window.location.href = 'biblioteka_bez.html';
      }
    });
  });
document.addEventListener('DOMContentLoaded', () => {
  const libraryLinkMobile = document.getElementById('libraryLinkMobile');
  if (libraryLinkMobile) {
    libraryLinkMobile.addEventListener('click', (e) => {
      e.preventDefault();
      const token = getToken();
      if (token && !isTokenExpired(token)) {
        window.location.href = 'biblioteka.html';
      } else {
        window.location.href = 'biblioteka_bez.html';
      }
    });
  }
});

  //// KARUZELE /////

function initCarousel(section) {
  const track = section.querySelector('.carousel-track');
  const btnPrev = section.querySelector('.carousel-btn.prev');
  const btnNext = section.querySelector('.carousel-btn.next');

  if (!track || !btnPrev || !btnNext) return;

  const slides = track.querySelectorAll('.carousel-slide');
  if (slides.length === 0) return;

const slide = slides[0];
const slideWidth = slide.offsetWidth + parseInt(getComputedStyle(track).gap);

  // Kliknięcia przycisków
  btnNext.addEventListener('click', () => {
    track.scrollBy({ left: slideWidth, behavior: 'smooth' });
  });
  btnPrev.addEventListener('click', () => {
    track.scrollBy({ left: -slideWidth, behavior: 'smooth' });
  });
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
const hamburger = document.getElementById("hamburger");
const mNav = document.getElementById("m-nav");

hamburger.addEventListener("click", () => {
    mNav.classList.toggle("active");
});

// Toggle dropdown "Moje konto" w mobilnym menu
const accountWrapperMobile = document.querySelector("#accountMenuItemMobile .account-wrapper");
const accountBtnMobile = document.getElementById("accountBtnMobile");

accountBtnMobile.addEventListener("click", (e) => {
    e.stopPropagation();
    accountWrapperMobile.classList.toggle("active");
});

// Zamknięcie po kliknięciu poza dropdown
document.addEventListener("click", (e) => {
    if (!accountWrapperMobile.contains(e.target)) {
        accountWrapperMobile.classList.remove("active");
    }
});


/////  Mobile account dropdown behavior  /////

const accountDropdownMobile = document.getElementById("accountDropdownMobile");
const nickElMobile = accountDropdownMobile.querySelector(".account-nick");
const openResBtnMobile = document.getElementById("openReservationsMobile");
const settingsBtnMobile = document.getElementById("openSettingsMobile");

// Pobranie nazwy użytkownika do mobilnego menu
async function loadAccountNameMobile() {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
        nickElMobile.textContent = '—';
        return;
    }
    try {
        const response = await safeFetch('/users/account', { method: 'GET' });
        const data = await response.json();
        if (response.ok && data.success) {
            nickElMobile.textContent = data.user.username;
        } else {
            nickElMobile.textContent = '—';
        }
    } catch (err) {
        console.error('Błąd pobierania konta (mobile):', err);
        nickElMobile.textContent = 'Błąd';
    }
}


// Kliknięcia przycisków w mobilnym dropdownie
if (openResBtnMobile) {
    openResBtnMobile.addEventListener("click", (e) => {
        e.preventDefault();
        accountWrapperMobile.classList.remove("active");
        window.location.href = 'user_reservations.html';
    });
}

if (settingsBtnMobile) {
    settingsBtnMobile.addEventListener("click", (e) => {
        e.preventDefault();
        accountWrapperMobile.classList.remove("active");
        window.location.href = 'client_settings.html';
    });
}

if (logoutBtnMobile) {
    logoutBtnMobile.addEventListener("click", (e) => {
        e.preventDefault();
        removeToken();
        window.location.href = 'index.html';
    });
}

// Zamknięcie mobilnego dropdownu po kliknięciu poza nim
document.addEventListener("click", (e) => {
    if (!accountWrapperMobile.contains(e.target)) {
        accountWrapperMobile.classList.remove("active");
    }
});

// Pobierz nazwę użytkownika od razu po załadowaniu strony
document.addEventListener("DOMContentLoaded", loadAccountNameMobile);