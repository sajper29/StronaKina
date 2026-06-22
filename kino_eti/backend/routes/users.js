const express = require('express');
const getConnection = require('../db');
const bcrypt = require('bcrypt');
const validator = require('validator');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/account', authenticateToken, async (req, res) => {
  try {
    const conn = await getConnection();
    const [rows] = await conn.execute('SELECT username,email,role FROM users WHERE id = ?', [req.user.id]);
    await conn.end();

    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Użytkownik nie istnieje.' });
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Błąd serwera.' });
  }
});

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,30}$/;
const usernameRegex = /^(?=.*[a-zA-Z])[a-zA-Z0-9_-]{3,20}$/;

router.put('/update', authenticateToken, async (req, res) => {
  const { 
    username, 
    email, 
    currentPassword, 
    newPassword, 
    confirmPassword 
  } = req.body;

  const id = req.user.id;

  if (!currentPassword) {
    return res.status(400).json({
      success: false,
      message: "Musisz podać aktualne hasło, aby wykonać zmianę."
    });
  }

  try {
    const conn = await getConnection();

    // Pobierz aktualne dane użytkownika
    const [userRows] = await conn.execute(
      "SELECT username, email, password FROM users WHERE id = ? LIMIT 1", 
      [id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: "Użytkownik nie istnieje." });
    }

    const user = userRows[0];


    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Błędne aktualne hasło."
      });
    }


    const updates = [];
    const values = [];


    if (username !== undefined) {
      if (username === user.username) {
        return res.status(400).json({
          success: false,
          message: "Nowa nazwa użytkownika nie może być taka sama jak obecna."
        });
      }

      if (!usernameRegex.test(username)) {
        return res.status(400).json({
          success: false,
          message:
            'Nazwa użytkownika musi mieć 3–20 znaków, zawierać litery i może też _ lub -.'
        });
      }

      const [existsUser] = await conn.execute(
        "SELECT id FROM users WHERE LOWER(username)=LOWER(?) AND id != ?",
        [username, id]
      );

      if (existsUser.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Ta nazwa użytkownika jest już zajęta."
        });
      }

      updates.push("username = ?");
      values.push(username);
    }



    if (email !== undefined) {
      if (email === user.email) {
        return res.status(400).json({
          success: false,
          message: "Nowy email nie może być taki sam jak obecny."
        });
      }

      if (!validator.isEmail(email)) {
        return res.status(400).json({
          success: false,
          message: "Nieprawidłowy email."
        });
      }

      const [existsEmail] = await conn.execute(
        "SELECT id FROM users WHERE LOWER(email)=LOWER(?) AND id != ?",
        [email, id]
      );

      if (existsEmail.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Ten email jest już używany."
        });
      }

      updates.push("email = ?");
      values.push(email);
    }



    if (newPassword !== undefined || confirmPassword !== undefined) {

      if (!newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "Podaj nowe hasło i powtórz nowe hasło."
        });
      }

      if (newPassword === currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Nowe hasło nie może być takie samo jak obecne."
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "Nowe hasła nie są identyczne."
        });
      }

      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
          success: false,
          message:
            "Hasło musi mieć 8–30 znaków, zawierać małą i dużą literę, cyfrę i znak specjalny."
        });
      }

      const hash = await bcrypt.hash(newPassword, 10);

      updates.push("password = ?");
      values.push(hash);
    }



    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nie podano żadnych danych do zmiany."
      });
    }


    const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;
    values.push(id);

    await conn.execute(sql, values);
    await conn.end();


    res.json({
      success: true,
      forceLogout: true,
      message: "Dane zostały zmienione. Zaloguj się ponownie."
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Błąd serwera."
    });
  }
});


module.exports = router;
