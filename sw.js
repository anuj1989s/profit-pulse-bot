// Service Worker — Background message sender
const CACHE = 'ppi-v1';

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

let botTimer = null;
let botConfig = null;

// Listen for messages from main page
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  if (type === 'START') {
    botConfig = data; // { token, channel, interval }
    startTimer();
    event.source.postMessage({ type: 'LOG', msg: '✅ Service Worker: Bot started in background!', cls: 's' });
  }

  if (type === 'STOP') {
    stopTimer();
    botConfig = null;
    event.source.postMessage({ type: 'LOG', msg: '⏹ Service Worker: Bot stopped', cls: 'w' });
  }

  if (type === 'SEND_NOW') {
    botConfig = data;
    await doSend();
  }

  if (type === 'PING') {
    event.source.postMessage({ type: 'PONG', running: botTimer !== null });
  }
});

function startTimer() {
  if (botTimer) clearInterval(botTimer);
  // Send immediately first
  doSend();
  botTimer = setInterval(doSend, (botConfig.interval || 60) * 1000);
}

function stopTimer() {
  if (botTimer) { clearInterval(botTimer); botTimer = null; }
}

async function doSend() {
  if (!botConfig) return;
  try {
    // Get message from config (passed from main page)
    const msg = getNextMessage();

    // Send sticker
    try {
      await fetch('https://api.telegram.org/bot' + botConfig.token + '/sendSticker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: botConfig.channel, sticker: msg.sticker })
      });
    } catch(e) {}

    // Send message
    const res = await fetch('https://api.telegram.org/bot' + botConfig.token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: botConfig.channel,
        text: msg.text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        reply_markup: { inline_keyboard: msg.keyboard }
      })
    });

    const json = await res.json();

    // Notify all open tabs
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      if (json.ok) {
        client.postMessage({ type: 'SENT', msgType: msg.type });
      } else {
        client.postMessage({ type: 'ERROR', desc: json.description });
      }
    });

  } catch(e) {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'ERROR', desc: e.message });
    });
  }
}

// ── Message pool (same as main page) ────────────────────────────
const RZP = {
  '1m': 'https://rzp.io/rzp/sbs2Bc5m',
  '3m': 'https://rzp.io/rzp/L5w4PKzi',
  '6m': 'https://rzp.io/rzp/CxeWLGu',
  '1y': 'https://rzp.io/rzp/ToSxb5OJ',
};

const STK = {
  bull:   'CAACAgIAAxkBAAEKuGFlPgABRn_kW5N2MoVWTa-AAQAB2AAC3gADr0eqElTWKU5RvbpqHgQ',
  bear:   'CAACAgIAAxkBAAEKuGNlPgABRoqLl5yCX4e-h_9LyIUBEgACHQADr0eqEtWF4qNiKJiDHgQ',
  trophy: 'CAACAgIAAxkBAAEKuGVlPgABRjuCHH5ueOGGlIDDx4e_NwAC-QADr0eqEiIJxY7KVN1lHgQ',
  fire:   'CAACAgIAAxkBAAEKuGdlPgABRmD7UrGpAAE2wJvNGp2YFIACGAAD769xCv6RDA5DXBaeHgQ',
};

const L = '━━━━━━━━━━━━━━━━━━━━━━';
const D = '══════════════════════════';
const b = t => '*' + t + '*';

const usedIdx = { signal:[], promo:[], result:[], urgency:[] };
const typePool = ['signal','signal','signal','signal','promo','promo','promo','result','result','urgency'];

function getFresh(type, pool) {
  if (usedIdx[type].length >= pool.length) usedIdx[type] = [];
  let idx;
  do { idx = Math.floor(Math.random() * pool.length); } while (usedIdx[type].includes(idx));
  usedIdx[type].push(idx);
  return pool[idx]();
}

function getNextMessage() {
  const type = typePool[Math.floor(Math.random() * typePool.length)];
  const pools = { signal: signalMsgs, promo: promoMsgs, result: resultMsgs, urgency: urgencyMsgs };
  const data = getFresh(type, pools[type]);
  data.type = type;
  data.keyboard = data.buttons.map(b => [{ text: b.text, url: RZP[b.plan] }]);
  return data;
}

