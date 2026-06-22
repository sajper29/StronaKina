const express = require('express');
const getConnection = require('../db');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();
async function updateEndedReservations(conn) {
  await conn.execute(`
    UPDATE reservations r
    JOIN on_screen os ON r.on_screen_id = os.id
    SET r.status = 'ended'
    WHERE os.start_time < NOW() AND r.status != 'ended'
  `);
}
router.get("/seats/:onScreenId", async (req, res) => {
    const id = req.params.onScreenId;
    
    try {
        const conn = await getConnection();


        const [seats] = await conn.execute(`
            SELECT ss.id, ss.seat_row, ss.seat_number, 
                   CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END AS taken
            FROM screen_seats ss
            JOIN on_screen os ON os.screen_id = ss.screen_id
            LEFT JOIN reservations r 
                ON r.seat_id = ss.id AND r.on_screen_id = os.id
            WHERE os.id = ?
            ORDER BY ss.seat_row, ss.seat_number
        `, [id]);

        res.json({ success: true, seats });
          console.log("Fetching seats for onScreenId:", id);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});


router.post("/reserve", authenticateToken, async (req, res) => {
    const userId = req.user.id; // teraz będzie dostępne
    const { onScreenId, seats } = req.body;

    if (!Array.isArray(seats) || seats.length === 0) {
        return res.status(400).json({ success: false, msg: "Nie wybrano miejsc" });
    }

    try {
        const conn = await getConnection();


        const placeholders = seats.map(() => '?').join(',');
        const [takenSeats] = await conn.execute(`
            SELECT seat_id FROM reservations 
            WHERE on_screen_id = ? AND seat_id IN (${placeholders})
        `, [onScreenId, ...seats]);

        if (takenSeats.length > 0) {
            return res.status(400).json({ success: false, msg: "Niektóre miejsca są już zajęte" });
        }


        const values = seats.map(seatId => [userId, onScreenId, seatId]);
        await conn.query(`
            INSERT INTO reservations (user_id, on_screen_id, seat_id) VALUES ?
        `, [values]);

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, msg: "Błąd serwera" });
    }
});

// Pobranie rezerwacji dla zalogowanego użytkownika
router.get('/my', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const conn = await getConnection();
      await updateEndedReservations(conn);
const [rows] = await conn.execute(`
  SELECT 
    r.id, 
    r.seat_id, 
    s.seat_row, 
    s.seat_number, 
    scr.name AS screen_name, 
    m.title, 
    os.start_time,
    r.status
  FROM reservations r
  JOIN screen_seats s ON r.seat_id = s.id
  JOIN on_screen os ON r.on_screen_id = os.id
  JOIN movies m ON os.movie_id = m.id
  JOIN screens scr ON os.screen_id = scr.id
  WHERE r.user_id = ?
  ORDER BY m.title, os.start_time, s.seat_row, s.seat_number
`, [userId]);
    await conn.end();

    res.json({ success: true, reservations: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

router.delete('/cancel/:id', authenticateToken, async (req, res) => {
  const reservationId = req.params.id;
  const userId = req.user.id;

  try {
    const conn = await getConnection();

    const [rows] = await conn.execute(
      'SELECT * FROM reservations WHERE id = ? AND user_id = ? AND status = "reserved"',
      [reservationId, userId]
    );

    if (!rows.length) {
      await conn.end();
      return res.status(400).json({ success: false, message: 'Nie można anulować tej rezerwacji.' });
    }

    await conn.execute('DELETE FROM reservations WHERE id = ?', [reservationId]);
    await conn.end();

    res.json({ success: true, message: 'Rezerwacja anulowana.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Błąd serwera.' });
  }
});

router.delete('/delete/:id', authenticateToken, async (req, res) => {
  const reservationId = req.params.id;
  const userId = req.user.id;

  try {
    const conn = await getConnection();


    const [rows] = await conn.execute(
      'SELECT * FROM reservations WHERE id = ? AND user_id = ? AND status = "ended"',
      [reservationId, userId]
    );

    if (!rows.length) {
      await conn.end();
      return res.status(400).json({ success: false, message: 'Nie można anulować tej rezerwacji.' });
    }

    await conn.execute('DELETE FROM reservations WHERE id = ?', [reservationId]);
    await conn.end();

    res.json({ success: true, message: 'Seans usunięty' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Błąd serwera.' });
  }
});


router.post('/pay/:id', authenticateToken, async (req, res) => {
  const reservationId = req.params.id;
  const userId = req.user.id;

  try {
    const conn = await getConnection();


    const [rows] = await conn.execute(
      'SELECT * FROM reservations WHERE id = ? AND user_id = ? AND status = "reserved"',
      [reservationId, userId]
    );

    if (!rows.length) {
      await conn.end();
      return res.status(400).json({ success: false, message: 'Nie można opłacić tej rezerwacji.' });
    }

    await conn.execute('UPDATE reservations SET status = "paid" WHERE id = ?', [reservationId]);
    await conn.end();

    res.json({ success: true, message: 'Rezerwacja opłacona.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Błąd serwera.' });
  }
});


module.exports = router;
