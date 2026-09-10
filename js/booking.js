(function(){
  renderChrome(null);
  const area = document.getElementById('bookArea');

  let session = null;
  let state = {
    services: [],
    step: 'service', // service, datetime, details, confirmation
    serviceId: null,
    date: null,
    time: null,
    name: '',
    phone: '',
    lastConfirmed: null,
  };

  function getService(id){ return state.services.find(s=>String(s.id)===String(id)); }
  function next14Days(){
    const days = [];
    const today = new Date();
    for(let i=0;i<14;i++){ const d=new Date(today); d.setDate(today.getDate()+i); days.push(d); }
    return days;
  }
  function isoDate(d){
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }

  async function init(){
    const params = new URLSearchParams(location.search);
    session = await requireLogin('booking.html' + location.search);
    if(!session) return; // requireLogin already redirected to account.html

    // Prefill from account details, so returning customers don't retype every time
    const meta = session.user.user_metadata || {};
    state.name = meta.full_name || '';
    state.phone = meta.phone || '';

    const { data, error } = await sb.from('services').select('*').order('name');
    if(error){ area.innerHTML = `<div class="banner-error">Could not load services: ${escapeHtml(error.message)}</div>`; return; }
    state.services = data || [];
    const pre = params.get('service');
    if(pre && getService(pre)){ state.serviceId = pre; state.step = 'datetime'; }
    render();
  }

  function stepDots(step){
    let d=''; for(let i=1;i<=3;i++) d += `<div class="dot ${i<=step?'done':''}"></div>`;
    return `<div class="step-dots">${d}</div>`;
  }

  function render(){
    if(state.step==='service') area.innerHTML = renderServiceStep();
    else if(state.step==='datetime') area.innerHTML = renderDatetimeStep();
    else if(state.step==='details') area.innerHTML = renderDetailsStep();
    else if(state.step==='confirmation') area.innerHTML = renderConfirmationStep();
    attach();
  }

  function renderServiceStep(){
    let html = `<h2 style="margin:0 0 6px;color:var(--navy);">Choose a service</h2>${stepDots(1)}`;
    state.services.forEach(s=>{
      const sel = state.serviceId===String(s.id);
      html += `<div class="b-card ${sel?'selected':''}" data-action="pick-service" data-id="${s.id}">
        <div><p class="b-title">${escapeHtml(s.name)}</p><p class="b-meta">${s.duration} min</p></div>
        <div class="b-price">₱${s.price}</div>
      </div>`;
    });
    return html;
  }

  function renderDatetimeStep(){
    let html = `<div class="back-row"><button class="back-btn" data-action="goto-service">&larr;</button><h2>Pick a time</h2></div>${stepDots(2)}`;
    html += `<p style="font-size:12.5px;font-weight:600;color:var(--gray-600);margin:0 0 8px;">DATE</p><div class="b-date-row">`;
    next14Days().forEach(d=>{
      const iso = isoDate(d);
      const sel = state.date===iso;
      html += `<div class="b-date-chip ${sel?'selected':''}" data-action="pick-date" data-date="${iso}">
        <div class="dow">${d.toLocaleDateString('en-US',{weekday:'short'})}</div><div class="dnum">${d.getDate()}</div></div>`;
    });
    html += `</div><p style="font-size:12.5px;font-weight:600;color:var(--gray-600);margin:18px 0 4px;">AVAILABLE TIMES</p>`;
    html += `<div id="slotArea">${state.date ? '<div class="b-slot empty">Loading times…</div>' : '<div class="b-slot empty">Pick a date to see open times</div>'}</div>`;
    html += `<div style="height:18px;"></div><button class="btn-gold" id="continueBtn" ${(!state.date || state.time==null)?'disabled':''} data-action="goto-details">Continue</button>`;
    return html;
  }

  function renderDetailsStep(){
    const svc = getService(state.serviceId);
    const dateObj = new Date(state.date + 'T00:00:00');
    let html = `<div class="back-row"><button class="back-btn" data-action="goto-datetime">&larr;</button><h2>Your details</h2></div>${stepDots(3)}`;
    html += `<div class="b-summary">
      <div class="b-summary-row"><span class="k">Service</span><span class="v">${escapeHtml(svc.name)}</span></div>
      <div class="b-summary-row"><span class="k">When</span><span class="v">${dateObj.toLocaleDateString('en-US',{month:'short',day:'numeric'})}, ${minutesToLabel(state.time)}</span></div>
      <div class="b-summary-row"><span class="k">Price</span><span class="v">₱${svc.price}</span></div>
    </div>`;
    html += `<div class="field"><label>Full Name</label><input type="text" id="bName" value="${escapeHtml(state.name)}" placeholder="Juan Dela Cruz"></div>
    <div class="field"><label>Contact Number</label><input type="tel" id="bPhone" value="${escapeHtml(state.phone)}" placeholder="0912 345 6789"></div>
    <input type="text" id="bHoneypot" autocomplete="off" tabindex="-1" style="position:absolute;left:-9999px;opacity:0;" aria-hidden="true">
    <button class="btn-gold" id="confirmBtn" data-action="confirm-booking">Confirm Appointment</button>`;
    return html;
  }

  function renderConfirmationStep(){
    const a = state.lastConfirmed;
    if(!a) return `<div class="empty-state">Nothing to confirm yet.</div>`;
    const svc = getService(a.service_id);
    const dateObj = new Date(a.date + 'T00:00:00');
    return `
    <div style="text-align:center;padding:6px 0 10px;">
      <div style="font-size:36px;">✂️</div>
      <h2 style="margin:10px 0 4px;color:var(--navy);">You're booked in</h2>
      <p style="color:var(--gray-600);font-size:14px;margin:0;">See you at Royal Barbershop</p>
    </div>
    <div class="b-queue-hero">
      <div class="num">Q-${String(a.queue_number).padStart(3,'0')}</div>
      <div class="lbl">Your queue number</div>
    </div>
    <div class="b-summary" style="border:2px solid var(--gold);">
      <div class="b-summary-row"><span class="k">Confirmation code</span><span class="v" style="font-family:'Poppins',sans-serif;font-size:17px;letter-spacing:1px;">${escapeHtml(a.confirmation_code)}</span></div>
    </div>
    <p style="font-size:12.5px;color:var(--gray-600);margin:-8px 0 18px;text-align:center;">Save this code — you'll need it to check your status or cancel.</p>
    <div class="b-summary">
      <div class="b-summary-row"><span class="k">Service</span><span class="v">${escapeHtml(svc?svc.name:'')}</span></div>
      <div class="b-summary-row"><span class="k">When</span><span class="v">${dateObj.toLocaleDateString('en-US',{month:'short',day:'numeric'})}, ${minutesToLabel(timeStrToMinutes(a.time))}</span></div>
      <div class="b-summary-row"><span class="k">Price</span><span class="v">₱${svc?svc.price:''}</span></div>
    </div>
    <a href="appointments.html" class="btn-navy">View My Appointments</a>
    <div style="height:10px;"></div>
    <a href="index.html" class="btn-outline" style="display:block;text-align:center;">Back to Home</a>`;
  }

  async function generateSlots(dateIso, durationMins){
    const { data, error } = await sb.from('queue_entries')
      .select('time').eq('date', dateIso).eq('type','appointment').in('status', ['waiting','in-progress']);
    if(error){ showToast('Could not check availability'); return []; }
    const booked = data.filter(r=>r.time).map(r=>{ const start = timeStrToMinutes(r.time); return [start, start+30]; });
    const slots = [];
    const step = 30;
    const startMin = SHOP_HOURS.start*60, endMin = SHOP_HOURS.end*60;
    const now = new Date();
    const todayIso = isoDate(now);
    const nowMins = now.getHours()*60+now.getMinutes();
    for(let t=startMin; t+durationMins<=endMin; t+=step){
      if(dateIso===todayIso && t<=nowMins) continue;
      const overlaps = booked.some(([bs,be]) => t<be && (t+durationMins)>bs);
      if(!overlaps) slots.push(t);
    }
    return slots;
  }

  async function loadSlotsIntoDom(){
    const svc = getService(state.serviceId);
    const slots = await generateSlots(state.date, svc.duration);
    const el = document.getElementById('slotArea');
    if(!el) return;
    if(slots.length===0){
      el.innerHTML = `<div class="b-slot empty">No open times that day — try another date</div>`;
    }else{
      el.innerHTML = `<div class="b-slot-grid">` + slots.map(t=>{
        const sel = state.time===t;
        return `<div class="b-slot ${sel?'selected':''}" data-action="pick-time" data-time="${t}">${minutesToLabel(t)}</div>`;
      }).join('') + `</div>`;
      el.querySelectorAll('[data-action="pick-time"]').forEach(x=>x.addEventListener('click', onAction));
    }
  }

  async function nextQueueNumber(dateIso){
    const { data, error } = await sb.from('queue_entries').select('queue_number').eq('date', dateIso).order('queue_number', {ascending:false}).limit(1);
    if(error || !data || data.length===0) return 1;
    return data[0].queue_number + 1;
  }

  async function confirmBooking(){
    if(!state.name.trim() || !state.phone.trim()){ showToast('Please add your name and contact number'); return; }
    const honeypot = document.getElementById('bHoneypot');
    if(honeypot && honeypot.value.trim()) return;
    const btn = document.getElementById('confirmBtn');
    if(btn){ btn.disabled = true; btn.textContent = 'Booking…'; }
    try{
      const qnum = await nextQueueNumber(state.date);
      const insertRow = {
        user_id: session.user.id,
        customer_name: state.name.trim(),
        contact_number: state.phone.trim(),
        service_id: state.serviceId,
        type: 'appointment',
        date: state.date,
        time: minutesToTimeStr(state.time),
        queue_number: qnum,
        status: 'waiting',
        confirmation_code: genCode(),
      };
      let { error } = await sb.from('queue_entries').insert(insertRow);
      if(error && error.code==='23505' && error.message.includes('confirmation_code')){
        insertRow.confirmation_code = genCode();
        ({ error } = await sb.from('queue_entries').insert(insertRow));
      }
      if(error){
        if(error.code==='23505' && error.message.includes('unique_appointment_slot')) showToast('That time was just taken — pick another slot');
        else if(error.code==='23505' && error.message.includes('one_active_booking_per_phone_per_day')) showToast('That number already has an active booking that day');
        else if(error.code==='23514') showToast('Please check your name, number, and date');
        else showToast('Booking failed: ' + error.message);
        if(btn){ btn.disabled=false; btn.textContent='Confirm Appointment'; }
        return;
      }
      state.lastConfirmed = insertRow;
      state.step = 'confirmation';
      render();
    }catch(err){
      showToast('Something went wrong — try again');
      if(btn){ btn.disabled=false; btn.textContent='Confirm Appointment'; }
    }
  }

  function onAction(e){
    const el = e.currentTarget;
    const action = el.dataset.action;
    if(action==='pick-service'){ state.serviceId = el.dataset.id; state.date=null; state.time=null; state.step='datetime'; render(); }
    else if(action==='goto-service'){ state.step='service'; render(); }
    else if(action==='goto-datetime'){ state.step='datetime'; render(); }
    else if(action==='pick-date'){ state.date = el.dataset.date; state.time=null; render(); }
    else if(action==='pick-time'){ state.time = parseInt(el.dataset.time,10); render(); }
    else if(action==='goto-details'){ if(!el.hasAttribute('disabled')){ state.step='details'; render(); } }
    else if(action==='confirm-booking'){ confirmBooking(); }
  }

  function attach(){
    area.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click', onAction));
    const bName = document.getElementById('bName');
    if(bName) bName.addEventListener('input', e=>{ state.name = e.target.value; });
    const bPhone = document.getElementById('bPhone');
    if(bPhone) bPhone.addEventListener('input', e=>{ state.phone = e.target.value; });
    if(state.step==='datetime' && state.date) loadSlotsIntoDom();
  }

  init();
})();
