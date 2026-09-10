/* ============================================================
   form.js — 問い合わせフォーム共通処理
   index.html の submitForm() と trade.html の submitTradeForm() を
   1つに統合したもの。違いは HTML 側の data 属性で指定する。

   使い方（HTML側）:
     <div class="form-box" id="contact-form"
          data-type="contact"
          data-required="f-name,f-email,f-message">
       ...
       <button class="btn" id="f-submit">送信する</button>
       <p class="form-result" id="f-result"></p>
     </div>
     <script>MimosaForm.init('#contact-form');</script>

   trade.html なら data-type="trade"
   data-required="f-shopname,f-name,f-email" にするだけ。
   ============================================================ */

const MimosaForm = (() => {

  // id → 送信するキー名。存在するものだけ拾う
  const FIELDS = {
    'f-shopname': 'shopName',
    'f-name':     'name',
    'f-email':    'email',
    'f-message':  'message'
  };

  // 必須項目が空だったときの表示名
  const LABELS = {
    'f-shopname': '書店・取次名',
    'f-name':     'お名前',
    'f-email':    'メールアドレス',
    'f-message':  'お問い合わせ内容'
  };

  function show(result, kind, text) {
    result.className = 'form-result ' + (kind === 'ok' ? 'is-ok' : 'is-error');
    result.textContent = text;
  }

  function init(selector) {
    const box = document.querySelector(selector);
    if (!box) return;

    const type     = box.dataset.type || 'contact';
    const required = (box.dataset.required || 'f-name,f-email')
                       .split(',').map(s => s.trim()).filter(Boolean);
    const btn      = box.querySelector('#f-submit');
    const result   = box.querySelector('#f-result');
    if (!btn || !result) return;

    const label = btn.textContent;

    btn.addEventListener('click', async () => {
      const payload = { type };
      for (const [id, key] of Object.entries(FIELDS)) {
        const el = document.getElementById(id);
        if (el) payload[key] = el.value.trim();
      }
      payload.materials = Array.from(
        document.querySelectorAll('.f-material:checked')
      ).map(c => c.value);

      // 必須チェック
      const missing = required.filter(id => {
        const el = document.getElementById(id);
        return !el || !el.value.trim();
      });
      if (missing.length) {
        show(result, 'error',
          missing.map(id => LABELS[id] || id).join('・') + 'を入力してください。');
        return;
      }
      if (payload.email && !payload.email.includes('@')) {
        show(result, 'error', 'メールアドレスの形式が正しくありません。');
        return;
      }

      btn.disabled = true;
      btn.textContent = '送信中…';
      result.className = 'form-result';

      try {
        const res = await fetch(window.MIMOSA.GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status !== 'ok') throw new Error(data.message || '送信に失敗しました');

        show(result, 'ok',
          `ありがとうございます。${window.MIMOSA.REPLY_LEAD}にご連絡いたします。`);
        btn.textContent = '送信しました';
        Object.keys(FIELDS).forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
        document.querySelectorAll('.f-material').forEach(c => (c.checked = false));

      } catch (err) {
        show(result, 'error',
          '送信できませんでした。時間をおいて試すか、メールでご連絡ください。');
        btn.disabled = false;
        btn.textContent = label;
      }
    });
  }

  return { init };
})();
