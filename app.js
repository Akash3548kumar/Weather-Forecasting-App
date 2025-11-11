// Weather API Config
const BASE_URL = "https://api.openweathermap.org/data/2.5/";
const ICON_URL = "https://openweathermap.org/img/wn/";

const apiForm = document.getElementById('apiForm');
const apiInput = document.getElementById('apiInput');
const cityForm = document.getElementById('cityForm');
const cityInput = document.getElementById('cityInput');
const weatherSection = document.getElementById('weatherSection');
const currentWeatherDiv = document.getElementById('currentWeather');
const forecastDiv = document.getElementById('forecast');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const geoBtn = document.getElementById('geoBtn');

let API_KEY = localStorage.getItem('owm_api_key') || '';
let lastCity = localStorage.getItem('last_city') || '';

function showLoading(state) {
  loading.classList.toggle('hidden', !state);
}
function showError(msg) {
  errorMessage.textContent = msg;
  errorMessage.classList.remove('hidden');
  weatherSection.classList.add('hidden');
}
function clearError() {
  errorMessage.textContent = '';
  errorMessage.classList.add('hidden');
}
function showWeatherSection(state) {
  weatherSection.classList.toggle('hidden', !state);
}

// Handle API Key input
apiForm.addEventListener('submit', e => {
  e.preventDefault();
  const key = apiInput.value.trim();
  if (!key) {
    showError("Please enter your OpenWeatherMap API Key.");
    return;
  }
  localStorage.setItem('owm_api_key', key);
  API_KEY = key;
  clearError();
  apiInput.value = '';
  showError("✅ API Key saved! You can now search for weather.");
});

cityForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!API_KEY) {
    showError("Please enter your API Key first.");
    return;
  }
  const city = cityInput.value.trim();
  if (!city) {
    showError("Please enter a city name.");
    return;
  }
  clearError();
  localStorage.setItem('last_city', city);
  fetchWeatherByCity(city);
});

geoBtn.addEventListener('click', () => {
  if (!API_KEY) {
    showError("Please enter your API Key first.");
    return;
  }
  if (!navigator.geolocation) {
    showError("Geolocation is not supported in this browser.");
    return;
  }
  clearError();
  showLoading(true);
  navigator.geolocation.getCurrentPosition(
    pos => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
    err => {
      showLoading(false);
      showError("Could not get your location. Please check permissions.");
    });
});

async function fetchWeatherByCity(city) {
  showLoading(true);
  try {
    const [weather, forecast] = await Promise.all([
      fetchData(`${BASE_URL}weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`),
      fetchData(`${BASE_URL}forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`)
    ]);
    renderWeather(weather, forecast);
  } catch (err) {
    showError("City not found or network error. Please try again.");
  }
  showLoading(false);
}

async function fetchWeatherByCoords(lat, lon) {
  showLoading(true);
  try {
    const [weather, forecast] = await Promise.all([
      fetchData(`${BASE_URL}weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
      fetchData(`${BASE_URL}forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`)
    ]);
    renderWeather(weather, forecast);
  } catch (err) {
    showError("Could not fetch data for your location.");
  }
  showLoading(false);
}

async function fetchData(url) {
  const resp = await fetch(url);
  if (!resp.ok) {
    if (resp.status === 401) throw new Error('Invalid API Key');
    if (resp.status === 404) throw new Error('City not found');
    throw new Error('Network error');
  }
  return resp.json();
}

function renderWeather(weather, forecast) {
  if (!weather || !forecast) {
    showError("Weather data not available.");
    return;
  }
  showWeatherSection(true);

  // Current weather card
  const feelsLike = weather.main.feels_like ? `Feels like ${Math.round(weather.main.feels_like)}°C` : '';
  const pressure = weather.main.pressure ? `Pressure: ${weather.main.pressure} hPa` : '';
  const visibility = weather.visibility ? `Visibility: ${(weather.visibility / 1000).toFixed(1)} km` : '';

  currentWeatherDiv.innerHTML = `
    <h2><i class="fas fa-map-marker-alt"></i> ${weather.name}, ${weather.sys.country}</h2>
    <div class="weather-details">
      <div><i class="fas fa-temperature-high"></i> ${Math.round(weather.main.temp)}°C <span style="font-size: 0.8em; color: var(--text-muted);">(${feelsLike})</span></div>
      <div><i class="fas fa-cloud"></i> ${weather.weather[0].description.charAt(0).toUpperCase() + weather.weather[0].description.slice(1)}</div>
      <div><i class="fas fa-tint"></i> Humidity: ${weather.main.humidity}%</div>
      <div><i class="fas fa-wind"></i> Wind: ${weather.wind.speed} m/s</div>
      ${pressure ? `<div><i class="fas fa-gauge"></i> ${pressure}</div>` : ''}
      ${visibility ? `<div><i class="fas fa-eye"></i> ${visibility}</div>` : ''}
    </div>
    <img src="${ICON_URL + weather.weather[0].icon}@4x.png" alt="${weather.weather[0].description}" />
    <div style="margin-top:0.8em; font-size:0.9em; color:#94a3b8; text-align: center;">
        Last updated: ${new Date(weather.dt*1000).toLocaleString()}
    </div>
  `;

  // 5 day forecast (show next 5 days at noon)
  const forecasts = {};
  forecast.list.forEach(item => {
    const date = item.dt_txt.split(' ')[0];
    const hour = item.dt_txt.split(' ')[1];
    // Pick noon if exists, otherwise first for day
    if (hour.startsWith('12')) forecasts[date] = item;
    else if (!forecasts[date]) forecasts[date] = item;
  });
  const today = (new Date()).toISOString().split('T')[0];
  forecastDiv.innerHTML = '';
  Object.keys(forecasts).slice(today in forecasts ? 1 : 0,6).forEach(date => {
    const fc = forecasts[date];
    const dayName = new Date(fc.dt_txt).toLocaleDateString(undefined, {weekday: 'short'});
    forecastDiv.innerHTML += `
      <div class="forecast-card">
        <div>${dayName}</div>
        <img src="${ICON_URL + fc.weather[0].icon}@2x.png" alt="${fc.weather[0].description}" />
        <div>${Math.round(fc.main.temp)}°C</div>
        <div>${fc.weather[0].description}</div>
      </div>
    `;
  });
}

// On load: check for API key and last city
window.addEventListener('DOMContentLoaded', ()=>{
  if (API_KEY) {
    showError("✅ API Key loaded. Ready to search!");
    if (lastCity) {
      cityInput.value = lastCity;
    }
  } else {
    showError("Welcome! Please enter your OpenWeatherMap API Key to get started.");
  }
});
