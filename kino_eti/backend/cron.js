const cron = require('node-cron');
const getConnection = require('./db');

async function updateEndedShows() {
  try {
    const conn = await getConnection();
    await conn.execute(`
      UPDATE on_screen 
      SET status = 'ended' 
      WHERE start_time < NOW() AND status != 'ended'
    `);
    await conn.end();
    console.log('Zaktualizowano status zakończonych seansów');
  } catch (err) {
    console.error('Błąd przy aktualizacji seansów:', err);
  }
}

updateEndedShows();

// Harmonogram co minutę
cron.schedule('*/5 * * * *', updateEndedShows);
