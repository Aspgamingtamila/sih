/* WeatherGPT client */
const ui = {
  en: { locating: '…locating', location: 'Location', set: 'Set', placeholder: 'Type your weather question…', intro: 'Hello — I’m WeatherGPT. Set a location or use the location button, then ask about forecasts, warnings, crops, flights, or marine conditions.', unavailable: 'I could not load weather data. Please check the location and try again.', keyNeeded: 'Live weather is available below. Add a Gemini API key through a secure backend (or window.WEATHERGPT_GEMINI_API_KEY for local testing) for a tailored response.', listening: 'Listening…' },
  hi: { locating: '…स्थान खोजा जा रहा है', location: 'स्थान', set: 'सेट करें', placeholder: 'मौसम का प्रश्न लिखें…', intro: 'नमस्ते — मैं WeatherGPT हूँ। स्थान सेट करें या स्थान बटन का उपयोग करें, फिर पूर्वानुमान, चेतावनी, खेती या उड़ान के बारे में पूछें।', unavailable: 'मौसम डेटा लोड नहीं हो सका। स्थान जाँचकर पुनः प्रयास करें।', keyNeeded: 'नीचे लाइव मौसम उपलब्ध है। व्यक्तिगत Gemini उत्तर के लिए सुरक्षित बैकएंड से API कुंजी जोड़ें।', listening: 'सुन रहा हूँ…' },
  ta: { locating: '…இருப்பிடம் கண்டறியப்படுகிறது', location: 'இருப்பிடம்', set: 'அமை', placeholder: 'வானிலை கேள்வியை தட்டச்சிடவும்…', intro: 'வணக்கம் — நான் WeatherGPT. இருப்பிடத்தை அமைக்கவும் அல்லது இருப்பிட பொத்தானைப் பயன்படுத்தவும்; பிறகு முன்னறிவிப்பு, எச்சரிக்கை அல்லது பயிர் ஆலோசனை பற்றி கேளுங்கள்.', unavailable: 'வானிலைத் தரவை ஏற்ற முடியவில்லை. இருப்பிடத்தைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.', keyNeeded: 'நேரடி வானிலை கீழே உள்ளது. தனிப்பட்ட Gemini பதிலுக்கு பாதுகாப்பான பின்னணியில் API விசையைச் சேர்க்கவும்.', listening: 'கேட்கிறது…' }
};
const languages = [['en','English'],['hi','हिन्दी'],['ta','தமிழ்']];
let lang = localStorage.getItem('weathergpt-lang') || 'en';
let place = null, weather = null, recognition = null;
const $ = id => document.getElementById(id);
const esc = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function t(){ return ui[lang] || ui.en; }

function addMessage(text, role='assistant', tags=[], speak=false){
  const msg=document.createElement('div'); msg.className='msg '+role;
  const bubble=document.createElement('div'); bubble.className='bubble'; bubble.textContent=text; 
  
  if (role === 'assistant' && tags.length > 0) {
    const combined = tags.join(' ').toLowerCase();
    if (combined.includes('severe') || combined.includes('strong')) bubble.classList.add('severity-severe');
    else if (combined.includes('heavy') || combined.includes('heat') || combined.includes('cold')) bubble.classList.add('severity-high');
    else if (combined.includes('moderate')) bubble.classList.add('severity-moderate');
  }
  msg.appendChild(bubble);

  if(tags.length){ 
    const row=document.createElement('div'); row.className='tag-row'; 
    row.innerHTML=tags.map(x => {
      const t = x.toLowerCase();
      let cls = 'tag';
      if(t.includes('severe') || t.includes('strong')) cls += ' severe';
      else if(t.includes('heavy') || t.includes('heat') || t.includes('cold')) cls += ' high';
      else if(t.includes('moderate')) cls += ' moderate';
      return `<span class="${cls}">${esc(x)}</span>`;
    }).join(''); 
    msg.appendChild(row); 
  }

  if(role==='assistant' && 'speechSynthesis' in window){ 
    const actions=document.createElement('div'); actions.className='msg-actions'; 
    const button=document.createElement('button'); button.className='icon-btn'; 
    button.textContent='🔊 Read aloud'; button.onclick=()=>speakText(text); 
    actions.appendChild(button); msg.appendChild(actions); 
  }
  
  $('chat').appendChild(msg); $('chat').scrollTop=$('chat').scrollHeight; if(speak) speakText(text);
}

