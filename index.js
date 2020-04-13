const fetch = require('node-fetch');
const parse5 = require('parse5');
const xmlser = require('xmlserializer');
const xpath = require('xpath');
const Dom = require('xmldom').DOMParser;
const config = require('./data/options.json');
require('dotenv').config();
require('log-timestamp');

const WILLHABEN_URL = config.willhaben_url;
const INTERVAL = config.interval;
const TELEGRAM_TOKEN = config.telegram_token; // bot from https://t.me/botfather
const TELEGRAM_CHAT_ID = config.telegram_chat_id; // id from https://telegram.me/userinfobot
const XPATH_QUERY = config.xpath_query;
const TIME_BETWEEN_SEND_MULTIPLE_MESSAGES = 30; // in minutes

gLastNowLinksDate = new Date();

const TELEGRAM_MESSAGE_PATH = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=`;

function sendTelegramMessage(message, checkLastMessage=false){
  sendMessage=!checkLastMessage;

  vCurrDate = new Date();
  if (checkLastMessage){
    if (  (vCurrDate.getTime() - gLastNowLinksDate.getTime()) >= TIME_BETWEEN_SEND_MULTIPLE_MESSAGES*60000
       && (vCurrDate.getHours() > 7 && vCurrDate.getHours() < 22) //only send messages between 7-22h
       ){
      gLastNowLinksDate = new Date(); 
      sendMessage=true;
    }
  }

  if (sendMessage){
    fetch(TELEGRAM_MESSAGE_PATH + encodeURI(message)); 
  }
}

async function fetchLinks(url, xPathQuery) {
  const result = await fetch(url);
  const html = await result.text();
  const document = parse5.parse(html.toString());
  const xhtml = xmlser.serializeToString(document);
  const doc = new Dom({
    locator: {},
    errorHandler: { warning: function (w) { }, 
    error: function (e) { }, 
    fatalError: function (e) { console.error(e) } }
}).parseFromString(xhtml, 'text/html');
  const select = xpath.useNamespaces({"x": "http://www.w3.org/1999/xhtml"});
  const nodes = select(xPathQuery, doc);
  const willhabenURL = new URL(WILLHABEN_URL);

  return nodes.map((node) => {
    const url = new URL('https:' + '//' + willhabenURL.host + node.value);
    return url.origin + url.pathname;
  });
}

async function start() {
  console.log("Willhaben URL: " + WILLHABEN_URL)
  const linkCache = await fetchLinks(WILLHABEN_URL, XPATH_QUERY);

  setInterval(async () => {
    const newLinks = await fetchLinks(WILLHABEN_URL, XPATH_QUERY);
    if (newLinks.length == 0) {
      console.log('Es wurden keine Ergebnisse gefunden.');
      sendTelegramMessage('keine Ergebnisse gefunden.',true);
    }
    
    newLinks.forEach((newLink) => {
      if (!linkCache.includes(newLink)) {
        linkCache.push(newLink);

        sendTelegramMessage(newLink);
        console.log('new', newLink);
      }
    });
  }, INTERVAL*1000);
}

start();
