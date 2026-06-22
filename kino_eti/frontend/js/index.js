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
        const userRole = data.role;
        if (response.ok && data.success) {
          if (data.token) saveToken(data.token);
          if (loginError) loginError.textContent = "";
          window.location.href = "client.html";
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

// Filmy

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
          window.location.href = `movies_bez.html?id=${movie.id}`;
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

    const containers = {
      family: document.getElementById('family'),
      classic: document.getElementById('action'),
      coming_soon: document.getElementById('coming_soon')
    };

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



document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.reset();
    }
});

/////  Szybkie mapowanie przycisków log/register z index.html

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

//// Odświeżenie /////

async function checkLoginAndShowBody() {
  const token = getToken();
  if (!token || isTokenExpired(token)) {
    removeToken();
    document.body.style.display = 'block';
    return;
  }

  try {
    const resp = await safeFetch('/users/account', { method: 'GET' });
    const data = await resp.json();
    if (!resp.ok || !data.success) {
      removeToken();
        document.body.style.display = 'block';
    } else {
        window.location.replace('client.html');
    }
  } catch (err) {
    console.error('Błąd autoryzacji:', err);
    removeToken();
    document.body.style.display = 'block';
  }
}

document.addEventListener('DOMContentLoaded', () => { const bodyStyle = window.getComputedStyle(document.body); if (bodyStyle && bodyStyle.display === 'none') { checkLoginAndShowBody(); } });


//// Kupowanie /////

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

 //// KARUZELE ///
 

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


const hamburger = document.getElementById("hamburger");
const nav = document.getElementById("m-nav");

hamburger.addEventListener("click", () => {
    nav.classList.toggle("active");
});




