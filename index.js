// Importa le librerie necessarie
const { chromium } = require('playwright');
const fs = require('fs');
const qrcode = require('qrcode-terminal');

// Definiamo il percorso del file di sessione
const AUTH_FILE_PATH = './auth.json';
// Definiamo il nostro "travestimento": un User Agent di un browser moderno
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

async function main() {
  if (fs.existsSync(AUTH_FILE_PATH)) {
    console.log("Trovata sessione esistente, avvio il browser e procedo...");
    await runWithSession();
  } else {
    console.log("Nessuna sessione trovata, avvio la procedura di primo accesso...");
    await firstLogin();
  }
}

async function firstLogin() {
  const browser = await chromium.launch({ headless: true });
  // *** MODIFICA CHIAVE: Aggiungiamo lo User Agent ***
  const context = await browser.newContext({ userAgent: USER_AGENT });
  const page = await context.newPage();

  console.log("Navigazione su WhatsApp Web (con il nostro nuovo 'travestimento')...");
  await page.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded' });

  console.log("Pagina caricata. Attendo il selettore del QR Code...");
  
  // Attendiamo la comparsa del QR Code (con un timeout generoso)
  const qrCodeSelector = 'div[data-ref]';
  await page.waitForSelector(qrCodeSelector, { timeout: 90000 });
    
  const qrCodeData = await page.getAttribute(qrCodeSelector, 'data-ref');

  console.log('--------------------------------------------------');
  console.log('SCANSIONA QUESTO QR CODE CON IL TUO TELEFONO:');
  console.log('--------------------------------------------------');
    
  qrcode.generate(qrCodeData, { small: true });

  console.log('--------------------------------------------------');
  console.log('In attesa della scansione...');

  await page.waitForSelector('#pane-side', { timeout: 120000 });
  console.log("Scansione completata e accesso effettuato!");

  await context.storageState({ path: AUTH_FILE_PATH });
  console.log("Sessione di login salvata in 'auth.json'");

  await readChats(page);
  await browser.close();
}

async function runWithSession() {
  const browser = await chromium.launch({ headless: true });
  // *** MODIFICA CHIAVE: Aggiungiamo lo User Agent anche qui per coerenza ***
  const context = await browser.newContext({ 
    storageState: AUTH_FILE_PATH,
    userAgent: USER_AGENT
  });
  const page = await context.newPage();

  console.log("Navigazione su WhatsApp Web...");
  await page.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded' });
  
  await page.waitForSelector('#pane-side', { timeout: 60000 });
  console.log("Accesso automatico tramite sessione riuscito!");

  await readChats(page);
  await browser.close();
}

async function readChats(page) {
    console.log("Inizio lettura delle chat...");
    const chats = await page.locator('#pane-side > div > div > div > div').all();
    console.log(`Trovate ${chats.length} chat.`);
  
    for (const chat of chats) {
      await chat.click();
      await page.waitForTimeout(1500);
      const contactNameElement = await page.locator('header span[dir="auto"]').first();
      const contactName = await contactNameElement.innerText();
      const messages = await page.locator('.message-in, .message-out').allInnerTexts();
      console.log(`--- Conversazione con ${contactName} ---`);
      console.log(messages.join('\n'));
      console.log('--- Fine Conversazione ---\n');
    }
}

main();