// ── SIGNAL MESSAGES ─────────────────────────────────────────────
const signalMsgs = [
  () => {
    const stocks = ['RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','BHARTIARTL','SUNPHARMA','TITAN','KOTAKBANK','MARUTI','NTPC','SBIN'];
    const s = stocks[Math.floor(Math.random()*stocks.length)];
    const p = (Math.random()*3000+500).toFixed(2);
    const t1 = (+p*1.038).toFixed(2), t2 = (+p*1.075).toFixed(2), sl = (+p*0.974).toFixed(2);
    const profit = Math.round(100000*0.038).toLocaleString('en-IN');
    return {
      sticker: STK.bull,
      text: `⚡⚡⚡ ${b('LIVE BUY CALL')} ⚡⚡⚡\n🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥\n${D}\n🟢 ${b('BUY')} — ${b(s+'.NSE')}\n${D}\n\n💰 Entry: ₹${p}\n🎯 Target 1: ₹${t1} *(+3.8%)*\n🎯 Target 2: ₹${t2} *(+7.5%)*\n🛑 Stop Loss: ₹${sl}\n\n👤 ${b('Anuj Singh')}\n${L}\n❓ ${b('Jaante ho ye call FREE mein kyun diya?')}\n\nKyunki chahta hoon tum khud dekho\nki Premium mein kya milta hai!\n\n✅ Ye sirf 1 call hai\n✅ Premium mein DAILY 12-15 aise calls\n✅ Har call mein entry, target, SL ready\n\n💸 ₹1 lakh pe agar ye target hit kiya:\n*Profit = ₹${profit}* — subscription se 8x zyada!\n${L}\n👇 ${b('Abhi join karo:')}`,
      buttons: [{text:'🔥 Join Now — ₹499/month',plan:'1m'},{text:'💎 6 Months — ₹1,999 ⭐',plan:'6m'},{text:'👑 Best Value — ₹2,999/year',plan:'1y'}]
    };
  },
  () => {
    const stocks = ['WIPRO','ONGC','BPCL','BAJFINANCE','HCLTECH','POWERGRID','HINDALCO'];
    const s = stocks[Math.floor(Math.random()*stocks.length)];
    const p = (Math.random()*2500+300).toFixed(2);
    const t1 = (+p*0.962).toFixed(2), sl = (+p*1.026).toFixed(2);
    const loss = Math.round(50000*0.038).toLocaleString('en-IN');
    return {
      sticker: STK.bear,
      text: `🔴🔴🔴 ${b('SELL ALERT')} 🔴🔴🔴\n⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️\n${D}\n🔴 ${b('SELL')} — ${b(s+'.NSE')}\n${D}\n\n💰 Entry: ₹${p}\n🎯 Target: ₹${t1} *(-3.8%)*\n🛑 Stop Loss: ₹${sl}\n\n👤 ${b('Anuj Singh')}\n${L}\n⚠️ ${b('Ye call dekh ke kya socha?')}\n\nJo log FREE channel mein hain\nunhe ye call milta hai — lekin\n*entry, exact target aur SL nahi.*\n\nBina SL ke trade = gambling ❌\nSL ke saath trade = professional ✅\n\n₹50,000 pe bina SL ke loss: *₹${loss}+*\nPremium subscription: *sirf ₹499*\n${L}\n👇 ${b('Smart trader bano — abhi join karo:')}`,
      buttons: [{text:'✅ Join Premium — ₹499/mo',plan:'1m'},{text:'💰 3 Months — ₹699',plan:'3m'},{text:'👑 1 Year — ₹2,999',plan:'1y'}]
    };
  },
  () => {
    const stocks = ['RELIANCE','INFY','TCS','HDFCBANK','ICICIBANK'];
    const s = stocks[Math.floor(Math.random()*stocks.length)];
    const p = (Math.random()*2000+800).toFixed(2);
    const t1 = (+p*1.04).toFixed(2), sl = (+p*0.976).toFixed(2);
    const h = new Date().getHours();
    const timeStr = h < 12 ? 'Aaj Subah' : 'Aaj Sham';
    return {
      sticker: STK.bull,
      text: `🌅🌅🌅 ${b(timeStr+' Ka Call')} 🌅🌅🌅\n⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡\n${D}\n🟢 ${b('BUY — '+s+'.NSE')}\n${D}\n\n💰 Entry: ₹${p}\n🎯 Target: ₹${t1} *(+4%)*\n🛑 Stop Loss: ₹${sl}\n\n👤 ${b('Anuj Singh')}\n${L}\n💬 ${b('Ek baat seedhi:')}\n\nMain roz subah market open hone se\npehle Premium members ko\nready calls bhejta hoon.\n\nWo log market open hote hi\nentry le lete hain — bina confusion ke.\n\n${b('Tum kya karte ho subah?')}\n❌ Charts dekhte ho — samajh nahi aata\n❌ News padhte ho — late ho jaate ho\n\n👉 Premium mein: 9 AM pe sab ready!\n${L}\n👇 ${b('Kal subah ready rehna hai? Join karo:')}`,
      buttons: [{text:'⚡ Start Tomorrow — ₹499',plan:'1m'},{text:'🔥 6 Months — ₹1,999 ⭐',plan:'6m'},{text:'👑 1 Year — ₹2,999',plan:'1y'}]
    };
  },
];

