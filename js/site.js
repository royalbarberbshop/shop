// Shared across every page: Supabase client + auth helpers + common helpers + navbar/footer

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- AUTH ----------
async function getSession(){
  const { data } = await sb.auth.getSession();
  return data.session;
}
async function signUpWithEmail(email, password, fullName, phone){
  return sb.auth.signUp({
    email, password,
    options: { data: { full_name: fullName, phone: phone } }
  });
}
async function signInWithEmail(email, password){
  return sb.auth.signInWithPassword({ email, password });
}
async function signInWithFacebook(nextPage){
  return sb.auth.signInWithOAuth({
    provider: 'facebook',
    options: { redirectTo: location.origin + location.pathname.replace(/[^/]*$/, '') + (nextPage || 'index.html') }
  });
}
async function signOutUser(){
  await sb.auth.signOut();
  location.href = 'index.html';
}
// Call at the top of any page that requires a logged-in customer.
// Redirects to account.html (preserving where to return to) if not logged in.
async function requireLogin(currentPageWithQuery){
  const session = await getSession();
  if(!session){
    location.href = 'account.html?next=' + encodeURIComponent(currentPageWithQuery);
    return null;
  }
  return session;
}

// ---------- formatting helpers ----------
function escapeHtml(str){ const div=document.createElement('div'); div.textContent = str==null?'':str; return div.innerHTML; }
function fmtDate(iso){
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US',{month:'short', day:'numeric', year:'numeric'});
}
function fmtDateShort(iso){
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US',{month:'short', day:'numeric'});
}
function timeStrToMinutes(t){
  if(!t) return null;
  const [h,m] = t.split(':').map(Number);
  return h*60+m;
}
function minutesToTimeStr(mins){
  const h = Math.floor(mins/60), m = mins%60;
  return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':00';
}
function minutesToLabel(mins){
  if(mins==null) return '';
  let h = Math.floor(mins/60), m = mins%60;
  const ap = h>=12 ? 'PM':'AM';
  let hh = h%12; if(hh===0) hh=12;
  return hh + ':' + String(m).padStart(2,'0') + ' ' + ap;
}
function timeLabelFromCol(t){ return t ? minutesToLabel(timeStrToMinutes(t)) : 'Walk-in'; }
function fmtDateFull(iso, timeCol){
  const d = new Date(iso + 'T00:00:00');
  const datePart = d.toLocaleDateString('en-US',{weekday:'long', month:'long', day:'numeric', year:'numeric'});
  return timeCol ? `${datePart} @ ${minutesToLabel(timeStrToMinutes(timeCol))}` : datePart;
}
function isoDateToday(){
  const d = new Date();
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function genCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
  let s='';
  for(let i=0;i<6;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}
function statusPillClass(status){
  if(status==='waiting') return 'pill-waiting';
  if(status==='in-progress') return 'pill-active';
  if(status==='completed') return 'pill-completed';
  return 'pill-cancelled'; // cancelled or no-show
}
function statusLabel(status){
  if(status==='in-progress') return 'IN SERVING';
  return status.toUpperCase().replace('-',' ');
}

function showToast(msg){
  let el = document.getElementById('siteToast');
  if(!el){
    el = document.createElement('div');
    el.id = 'siteToast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>{ el.style.display='none'; }, 2600);
}

// ---------- navbar / footer ----------
function renderChrome(activePage){
  const nav = document.getElementById('siteNavbar');
  const foot = document.getElementById('siteFooter');
  const links = [
    {href:'index.html', label:'Home', key:'home'},
    {href:'appointments.html', label:'My Appointments', key:'appointments'},
    {href:'about.html', label:'About', key:'about'},
    {href:'services.html', label:'Services', key:'services'},
    {href:'contact.html', label:'Contact', key:'contact'},
  ];
  if(nav){
    nav.innerHTML = `
      <a href="index.html" class="nav-brand" style="cursor:pointer;">
        <div class="nav-logo">R</div>
        <div class="nav-brand-text">
          <div class="name">ROYAL BARBERSHOP</div>
          <div class="tag">SHAVE &middot; CUT &middot; STYLE</div>
        </div>
      </a>
      <div class="nav-links">
        ${links.map(l=>`<a href="${l.href}" class="${activePage===l.key?'active':''}">${l.label}</a>`).join('')}
      </div>
      <div class="nav-actions">
        <span id="authArea"></span>
        <a href="booking.html" class="nav-cta"><img src="icons/calendar-icon.PNG" class="ui-icon" alt=""> Book Appointment</a>
      </div>
    `;
  }
  if(foot){
    foot.innerHTML = `
      <div class="footer-brand">
        <img src="icons/royal-mark.png" class="footer-wordmark" alt="Royal Barbershop">
      </div>
      <div class="footer-cols">
        <div class="footer-col">
          <div class="ic"><img src="icons/time-icon-white.png" class="ui-icon" alt=""></div>
          <div><div class="lbl">Hours of Operation</div><div class="val">Mon &ndash; Sun | 9:00 AM &ndash; 8:00 PM</div></div>
        </div>
        <div class="footer-col">
          <div class="ic"><img src="icons/location-icon-white.PNG" class="ui-icon" alt=""></div>
          <div><div class="lbl">Location</div><div class="val">Siniloan, Laguna</div></div>
        </div>
        <div class="footer-col">
          <div class="ic"><img src="icons/phone-icon-white.PNG" class="ui-icon" alt=""></div>
          <div><div class="lbl">Get in Touch</div><div class="val">+63 912 345 6789</div></div>
        </div>
      </div>
    `;
  }
  renderAuthSlot(activePage);
}

async function renderAuthSlot(activePage){
  const el = document.getElementById('authArea');
  if(!el) return;
  const session = await getSession();
  if(session){
    const name = (session.user.user_metadata && session.user.user_metadata.full_name) || session.user.email;
    const firstName = name.split(' ')[0];
    el.innerHTML = `
      <span style="font-size:14px;color:var(--gray-600);">Hi, ${escapeHtml(firstName)}</span>
      <button class="nav-cta-alt" id="navLogoutBtn">Log Out</button>
    `;
    document.getElementById('navLogoutBtn').addEventListener('click', signOutUser);
  }else{
    el.innerHTML = `<a href="account.html" class="nav-cta-alt">Log In</a>`;
  }
}
