const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const getConnection = require('../db');
const router = express.Router();
const validator = require('validator');
const authenticateToken = require('../middleware/authMiddleware');


const JWT_SECRET = process.env.JWT_SECRET;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,30}$/;
const usernameRegex = /^(?=.*[a-zA-Z])[a-zA-Z0-9_-]{3,20}$/;

router.post('/register', async (req, res) => {
  let conn;
  try {
    const { uname, email, psw, confirmPassword } = req.body;

    if (!uname || !email || !psw || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Wszystkie pola są wymagane.' });
    }
    if (uname.startsWith(`etikino_`)) {
      return res.status(400).json({ success: false, message: 'Zakaz tworzenia konta rozpoczynającego się na etikino_' });
    }
    if (psw !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Hasła nie są identyczne.' });
    }
    
    if (!usernameRegex.test(uname)) {
      return res.status(400).json({
        success: false,
        message: 'Nazwa użytkownika musi mieć 3-20 znaków, zawierać przynajmniej jedną literę i może zawierać cyfry, _ lub -.'
      });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Nieprawidłowy adres e‑mail.' });
    }

    if (!passwordRegex.test(psw)) {
      return res.status(400).json({
        success: false,
        message: 'Hasło musi mieć minimum 8, maksymalnie 30 znaków, zawierać małą i wielką literę, cyfrę oraz znak specjalny.'
      });
    }
    
    conn = await getConnection();

    const [existing] = await conn.execute(
      'SELECT id,username,email FROM users WHERE LOWER(username)=LOWER(?) OR LOWER(email)=LOWER(?) LIMIT 1',
      [uname, email]
    );
    if (existing.length > 0 && existing[0].username.toLowerCase() === uname.toLowerCase()) {
      return res.status(409).json({ success: false, message: 'Użytkownik o takiej nazwie już istnieje.' });
    }
    if (existing.length > 0 && existing[0].email.toLowerCase() === email.toLowerCase()) {
      return res.status(409).json({ success: false, message: 'E-mail już zajęty.' });
    }

    const hash = await bcrypt.hash(psw, 10);

    await conn.execute(
      'INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, NOW())',
      [uname, email, hash]
    );

    return res.json({ success: true, message: 'Zarejestrowano pomyślnie\nZaloguj się.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Błąd serwera.' });
  } 
});

router.post('/login', async (req, res) => {
  try {
    const { uname, psw } = req.body;
    if (!uname || !psw) return res.status(400).json({ success: false, message: 'Wszystkie pola są wymagane.' });

    const conn = await getConnection();
    const [rows] = await conn.execute(
      'SELECT id, username, password, role, session_token FROM users WHERE LOWER(username)=LOWER(?)', 
      [uname]
    );

    if (rows.length === 0) {
      await conn.end();
      return res.status(401).json({ success: false, message: 'Nieprawidłowy login lub hasło.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(psw, user.password);
    if (!match) {
      await conn.end();
      return res.status(401).json({ success: false, message: 'Nieprawidłowy login lub hasło.' });
    }
    
    // Sprawdzamy, czy istnieje aktywny token w bazie
    if (user.session_token) {
      try {
        jwt.verify(user.session_token, JWT_SECRET);
        // Token ważny => odrzuć logowanie
        await conn.end();
        return res.status(403).json({ success: false, message: 'Konto jest już zalogowane na innym urządzeniu.' });
      } catch (err) {
        // Token wygasł => kontynuujemy logowanie
      }
    }

    // Tworzymy nowy token
    const token = jwt.sign({ id: user.id, username: user.username,role: user.role }, JWT_SECRET, { expiresIn: '1h' });

    // Zapis nowego tokena w bazie
    await conn.execute('UPDATE users SET session_token = ? WHERE id = ?', [token, user.id]);
    await conn.end();

    res.json({ success: true, token,role:user.role });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Błąd serwera.' });
  }
});

router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const conn = await getConnection();
    await conn.execute('UPDATE users SET session_token = NULL WHERE id = ?', [req.user.id]);
    await conn.end();
    return res.json({ success: true, message: 'Wylogowano pomyślnie.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Błąd serwera.' });
  }
});


module.exports = router;
