// scripts/patterns.js
// 특징주, 우선공시, 섹터 정규식 패턴

module.exports = {
  featuredStock: {
    pattern1: /특징주\s+([가-힣\w\s]+?)[\s,\.!:?]|특징주\s+([가-힣\w\s]+)$/i,
    pattern2: /특징주/i,
    
    extract: (title) => {
      const match1 = title.match(/특징주\s+([가-힣\w]+)/);
      if (match1 && match1[1]) {
        return {
          priority: 1,
          ticker: match1[1].trim(),
          type: 'featured_stock_ticker'
        };
      }
      
      if (/특징주/.test(title)) {
        return {
          priority: 3,
          type: 'featured_stock_sector'
        };
      }
      
      return null;
    }
  },

  priorityNotice: {
    keywords: [
      '수주', 'M&A', 'FDA 승인', '대규모 계약', '세계 최초', 'M7',
      '삼성전자', '반도체', '실적 발표', '공급 계약', '기술 개발',
      '신사업', '정부 정책', '투자 유치', '상장'
    ],

    createPattern: (keyword) => {
      return new RegExp(`\\b${keyword}\\b`, 'i');
    },

    extract: (title) => {
      for (const keyword of module.exports.priorityNotice.keywords) {
        const pattern = module.exports.priorityNotice.createPattern(keyword);
        if (pattern.test(title)) {
          return {
            priority: 2,
            keyword,
            type: 'priority_notice'
          };
        }
      }
      return null;
    }
  },

  sector: {
    list: [
      'AI', '인공지능', '반도체', 'HBM', 'GPU', '전력', '원전',
      '조선', '방산', '바이오', '2차전지', '배터리', 'EV', '전기차',
      '디스플레이', 'LCD', 'OLED', '로봇', '우주항공', '5G', '클라우드',
      '자율주행', '수소', '팬데믹'
    ],

    extract: (title) => {
      for (const sector of module.exports.sector.list) {
        if (title.includes(sector)) {
          return sector;
        }
      }
      return null;
    }
  },

  ticker: {
    koreanPattern: /([가-힣]{2,5}(?:전자|화학|기술|정보|통신|에너지|제약|식품|건설|자동차|해운)?)/,
    codePattern: /\b\d{6}\b/,
    
    extract: (title) => {
      const codeMatch = title.match(module.exports.ticker.codePattern);
      if (codeMatch) {
        return codeMatch[0];
      }
      
      const nameMatch = title.match(module.exports.ticker.koreanPattern);
      if (nameMatch && nameMatch[1]) {
        return nameMatch[1].trim();
      }
      
      return null;
    }
  },

  analyze: (title, source) => {
    const result = {
      title,
      source,
      timestamp: new Date().toISOString(),
      featured: null,
      notice: null,
      sector: null,
      ticker: null,
      priority: null,
      sendAlert: false
    };

    result.featured = module.exports.featuredStock.extract(title);
    if (result.featured) {
      result.priority = result.featured.priority;
      result.sendAlert = true;
      
      if (!result.featured.ticker) {
        result.sector = module.exports.sector.extract(title);
      } else {
        result.ticker = result.featured.ticker;
      }
    }

    if (!result.featured) {
      result.notice = module.exports.priorityNotice.extract(title);
      if (result.notice) {
        result.priority = result.notice.priority;
        result.sendAlert = true;
        result.ticker = module.exports.ticker.extract(title);
        result.sector = module.exports.sector.extract(title);
      }
    }

    if (!result.sector) {
      result.sector = module.exports.sector.extract(title);
    }

    if (!result.ticker && !result.featured?.ticker) {
      result.ticker = module.exports.ticker.extract(title);
    }

    return result;
  }
};
