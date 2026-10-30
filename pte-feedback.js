(function () {
  "use strict";

  if (window.PTEFeedback) return;

  var STOP = new Set([
    "a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "with", "as",
    "is", "are", "was", "were", "be", "been", "by", "from", "that", "this", "it",
    "its", "their", "our", "we", "you", "they", "he", "she", "at", "into", "about"
  ]);

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function ensureStyles() {
    if (document.getElementById("pfbStyles")) return;
    var style = document.createElement("style");
    style.id = "pfbStyles";
    style.textContent = [
      ".pfbBox{margin-top:12px;padding-top:12px;border-top:1px solid #eef1f6}",
      ".pfbRow{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px}",
      ".pfbBtn{border:0;border-radius:10px;padding:10px 15px;font-size:14px;font-weight:650;cursor:pointer;background:#2456a6;color:#fff}",
      ".pfbBtn.ghost{background:#eef3fb;color:#2456a6}",
      ".pfbBtn:disabled{opacity:.55;cursor:wait}",
      ".pfbFb{display:none;margin-top:10px;padding:12px 13px;border:1px solid #e3e7ee;border-radius:10px;background:#fbfcfe;font-size:14px;line-height:1.75;white-space:pre-wrap}",
      ".pfbFb.on{display:block}",
      ".pfbMeta{font-weight:700;color:#2456a6;margin-bottom:5px}",
      ".pfbSmall{font-size:12.5px;color:#8b93a3;margin-top:5px}",
      ".pfbChips{display:flex;flex-wrap:wrap;gap:6px;margin:7px 0}",
      ".pfbChip{display:inline-block;border-radius:14px;padding:3px 9px;font-size:12.5px;background:#fff2d9;color:#8a5b00}",
      ".pfbList{margin:5px 0 0 18px}.pfbList li{margin:3px 0}",
      ".pfbTa{width:100%;min-height:100px;border:1px solid #d8dde6;border-radius:10px;padding:10px;font:inherit;line-height:1.6;resize:vertical}",
      ".pfbTa:focus{border-color:#2456a6;outline:0}",
      ".pfbPreview{margin-top:4px;padding:10px 12px;border:1px solid #f0d6d6;border-radius:9px;background:#fffafa;white-space:pre-wrap;line-height:1.8}",
      ".pfbErr{background:#fff0f0;color:#9f2f2f;text-decoration:underline wavy #d9534f;text-underline-offset:3px;cursor:help}",
      ".pfbGramList{margin-top:10px}",
      ".pfbGramItem{padding:8px 0;border-top:1px solid #f0e3e3}",
      ".pfbGramItem:first-child{border-top:0}",
      ".pfbGramIssue{font-size:13.5px;color:#7a3030}",
      ".pfbGramBad{color:#b33;font-weight:700}",
      ".pfbGramGood{color:#1b7a4b;font-weight:700}",
      ".pfbGramMsg{font-size:12.5px;color:#8b93a3;margin-top:2px}",
      ".pfbFixBtn{margin-left:7px;border:0;border-radius:7px;padding:2px 8px;font-size:12px;background:#e7f7ee;color:#1b7a4b;cursor:pointer}",
      ".pfbNote{margin-top:8px;font-size:12px;color:#8b93a3}"
    ].join("");
    document.head.appendChild(style);
  }

  function words(text) {
    return String(text || "")
      .replace(/[’‘]/g, "'")
      .toLowerCase()
      .match(/[a-z0-9]+(?:'[a-z]+)?/g) || [];
  }

  function wordCount(text) {
    return words(text).length;
  }

  function stem(token) {
    if (token.length > 5 && token.endsWith("ing")) return token.slice(0, -3);
    if (token.length > 4 && token.endsWith("ed")) return token.slice(0, -2);
    if (token.length > 4 && token.endsWith("es")) return token.slice(0, -2);
    if (token.length > 3 && token.endsWith("s")) return token.slice(0, -1);
    return token;
  }

  function significant(text) {
    return words(text).filter(function (token) { return !STOP.has(token); }).map(stem);
  }

  function phraseCovered(text, phrase) {
    var source = words(text);
    var phraseWords = significant(phrase);
    if (!phraseWords.length) {
      phraseWords = words(phrase);
    }
    if (!phraseWords.length) return false;
    var haystack = " " + source.join(" ") + " ";
    var needle = " " + words(phrase).join(" ") + " ";
    if (haystack.indexOf(needle) >= 0) return true;
    var sourceSet = new Set(source.map(stem));
    var hit = phraseWords.filter(function (token) { return sourceSet.has(token); }).length;
    var threshold = phraseWords.length <= 2 ? phraseWords.length : Math.ceil(phraseWords.length * 0.7);
    return hit >= threshold;
  }

  function coverageResult(text, phrases) {
    phrases = phrases || [];
    var matched = [];
    var missed = [];
    phrases.forEach(function (phrase) {
      var en = typeof phrase === "string" ? phrase : phrase.en;
      if (phraseCovered(text, en)) matched.push(phrase);
      else missed.push(phrase);
    });
    return { matched: matched, missed: missed, total: phrases.length };
  }

  function appendPhraseChips(host, phrases) {
    var wrap = document.createElement("div");
    wrap.className = "pfbChips";
    phrases.forEach(function (phrase) {
      var chip = document.createElement("span");
      chip.className = "pfbChip";
      var en = typeof phrase === "string" ? phrase : phrase.en;
      var zh = typeof phrase === "string" ? "" : phrase.zh;
      chip.textContent = en + (zh ? " · " + zh : "");
      wrap.appendChild(chip);
    });
    host.appendChild(wrap);
  }

  function renderCoverage(host, text, phrases, part) {
    host.textContent = "";
    var result = coverageResult(text, phrases);
    var ratio = result.total ? result.matched.length / result.total : 0;
    var title = document.createElement("div");
    title.className = "pfbMeta";
    title.textContent = "快速反馈：关键点覆盖 " + result.matched.length + "/" + result.total;
    host.appendChild(title);

    if (result.missed.length) {
      var missLabel = document.createElement("div");
      missLabel.textContent = "这次没有清楚带到的内容：";
      host.appendChild(missLabel);
      appendPhraseChips(host, result.missed);
    } else {
      var complete = document.createElement("div");
      complete.textContent = "关键点基本都带到了，内容骨架已经比较稳。";
      host.appendChild(complete);
    }

    var action = document.createElement("div");
    if (ratio >= 0.8) {
      action.textContent = "下一步：把已覆盖的词组连成完整句，检查主语、动词和单复数。";
    } else if (ratio >= 0.5) {
      action.textContent = "下一步：先按上面的缺漏词组各补半句，再重新顺一遍逻辑。";
    } else {
      action.textContent = "下一步：先不要追求长句，按关键词的先后顺序说出讲座主干。";
    }
    host.appendChild(action);

    if (part === "sst" || part === "SST") {
      var count = wordCount(text);
      var wordTip = document.createElement("div");
      wordTip.className = "pfbSmall";
      wordTip.textContent = "当前 " + count + " 词；SST 摘要目标为 50-70 词。";
      host.appendChild(wordTip);
    }
  }

  function lcsSize(a, b) {
    var row = new Array(b.length + 1).fill(0);
    for (var i = 1; i <= a.length; i++) {
      var prev = 0;
      for (var j = 1; j <= b.length; j++) {
        var old = row[j];
        row[j] = a[i - 1] === b[j - 1] ? prev + 1 : Math.max(row[j], row[j - 1]);
        prev = old;
      }
    }
    return row[b.length];
  }

  function renderFixCheck(host, answer, reference) {
    host.textContent = "";
    var userWords = words(answer);
    var refWords = words(reference);
    var common = lcsSize(userWords, refWords);
    var score = userWords.length + refWords.length
      ? Math.round((2 * common / (userWords.length + refWords.length)) * 100)
      : 0;
    var title = document.createElement("div");
    title.className = "pfbMeta";
    title.textContent = "快速反馈：与参考答案的词形匹配约 " + score + "%";
    host.appendChild(title);

    var userSet = new Set(userWords);
    var refSet = new Set(refWords);
    var missing = refWords.filter(function (token) { return !userSet.has(token); });
    var extra = userWords.filter(function (token) { return !refSet.has(token); });
    if (missing.length) {
      var miss = document.createElement("div");
      miss.textContent = "参考段落中出现、你的答案中没有的词：" + missing.slice(0, 14).join(", ");
      host.appendChild(miss);
    }
    if (extra.length) {
      var add = document.createElement("div");
      add.textContent = "你的答案里多出的词：" + extra.slice(0, 14).join(", ");
      host.appendChild(add);
    }
    var tip = document.createElement("div");
    tip.textContent = "优先检查这些位置附近的时态、单复数、拼写和介词。";
    host.appendChild(tip);
  }

  function localGrammarMatches(text) {
    var matches = [];
    var rules = [
      { pattern: /\b([a-z]+)\s+\1\b/gi, replace: function (m) { return m[1]; }, message: "重复单词" },
      { pattern: /\b(He|She|It)\s+have\b/gi, replace: function (m) { return m[1] + " has"; }, message: "第三人称单数用 has" },
      { pattern: /\b(He|She|It)\s+do\b/gi, replace: function (m) { return m[1] + " does"; }, message: "第三人称单数用 does" },
      { pattern: /\b(He|She|It)\s+don't\b/gi, replace: function (m) { return m[1] + " doesn't"; }, message: "第三人称单数用 doesn't" },
      { pattern: /\b(I|You|We|They)\s+has\b/gi, replace: function (m) { return m[1] + " have"; }, message: "这里应该用 have" },
      { pattern: /\b(I|You|We|They)\s+doesn't\b/gi, replace: function (m) { return m[1] + " don't"; }, message: "这里应该用 don't" },
      { pattern: /\b(people|children)\s+is\b/gi, replace: function (m) { return m[1] + " are"; }, message: "复数主语用 are" },
      { pattern: /\b(discuss about)\b/gi, replace: "discuss", message: "discuss 后面不接 about" },
      { pattern: /\b(depends of)\b/gi, replace: "depends on", message: "固定搭配是 depend on" },
      { pattern: /\b(interested on)\b/gi, replace: "interested in", message: "固定搭配是 interested in" },
      { pattern: /\b(married with)\b/gi, replace: "married to", message: "固定搭配是 married to" },
      { pattern: /\b(according with)\b/gi, replace: "according to", message: "固定搭配是 according to" },
      { pattern: /\b(can|should|must)\s+to\b/gi, replace: function (m) { return m[1]; }, message: "情态动词后直接接动词原形" },
      { pattern: /\bmore better\b/gi, replace: "better", message: "better 本身已经是比较级" },
      { pattern: /\binformations\b/gi, replace: "information", message: "information 通常不可数" },
      { pattern: /\bequipments\b/gi, replace: "equipment", message: "equipment 通常不可数" },
      { pattern: /\badvices\b/gi, replace: "advice", message: "advice 通常不可数" },
      { pattern: /\bhomeworks\b/gi, replace: "homework", message: "homework 通常不可数" }
    ];
    rules.forEach(function (rule) {
      var match;
      rule.pattern.lastIndex = 0;
      while ((match = rule.pattern.exec(text))) {
        matches.push({
          offset: match.index,
          length: match[0].length,
          message: rule.message,
          replacements: [{ value: typeof rule.replace === "function" ? rule.replace(match) : rule.replace }]
        });
      }
    });
    return grammarReplacements(matches, text);
  }

  function appendGrammarText(host, text, textarea, matches, fallback) {
    host.textContent = "";
    var clean = (matches || []).filter(function (match) {
      return match && Number.isFinite(match.offset) && match.length > 0;
    });
    var title = document.createElement("div");
    title.className = "pfbMeta";
    title.textContent = clean.length
      ? "语法检查：发现 " + clean.length + " 处需要确认"
      : "语法检查：暂未发现明显错误";
    host.appendChild(title);

    var preview = document.createElement("div");
    preview.className = "pfbPreview";
    var cursor = 0;
    clean.forEach(function (match) {
      if (match.offset < cursor || match.offset >= text.length) return;
      preview.appendChild(document.createTextNode(text.slice(cursor, match.offset)));
      var mark = document.createElement("span");
      mark.className = "pfbErr";
      mark.textContent = text.slice(match.offset, match.offset + match.length);
      mark.title = match.message || "需要检查";
      preview.appendChild(mark);
      cursor = match.offset + match.length;
    });
    preview.appendChild(document.createTextNode(text.slice(cursor)));
    host.appendChild(preview);

    if (!clean.length) return;
    var list = document.createElement("div");
    list.className = "pfbGramList";
    clean.forEach(function (match) {
      var item = document.createElement("div");
      item.className = "pfbGramItem";
      var issue = document.createElement("div");
      issue.className = "pfbGramIssue";
      var bad = document.createElement("span");
      bad.className = "pfbGramBad";
      bad.textContent = text.slice(match.offset, match.offset + match.length);
      issue.appendChild(bad);
      var replacement = match.replacements && match.replacements[0] && match.replacements[0].value;
      if (replacement !== undefined && replacement !== null) {
        var arrow = document.createElement("span");
        arrow.textContent = " → ";
        issue.appendChild(arrow);
        var good = document.createElement("span");
        good.className = "pfbGramGood";
        good.textContent = replacement;
        issue.appendChild(good);
        var fix = document.createElement("button");
        fix.type = "button";
        fix.className = "pfbFixBtn";
        fix.textContent = "替换";
        fix.addEventListener("click", function () {
          var source = textarea.value;
          textarea.value = source.slice(0, match.offset) + replacement + source.slice(match.offset + match.length);
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          checkGrammar(textarea, host);
        });
        issue.appendChild(fix);
      }
      item.appendChild(issue);
      var message = document.createElement("div");
      message.className = "pfbGramMsg";
      message.textContent = match.message || "请结合句子结构检查这里。";
      item.appendChild(message);
      list.appendChild(item);
    });
    host.appendChild(list);
    var note = document.createElement("div");
    note.className = "pfbNote";
    note.textContent = fallback
      ? "网络不可用，已使用本地基础规则检查。"
      : "使用免费语法检查服务，不消耗 AI token；建议以句意和上下文为准。";
    host.appendChild(note);
  }

  function grammarReplacements(matches, text) {
    var clean = (matches || []).filter(function (match) {
      return match && Number.isFinite(match.offset) && match.length > 0;
    }).sort(function (a, b) { return a.offset - b.offset; });
    var accepted = [];
    clean.forEach(function (match) {
      if (!accepted.length || match.offset >= accepted[accepted.length - 1].offset + accepted[accepted.length - 1].length) {
        accepted.push(match);
      }
    });
    return accepted;
  }

  function checkGrammar(textarea, host) {
    var text = (textarea && textarea.value) || "";
    if (!text.trim()) {
      host.classList.add("on");
      host.textContent = "先写下英文摘要或复述，再点语法划线。";
      return;
    }
    host.classList.add("on");
    host.textContent = "正在检查语法，请稍等…";
    var input = text.slice(0, 5000);
    var body = new URLSearchParams();
    body.set("text", input);
    body.set("language", "en-US");
    fetch("https://api.languagetool.org/v2/check", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    }).then(function (data) {
      var matches = grammarReplacements(data.matches || [], input);
      appendGrammarText(host, input, textarea, matches, false);
    }).catch(function () {
      var matches = localGrammarMatches(input);
      appendGrammarText(host, input, textarea, matches, true);
    });
  }

  function makeControls(config) {
    ensureStyles();
    var box = document.createElement("div");
    box.className = "pfbBox";

    var textarea;
    if (config.textarea === false) {
      textarea = config.existing || null;
    } else {
      textarea = document.createElement("textarea");
      textarea.className = "pfbTa";
      textarea.placeholder = config.placeholder || "写下你的摘要、笔记或刚才说的转写…";
      box.appendChild(textarea);
    }

    var row = document.createElement("div");
    row.className = "pfbRow";
    var quick = document.createElement("button");
    quick.type = "button";
    quick.className = "pfbBtn ghost";
    quick.textContent = config.quickLabel || "快速反馈";
    var grammar = document.createElement("button");
    grammar.type = "button";
    grammar.className = "pfbBtn";
    grammar.textContent = config.grammarLabel || "语法划线";
    row.appendChild(quick);
    row.appendChild(grammar);
    box.appendChild(row);

    var feedback = document.createElement("div");
    feedback.className = "pfbFb";
    box.appendChild(feedback);

    quick.addEventListener("click", function () {
      feedback.classList.add("on");
      if (config.onQuick) {
        config.onQuick((textarea && textarea.value) || "", feedback);
      } else {
        renderCoverage(feedback, (textarea && textarea.value) || "", config.phrases || [], config.part);
      }
    });
    grammar.addEventListener("click", function () {
      checkGrammar(textarea, feedback);
    });
    return box;
  }

  function mountPractice() {
    if (typeof window.practice !== "function") return;
    var original = window.practice;
    window.practice = function (item) {
      original(item);
      var list = document.getElementById("list");
      if (!list || list.querySelector(".pfbBox")) return;
      var part = window.TT || "rl";
      var sstBox = document.getElementById("ans");
      var controls = makeControls({
        existing: sstBox,
        textarea: sstBox ? false : true,
        phrases: item.phrases || [],
        part: part,
        title: item.name,
        reference: item.ref,
        transcript: item.ana,
        placeholder: part === "rl" ? "写下你的复述笔记，或把刚才说的话转写到这里…" : ""
      });

      if (sstBox) {
        var panel = sstBox.closest(".panel");
        if (panel) panel.appendChild(controls);
      } else {
        var newPanel = document.createElement("div");
        newPanel.className = "panel";
        newPanel.appendChild(controls);
        var refSec = document.getElementById("refSec");
        var refPanel = refSec && refSec.closest(".panel");
        if (refPanel && refPanel.parentNode) refPanel.parentNode.insertBefore(newPanel, refPanel);
        else list.appendChild(newPanel);
      }
    };
  }

  function mountSkill() {
    if (typeof window.cardMode === "function") {
      var oldCard = window.cardMode;
      window.cardMode = function (item) {
        try { oldCard(item); } catch (error) { console.warn("card mode", error); }
        var panel = document.createElement("div");
        panel.className = "panel";
        panel.appendChild(makeControls({
          phrases: item.phrases2 || [],
          part: item.part || "",
          title: item.name,
          reference: item.ref,
          transcript: item.eng
        }));
        document.getElementById("list").appendChild(panel);
      };
    }

    if (typeof window.buildMode === "function") {
      var oldBuild = window.buildMode;
      window.buildMode = function (item) {
        try { oldBuild(item); } catch (error) { console.warn("build mode", error); }
        var textarea = document.getElementById("ta");
        if (!textarea) return;
        var controls = makeControls({
          existing: textarea,
          textarea: false,
          phrases: item.phrases2 || [],
          part: item.part || "",
          title: item.name,
          reference: item.ref,
          transcript: item.eng,
          quickLabel: "检查词组"
        });
        textarea.closest(".panel").appendChild(controls);
      };
    }

    if (typeof window.fixMode === "function") {
      var oldFix = window.fixMode;
      window.fixMode = function () {
        try { oldFix.apply(this, arguments); } catch (error) { console.warn("fix mode", error); }
        var textarea = document.getElementById("ta");
        if (!textarea) return;
        var index = window.FIXORDER && window.FIXORDER.length ? window.FIXORDER[window.FIXIDX] : 0;
        var entry = window.D && window.D.errors ? window.D.errors[index] : null;
        if (!entry) return;
        var controls = makeControls({
          existing: textarea,
          textarea: false,
          phrases: [],
          part: "fix",
          title: entry.name,
          reference: entry.good,
          transcript: entry.bad,
          quickLabel: "对比答案",
          onQuick: function (answer, feedback) {
            renderFixCheck(feedback, answer, entry.good);
          }
        });
        textarea.closest(".panel").appendChild(controls);
      };
    }
  }

  function init() {
    mountPractice();
    mountSkill();
  }

  window.PTEFeedback = { init: init };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
