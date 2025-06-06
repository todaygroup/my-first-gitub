document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('rss-form');
  const urlInput = document.getElementById('rss-url');
  const newsCards = document.getElementById('news-cards');
  const presetBtns = document.querySelectorAll('.preset-btn');

  // 프리셋 버튼 클릭 시
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      urlInput.value = btn.dataset.url;
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });
  });

  // 폼 제출 시
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (!url) return;
    newsCards.innerHTML = '<p>뉴스를 불러오는 중...</p>';
    try {
      // CORS 우회용 프록시 사용 (공개 프록시, 실제 서비스 시 별도 서버 권장)
      const proxy = 'https://api.allorigins.win/get?url=';
      const response = await fetch(proxy + encodeURIComponent(url));
      const data = await response.json();
      const parser = new DOMParser();
      const xml = parser.parseFromString(data.contents, 'application/xml');
      const items = Array.from(xml.querySelectorAll('item'));
      if (!items.length) throw new Error('뉴스 항목이 없습니다.');
      // pubDate 기준으로 그룹화
      const grouped = {};
      items.slice(0, 50).forEach(item => { // 최대 50개까지 그룹화
        const pubDate = formatDate(item.querySelector('pubDate')?.textContent);
        if (!grouped[pubDate]) grouped[pubDate] = [];
        grouped[pubDate].push(item);
      });
      // 날짜 내림차순 정렬
      const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
      newsCards.innerHTML = '';
      sortedDates.forEach(date => {
        newsCards.innerHTML += `<h3 class="news-date-heading">${date}</h3><div class="news-date-group" id="group-${date}"></div>`;
        const groupDiv = document.getElementById(`group-${date}`);
        grouped[date].slice(0, 10).forEach(item => {
          const title = item.querySelector('title')?.textContent || '제목 없음';
          const link = item.querySelector('link')?.textContent || '#';
          const desc = item.querySelector('description')?.textContent || '';
          let img = '';
          // 이미지 추출 (media:content, enclosure, description 내 img 등)
          const media = item.querySelector('media\\:content, enclosure[url][type^="image"]');
          if (media) img = media.getAttribute('url');
          else {
            const descImg = desc.match(/<img[^>]+src=\"([^\"]+)\"/);
            if (descImg) img = descImg[1];
          }
          // 카드 생성
          const card = document.createElement('article');
          card.className = 'news-card';
          card.tabIndex = 0;
          card.setAttribute('aria-label', title);
          card.innerHTML = `
            <img src="${img || fallbackImg}" alt="${title} 대표 이미지" onerror="this.onerror=null;this.src='${fallbackImg}';">
            <div class="news-card-content">
              <a href="${link}" target="_blank" rel="noopener noreferrer" class="news-card-title">${title}</a>
              <div class="news-card-desc">${desc.replace(/<[^>]+>/g, '').slice(0, 120)}...</div>
            </div>
          `;
          groupDiv.appendChild(card);
        });
      });
    } catch (err) {
      newsCards.innerHTML = `<p>뉴스를 불러오지 못했습니다. (${err.message})</p>`;
    }
  });

  // 탭 전환 및 프리셋 관리
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const newsCards = document.getElementById('news-cards');
  const datePicker = document.getElementById('date-picker');
  const yearInput = document.getElementById('year');
  const monthInput = document.getElementById('month');
  const dayInput = document.getElementById('day');

  // RSS 프리셋 관리
  let currentRssUrl = 'http://feeds.bbci.co.uk/news/rss.xml'; // 기본값 BBC News
  function setRssUrl(url) {
    currentRssUrl = url;
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.url === url);
    });
  }
  function setupPresetBtns(formSelector) {
    document.querySelectorAll(formSelector + ' .preset-btn').forEach(btn => {
      btn.addEventListener('click', () => setRssUrl(btn.dataset.url));
    });
  }
  setupPresetBtns('#date-search-form');
  setupPresetBtns('#keyword-search-form');
  setupPresetBtns('#detail-search-form');
  setRssUrl(currentRssUrl);

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tabContents.forEach(sec => sec.hidden = true);
      document.getElementById('tab-' + btn.dataset.tab).hidden = false;
    });
  });

  // 이미지 대체
  const fallbackImg = 'https://via.placeholder.com/300x160?text=No+Image';
  function formatDate(dateStr) {
    if (!dateStr) return '날짜 없음';
    const d = new Date(dateStr);
    if (isNaN(d)) return '날짜 없음';
    return d.toISOString().slice(0, 10);
  }

  // 스크랩 관리(localStorage)
  function getScraps() {
    return JSON.parse(localStorage.getItem('scrapNews') || '[]');
  }
  function setScraps(arr) {
    localStorage.setItem('scrapNews', JSON.stringify(arr));
  }
  function isScrapped(link) {
    return getScraps().some(item => item.link === link);
  }
  function toggleScrap(news) {
    let scraps = getScraps();
    if (isScrapped(news.link)) {
      scraps = scraps.filter(item => item.link !== news.link);
    } else {
      scraps.push(news);
    }
    setScraps(scraps);
  }

  // 카드 생성 함수
  function createNewsCard(news, scrapMode = false) {
    const card = document.createElement('article');
    card.className = 'news-card';
    card.tabIndex = 0;
    card.setAttribute('aria-label', news.title);
    card.innerHTML = `
      <img src="${news.img || fallbackImg}" alt="${news.title} 대표 이미지" onerror="this.onerror=null;this.src='${fallbackImg}';">
      <div class="news-card-content">
        <a href="${news.link}" target="_blank" rel="noopener noreferrer" class="news-card-title">${news.title}</a>
        <div class="news-card-desc">${news.desc.slice(0, 120)}...</div>
        <div class="news-card-meta">${news.date}</div>
      </div>
      <button class="scrap-btn${isScrapped(news.link) ? ' active' : ''}" title="스크랩" aria-label="스크랩" tabindex="0">★</button>
    `;
    const scrapBtn = card.querySelector('.scrap-btn');
    scrapBtn.addEventListener('click', e => {
      e.stopPropagation();
      toggleScrap(news);
      scrapBtn.classList.toggle('active');
      if (scrapMode) card.remove();
    });
    return card;
  }

  // 날짜별 그룹화 렌더링
  function renderNewsByDate(newsArr, container) {
    container.innerHTML = '';
    const grouped = {};
    newsArr.forEach(news => {
      if (!grouped[news.date]) grouped[news.date] = [];
      grouped[news.date].push(news);
    });
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    sortedDates.forEach(date => {
      container.innerHTML += `<h3 class="news-date-heading">${date}</h3><div class="news-date-group" id="group-${date}"></div>`;
      const groupDiv = container.querySelector(`#group-${date}`);
      grouped[date].forEach(news => {
        groupDiv.appendChild(createNewsCard(news));
      });
    });
  }

  // RSS 파싱 및 뉴스 객체화
  async function fetchRssAndParse(url) {
    const proxy = 'https://api.allorigins.win/get?url=';
    const response = await fetch(proxy + encodeURIComponent(url));
    const data = await response.json();
    const parser = new DOMParser();
    const xml = parser.parseFromString(data.contents, 'application/xml');
    const items = Array.from(xml.querySelectorAll('item'));
    return items.slice(0, 50).map(item => {
      const title = item.querySelector('title')?.textContent || '제목 없음';
      const link = item.querySelector('link')?.textContent || '#';
      const desc = (item.querySelector('description')?.textContent || '').replace(/<[^>]+>/g, '');
      const date = formatDate(item.querySelector('pubDate')?.textContent);
      let img = '';
      const media = item.querySelector('media\\:content, enclosure[url][type^="image"]');
      if (media) img = media.getAttribute('url');
      else {
        const descImg = item.querySelector('description')?.textContent?.match(/<img[^>]+src=\"([^\"]+)\"/);
        if (descImg) img = descImg[1];
      }
      return { title, link, desc, date, img };
    });
  }

  // 달력 input과 연/월/일 입력 동기화
  if (datePicker && yearInput && monthInput && dayInput) {
    datePicker.addEventListener('change', () => {
      if (datePicker.value) {
        const [y, m, d] = datePicker.value.split('-');
        yearInput.value = y;
        monthInput.value = m;
        dayInput.value = d;
      }
    });
    [yearInput, monthInput, dayInput].forEach(input => {
      input.addEventListener('input', () => {
        const y = yearInput.value.padStart(4, '0');
        const m = monthInput.value.padStart(2, '0');
        const d = dayInput.value.padStart(2, '0');
        if (y && m && d) {
          datePicker.value = `${y}-${m}-${d}`;
        }
      });
    });
  }

  // 날짜검색
  const dateForm = document.getElementById('date-search-form');
  dateForm.addEventListener('submit', async e => {
    e.preventDefault();
    let y, m, d;
    if (datePicker && datePicker.value) {
      [y, m, d] = datePicker.value.split('-');
    } else {
      y = yearInput.value;
      m = String(monthInput.value).padStart(2, '0');
      d = String(dayInput.value).padStart(2, '0');
    }
    const url = currentRssUrl;
    newsCards.innerHTML = '<p>뉴스를 불러오는 중...</p>';
    try {
      const newsArr = await fetchRssAndParse(url);
      const filterDate = `${y}-${m}-${d}`;
      const filtered = newsArr.filter(n => n.date === filterDate);
      if (filtered.length === 0) {
        newsCards.innerHTML = '<p>해당 날짜의 뉴스가 없습니다.</p>';
      } else {
        renderNewsByDate(filtered, newsCards);
      }
    } catch (err) {
      newsCards.innerHTML = `<p>뉴스를 불러오지 못했습니다. (${err.message})</p>`;
    }
  });

  // 키워드검색
  const keywordForm = document.getElementById('keyword-search-form');
  const keywordCards = document.getElementById('keyword-news-cards');
  keywordForm.addEventListener('submit', async e => {
    e.preventDefault();
    const keyword = keywordForm.keyword.value.trim();
    if (!keyword) return;
    const url = currentRssUrl;
    keywordCards.innerHTML = '<p>뉴스를 불러오는 중...</p>';
    try {
      const newsArr = await fetchRssAndParse(url);
      const filtered = newsArr.filter(n => n.title.includes(keyword) || n.desc.includes(keyword));
      if (filtered.length === 0) {
        keywordCards.innerHTML = '<p>검색 결과가 없습니다.</p>';
      } else {
        renderNewsByDate(filtered, keywordCards);
      }
    } catch (err) {
      keywordCards.innerHTML = `<p>뉴스를 불러오지 못했습니다. (${err.message})</p>`;
    }
  });

  // 상세검색
  const detailForm = document.getElementById('detail-search-form');
  const detailCards = document.getElementById('detail-news-cards');
  detailForm.addEventListener('submit', async e => {
    e.preventDefault();
    const keyword = detailForm['detail-keyword'].value.trim();
    const press = detailForm.press.value.trim();
    const category = detailForm.category.value.trim();
    const url = currentRssUrl;
    detailCards.innerHTML = '<p>뉴스를 불러오는 중...</p>';
    try {
      const newsArr = await fetchRssAndParse(url);
      const filtered = newsArr.filter(n => {
        let ok = true;
        if (keyword) ok = ok && (n.title.includes(keyword) || n.desc.includes(keyword));
        if (press) ok = ok && n.desc.includes(press); // 실제 press 정보가 있으면 해당 필드로 변경
        if (category) ok = ok && n.desc.includes(category); // 실제 category 정보가 있으면 해당 필드로 변경
        return ok;
      });
      if (filtered.length === 0) {
        detailCards.innerHTML = '<p>검색 결과가 없습니다.</p>';
      } else {
        renderNewsByDate(filtered, detailCards);
      }
    } catch (err) {
      detailCards.innerHTML = `<p>뉴스를 불러오지 못했습니다. (${err.message})</p>`;
    }
  });

  // 마이스크랩
  const scrapCards = document.getElementById('scrap-news-cards');
  function renderScrapCards() {
    const scraps = getScraps();
    scrapCards.innerHTML = '';
    if (scraps.length === 0) {
      scrapCards.innerHTML = '<p>스크랩한 뉴스가 없습니다.</p>';
    } else {
      renderNewsByDate(scraps, scrapCards);
    }
  }
  document.getElementById('tab-scrap').addEventListener('show', renderScrapCards);
  [...tabBtns].find(btn => btn.dataset.tab === 'scrap').addEventListener('click', renderScrapCards);

  // i18n 다국어 리소스
  const i18n = {
    ko: {
      title: '📰 뉴스 카드 아카이브',
      skip: '본문 바로가기',
      tab_date: '날짜검색',
      tab_keyword: '키워드검색',
      tab_detail: '상세검색',
      tab_scrap: '마이스크랩',
      label_date: '날짜',
      or: '또는',
      label_year: '연도',
      label_month: '월',
      label_day: '일',
      preset_yna: '연합뉴스TV',
      preset_bbc: 'BBC News',
      go: '이동',
      label_keyword: '키워드',
      search: '검색',
      label_press: '언론사',
      label_category: '카테고리',
      detail_search: '상세검색',
      all_rights: '모든 권리 보유.'
    },
    en: {
      title: '📰 News Card Archive',
      skip: 'Skip to main',
      tab_date: 'Date Search',
      tab_keyword: 'Keyword Search',
      tab_detail: 'Advanced Search',
      tab_scrap: 'My Scrap',
      label_date: 'Date',
      or: 'or',
      label_year: 'Year',
      label_month: 'Month',
      label_day: 'Day',
      preset_yna: 'Yonhap News TV',
      preset_bbc: 'BBC News',
      go: 'Go',
      label_keyword: 'Keyword',
      search: 'Search',
      label_press: 'Press',
      label_category: 'Category',
      detail_search: 'Advanced Search',
      all_rights: 'All rights reserved.'
    }
  };

  function setLang(lang) {
    const dict = i18n[lang] || i18n.ko;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = dict[key];
        } else {
          el.textContent = dict[key];
        }
      }
    });
    document.documentElement.lang = lang;
  }

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setLang(btn.dataset.lang);
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  // 페이지 로드 시 기본 언어 설정
  setLang('ko');
}); 