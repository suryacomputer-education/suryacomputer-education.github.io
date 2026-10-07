/**
 * SURYA — Google Sign-In + Gmail Password Reset for website
 * (same backend flow as the Android app)
 *
 * SuryaGoogleLogin({mode:'student'|'library', buttonId, messageId})
 * SuryaGoogleReset.open()   -> Gmail se Student / Library password reset
 */
(function(){
  var GIS_SRC='https://accounts.google.com/gsi/client';
  var state={inited:false,mode:'login',handlers:{}};

  function api(body){
    return fetch(window.SURYA_DATABASE_API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body)})
      .then(function(r){return r.text();})
      .then(function(t){
        try{return JSON.parse(t);}
        catch(e){throw new Error('Server अभी busy है, थोड़ी देर बाद दोबारा try करें.');}
      });
  }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m];});}

  /* ---------- one shared Google Identity init ---------- */
  function loadGis(cb){
    if(window.google&&window.google.accounts&&window.google.accounts.id)return cb(null);
    var s=document.createElement('script');
    s.src=GIS_SRC;s.async=true;s.defer=true;
    s.onload=function(){cb(null);};
    s.onerror=function(){cb(new Error('Google script load नहीं हुई. Internet check करें.'));};
    document.head.appendChild(s);
  }
  function ensureInit(cb){
    loadGis(function(err){
      if(err)return cb(err);
      if(!state.inited){
        window.google.accounts.id.initialize({
          client_id:window.SURYA_GOOGLE_CLIENT_ID,
          callback:function(resp){var h=state.handlers[state.mode];if(h)h(resp);},
          auto_select:false
        });
        state.inited=true;
      }
      cb(null);
    });
  }
  function renderButton(holder){
    window.google.accounts.id.renderButton(holder,{theme:'outline',size:'large',text:'continue_with',shape:'pill',width:Math.min(320,Math.max(220,holder.clientWidth||300))});
  }

  /* ---------- Google LOGIN ---------- */
  window.SuryaGoogleLogin=function(opts){
    var mode=opts.mode==='library'?'library':'student';
    var holder=document.getElementById(opts.buttonId);
    var msg=document.getElementById(opts.messageId);
    if(!holder||!window.SURYA_GOOGLE_CLIENT_ID)return;

    function say(t,bad){if(!msg)return;msg.textContent=t;msg.style.color=bad?'#b42318':'';}
    function showJoin(kind){
      if(!msg)return;
      var link=kind==='library'
        ?'<a href="library-admission.html">📚 Library membership के लिए apply करें</a>'
        :'<a href="admission.html">🎓 Student admission के लिए apply करें</a>';
      msg.innerHTML+='<div style="margin-top:8px;font-weight:400">नया account बनाने के लिए: '+link+'</div>';
    }

    state.handlers.login=async function(resp){
      try{
        say('⏳ Google account verify हो रहा है...');
        var g=await api({action:'studentAccountGoogle',idToken:resp.credential});
        if(!g.success)throw new Error(g.message||'Google login failed.');
        var n=await api({action:'studentAccountNativeSessions',token:g.token});
        if(!n.success)throw new Error(n.message||'Session setup failed.');
        var acc=n.account||g.account||{};
        if(n.studentToken){
          sessionStorage.setItem('SURYA_STUDENT_TOKEN',n.studentToken);
          sessionStorage.setItem('SURYA_STUDENT_ID',acc.studentId||'');
          sessionStorage.setItem('SURYA_STUDENT_AUTH','true');
        }
        if(n.libraryToken)sessionStorage.setItem('SURYA_LIBRARY_TOKEN',n.libraryToken);

        if(mode==='library'){
          if(n.libraryToken){location.href='library-dashboard.html';return;}
          say(acc.libraryId?'❌ Library access अभी active नहीं है या approve नहीं हुआ.':'❌ इस Gmail से कोई Library ID linked नहीं है.',true);
          if(!acc.libraryId)showJoin('library');
          return;
        }
        if(n.studentToken){location.href='student-dashboard.html';return;}
        say(acc.studentId?'❌ Student access अभी active नहीं है या approve नहीं हुआ.':'❌ इस Gmail से कोई Student ID linked नहीं है.',true);
        if(!acc.studentId)showJoin('student');
      }catch(e){say('❌ '+(e&&e.message?e.message:e),true);}
    };

    ensureInit(function(err){
      if(err){say('❌ '+err.message,true);return;}
      renderButton(holder);
    });
  };

  /* ---------- Gmail PASSWORD RESET (modal) ---------- */
  var R={ov:null,acc:null,done:{student:false,library:false},cool:null};

  function ui(html){R.ov.querySelector('#sgrBody').innerHTML=html;}
  function say(t,bad){var m=R.ov&&R.ov.querySelector('#sgrMsg');if(m){m.textContent=t||'';m.style.color=bad?'#b42318':'#0a7d33';}}
  function close(){
    clearInterval(R.cool);
    if(R.ov){R.ov.remove();R.ov=null;}
    state.mode='login';
  }

  function open(){
    if(!window.SURYA_GOOGLE_CLIENT_ID){alert('Google login configure नहीं है.');return;}
    if(R.ov)close();
    R.acc=null;R.done={student:false,library:false};
    state.mode='reset';
    R.ov=document.createElement('div');
    R.ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:14px';
    R.ov.innerHTML='<div style="background:#fff;color:#172033;border-radius:14px;max-width:420px;width:100%;padding:18px;box-shadow:0 10px 40px rgba(0,0,0,.35);max-height:92vh;overflow:auto">'
      +'<div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">🔑 Gmail से Password Reset</h3>'
      +'<button id="sgrX" type="button" style="border:0;background:transparent;font-size:22px;cursor:pointer;color:#172033">✕</button></div>'
      +'<div id="sgrBody" style="margin-top:12px"></div><div id="sgrMsg" style="margin-top:10px;font-weight:600"></div></div>';
    document.body.appendChild(R.ov);
    R.ov.querySelector('#sgrX').onclick=close;
    stepGoogle();
  }

  function stepGoogle(){
    ui('<p style="margin:0 0 10px">अपने Gmail से verify करें. जिस Gmail से Student ID या Library ID जुड़ी है वही चुनें.</p><div id="sgrGoogle" style="display:flex;justify-content:center;min-height:44px"></div>');
    state.mode='reset';
    state.handlers.reset=onCredential;
    ensureInit(function(err){
      if(err){say('❌ '+err.message,true);return;}
      renderButton(R.ov.querySelector('#sgrGoogle'));
    });
  }

  async function onCredential(resp){
    try{
      say('⏳ Gmail verify हो रहा है...');
      var g=await api({action:'studentAccountGoogle',idToken:resp.credential});
      if(!g.success)throw new Error(g.message||'Google verify failed.');
      R.acc=g.account||{};
      if(!R.acc.studentId&&!R.acc.libraryId)throw new Error('इस Gmail से कोई Student ID या Library ID linked नहीं है.');
      say('');
      stepChoose();
    }catch(e){say('❌ '+(e&&e.message?e.message:e),true);}
  }

  function stepChoose(){
    var a=R.acc,btn='';
    if(a.studentId&&!R.done.student)btn+='<button type="button" data-t="student" style="display:block;width:100%;margin:8px 0;padding:12px;border:0;border-radius:10px;background:#1f4f8f;color:#fff;font-size:1rem;cursor:pointer">🎓 Student ID: '+esc(a.studentId)+'</button>';
    if(a.libraryId&&!R.done.library)btn+='<button type="button" data-t="library" style="display:block;width:100%;margin:8px 0;padding:12px;border:0;border-radius:10px;background:#7b43be;color:#fff;font-size:1rem;cursor:pointer">📚 Library ID: '+esc(a.libraryId)+'</button>';
    if(!btn){ui('<p>✅ Password reset हो गया. अब नए password से login करें.</p><button type="button" id="sgrClose" style="padding:11px 16px;border:0;border-radius:10px;background:#1f4f8f;color:#fff;cursor:pointer">OK</button>');R.ov.querySelector('#sgrClose').onclick=close;return;}
    ui('<p style="margin:0 0 6px">किसका password reset करना है? दोनों हों तो बारी-बारी से करें.</p>'+btn);
    Array.prototype.forEach.call(R.ov.querySelectorAll('button[data-t]'),function(b){b.onclick=function(){requestOtp(b.getAttribute('data-t'));};});
  }

  async function requestOtp(kind,resend){
    var id=kind==='library'?R.acc.libraryId:R.acc.studentId;
    try{
      say('⏳ OTP भेजा जा रहा है...');
      var r=await api(kind==='library'
        ?{action:'libraryRequestReset',libraryId:id}
        :{action:'studentRequestReset',studentId:id});
      if(!r.success)throw new Error(r.message||'OTP नहीं भेजा जा सका.');
      say('✅ '+(r.message||'OTP भेज दिया गया.'));
      if(!resend)stepOtp(kind,id);
      else startCooldown();
    }catch(e){say('❌ '+(e&&e.message?e.message:e),true);}
  }

  function startCooldown(){
    var b=R.ov&&R.ov.querySelector('#sgrResend');if(!b)return;
    var n=60;b.disabled=true;clearInterval(R.cool);
    R.cool=setInterval(function(){
      n--;
      if(!R.ov||!R.ov.querySelector('#sgrResend')){clearInterval(R.cool);return;}
      if(n<=0){clearInterval(R.cool);b.disabled=false;b.textContent='🔁 Resend OTP';}
      else b.textContent='🔁 Resend OTP ('+n+'s)';
    },1000);
  }

  function stepOtp(kind,id){
    var inp='width:100%;box-sizing:border-box;padding:11px;margin:6px 0;border:1px solid #bbb;border-radius:8px;font-size:1rem';
    ui('<p style="margin:0 0 6px"><b>'+(kind==='library'?'Library ID: ':'Student ID: ')+esc(id)+'</b></p>'
      +'<input id="sgrOtp" inputmode="numeric" placeholder="6-digit OTP (email से)" style="'+inp+'">'
      +'<input id="sgrPw" type="password" placeholder="New Password (8+ characters)" style="'+inp+'">'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">'
      +'<button id="sgrSave" type="button" style="padding:11px 16px;border:0;border-radius:10px;background:#2ea05a;color:#fff;cursor:pointer">🔐 Reset Password</button>'
      +'<button id="sgrResend" type="button" style="padding:11px 16px;border:1px solid #1f4f8f;border-radius:10px;background:transparent;color:#1f4f8f;cursor:pointer" disabled>🔁 Resend OTP</button>'
      +'<button id="sgrBack" type="button" style="padding:11px 16px;border:0;border-radius:10px;background:#ddd;color:#172033;cursor:pointer">← Back</button></div>');
    startCooldown();
    R.ov.querySelector('#sgrResend').onclick=function(){requestOtp(kind,true);};
    R.ov.querySelector('#sgrBack').onclick=function(){say('');stepChoose();};
    R.ov.querySelector('#sgrSave').onclick=async function(){
      var otp=R.ov.querySelector('#sgrOtp').value.trim(),pw=R.ov.querySelector('#sgrPw').value;
      if(!otp){say('❌ OTP भरें.',true);return;}
      if(pw.length<8){say('❌ Password कम से कम 8 characters का रखें.',true);return;}
      try{
        say('⏳ Password बदला जा रहा है...');
        var r=await api(kind==='library'
          ?{action:'libraryResetPassword',libraryId:id,resetCode:otp,newPassword:pw}
          :{action:'studentResetPassword',studentId:id,otp:otp,newPassword:pw});
        if(!r.success)throw new Error(r.message||'Reset failed.');
        R.done[kind]=true;
        say('✅ '+(r.message||'Password reset हो गया.'));
        setTimeout(stepChoose,900);
      }catch(e){say('❌ '+(e&&e.message?e.message:e),true);}
    };
  }

  window.SuryaGoogleReset={open:open,close:close};
})();
