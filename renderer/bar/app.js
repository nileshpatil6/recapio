// Floating bar renderer
const bar = document.getElementById('bar');
const dot = document.getElementById('dot');
const appName = document.getElementById('appName');
const recBtn = document.getElementById('recBtn');
const timer = document.getElementById('timer');
const hint = document.getElementById('hint');

let isRecording = false;
let timerInterval = null;
let elapsed = 0;
let micStream = null;
let sysStream = null;
let mediaRecorder = null;
let audioChunks = [];
let startTime = null;

// ── Drag ────────────────────────────────────────────
const drag = document.getElementById('drag');
let dragging = false, ox = 0, oy = 0;
drag.addEventListener('mousedown', e => {
  dragging = true; ox = e.screenX; oy = e.screenY;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', () => { dragging = false; document.removeEventListener('mousemove', onDrag); });
});
function onDrag(e) {
  if (!dragging) return;
  window.screenX; // keep reference
}

// ── Buttons ─────────────────────────────────────────
document.getElementById('openMain').addEventListener('click', () => window.api.openMain());
document.getElementById('closeBtn').addEventListener('click', () => window.api.close());
recBtn.addEventListener('click', toggleRecording);

// ── Hotkey events from main ──────────────────────────
window.api.on('start-recording', () => { if (!isRecording) startRecording(); });
window.api.on('stop-recording', () => { if (isRecording) stopRecording(); });
window.api.on('status', (_e, status) => setStatus(status));

// ── Recording ────────────────────────────────────────
async function toggleRecording() {
  if (isRecording) stopRecording(); else startRecording();
}

async function startRecording() {
  isRecording = true;
  audioChunks = [];
  elapsed = 0;
  startTime = Date.now();

  setUIRecording(true);
  startTimer();

  const cfg = await window.api.getConfig();
  const audioCtx = new AudioContext({ sampleRate: 44100 });
  const dest = audioCtx.createMediaStreamDestination();

  // Mic
  if (cfg.recordMic !== false) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
      const micSrc = audioCtx.createMediaStreamSource(micStream);
      const micGain = audioCtx.createGain(); micGain.gain.value = 0.8;
      micSrc.connect(micGain); micGain.connect(dest);
    } catch (e) { console.warn('[Mic]', e.message); }
  }

  // System audio via desktopCapturer
  if (cfg.recordSystem !== false) {
    try {
      const sources = await window.api.getDesktopSources?.() || [];
      const screenSource = sources[0];
      if (screenSource) {
        sysStream = await navigator.mediaDevices.getUserMedia({
          audio: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: screenSource.id } },
          video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: screenSource.id, maxWidth: 1, maxHeight: 1 } }
        });
        const sysAudioSrc = audioCtx.createMediaStreamSource(sysStream);
        const sysGain = audioCtx.createGain(); sysGain.gain.value = 0.9;
        sysAudioSrc.connect(sysGain); sysGain.connect(dest);
      }
    } catch (e) { console.warn('[SysAudio]', e.message); }
  }

  // Record mixed stream
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
  mediaRecorder = new MediaRecorder(dest.stream, { mimeType, audioBitsPerSecond: 128000 });
  mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
  mediaRecorder.start(500);
}

function stopRecording() {
  if (!mediaRecorder) return;
  isRecording = false;
  stopTimer();
  setUIRecording(false);
  setStatus('processing');

  const duration = (Date.now() - startTime) / 1000;

  mediaRecorder.onstop = async () => {
    const blob = new Blob(audioChunks, { type: 'audio/webm' });
    const arrayBuffer = await blob.arrayBuffer();

    micStream?.getTracks().forEach(t => t.stop());
    sysStream?.getTracks().forEach(t => t.stop());
    micStream = null; sysStream = null; mediaRecorder = null;

    await window.api.recordingDone(arrayBuffer, duration);
  };
  mediaRecorder.stop();
}

// ── UI helpers ───────────────────────────────────────
function setUIRecording(on) {
  bar.classList.toggle('recording-active', on);
  dot.classList.toggle('recording', on);
  recBtn.classList.toggle('recording', on);
  recBtn.textContent = on ? '⏹ Stop' : '⏺ Start';
  timer.classList.toggle('recording', on);
  hint.style.opacity = on ? '0' : '1';
}

function setStatus(status) {
  bar.className = 'bar';
  if (status === 'processing') {
    bar.classList.add('processing');
    appName.textContent = 'Processing...';
    dot.style.color = '#ffaa44';
  } else if (status === 'done') {
    bar.classList.add('done');
    appName.textContent = 'Done ✓';
    dot.style.color = '#44ff88';
    setTimeout(() => setStatus('ready'), 3000);
  } else if (status === 'done-nokey') {
    appName.textContent = 'Saved (no API key)';
    dot.style.color = '#ffaa44';
    setTimeout(() => setStatus('ready'), 3000);
  } else if (status === 'error') {
    bar.classList.add('error');
    appName.textContent = 'Error — check logs';
    dot.style.color = '#ff6666';
    setTimeout(() => setStatus('ready'), 4000);
  } else {
    appName.textContent = 'VoiceNotes AI';
    dot.style.color = '#7b7fff';
  }
}

function startTimer() {
  timerInterval = setInterval(() => {
    elapsed++;
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    timer.textContent = `${m}:${s}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timer.textContent = '00:00';
}
