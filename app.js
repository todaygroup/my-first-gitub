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
      const items = xml.querySelectorAll('item');
      if (!items.length) throw new Error('뉴스 항목이 없습니다.');
      newsCards.innerHTML = '';
      items.forEach((item, idx) => {
        if (idx >= 10) return; // 최대 10개만 표시
        const title = item.querySelector('title')?.textContent || '제목 없음';
        const link = item.querySelector('link')?.textContent || '#';
        const desc = item.querySelector('description')?.textContent || '';
        const pubDate = item.querySelector('pubDate')?.textContent || '';
        let img = '';
        // 이미지 추출 (media:content, enclosure, description 내 img 등)
        const media = item.querySelector('media\\:content, enclosure[url][type^="image"]');
        if (media) img = media.getAttribute('url');
        else {
          const descImg = desc.match(/<img[^>]+src=\"([^\"]+)\"/);
          if (descImg) img = descImg[1];
        }
        newsCards.innerHTML += `
          <article class="news-card" tabindex="0" aria-label="${title}">
            ${img ? `<img src="${img}" alt="${title} 대표 이미지">` : ''}
            <div class="news-card-content">
              <a href="${link}" target="_blank" rel="noopener noreferrer" class="news-card-title">${title}</a>
              <div class="news-card-desc">${desc.replace(/<[^>]+>/g, '').slice(0, 120)}...</div>
              <div class="news-card-meta">${pubDate}</div>
            </div>
          </article>
        `;
      });
    } catch (err) {
      newsCards.innerHTML = `<p>뉴스를 불러오지 못했습니다. (${err.message})</p>`;
    }
  });
}); 