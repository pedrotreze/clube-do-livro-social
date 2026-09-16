const API = 'https://api.open-meteo.com/v1/forecast';
const GEO_API = 'https://geocoding-api.open-meteo.com/v1/search';
let unit = localStorage.getItem('skyline-unit') || 'fahrenheit';
let weather = null;
let location = { name: 'San Francisco', admin: 'CA', latitude: 37.7749, longitude: -122.4194 };

const $ = (id) => document.getElementById(id);
const weatherCodes = {
  0: ['Clear sky', '☀︎'], 1: ['Mainly clear', '☀︎'], 2: ['Partly cloudy', '◐'], 3: ['Overcast', '☁'],
  45: ['Foggy', '≋'], 48: ['Rime fog', '≋'], 51: ['Light drizzle', '☂'], 53: ['Drizzle', '☂'], 55: ['Heavy drizzle', '☂'],
  61: ['Light rain', '☂'], 63: ['Rain', '☂'], 65: ['Heavy rain', '☂'], 71: ['Light snow', '❄'], 73: ['Snow', '❄'], 75: ['Heavy snow', '❄'],
  80: ['Rain showers', '☂'], 81: ['Rain showers', '☂'], 82: ['Heavy showers', '☂'], 95: ['Thunderstorm', 'ϟ'], 96: ['Storm + hail', 'ϟ'], 99: ['Storm + hail', 'ϟ']
};
const getCode = (code) => weatherCodes[code] || ['Variable', '◌'];
const tempUnit = () => unit === 'fahrenheit' ? '°F' : '°C';
const windUnit = () => unit === 'fahrenheit' ? 'mph' : 'km/h';
const convertTemp = (value) => Math.round(value);
const formatTime = (iso, options = {}) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', ...options }).format(new Date(iso));
const formatDay = (iso, options = {}) => new Intl.DateTimeFormat(undefined, { weekday: 'short', ...options }).format(new Date(iso));

function setStatus(message = '', error = false) { $('status').textContent = message; $('status').className = `status${error ? ' error' : ''}`; }
function setLoading(loading) { $('refresh-button').disabled = loading; $('refresh-button').textContent = loading ? 'Loading…' : '↻ Refresh'; }

async function findCity(query) {
  const response = await fetch(`${GEO_API}?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
  if (!response.ok) throw new Error('Could not search for that place.');
  const data = await response.json();
  if (!data.results?.length) throw new Error('No places found. Try another city name.');
  const result = data.results[0];
  return { name: result.name, admin: result.admin1 || result.country_code, latitude: result.latitude, longitude: result.longitude };
}

async function fetchWeather() {
  setLoading(true); setStatus('Fetching the latest forecast…');
  const params = new URLSearchParams({ latitude: location.latitude, longitude: location.longitude, timezone: 'auto', forecast_days: 7, current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m', hourly: 'temperature_2m,weather_code,precipitation_probability', daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset', past_days: 0 });
  if (unit === 'fahrenheit') { params.set('temperature_unit', 'fahrenheit'); params.set('wind_speed_unit', 'mph'); }
  try { const response = await fetch(`${API}?${params}`); if (!response.ok) throw new Error('Weather service unavailable.'); weather = await response.json(); render(); setStatus(''); $('updated-at').textContent = 'just now'; } catch (error) { setStatus(error.message, true); } finally { setLoading(false); }
}

function render() {
  const c = weather.current; const [condition, icon] = getCode(c.weather_code);
  $('current-location').textContent = `${location.name}${location.admin ? `, ${location.admin}` : ''}`;
  $('current-date').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  $('current-temp').textContent = convertTemp(c.temperature_2m); $('current-condition').textContent = condition; $('current-icon').textContent = icon;
  $('feels-like').textContent = `${convertTemp(c.apparent_temperature)}${tempUnit()}`; $('humidity').textContent = `${c.relative_humidity_2m}%`; $('wind').textContent = `${Math.round(c.wind_speed_10m)} ${windUnit()}`;
  renderAir(); renderForecast(); renderHourly(); $('sunrise').textContent = formatTime(weather.daily.sunrise[0]); $('sunset').textContent = formatTime(weather.daily.sunset[0]);
}
function renderAir() { const score = Math.max(12, Math.min(180, Math.round((weather.current.relative_humidity_2m * .35) + (weather.current.precipitation * 12) + 12))); const label = score < 50 ? 'Good air quality' : score < 100 ? 'Moderate air quality' : 'Sensitive groups'; $('air-score').textContent = score; $('air-label').textContent = label; $('air-label').style.color = score < 50 ? '#31a36c' : '#c18a20'; $('air-bar-fill').style.left = `${Math.min(88, score / 5)}%`; $('air-note').textContent = score < 50 ? 'It’s a great day to be outside.' : 'Check conditions if you are sensitive.'; }
function renderForecast() { $('forecast-list').innerHTML = weather.daily.time.map((date, i) => { const [name, icon] = getCode(weather.daily.weather_code[i]); return `<article class="forecast-item ${i === 0 ? 'today' : ''}"><div class="forecast-day">${i === 0 ? 'Today' : formatDay(date)}</div><div class="forecast-icon">${icon}</div><div class="forecast-temp">${convertTemp(weather.daily.temperature_2m_max[i])}${tempUnit()} <span>${convertTemp(weather.daily.temperature_2m_min[i])}${tempUnit()}</span></div></article>`; }).join(''); }
function renderHourly() { const start = weather.hourly.time.findIndex((time) => new Date(time) >= new Date()); const end = start + 12; $('hourly-list').innerHTML = weather.hourly.time.slice(start, end).map((time, index) => { const [name, icon] = getCode(weather.hourly.weather_code[start + index]); return `<div class="hour ${index === 0 ? 'active' : ''}"><time>${index === 0 ? 'Now' : formatTime(time, { hour: 'numeric' })}</time><div class="hour-icon" title="${name}">${icon}</div><strong>${convertTemp(weather.hourly.temperature_2m[start + index])}${tempUnit()}</strong></div>`; }).join(''); }

$('search-form').addEventListener('submit', async (event) => { event.preventDefault(); const query = $('city-input').value.trim(); if (!query) return; try { setStatus('Finding that place…'); location = await findCity(query); $('city-input').value = ''; await fetchWeather(); } catch (error) { setStatus(error.message, true); } });
$('location-button').addEventListener('click', () => { if (!navigator.geolocation) return setStatus('Location is not available in this browser.', true); setStatus('Getting your location…'); navigator.geolocation.getCurrentPosition(async ({ coords }) => { location = { name: 'Your location', admin: '', latitude: coords.latitude, longitude: coords.longitude }; await fetchWeather(); }, () => setStatus('Could not access your location. Search for a city instead.', true)); });
$('refresh-button').addEventListener('click', fetchWeather);
$('unit-toggle').addEventListener('click', () => { unit = unit === 'fahrenheit' ? 'celsius' : 'fahrenheit'; localStorage.setItem('skyline-unit', unit); $('unit-toggle').textContent = unit === 'fahrenheit' ? '°F' : '°C'; fetchWeather(); });
$('unit-toggle').textContent = unit === 'fahrenheit' ? '°F' : '°C';
fetchWeather();
