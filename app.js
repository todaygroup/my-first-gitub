document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('rss-form');
  const urlInput = document.getElementById('rss-url');
  const newsCards = document.getElementById('news-cards');
  const presetBtns = document.querySelectorAll('.preset-btn');

  // 대체 이미지 URL (접근성 및 글로벌 표준 준수)
  const fallbackImg = 'https://via.placeholder.com/300x160?text=No+Image';

  // pubDate를 YYYY-MM-DD(ISO 8601)로 변환
  function formatDate(dateStr) {
    if (!dateStr) return '날짜 없음';
    const d = new Date(dateStr);
    if (isNaN(d)) return '날짜 없음';
    return d.toISOString().slice(0, 10);
  }

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
}); 