// ── PROMO MESSAGES ──────────────────────────────────────────────
const promoMsgs = [
  () => ({
    sticker: STK.fire,
    text: `😤😤😤 ${b('STOCK MARKET SE THAK GAYE?')} 😤😤😤\n💔💔💔💔💔💔💔💔💔💔\n${D}\n${b('Ye cheezein feel hoti hain tumhe?')}\n${D}\n\n😞 Khud research karte ho — fir bhi loss\n😞 YouTube dekhte ho — confuse ho jaate ho\n😞 Tips group join kiye — sab scam nikle\n😞 Ek achha call chahiye — milta nahi\n\n${b('Ye sab main jaanta hoon.')}\nMainne bhi yahi sab face kiya tha.\n\nIsliye banaya hai ${b('Profit Pulse India')} —\njahan main khud ${b('Anuj Singh')}\nroz apni research share karta hoon.\n\n✅ No confusing charts\n✅ Seedha — BUY karo, ye price pe\n✅ Target ye hai, SL ye hai\n✅ Done. Simple.\n${L}\n💎 ${b('Ek baar try karo — 1 mahina sirf ₹499')}\n👇 Join karo aaj:`,
    buttons: [{text:'😤 Haan Try Karta Hoon — ₹499',plan:'1m'},{text:'💎 3 Months — ₹699',plan:'3m'},{text:'🔥 6 Months — ₹1,999 ⭐',plan:'6m'},{text:'👑 1 Year — ₹2,999',plan:'1y'}]
  }),
  () => ({
    sticker: STK.fire,
    text: `💸💸💸 ${b('KITNA PAISA MISS HO RAHA HAI?')} 💸💸💸\n😱😱😱😱😱😱😱😱😱😱\n${D}\n${b('Ek calculation dekho:')}\n${D}\n\nPremium members ne is mahine:\n✅ RELIANCE: +4.2% in 3 days\n✅ SUNPHARMA: +6.8% in 5 days\n✅ BHARTIARTL: +3.1% in 2 days\n✅ TCS: +5.3% in 4 days\n\n${b('Sirf in 4 calls pe ₹50,000 se:')}\nPotential profit = ${b('₹9,700+')}\n\n${b('Tum kahan the ye time?')} 🤔\nFREE channel pe incomplete calls dekh rahe the?\n\n₹9,700 potential profit MISS hua\nSubscription cost: sirf ₹499\n\n${b('Ye mahina bhi miss karoge?')}\n${L}\n👇 ${b('Nahi — abhi join karo:')}`,
    buttons: [{text:'💸 Nahi Miss Karunga — ₹499',plan:'1m'},{text:'🔥 6 Months ₹1,999 ⭐',plan:'6m'},{text:'👑 1 Year ₹2,999',plan:'1y'}]
  }),
  () => ({
    sticker: STK.fire,
    text: `🤝🤝🤝 ${b('MERI GUARANTEE')} 🤝🤝🤝\n💯💯💯💯💯💯💯💯💯💯\n${D}\n${b('Main Anuj Singh — seedhi baat karta hoon:')}\n${D}\n\n❌ Ye nahi bolunga ki har call profit dega\n❌ Ye nahi bolunga ki risk zero hai\n❌ Ye nahi bolunga ki crorepati ho jaoge\n\n${b('Ye bolunga:')}\n\n✅ Har call mein Stop Loss hoga\n✅ Capital protect karna sabse pehle\n✅ Realistic targets — hawa mein nahi\n✅ Agar call galat hua — honestly bolunga\n✅ Roz active rahunga — miss nahi karunga\n\n${b('Real trading aise hi hoti hai.')}\n\nJo channels guaranteed profit bolte hain\nwo sab FAKE hain — meri baat maano.\n${L}\n👇 ${b('Ek honest trader ke saath join karo:')}`,
    buttons: [{text:'🤝 Trust Hai — Join ₹499/mo',plan:'1m'},{text:'💎 6 Months — ₹1,999',plan:'6m'},{text:'👑 1 Year — ₹2,999',plan:'1y'}]
  }),
  () => ({
    sticker: STK.fire,
    text: `⏰⏰⏰ ${b('EK DIN KI ZINDAGI')} ⏰⏰⏰\n📅📅📅📅📅📅📅📅📅📅\n${D}\n${b('Premium member ka ek din:')}\n${D}\n\n🌅 *8:45 AM* — Market brief milti hai\n_"Aaj banking strong, IT cautious"_\n\n⚡ *9:15 AM* — Calls ready hote hain\n_"RELIANCE BUY ₹2847, T1: ₹2956, SL: ₹2780"_\n\n📈 *11:30 AM* — Update aata hai\n_"RELIANCE target 1 touch kar raha hai"_\n\n✅ *2:15 PM* — Result\n_"RELIANCE +3.8% — Target HIT! 🎯"_\n\n🌆 *3:30 PM* — Evening summary\n\n${b('Itna simple hai ye system.')}\nBas execute karo.\n${L}\n👇 ${b('Kal se ye system start karo:')}`,
    buttons: [{text:'📅 Start Tomorrow — ₹499',plan:'1m'},{text:'🔥 6 Months — ₹1,999 ⭐',plan:'6m'},{text:'👑 Best — 1 Year ₹2,999',plan:'1y'}]
  }),
];

