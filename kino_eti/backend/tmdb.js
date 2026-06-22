const fs = require("fs");
const axios = require("axios");

const TMDB_API_KEY = "4c71aa364bf102c52698d8df1774678a";
const TOTAL_PAGES = 50;

function escapeSQL(str) {
  if (!str) return "";
  return str.replace(/'/g, "''");
}

async function fetchDiscover(page) {
  const url =
    `https://api.themoviedb.org/3/discover/movie?` +
    `api_key=${TMDB_API_KEY}&language=pl-PL&sort_by=popularity.desc&page=${page}`;

  const { data } = await axios.get(url);
  return data.results;
}

async function fetchMovieDetails(id) {
  const url =
    `https://api.themoviedb.org/3/movie/${id}?` +
    `api_key=${TMDB_API_KEY}&language=en-US&append_to_response=release_dates`; // gatunki po angielsku

  const { data } = await axios.get(url);
  return data;
}

function extractAgeRating(details) {
  try {
    const certs = details.release_dates.results;
    const pl = certs.find(c => c.iso_3166_1 === "PL");
    if (!pl || pl.release_dates.length === 0) return "0+";

    return pl.release_dates[0].certification || "0+";
  } catch {
    return "0+";
  }
}

//gatunki rozdzielone SLASHEM
function extractGenres(details) {
  if (!details.genres) return null;
  return details.genres.map(g => g.name).join("/");
}

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function generateSQL() {
  const movieMap = new Map();

  console.log("Pobieranie filmów...");

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const movies = await fetchDiscover(page);
    console.log(`Strona ${page} — ${movies.length} filmów`);
    movies.forEach(m => movieMap.set(m.id, m));
  }

  console.log(`Łącznie filmów: ${movieMap.size}`);

  let values = [];

  for (const movie of movieMap.values()) {
    const details = await fetchMovieDetails(movie.id);

    const title = escapeSQL(movie.title);
    const poster = movie.poster_path || "";
    const description = escapeSQL(details.overview || "");
    const duration = details.runtime || 0;
    const ageRating = extractAgeRating(details);
    const releaseDate = movie.release_date || null;
    const genre = escapeSQL(extractGenres(details));

    values.push(
      `('${title}', 'https://image.tmdb.org/t/p/original${poster}', '${description}', ${duration}, ` +
      `'${ageRating}', ` + 
      `${releaseDate ? `'${releaseDate}'` : "NULL"}, ` +
      `${genre ? `'${genre}'` : "NULL"})`
    );

    await delay(200);
  }

  const sql =
`INSERT INTO movies
(title, poster, description, duration_minutes, age_rating, release_date, genre)
VALUES
${values.join(",\n")}
;`;

  fs.writeFileSync("movies_insert.sql", sql, "utf8");

  console.log("Zapisano movies_insert.sql");
}

generateSQL();
