(() => {
  const app = document.querySelector('[data-app-state]');
  const list = document.querySelector('[data-role="item-list"]');
  const end = document.querySelector('[data-role="end"]');

  const batches = [
    [
      { id: 'D001', title: '合成动态记录一' },
      { id: 'D002', title: '合成动态记录二' },
      { id: 'D003', title: '合成动态记录三' },
    ],
    [
      { id: 'D004', title: '合成动态记录四' },
      { id: 'D005', title: '合成动态记录五' },
      { id: 'D006', title: '合成动态记录六' },
    ],
    [
      { id: 'D007', title: '合成动态记录七' },
      { id: 'D008', title: '合成动态记录八' },
      { id: 'D009', title: '合成动态记录九' },
    ],
  ];

  let batchIndex = 0;
  let adding = false;

  function addBatch(batchNumber) {
    if (batchNumber < 1 || batchNumber > batches.length) {
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const item of batches[batchNumber - 1]) {
      const article = document.createElement('article');
      article.dataset.itemId = item.id;
      article.dataset.batch = String(batchNumber);
      const title = document.createElement('h2');
      title.textContent = item.title;
      const note = document.createElement('p');
      note.textContent = `批次 ${batchNumber} · 合成记录`;
      article.append(title, note);
      fragment.append(article);
    }
    list.append(fragment);
    const marker = document.createElement('div');
    marker.hidden = true;
    marker.setAttribute('data-batch-marker', String(batchNumber));
    list.append(marker);
    batchIndex = batchNumber;
    if (batchNumber === 1) {
      app.dataset.appState = 'ready';
    }
    if (batchNumber === batches.length) {
      app.dataset.appState = 'complete';
      end.hidden = false;
    }
  }

  function maybeAddNextBatch() {
    if (adding || batchIndex >= batches.length) {
      return;
    }
    const nearBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 6;
    if (!nearBottom) {
      return;
    }
    adding = true;
    addBatch(batchIndex + 1);
    adding = false;
  }

  list.addEventListener('scroll', maybeAddNextBatch);
  window.setTimeout(() => addBatch(1), 300);

  window.__fixture = {
    get batchCount() {
      return batchIndex;
    },
    get itemCount() {
      return list.querySelectorAll('[data-item-id]').length;
    },
  };
})();