function speakText(text){ speechSynthesis.cancel(); const utterance=new SpeechSynthesisUtterance(text); utterance.lang=lang==='hi'?'hi-IN':lang==='ta'?'ta-IN':'en-IN'; speechSynthesis.speak(utterance); }
function setLanguage(){
  lang=$('langSelect').value; localStorage.setItem('weathergpt-lang',lang); document.documentElement.lang=lang;
  $('conditionsStrip').firstElementChild.textContent=place ? `${t().location}: ${place.name}` : t().locating;
  $('locInput').placeholder=`${t().location} (e.g. Madurai)`; $('locSetBtn').textContent=t().set; $('textInput').placeholder=t().placeholder;
}
async function resolveLocation(name){
  const url='https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name='+encodeURIComponent(name);
  const data=await fetch(url).then(r=>r.ok?r.json():Promise.reject(r));
  if(!data.results?.[0]) throw new Error('Location not found'); const result=data.results[0];
  return {name:[result.name,result.admin1,result.country].filter(Boolean).join(', '), latitude:result.latitude, longitude:result.longitude};
}
async function fetchWeather(location){
  const params=new URLSearchParams({latitude:location.latitude,longitude:location.longitude,current:'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_gusts_10m',daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_gusts_10m',timezone:'auto',forecast_days:'7'});
  weather=await fetch('https://api.open-meteo.com/v1/forecast?'+params).then(r=>r.ok?r.json():Promise.reject(r)); place=location;
  const c=weather.current; $('conditionsStrip').firstElementChild.innerHTML=`<b>${esc(place.name)}</b> · ${Math.round(c.temperature_2m)}°C · feels ${Math.round(c.apparent_temperature)}°C · wind ${Math.round(c.wind_speed_10m)} km/h`;
}
function alerts(){
  if(!weather) return []; const d=weather.daily, out=[];
  const maxRain=Math.max(...d.precipitation_sum), maxGust=Math.max(...d.wind_gusts_10m), maxTemp=Math.max(...d.temperature_2m_max), minTemp=Math.min(...d.temperature_2m_min);
  if(maxRain>=64) out.push('Severe rain potential'); else if(maxRain>=35) out.push('Heavy rain potential');
  if(maxGust>=75) out.push('Strong wind potential'); if(maxTemp>=40) out.push('Heat risk'); if(minTemp<=5) out.push('Cold risk'); return out;
}
function localBriefing(question){
  const d=weather.daily, rows=d.time.slice(0,3).map((date,i)=>`${date}: ${Math.round(d.temperature_2m_min[i])}–${Math.round(d.temperature_2m_max[i])}°C, rain ${d.precipitation_sum[i]} mm, gusts ${Math.round(d.wind_gusts_10m[i])} km/h`).join('\n');
  const risk=alerts(); return `Weather for ${place.name}\nNow: ${Math.round(weather.current.temperature_2m)}°C (feels ${Math.round(weather.current.apparent_temperature)}°C), wind ${Math.round(weather.current.wind_speed_10m)} km/h.\n\nNext 3 days:\n${rows}${risk.length?'\n\nIndicative alert flags: '+risk.join('; ')+'. These are computed from forecast thresholds and are not official warnings.':''}`;
}

async function askGemini(question, context){
  const key = 'AQ.Ab8RN6IEQ33FnRbEu5ZfHuluWjuixCfF9MYoFB3M1TO5pwAUGg'; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${key}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { 
        parts: [{ text: 'You are WeatherGPT. Give concise, safety-conscious weather guidance in ' + lang + '. Forecast data: ' + context }] 
      },
      contents: [{ 
        role: 'user', 
        parts: [{ text: question }] 
      }],
      generationConfig: { 
        maxOutputTokens: 700 
      }
    })
  });

  if(!response.ok) throw new Error('Gemini request failed'); 
  const data = await response.json(); 
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function send(question){
  question=(question||$('textInput').value).trim(); if(!question) return; $('textInput').value=''; addMessage(question,'user');
  const typing=document.createElement('div'); typing.className='typing'; typing.innerHTML='<span></span><span></span><span></span>'; $('chat').appendChild(typing); $('chat').scrollTop=$('chat').scrollHeight;
  try { if(!weather){ const query=$('locInput').value.trim() || 'Madurai'; await fetchWeather(await resolveLocation(query)); }
    const brief=localBriefing(question); let answer; try { answer=await askGemini(question,brief); } catch { answer=null; }
    typing.remove(); addMessage(answer || brief,'assistant',alerts().length?['Forecast',...alerts().slice(0,2)]:['Forecast']); if(!answer) addMessage(t().keyNeeded,'assistant',['SETUP']);
  } catch(e) { typing.remove(); addMessage(t().unavailable,'assistant',['ERROR']); }
}
async function setPlace(){ try { const name=$('locInput').value.trim(); if(!name) return; await fetchWeather(await resolveLocation(name)); addMessage(localBriefing('forecast'),'assistant',alerts().length?['Forecast',...alerts()]:['Forecast']); } catch { addMessage(t().unavailable,'assistant',['ERROR']); } }
function useGeolocation(){ if(!navigator.geolocation){ addMessage('Geolocation is not supported by this browser.','assistant',['ERROR']); return; } navigator.geolocation.getCurrentPosition(async pos=>{ try { const lat=pos.coords.latitude, lon=pos.coords.longitude; await fetchWeather({name:`${lat.toFixed(3)}, ${lon.toFixed(3)}`,latitude:lat,longitude:lon}); addMessage(localBriefing('forecast'),'assistant',['Forecast']); } catch { addMessage(t().unavailable,'assistant',['ERROR']); } },()=>addMessage('Location permission was not granted. Enter a location instead.','assistant',['LOCATION'])); }
function voice(){ const R=window.SpeechRecognition||window.webkitSpeechRecognition; if(!R){ addMessage('Voice input is not supported by this browser.','assistant',['VOICE']); return; } if(recognition){ recognition.stop(); return; } recognition=new R(); recognition.lang=lang==='hi'?'hi-IN':lang==='ta'?'ta-IN':'en-IN'; recognition.interimResults=false; $('micBtn').classList.add('listening'); recognition.onresult=e=>{ $('textInput').value=e.results[0][0].transcript; }; recognition.onend=()=>{$('micBtn').classList.remove('listening'); recognition=null; }; recognition.start(); }
document.addEventListener('DOMContentLoaded',()=>{ languages.forEach(([value,label])=>$('langSelect').add(new Option(label,value))); $('langSelect').value=lang; setLanguage(); addMessage(t().intro,'assistant',['READY']);$('infoBtn').onclick=()=>{ $('infoPanel').classList.toggle('open');$('infoBtn').setAttribute('aria-expanded',$('infoPanel').classList.contains('open')); };$('langSelect').onchange=setLanguage; $('locSetBtn').onclick=setPlace; $('locInput').onkeydown=e=>{if(e.key==='Enter')setPlace()}; $('locGeoBtn').onclick=useGeolocation; $('sendBtn').onclick=()=>send(); $('textInput').onkeydown=e=>{if(e.key==='Enter')send()};$('micBtn').onclick=voice; document.querySelectorAll('.chip').forEach(b=>b.onclick=()=>send(b.dataset.q)); });