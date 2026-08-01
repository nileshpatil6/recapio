const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');
const fs = require('fs');

let genAI = null;
let fileManager = null;
let model = null;
let currentKey = '';

function configure(apiKey) {
  if (!apiKey || apiKey === currentKey) return;
  genAI = new GoogleGenerativeAI(apiKey);
  fileManager = new GoogleAIFileManager(apiKey);
  model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
  currentKey = apiKey;
}

function isConfigured() {
  return !!(genAI && currentKey);
}

async function transcribeAndSummarize(audioPath) {
  if (!isConfigured()) throw new Error('Gemini API key not set. Open Settings to add it.');

  const mimeType = audioPath.endsWith('.webm') ? 'audio/webm' : 'audio/wav';
  const uploadResult = await fileManager.uploadFile(audioPath, {
    mimeType,
    displayName: 'voicenote_recording',
  });

  const fileRef = uploadResult.file;

  // Wait for file to be processed
  let file = fileRef;
  while (file.state === 'PROCESSING') {
    await new Promise(r => setTimeout(r, 1500));
    file = await fileManager.getFile(file.name);
  }
  if (file.state === 'FAILED') throw new Error('Audio file processing failed on Gemini servers.');

  // Transcribe
  const transcriptRes = await model.generateContent([
    'Transcribe this audio recording completely and accurately. Include all spoken words. ' +
    'If there are multiple speakers, label them as Speaker 1, Speaker 2, etc. ' +
    'Return only the transcription text, nothing else.',
    { fileData: { fileUri: file.uri, mimeType } },
  ]);
  const transcript = transcriptRes.response.text().trim();

  // Summarize
  const summaryRes = await model.generateContent(
    `Based on this transcript, provide a structured summary with:\n` +
    `**Overview** – 2-3 sentence summary of what this recording is about\n` +
    `**Key Points** – bullet list of main topics discussed\n` +
    `**Decisions & Action Items** – any decisions made or tasks assigned (if any)\n` +
    `**Notable Quotes** – any important or memorable statements\n\n` +
    `Transcript:\n${transcript}`
  );
  const summary = summaryRes.response.text().trim();

  // Clean up uploaded file
  try { await fileManager.deleteFile(file.name); } catch {}

  return { transcript, summary };
}

async function rewriteSummary(transcript, instruction) {
  if (!isConfigured()) throw new Error('Gemini API key not set.');
  const res = await model.generateContent(
    `Based on this transcript, ${instruction}\n\nTranscript:\n${transcript}`
  );
  return res.response.text().trim();
}

async function chat(transcript, summary, history, userMessage) {
  if (!isConfigured()) throw new Error('Gemini API key not set.');

  const systemCtx =
    `You are a helpful AI assistant. The user is asking about a specific voice recording. ` +
    `Use the context below to answer questions accurately.\n\n` +
    `=== SUMMARY ===\n${summary}\n\n=== FULL TRANSCRIPT ===\n${transcript}\n\n` +
    `Answer based on this content. Be concise and direct.`;

  const chatHistory = history.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  const chatSession = model.startChat({ history: chatHistory });
  const msgToSend = chatHistory.length === 0 ? `${systemCtx}\n\nUser question: ${userMessage}` : userMessage;
  const res = await chatSession.sendMessage(msgToSend);
  return res.response.text().trim();
}

async function searchAcrossNotes(notes, query) {
  if (!isConfigured()) throw new Error('Gemini API key not set.');

  const context = notes.slice(0, 12).map(n =>
    `=== ${n.title} (${(n.created_at || '').slice(0, 10)}) ===\n` +
    `Summary: ${n.summary || 'No summary'}\n` +
    `Transcript excerpt: ${(n.transcript || '').slice(0, 400)}...`
  ).join('\n\n');

  const res = await model.generateContent(
    `The user has the following voice recordings:\n\n${context}\n\n` +
    `Question: ${query}\n\nAnswer based on the notes above. Reference specific recordings when relevant.`
  );
  return res.response.text().trim();
}

module.exports = { configure, isConfigured, transcribeAndSummarize, rewriteSummary, chat, searchAcrossNotes };
