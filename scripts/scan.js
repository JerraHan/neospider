// scripts/scan.js
// NEO Spider 핵심 스캔 스크립트

const axios = require('axios');
const cheerio = require('cheerio');

const fs = require('fs');
const path = require('path');

const sources = require('./news-sources');
const patterns = require('./patterns');

const CONFIG = {
  scanLimit: process.env.SCAN_LIMIT_PER_SOURCE || 15,
  debug: process.env.DEBUG === 'true',
  timeout: 8000,
  retries: 2
};

const ALERTS = {
  priority1: [],
  priority2: [],
  priority3: [],
  gradeA: []
};

async function scrapeNews() {
  console.log('[1/5] 뉴스 크롤링 중...');
  
  const allNews = [];
  const sourcesToScan = [...sources.gradeA, ...sources.gradeB];
  
  for (const source of sourcesToScan) {
    try {
      const articles = await scrapeSource(source);
      allNews.push(...articles);
      
      if (CONFIG.debug) {
        console.log(`  ✓ ${source.name}: ${articles.length}개`);
      }
    } catch (error) {
      console.error(`  ✗ ${source.name}: ${error.message}`);
    }
  }
  
  console.log(`✓ 총 ${allNews.length}개 뉴스 수집\n`);
  return allNews;
}

async function scrapeSource(source, attempt = 0) {
  try {
    const { data } = await axios.get(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: CONFIG.timeout
    });
    
    const $ = cheerio.load(data);
    const articles = [];
    
    $(source.selector).slice(0, CONFIG.scanLimit).each((i, el) => {
      try {
        const $el = $(el);
        let title = '';
        let link = '';
        
        if (source.keywordPattern === 'title') {
          title = $el.attr('title') || $el.text() || '';
        } else {
          title = $el.text() || '';
        }
        
        link = $el.attr('href') || $el.parent().attr('href') || '';
        
        if (title && title.length > 5) {
          articles.push({
            source: source.name,
            title: title.trim(),
            link: link,
            grade: sources.gradeA.find(s => s.name === source.name) ? 'A' : 'B'
          });
        }
      } catch (e) {
        // 개별 기사 파싱 실패는 무시
      }
    });
    
    return articles;
  } catch (error) {
    if (attempt < CONFIG.retries) {
      console.log(`  재시도: ${source.name}`);
      return scrapeSource(source, attempt + 1);
    }
    throw error;
  }
}

function analyzeNews(allNews) {
  console.log('[2/5] 뉴스 분석 중...');
  
  for (const news of allNews) {
    const analysis = patterns.analyze(news.title, news.source);
    
    if (analysis.featured?.priority === 1) {
      ALERTS.priority1.push({
        ...news,
        ...analysis,
        priority: 1,
        sendAlert: true
      });
    }
    else if (analysis.notice?.priority === 2) {
      ALERTS.priority2.push({
        ...news,
        ...analysis,
        priority: 2,
        sendAlert: true
      });
    }
    else if (analysis.featured?.priority === 3) {
      ALERTS.priority3.push({
        ...news,
        ...analysis,
        priority: 3,
        sendAlert: true
      });
    }
    else if (news.grade === 'A' && !analysis.notice) {
      ALERTS.gradeA.push({
        ...news,
        ...analysis,
        priority: 4,
        sendAlert: false
      });
    }
  }
  
  console.log(`✓ 분석 완료`);
  console.log(`  1순위: ${ALERTS.priority1.length}개`);
  console.log(`  2순위: ${ALERTS.priority2.length}개`);
  console.log(`  3순위: ${ALERTS.priority3.length}개`);
  console.log(`  A급: ${ALERTS.gradeA.length}개\n`);
  
  return ALERTS;
}

