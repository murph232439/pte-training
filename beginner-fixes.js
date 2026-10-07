/* Repair learning flow while keeping the original question bank intact. */
(function () {
  'use strict';
  function englishOnly(text) { return String(text || '').split(/[\u3400-\u9fff]/)[0].trim(); }
  if (window.D && D.errors) {
    D.errors = D.errors.map(function (entry) {
      var item = Object.assign({}, entry);
      item.bad = englishOnly(item.bad);
      item.good = englishOnly(item.good);
      var bad = item.bad.split(/\s+/), good = item.good.split(/\s+/), start = 0, end = 0;
      while (start < Math.min(bad.length, good.length) && bad[start] === good[start]) start++;
      while (end < Math.min(bad.length, good.length) - start && bad[bad.length - 1 - end] === good[good.length - 1 - end]) end++;
      item.diff = esc(bad.slice(0, start).join(' ')) + ' <del>' + esc(bad.slice(start, bad.length - end).join(' ')) + '</del> <ins>' + esc(good.slice(start, good.length - end).join(' ')) + '</ins> ' + esc(good.slice(good.length - end).join(' '));
      return item;
    });
  }
  if (typeof window.renderList === 'function' && window.D && D.cards) {
    var originalList = window.renderList;
    window.renderList = function (query) {
      originalList(query);
      document.querySelectorAll('#list .card').forEach(function (card) {
        var item = D.cards[PART].find(function (x) { return x.id === Number(card.dataset.id); });
        if (item && (!item.phrases2 || !item.phrases2.length)) {
          card.querySelector('.cmeta').textContent = '词组练习正在整理';
          card.querySelector('.go').textContent = '整理中';
          card.setAttribute('aria-disabled', 'true');
          card.removeAttribute('data-id');
          card.style.cursor = 'default';
        }
      });
    };
    renderList(document.getElementById('q').value);
  }
  if (typeof window.buildMode === 'function') {
    var originalBuild = window.buildMode;
    window.buildMode = function (item) {
      if (!item.phrases2 || !item.phrases2.length) { cardMode(item); return; }
      originalBuild(item);
      var panel = document.querySelector('#list .panel');
      var tip = panel && panel.querySelector('div[style]');
      if (tip) tip.textContent = '先选两三个有用的词组写完整句，再整理成摘要或复述。可以改写人称和句式；参考范文示范信息整合，不要求逐字使用全部词组。';
    };
  }
  if (typeof window.cardMode === 'function') {
    var originalCard = window.cardMode;
    window.cardMode = function (item) {
      if (!item.phrases2 || !item.phrases2.length) {
        document.getElementById('list').innerHTML = '<button class="bigbtn ghost" id="back">返回题目列表</button><div class="panel"><div class="ptitle">' + esc(item.name) + '</div><p>本题的词组练习正在整理。请先选一题已有词组的练习。</p></div>';
        document.getElementById('back').onclick = function () { renderList(document.getElementById('q').value); };
        return;
      }
      originalCard(item);
    };
  }
  if (typeof window.fixMode === 'function') {
    var originalFix = window.fixMode;
    window.fixMode = function () {
      originalFix();
      var entry = D.errors[FIXORDER[FIXIDX]];
      document.querySelector('.angle').innerHTML = '<span>' + esc(entry.type) + '</span>';
    };
  }
  if (typeof window.practice === 'function') {
    var originalPractice = window.practice;
    window.practice = function (item) {
      originalPractice(item);
      var textarea = document.getElementById('ans');
      if (textarea) textarea.oninput = function () {
        var count = PTEFeedback.wordCount(this.value), label = document.getElementById('wc');
        label.textContent = count + ' 词'; label.className = 'wc' + (count >= 50 && count <= 70 ? ' ok' : '');
      };
      var tips = document.querySelector('#list .tips');
      if (tips) tips.textContent = TT === 'sst'
        ? '新手先记下：讲座主题、两条关键信息、它们的关系。再写成摘要；需要帮助时点「看关键词」和「看中文对照」。'
        : '先记主题和两三条关键信息。本页提供复述计时；录音请使用手机或电脑录音工具，完成后回听并对照范文。';
    };
  }
})();
