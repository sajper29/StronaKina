const express = require('express');
const getConnection = require('../db');
const authenticateToken = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/adminOnly');
const router = express.Router();


router.get('/movies', authenticateToken, adminOnly, async (req, res) => {
    try {
        const conn = await getConnection();
        const [movies] = await conn.execute('SELECT * FROM movies');
        await conn.end();
        res.json(movies);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
});

// Pobranie  sal
router.get('/screens', authenticateToken, adminOnly, async (req, res) => {
    try {
        const conn = await getConnection();
        const [screens] = await conn.execute('SELECT * FROM screens');
        await conn.end();
        res.json(screens);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
});

// Pobranie wyświetlanych filmów
router.get('/on_screen', authenticateToken, adminOnly, async (req, res) => {
    try {
        const conn = await getConnection();
        const [onScreen] = await conn.execute(`
            SELECT os.id, os.movie_id, os.screen_id, os.start_time, os.price,
                   m.title, m.poster, s.name AS screen_name
            FROM on_screen os
            JOIN movies m ON os.movie_id = m.id
            JOIN screens s ON os.screen_id = s.id WHERE os.status = 'upcoming';
        `);
        await conn.end();
        res.json(onScreen);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
});


router.post('/on_screen', authenticateToken, adminOnly, async (req, res) => {
    const { movie_id, screen_id, start_time, price } = req.body;
    if (!movie_id || !screen_id || !start_time || !price) {
        return res.status(400).json({ success: false, message: 'Brak wymaganych danych' });
    }

    try {
        const conn = await getConnection();

        // Pobierz czas trwania filmu w minutach
        const [movieRows] = await conn.execute(
            'SELECT duration_minutes FROM movies WHERE id = ?',
            [movie_id]
        );
        if (movieRows.length === 0) {
            await conn.end();
            return res.status(404).json({ success: false, message: 'Film nie istnieje' });
        }
        const durationMinutes = movieRows[0].duration_minutes;
        const newStart = new Date(start_time);
        const newEnd = new Date(newStart.getTime() + durationMinutes * 60 * 1000);

        // Pobranie wszystkich seansów w tej samej sali
        const [existing] = await conn.execute(
            'SELECT id, start_time, movie_id FROM on_screen WHERE screen_id = ? AND status = ?',
            [screen_id, 'upcoming']
        );

        for (let show of existing) {
            // Pobierz czas trwania istniejącego filmu
            const [existingMovie] = await conn.execute(
                'SELECT duration_minutes FROM movies WHERE id = ?',
                [show.movie_id]
            );
            const existingDuration = existingMovie[0].duration_minutes;
            const existingStart = new Date(show.start_time);
            const existingEnd = new Date(existingStart.getTime() + existingDuration * 60 * 1000);

            if (newStart < existingEnd && newEnd > existingStart) {
                await conn.end();
                return res.status(400).json({
                    success: false,
                    message: 'Wybrana sala jest już zajęta w tym czasie.'
                });
            }
        }

        await conn.execute(
            'INSERT INTO on_screen (movie_id, screen_id, start_time, price) VALUES (?, ?, ?, ?)',
            [movie_id, screen_id, start_time, price]
        );

        await conn.end();
        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
});


router.delete('/on_screen/:id', authenticateToken, adminOnly, async (req, res) => {
    const id = req.params.id;
    try {
        const conn = await getConnection();
        await conn.execute('DELETE FROM on_screen WHERE id = ?', [id]);
        await conn.end();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
});


// Pobierz wszystkich użytkowników (oprócz adminów)
router.get('/users/all', authenticateToken, adminOnly, async (req, res) => {
    let conn;
    try {
        conn = await getConnection();
        const [users] = await conn.execute(
            'SELECT id, username, email FROM users WHERE role != ? ORDER BY id ASC',
            ['admin']
        );
        await conn.end();
        res.json({ success: true, users });
    } catch (err) {
        if (conn) await conn.end();
        console.error(err);
        res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
});

// Szczegóły użytkownika wraz z komentarzami i rezerwacjami
router.get('/users/:id/full-details', authenticateToken, adminOnly, async (req, res) => {
    const userId = req.params.id;
    let conn;

    try {
        conn = await getConnection();

        const [userRows] = await conn.execute(
            'SELECT id, username, email, role FROM users WHERE id = ?',
            [userId]
        );

        if (userRows.length === 0) {
            await conn.end();
            return res.status(404).json({ success: false, message: 'Użytkownik nie istnieje' });
        }

        const [comments] = await conn.execute(`
            SELECT c.id, c.content, c.created_at, m.title AS movie_title
            FROM comments c
            LEFT JOIN movies m ON c.movie_id = m.id
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC
        `, [userId]);

        const [reservations] = await conn.execute(`
            SELECT r.id, r.status, m.title AS movie_title, os.start_time,
                   s.name AS screen_name, ss.seat_row, ss.seat_number
            FROM reservations r
            LEFT JOIN on_screen os ON r.on_screen_id = os.id
            LEFT JOIN movies m ON os.movie_id = m.id
            LEFT JOIN screens s ON os.screen_id = s.id
            LEFT JOIN screen_seats ss ON r.seat_id = ss.id
            WHERE r.user_id = ?
            ORDER BY r.id DESC
        `, [userId]);

        await conn.end();

        res.json({ success: true, user: userRows[0], comments, reservations });

    } catch (err) {
        if (conn) await conn.end();
        console.error('FULL DETAILS ERROR:', err);
        res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
});

// Aktualizacja danych użytkownika
router.put('/users/:id/update', authenticateToken, adminOnly, async (req, res) => {
    const { username, email, password } = req.body;
    const userId = req.params.id;
    let conn;

    try {
        conn = await getConnection();

        if (username) {
            await conn.execute('UPDATE users SET username = ? WHERE id = ?', [username, userId]);
        }
        if (email) {
            await conn.execute('UPDATE users SET email = ? WHERE id = ?', [email, userId]);
        }
        if (password) {
            const hashed = await bcrypt.hash(password, 10);
            await conn.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);
        }

        await conn.end();
        res.json({ success: true, message: 'Dane użytkownika zaktualizowane' });

    } catch (err) {
        if (conn) await conn.end();
        console.error('UPDATE USER ERROR:', err);
        res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
});

// Usuń użytkownika
router.delete('/users/:id', authenticateToken, adminOnly, async (req, res) => {
    const userId = req.params.id;
    let conn;

    try {
        conn = await getConnection();
        const [result] = await conn.execute('DELETE FROM users WHERE id = ?', [userId]);
        await conn.end();

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Użytkownik nie istnieje' });
        }

        res.json({ success: true, message: 'Użytkownik usunięty' });
    } catch (err) {
        if (conn) await conn.end();
        console.error('DELETE USER ERROR:', err);
        res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
});


// Usuń komentarz
router.delete('/comments/:id', authenticateToken, adminOnly, async (req, res) => {
    const commentId = req.params.id;
    let conn;

    try {
        conn = await getConnection();
        const [result] = await conn.execute('DELETE FROM comments WHERE id = ?', [commentId]);
        await conn.end();

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Komentarz nie istnieje' });
        }

        res.json({ success: true, message: 'Komentarz usunięty' });
    } catch (err) {
        if (conn) await conn.end();
        console.error('DELETE COMMENT ERROR:', err);
        res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
});


// Usuń rezerwację
router.delete('/reservations/:id', authenticateToken, adminOnly, async (req, res) => {
    const id = req.params.id;
    let conn;

    try {
        conn = await getConnection();
        const [result] = await conn.execute('DELETE FROM reservations WHERE id = ?', [id]);
        await conn.end();

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Rezerwacja nie istnieje' });
        }

        res.json({ success: true, message: 'Rezerwacja usunięta' });
    } catch (err) {
        if (conn) await conn.end();
        console.error('DELETE RESERVATION ERROR:', err);
        res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
});

// Opłać rezerwację (zmiana statusu na "paid")
router.post('/reservations/:id/pay', authenticateToken, adminOnly, async (req, res) => {
    const id = req.params.id;
    let conn;

    try {
        conn = await getConnection();
        const [result] = await conn.execute(
            'UPDATE reservations SET status = ? WHERE id = ?',
            ['paid', id]
        );
        await conn.end();

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Rezerwacja nie istnieje' });
        }

        res.json({ success: true, message: 'Rezerwacja opłacona' });
    } catch (err) {
        if (conn) await conn.end();
        console.error('PAY RESERVATION ERROR:', err);
        res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
});

router.get('/history', authenticateToken, adminOnly, async (req, res) => {
    try {
        const conn = await getConnection();
        const [history] = await conn.execute(`
            SELECT os.id, os.movie_id, os.screen_id, os.start_time, os.price,
                   m.title, m.poster, s.name AS screen_name
            FROM on_screen os
            JOIN movies m ON os.movie_id = m.id
            JOIN screens s ON os.screen_id = s.id 
            WHERE os.status = 'ended'
            ORDER BY os.start_time DESC
        `);
        await conn.end();
        res.json(history);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
});
module.exports = router;