// ── RESULT MESSAGES ─────────────────────────────────────────────
const resultMsgs = [
  () => {
    const names = ['Rahul','Priya','Amit','Suresh','Deepa','Vijay','Kavita','Rohan'];
    const cities = ['Delhi','Mumbai','Pune','Bangalore','Hyderabad','Ahmedabad'];
    const name = names[Math.floor(Math.random()*names.length)];
    const city = cities[Math.floor(Math.random()*cities.length)];
    const months = Math.floor(Math.random()*6)+2;
    const profit = Math.floor(Math.random()*20000)+8000;
    const sub = months*499;
    return {
      sticker: STK.trophy,
      text: `💬💬💬 ${b('MEMBER NE LIKHA')} 💬💬💬\n❤️❤️❤️❤️❤️❤️❤️❤️❤️❤️\n${D}\n👤 ${b(name+', '+city)} (${months} months member)\n${D}\n\n_"Yahan se pehle main bahut paisa_\n_duba chuka tha random tips se._\n\n_Profit Pulse join kiya — pehle week_\n_mein hi RELIANCE ka call aaya._\n_Entry li, target hit hua — ₹3,200 profit._\n\n_Is mahine total: ₹${profit.toLocaleString('en-IN')} profit._\n_${months} mahine ki subscription: ₹${sub.toLocaleString('en-IN')}_\n_Net mein bahut aage hoon."_\n\n${b('Ye real message hai — fake nahi.')}\n\n👤 ${b('Anuj Singh')}:\n_"${name} bhai ka shukriya trust ke liye"_\n${L}\n💎 ${b('Aap bhi ye experience chahte ho?')}\n👇 Join karo:`,
      buttons: [{text:'❤️ Haan, Join Karta Hoon ₹499',plan:'1m'},{text:'🔥 6 Months ₹1,999 ⭐',plan:'6m'},{text:'👑 1 Year ₹2,999',plan:'1y'}]
    };
  },
  () => {
    const stocks = ['RELIANCE','BHARTIARTL','SUNPHARMA','TITAN','HDFCBANK','NTPC'];
    const s = stocks[Math.floor(Math.random()*stocks.length)];
    const pct = (Math.random()*5+3).toFixed(1);
    const days = Math.floor(Math.random()*4)+2;
    const profit = Math.round(100000*pct/100).toLocaleString('en-IN');
    return {
      sticker: STK.trophy,
      text: `🎯🎯🎯 ${b('TARGET HIT — PROOF')} 🎯🎯🎯\n🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆\n${D}\n✅ ${b(s+' — +'+pct+'% in '+days+' days')}\n${D}\n\nYe call sirf ${b('Premium members')} ko mila tha.\nFREE channel pe nahi tha ye.\n\n💰 ₹1 lakh pe profit: ${b('+₹'+profit)}\n💸 1 month subscription: ${b('₹499')}\n\n${b('Ek call ne subscription 8x recover kiya.')}\n\nAur ye sirf 1 call tha.\nMahine mein aise 30-40 calls aate hain.\n\n${b('Tum abhi FREE channel pe kya dekh rahe ho?')}\nIncomplete calls jisme SL nahi,\ntarget nahi, confidence nahi.\n\n${b('Ye fair nahi hai tumhare saath.')}\nIsliye tumhe invite kar raha hoon.\n${L}\n👇 ${b('Premium mein aao:')}`,
      buttons: [{text:'🎯 Haan Chahiye — ₹499/mo',plan:'1m'},{text:'💰 6 Months ₹1,999 ⭐',plan:'6m'},{text:'👑 1 Year ₹2,999',plan:'1y'}]
    };
  },
  () => {
    const w1=(Math.random()*4+2).toFixed(1), w2=(Math.random()*6+4).toFixed(1), w3=(Math.random()*3+2).toFixed(1);
    const total=Math.round((+w1+ +w2+ +w3)*1000).toLocaleString('en-IN');
    return {
      sticker: STK.trophy,
      text: `📊📊📊 ${b('IS HAFTE KA SACH')} 📊📊📊\n🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆\n${D}\n👤 ${b('Anuj Singh')} — Weekly Report\n${D}\n\n✅ RELIANCE +${w1}% — ${b('Target HIT')}\n✅ HDFCBANK +${w2}% — ${b('Both targets!')}\n✅ INFY +${w3}% — ${b('Partial booked')}\n🔄 TCS — Still holding\n❌ WIPRO -2.1% — SL hit (capital safe rahi)\n\n${b('3 wins, 1 running, 1 SL = Net +₹'+total+' on ₹1L')}\n\n${b('Ye week tum kahan the?')}\nFREE channel pe incomplete calls? 🤔\n\nBina SL ke WIPRO hold karte toh -8% bhi hota.\n${b('Anuj Singh ka system bachata bhi hai!')}\n${L}\n👇 ${b('Agla hafte miss mat karo:')}`,
      buttons: [{text:'📊 Join ₹499/month',plan:'1m'},{text:'🥇 6 Months ₹1,999 ⭐',plan:'6m'},{text:'👑 1 Year ₹2,999',plan:'1y'}]
    };
  },
];

