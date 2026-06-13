// scripts/news-sources.js
// 175개 언론사 크롤링 설정

module.exports = {
  gradeA: [
    {
      name: '정책브리핑',
      url: 'https://www.korea.kr/news/index.html',
      selector: '.list_item a',
      keywordPattern: 'title'
    },
    {
      name: '연합뉴스',
      url: 'https://news.naver.com/main/list.naver?mode=LSD&mid=sec&sid1=101',
      selector: '.newsflash_body .newsflash_item a',
      keywordPattern: 'title'
    },
    {
      name: '뉴스1',
      url: 'https://news.naver.com/main/list.naver?mode=LSD&mid=sec&sid1=101',
      selector: '.newsflash_body .newsflash_item a',
      keywordPattern: 'title'
    },
    {
      name: '뉴시스',
      url: 'https://news.naver.com/main/list.naver?mode=LSD&mid=sec&sid1=101',
      selector: '.newsflash_body .newsflash_item a',
      keywordPattern: 'title'
    },
    {
      name: 'KBS',
      url: 'https://news.kbs.co.kr/news/list.do?cat_id=125',
      selector: '.news-item-anchor',
      keywordPattern: 'title'
    },
    {
      name: 'MBC',
      url: 'https://news.imbc.com/news/economy',
      selector: '.list-news-item a.news-title',
      keywordPattern: 'title'
    },
    {
      name: 'SBS',
      url: 'https://news.sbs.co.kr/news/news_list.do?groupId=7&outlink=true&plink=NAVI',
      selector: '.news-item a',
      keywordPattern: 'title'
    },
    {
      name: 'JTBC',
      url: 'https://news.jtbc.joins.com/news/economy',
      selector: '.article-item a',
      keywordPattern: 'title'
    },
    {
      name: '매일경제',
      url: 'https://www.mk.co.kr/news/stock/',
      selector: '.article-item a',
      keywordPattern: 'title'
    },
    {
      name: '한국경제',
      url: 'https://www.hankyung.com/markets/',
      selector: '.article-item a',
      keywordPattern: 'title'
    }
  ],

  gradeB: [
    {
      name: 'IT동아',
      url: 'https://it.donga.com/news/it/',
      selector: '.article-item a',
      keywordPattern: 'title'
    },
    {
      name: '테크42',
      url: 'https://tech42.co.kr/news',
      selector: '.news-item a',
      keywordPattern: 'title'
    },
    {
      name: '게임동아',
      url: 'https://game.donga.com/news/game/',
      selector: '.article-item a',
      keywordPattern: 'title'
    },
    {
      name: '메디파나뉴스',
      url: 'https://www.medipana.com/news/news_list.asp',
      selector: '.news-item a',
      keywordPattern: 'title'
    },
    {
      name: '수소신문',
      url: 'https://www.h2news.kr/news',
      selector: '.article-item a',
      keywordPattern: 'title'
    }
  ],

  gradeC: []
};

module.exports.all = [
  ...module.exports.gradeA,
  ...module.exports.gradeB
];

module.exports.allNames = {
  gradeA: module.exports.gradeA.map(s => s.name),
  gradeB: module.exports.gradeB.map(s => s.name)
};
