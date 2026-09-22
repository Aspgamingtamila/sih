let currentWeatherData = null;
let currentCity = "Chennai";
let currentLat = 13.0827;
let currentLon = 80.2707;

// 1. Initial Setup
document.addEventListener("DOMContentLoaded", () => {
  fetchWeather(currentLat, currentLon);
});

// 2. Fetch Live Weather Data Context (Open-Meteo)
async function fetchWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_gusts_10m_max&timezone=auto&forecast_days=3`;
    const response = await fetch(url);
    currentWeatherData = await response.json();
  } catch (error) {
    console.error("Failed to load weather context", error);
    currentWeatherData = "Weather data temporarily unavailable.";
  }
}

// 3. Update Location via Dropdown or Pills
function setQuickPlace(city) {
  const select = document.getElementById("locationSelect");
  select.value = city;
  updateLocation();
}

function updateLocation() {
  const select = document.getElementById("locationSelect");
  const option = select.options[select.selectedIndex];
  currentCity = option.value;
  currentLat = option.getAttribute("data-lat");
  currentLon = option.getAttribute("data-lon");
  
  // Update UI
  document.getElementById("chatLocName").innerText = currentCity;
  
  // Update Map
  document.getElementById("windyIframe").src = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km/h&zoom=7&overlay=wind&product=ecmwf&level=surface&lat=${currentLat}&lon=${currentLon}`;
  
  // Fetch new background context
  fetchWeather(currentLat, currentLon);
}

// 4. Gemini 1.5 API Integration (Fixed Endpoint)
async function askGemini(question, context) {
  const key = 'AQ.Ab8RN6IEQ33FnRbEu5ZfHuluWjuixCfF9MYoFB3M1TO5pwAUGg'; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { 
        parts: [{ text: `You are WeatherGPT, a highly helpful assistant on a dashboard. Keep answers very concise, friendly, and structured. Location: ${currentCity}. Forecast context: ${JSON.stringify(context)}` }] 
      },
      contents: [{ 
        role: 'user', 
        parts: [{ text: question }] 
      }],
      generationConfig: { maxOutputTokens: 300 }
    })
  });

  if(!response.ok) {
    console.error("API Error:", response.status, await response.text());
    throw new Error('API Request Failed'); 
  }
  const data = await response.json(); 
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not generate a response.';
}

// 5. Chat Interface Logic
async function sendMsg(text) {
  const inputField = document.getElementById("chatInput");
  const msgText = text || inputField.value.trim();
  if (!msgText) return;

  inputField.value = "";
  document.getElementById("chips").style.display = "none"; // Hide chips after first message
  
  // Append User Message
  const chatContainer = document.getElementById("chat");
  chatContainer.innerHTML += `<div class="msg user"><div class="bubble">${msgText}</div></div>`;
  chatContainer.scrollTop = chatContainer.scrollHeight;

  // Show Typing Indicator
  const typingId = "typing-" + Date.now();
  chatContainer.innerHTML += `<div id="${typingId}" class="typing"><span></span><span></span><span></span></div>`;
  chatContainer.scrollTop = chatContainer.scrollHeight;

  try {
    // Call Gemini API
    const response = await askGemini(msgText, currentWeatherData);
    
    // Remove typing & append Bot Message
    document.getElementById(typingId).remove();
    chatContainer.innerHTML += `<div class="msg assistant"><div class="bubble">${response.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}</div></div>`;
  } catch (e) {
    document.getElementById(typingId).remove();
    chatContainer.innerHTML += `<div class="msg assistant"><div class="bubble">Network error connecting to AI backend. Check browser console for details.</div></div>`;
  }
  chatContainer.scrollTop = chatContainer.scrollHeight;
}
