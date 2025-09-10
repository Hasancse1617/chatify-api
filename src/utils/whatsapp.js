import makeWASocket, { useMultiFileAuthState, delay, Browsers } from '@adiwajshing/baileys';
import { join } from 'path';
import { readdirSync } from 'fs';
import qrcode from 'qrcode';
import axios from 'axios';

const sessions = new Map();
const sessionsDir = join('.', 'sessions');

export const initSession = () => {
  try {
    const files = readdirSync(sessionsDir);
    files.forEach(file => {
      const sessionId = file.replace('.json', '');
      createSession(sessionId);
    });
  } catch {}
};

export const createSession = async (sessionId) => {
  const { state, saveCreds } = await useMultiFileAuthState(join(sessionsDir, sessionId));
  const wa = makeWASocket({ auth: state, printQRInTerminal: false, browser: Browsers.ubuntu('Chrome') });

  wa.ev.on('creds.update', saveCreds);
  wa.ev.on('messages.upsert', (m) => console.log('Message received:', m));

  // QR code
  let qrCodeData = null;
  wa.ev.on('connection.update', async (update) => {
    if (update.qr) qrCodeData = await qrcode.toDataURL(update.qr);
  });

  sessions.set(sessionId, wa);
  while (!qrCodeData) await delay(500);
  return qrCodeData;
};

export const getSession = (sessionId) => sessions.get(sessionId);

export const sendMessage = async (session, receiver, message) => {
  await delay(500);
  return session.sendMessage(receiver, { text: message });
};

export const sendMedia = async (session, receiver, mediaUrl, caption) => {
  await delay(500);
  return session.sendMessage(receiver, { image: { url: mediaUrl }, caption });
};

export const sendButtons = async (session, receiver, message, buttons) => {
  const templateButtons = buttons.map((b, i) => ({
    index: i,
    quickReplyButton: { displayText: b, id: `id${i}` }
  }));

  return session.sendMessage(receiver, { text: message, templateButtons });
};

export const sendTemplate = async (session, receiver, message, buttons, footer) => {
  const templateButtons = buttons.map((b, i) => {
    const typeMap = { urlButton: 'url', callButton: 'phoneNumber', quickReplyButton: 'id' };
    const key = typeMap[b.type] || 'id';
    return {
      index: i,
      [b.type]: { displayText: b.displayText, [key]: b.action || `action-${i}` }
    };
  });

  return session.sendMessage(receiver, { text: message, footer, templateButtons });
};

export const sendLocation = async (session, receiver, latitude, longitude) => {
  return session.sendMessage(receiver, {
    location: { degreesLatitude: latitude, degreesLongitude: longitude }
  });
};

export const sendVCard = async (session, receiver, fullName, org, phone, waId) => {
  const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${fullName}\nORG:${org};\nTEL;type=CELL;type=VOICE;waid=${waId}:${phone}\nEND:VCARD`;
  return session.sendMessage(receiver, { contacts: { displayName: fullName, contacts: [[vcard]] } });
};

export const sendList = async (session, receiver, message, footer, title, buttonText, sections) => {
  const listSections = sections.map((s, i) => ({
    title: s.title,
    rows: s.value.map((v, j) => ({
      title: v.title,
      rowId: `option-${i}-${j}`,
      description: v.description || ''
    }))
  }));

  return session.sendMessage(receiver, {
    text: message,
    footer,
    title,
    buttonText,
    sections: listSections
  });
};

export const getChatList = (session) => Array.from(session.chats?.keys() || []);
export const getGroups = (session) => Array.from(session.chats?.keys() || []).filter(c => c.endsWith('@g.us'));
