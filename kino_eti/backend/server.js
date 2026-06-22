require('dotenv').config();
require('./cron');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');


const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const movieRoutes = require('./routes/movies');
const reservationRoutes = require('./routes/reservations');
const adminRoutes = require('./routes/admin_control');


const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(bodyParser.json());
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});



app.use(express.static(path.join(__dirname, '../frontend/html')));
app.use('/css', express.static(path.join(__dirname, '../frontend/css')));
app.use('/js', express.static(path.join(__dirname, '../frontend/js')));
app.use('/img', express.static(path.join(__dirname, '../frontend/img')));

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/movies', movieRoutes);
app.use('/reservations', reservationRoutes);
app.use('/admin_control', adminRoutes);

app.listen(PORT, () => {
  console.log(`Serwer działa na http://localhost:${PORT}`);
});
