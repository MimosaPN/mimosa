/* ============================================================
   config.js — サイト共通の設定
   GASを再デプロイしてURLが変わったら、直すのはこの1行だけ。
   （現在は index.html / shobo/index.html / trade.html の3箇所に
     同じURLがベタ書きされている。それを全部これに置き換える）
   ============================================================ */

window.MIMOSA = {
  // Apps Script ウェブアプリのエンドポイント
  GAS_URL: 'https://script.google.com/macros/s/AKfycbws-OekNnVWaaDKjOgpFqf06RgB4mgE__zDD7jE1X4I7BBGktCVxO2tXjRMghLGLjP-UA/exec',

  // 書籍データの取得先（Phase 2で /data/books.json に一本化する）
  BOOKS_URL: '/data/books.json',

  // 問い合わせの返信目安。文言を1箇所で管理する
  REPLY_LEAD: '2〜3営業日以内'
};
