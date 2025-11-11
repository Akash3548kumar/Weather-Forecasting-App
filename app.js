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

function showLoading(state) {
  loading.classList.toggle('hidden', !state);
}
function showError(msg) {
  errorMessage.textContent = msg;
  weatherSection.classList.add('hidden');
}
function clearError() {
  errorMessage.textContent = '';
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
  showError("API Key saved! You can now search for weather.");
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
      showError("Could not get your location.");
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
    showError("City not found or network error.");
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
  if (!resp.ok) throw new Error('Network error');
  return resp.json();
}

function renderWeather(weather, forecast) {
  if (!weather || !forecast) {
    showError("Weather data not available.");
    return;
  }
  showWeatherSection(true);

  // Current weather card
  currentWeatherDiv.innerHTML = `
    <h2>${weather.name}, ${weather.sys.country}</h2>
    <div class="weather-details">
      <div><i class="fas fa-temperature-high"></i> ${Math.round(weather.main.temp)}°C</div>
      <div><i class="fas fa-cloud"></i> ${weather.weather[0].description}</div>
      <div><i class="fas fa-water"></i> Humidity: ${weather.main.humidity}%</div>
      <div><i class="fas fa-wind"></i> Wind: ${weather.wind.speed} m/s</div>
    </div>
    <img src="${ICON_URL + weather.weather[0].icon}@4x.png" alt="${weather.weather[0].description}" />
    <div style="margin-top:0.8em; font-size:0.97em; color:#555;">
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
    forecastDiv.innerHTML += `
      <div class="forecast-card">
        <div>${(new Date(fc.dt_txt)).toLocaleDateString(undefined, {weekday:'short',month:'short',day:'numeric'})}</div>
        <img src="${ICON_URL + fc.weather[0].icon}@2x.png" alt="${fc.weather[0].description}" />
        <div style="font-size:1.2em; font-weight:500;">${Math.round(fc.main.temp)}°C</div>
        <div style="font-size:.93em;">${fc.weather[0].description}</div>
      </div>
    `;
  });
}

// On load: check for API key
window.addEventListener('DOMContentLoaded', ()=>{
  if (API_KEY) {
    showError("API Key loaded from previous session. You can now search.");
  }
});