async function sendTelegramAlert(alerts) {
  console.log('[3/5] 텔레그램 알림 전송 중...');
  
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('  ⚠ TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHAT_ID 없음 (스킵)\n');
    return;
  }
  
  const alertList = [
    ...alerts.priority1,
    ...alerts.priority2,
    ...alerts.priority3
  ];
  
  if (alertList.length === 0) {
    console.log('  알림 대상 없음\n');
    return;
  }
  
  let message = `🚨 *NEO Spider 실시간 알림*\n\n`;
  message += `⏰ ${new Date().toLocaleTimeString('ko-KR')}\n`;
  message += `📊 ${new Date().toLocaleDateString('ko-KR')}\n\n`;
  
  if (alerts.priority1.length > 0) {
    message += `🔥 *1순위: 특징주 + 종목명*\n`;
    alerts.priority1.slice(0, 5).forEach(alert => {
      message += `• *${alert.ticker}* [${alert.source}]\n`;
      message += `  ${alert.title.substring(0, 60)}...\n`;
    });
    message += '\n';
  }
  
  if (alerts.priority2.length > 0) {
    message += `⚡ *2순위: 우선공시*\n`;
    alerts.priority2.slice(0, 5).forEach(alert => {
      message += `• *${alert.notice.keyword}*\n`;
      message += `  ${alert.title.substring(0, 60)}...\n`;
    });
    message += '\n';
  }
  
  if (alerts.priority3.length > 0) {
    message += `⭐ *3순위: 특징주 (섹터)*\n`;
    alerts.priority3.slice(0, 5).forEach(alert => {
      message += `• ${alert.sector || '기타'}\n`;
      message += `  ${alert.title.substring(0, 60)}...\n`;
    });
    message += '\n';
  }
  
  message += `→ 앱에서 상세 확인`;
  
  try {
    await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      },
      { timeout: 5000 }
    );
    console.log('✓ 텔레그램 알림 전송\n');
  } catch (error) {
    console.error(`✗ 텔레그램 전송 실패: ${error.message}\n`);
  }
}

async function updateGoogleSheets(alerts) {
  console.log('[4/5] Google Sheets 업데이트 중...');
  
  const SHEET_ID = process.env.GOOGLE_SHEET_ID;
  const SERVICE_ACCOUNT = process.env.GOOGLE_SERVICE_ACCOUNT;
  
  if (!SHEET_ID || !SERVICE_ACCOUNT) {
    console.warn('  ⚠ Google Sheets 설정 없음\n');
    return;
  }
  
  try {
    const credentials = typeof SERVICE_ACCOUNT === 'string' 
      ? JSON.parse(SERVICE_ACCOUNT)
      : SERVICE_ACCOUNT;
    
    // JWT 토큰 생성
    const payload = {
      iss: credentials.client_email,
      sub: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    
    const token = require('jsonwebtoken').sign(payload, credentials.private_key, { algorithm: 'RS256' });
    
    // Access token 발급받기
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: token
    });
    
    const accessToken = tokenRes.data.access_token;
    
    // Google Sheets API에 데이터 추가
    const allAlerts = [
      ...alerts.priority1,
      ...alerts.priority2,
      ...alerts.priority3
    ].sort((a, b) => a.priority - b.priority);
    
    const values = allAlerts.map(alert => [
      new Date().toLocaleTimeString('ko-KR'),
      alert.priority,
      alert.featured?.type || alert.notice?.type || 'news',
      alert.title.substring(0, 50),
      alert.ticker || alert.sector || '',
      alert.source,
      alert.link || ''
    ]);
    
    if (values.length > 0) {
      await axios.post(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Real-time!A:G:append?valueInputOption=USER_ENTERED`,
        { values },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    }
    
    console.log('✓ Google Sheets 업데이트\n');
  } catch (error) {
    console.error(`✗ Sheets 업데이트 실패: ${error.message}\n`);
  }
}

function saveLogs(alerts, allNews) {
  console.log('[5/5] 로그 저장 중...');
  
  const logDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(logDir, `scan-${timestamp}.json`);
  
  const logData = {
    timestamp: new Date().toISOString(),
    stats: {
      totalNews: allNews.length,
      priority1: alerts.priority1.length,
      priority2: alerts.priority2.length,
      priority3: alerts.priority3.length,
      gradeA: alerts.gradeA.length
    },
    alerts,
    allNews
  };
  
  fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
  console.log(`✓ 로그 저장: ${logFile}\n`);
}

async function main() {
  console.log('🕷️ NEO Spider 시작...\n');
  
  const startTime = Date.now();
  
  try {
    const allNews = await scrapeNews();
    analyzeNews(allNews);
    await sendTelegramAlert(ALERTS);
    await updateGoogleSheets(ALERTS);
    saveLogs(ALERTS, allNews);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✓ NEO Spider 완료 (${duration}초)\n`);
    
  } catch (error) {
    console.error(`\n[FATAL] ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { scrapeNews, analyzeNews, sendTelegramAlert, updateGoogleSheets };
