/**
 * Google Business Profile — genuine "Google पर Review दें" button
 *
 * Jab Business Profile verify ho jaye:
 *  Google Business Profile -> "Ask for reviews" / "Share review form" ->
 *  jo link mile (jaise https://g.page/r/XXXXXXXX/review) use niche REVIEW_URL me paste karein.
 * Jab tak REVIEW_URL khaali hai, button page par dikhega hi nahi.
 *
 * Note: sirf asli students/visitors se review maangein. Review ke badle paisa/gift na dein.
 */
(function(){
  var REVIEW_URL = "";   // <-- yahan Google review link paste karein

  var ok = /^https:\/\/(g\.page|g\.co|search\.google\.com|www\.google\.com|maps\.app\.goo\.gl)\//.test(REVIEW_URL);
  if(!ok) return;
  document.addEventListener('DOMContentLoaded', function(){
    var wrap = document.getElementById('googleReviewWrap');
    var link = document.getElementById('googleReviewLink');
    if(!wrap || !link) return;
    link.href = REVIEW_URL;
    wrap.hidden = false;
  });
})();
