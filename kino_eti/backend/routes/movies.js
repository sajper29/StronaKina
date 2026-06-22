const express = require('express');
const getConnection = require('../db');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/all_showings', async (req, res) => {
  try {
    const conn = await getConnection();

    const [rows] = await conn.execute(`
      SELECT 
        m.id AS movie_id,
        m.title,
        m.poster,
        m.description,
        m.genre,
        m.release_date,
        o.id AS on_screen_id,
        o.start_time,
        o.price,
        s.name AS screen_name
      FROM movies m
      JOIN on_screen o ON m.id = o.movie_id
      JOIN screens s ON o.screen_id = s.id
      WHERE o.start_time > NOW()
      ORDER BY m.id, o.start_time
    `);

    await conn.end();
    res.json({ success: true, showings: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Błąd serwera.' });
  }
});

router.get('/movies_all', async (req, res) => {
  try {
    const conn = await getConnection();
    const [rows] = await conn.execute('SELECT * FROM `movies`');
    await conn.end();
    res.json({ success: true, movies_all: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Błąd serwera.' });
  }
});

router.get('/movies_playing', async (req, res) => {
  try {
    const conn = await getConnection();
    const [rows] = await conn.execute('SELECT m.id, m.title, m.poster, m.description, m.genre, m.release_date,o.id AS `o_id`, o.start_time, o.price, s.name FROM movies m JOIN on_screen o ON m.id = o.movie_id JOIN screens s ON o.screen_id = s.id WHERE o.start_time = ( SELECT MIN(o2.start_time) FROM on_screen o2 WHERE o2.movie_id = m.id AND o2.start_time > NOW() );');
    await conn.end();
    res.json({ success: true, movies_playing: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Błąd serwera.' });
  }
});

router.get('/movie/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const conn = await getConnection();
    const [rows] = await conn.execute('SELECT * FROM `movies` WHERE id = ?', [id]);
    await conn.end();

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Film nie znaleziony.' });
    }

    res.json({ success: true, movie: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Błąd serwera.' });
  }
});

router.get('/movie/:id/showings', async (req, res) => {
  const id = req.params.id;
  try {
    const conn = await getConnection();
    const [rows] = await conn.execute(
      `SELECT on_screen.start_time, on_screen.price, screens.name,on_screen.id
       FROM on_screen 
       JOIN screens ON on_screen.screen_id = screens.id 
       WHERE on_screen.movie_id = ? AND start_time > NOW()`, [id]
    );
    await conn.end();
    res.json({ success: true, showings: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Błąd serwera.' });
  }
});

router.get('/movie/:id/comments', async (req, res) => {
  const conn = await getConnection();
  const movieId = req.params.id;
  try {
    const [rows] = await conn.execute(
      'SELECT c.id, c.user_id, c.content, c.created_at, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE c.movie_id = ? ORDER BY c.created_at DESC',
      [movieId]
    );
    res.json({ success: true, comments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

router.post('/movie/:id/comments_add', authenticateToken, async (req, res) => {
  const conn = await getConnection();
  const movieId = req.params.id;
  const userId = req.user.id;
  const { text } = req.body;

  if (!text || text.trim() === '') {
    return res.status(400).json({ success: false, message: 'Komentarz nie może być pusty.' });
  }

  try {
    await conn.execute(
      `INSERT INTO comments (movie_id, user_id, content) VALUES (?, ?, ?)`,
      [movieId, userId, text]
    );
    res.json({ success: true, message: 'Komentarz dodany.' });
  } catch (err) {
    console.error('Błąd dodawania komentarza:', err);
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

module.exports = router;