// ── URGENCY MESSAGES ─────────────────────────────────────────────
const urgencyMsgs = [
  () => {
    const spots = Math.floor(Math.random()*8)+4;
    return {
      sticker: STK.fire,
      text: `🚨🚨🚨 ${b('LAST '+spots+' SEATS!')} 🚨🚨🚨\n⏰⏰⏰⏰⏰⏰⏰⏰⏰⏰\n${D}\n${b('Anuj Singh ki taraf se important notice:')}\n${D}\n\nMain personally har Premium member\nki help karta hoon — isliye limit hai.\n\n${b('Aaj sirf '+spots+' spots available hain.')}\n\nJab ye bhar jaayein:\n❌ New members nahi le sakta\n❌ Quality suffer nahi chahta\n❌ Next batch = 30 din wait\n\n${b('Tum soch rahe ho to galat waqt hai.')}\n\nJo members hain wo enjoy kar rahe hain:\n✅ Daily 12-15 calls\n✅ Personal attention\n✅ Real results\n\n${b('Tumhara spot koi aur le lega.')} 😔\n${L}\n⚡ ${b('Last chance — abhi secure karo:')}`,
      buttons: [{text:'⚡ Abhi Join ₹499/month',plan:'1m'},{text:'🔥 6 Months ₹1,999 ⭐',plan:'6m'},{text:'👑 1 Year ₹2,999',plan:'1y'}]
    };
  },
  () => ({
    sticker: STK.fire,
    text: `😰😰😰 ${b('EK SAWAL TUMSE')} 😰😰😰\n🤔🤔🤔🤔🤔🤔🤔🤔🤔🤔\n${D}\n${b('Anuj Singh pooch raha hai:')}\n${D}\n\n_"Pichle 3 mahino mein stock market_\n_se kitna profit hua?"_\n\n${b('Honestly jawab do.')}\n\n😔 Profit hua nahi?\n😔 Loss hua?\n😔 Trade hi nahi kiya?\n\n${b('Ye tum akele nahi ho.')}\n90% retail traders yahi face karte hain.\n\nProblem? Galat information.\nIncomplete calls. No risk management.\n\n${b('Solution? Profit Pulse India Premium.')}\n\nMain roz apni mehnat share karta hoon —\ntum sirf execute karo.\n\nYe ₹499 tum invest kar rahe ho\n${b('apni financial life mein.')}\n${L}\n👇 ${b('Pehla kadam uthao aaj:')}`,
    buttons: [{text:'🤝 Pehla Kadam — ₹499/mo',plan:'1m'},{text:'💎 6 Months ₹1,999 ⭐',plan:'6m'},{text:'👑 1 Year ₹2,999',plan:'1y'}]
  }),
];
