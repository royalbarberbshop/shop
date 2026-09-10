(function(){
  renderChrome(null);
  const area = document.getElementById('bookArea');

  const STEPS = [
    {key:'service', num:1, label:'Select Service'},
    {key:'date', num:2, label:'Select Date'},
    {key:'time', num:3, label:'Select Time'},
    {key:'details', num:4, label:'User Details'},
    {key:'confirmation', num:5, label:'Confirmation'},
  ];

  let session = null;
  let state = {
    services: [],
    step: 'service',
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

    const meta = session.user.user_metadata || {};
    state.name = meta.full_name || '';
    state.phone = meta.phone || '';

    const { data, error } = await sb.from('services').select('*').order('name');
    if(error){ area.innerHTML = `<div class="banner-error">Could not load services: ${escapeHtml(error.message)}</div>`; return; }
    state.services = data || [];
    const pre = params.get('service');
    if(pre && getService(pre)){ state.serviceId = pre; state.step = 'date'; }
    render();
  }

  function renderStepNav(currentKey){
    const currentNum = STEPS.find(s=>s.key===currentKey).num;
    return `<div class="step-nav">` + STEPS.map(s=>{
      const cls = s.num < currentNum ? 'done' : s.num === currentNum ? 'current' : 'upcoming';
      return `<div class="step-node ${cls}">
        <div class="step-circle ${cls}">${s.num}</div>
        <div class="step-node-label">${s.label}</div>
      </div>`;
    }).join('') + `</div>`;
  }

  function render(){
    if(state.step==='service') area.innerHTML = renderServiceStep();
    else if(state.step==='date') area.innerHTML = renderDateStep();
    else if(state.step==='time') area.innerHTML = renderTimeStep();
    else if(state.step==='details') area.innerHTML = renderDetailsStep();
    else if(state.step==='confirmation') area.innerHTML = renderConfirmationStep();
    attach();
  }

  function renderServiceStep(){
    let html = renderStepNav('service');
    html += `<div class="book-step-eyebrow">STEP 1 OF 5</div>
      <h2 class="book-step-title">Select a Service</h2>
      <p class="book-step-sub">Choose the service you'd like to book at Royal Barbershop.</p>`;
    state.services.forEach(s=>{
      const sel = state.serviceId===String(s.id);
      html += `<div class="b-card ${sel?'selected':''}" data-action="pick-service" data-id="${s.id}">
        <div><p class="b-title">${escapeHtml(s.name)}</p><p class="b-meta">${s.duration} min</p></div>
        <div class="b-price">₱${s.price}</div>
      </div>`;
    });
    html += `<div class="book-nav-row"><span></span>
      <button class="btn-gold" id="nextBtn" ${!state.serviceId?'disabled':''} data-action="goto-date">Next Step</button>
    </div>`;
    return html;
  }

  function renderDateStep(){
    let html = renderStepNav('date');
    html += `<div class="book-step-eyebrow">STEP 2 OF 5</div>
      <h2 class="book-step-title">Select a Date</h2>
      <p class="book-step-sub">Shop operating hours: 9:00 AM &ndash; 8:00 PM, Monday to Sunday.</p>`;
    html += `<div class="b-date-row" style="flex-wrap:wrap;">`;
    next14Days().forEach(d=>{
      const iso = isoDate(d);
      const sel = state.date===iso;
      html += `<div class="b-date-chip ${sel?'selected':''}" data-action="pick-date" data-date="${iso}">
        <div class="dow">${d.toLocaleDateString('en-US',{weekday:'short'})}</div><div class="dnum">${d.getDate()}</div></div>`;
    });
    html += `</div>`;
    html += `<div class="book-nav-row">
      <button class="btn-outline" data-action="goto-service">Back</button>
      <button class="btn-gold" id="nextBtn" ${!state.date?'disabled':''} data-action="goto-time">Next Step</button>
    </div>`;
    return html;
  }

  function renderTimeStep(){
    const svc = getService(state.serviceId);
    const dateObj = new Date(state.date + 'T00:00:00');
    let html = renderStepNav('time');
    html += `<div class="book-step-eyebrow">STEP 3 OF 5</div>
      <h2 class="book-step-title">Select Appointment Time</h2>
      <p class="book-step-sub">Shop operating hours: 9:00 AM &ndash; 8:00 PM. We allocate ${svc.duration} minutes per hair grooming session with our resident master barber.</p>`;
    html += `<div class="date-recap-row">
      <span class="k">Selected Date: <b>${dateObj.toLocaleDateString('en-US',{month:'long', day:'numeric', year:'numeric', weekday:'long'})}</b></span>
      <span class="k">Timezone: <b>GMT+8 (Laguna, PH)</b></span>
    </div>`;
    html += `<div id="slotArea"><div class="loading-line">Loading times…</div></div>`;
    html += `<div class="book-nav-row">
      <button class="btn-outline" data-action="goto-date">Back</button>
      <button class="btn-gold" id="nextBtn" ${state.time==null?'disabled':''} data-action="goto-details">Next Step</button>
    </div>`;
    return html;
  }

  function renderDetailsStep(){
    const svc = getService(state.serviceId);
    const dateObj = new Date(state.date + 'T00:00:00');
    let html = renderStepNav('details');
    html += `<div class="book-step-eyebrow">STEP 4 OF 5</div>
      <h2 class="book-step-title">Your Details</h2>
      <p class="book-step-sub">Almost done — confirm who this booking is for.</p>`;
    html += `<div class="b-summary">
      <div class="b-summary-row"><span class="k">Service</span><span class="v">${escapeHtml(svc.name)}</span></div>
      <div class="b-summary-row"><span class="k">When</span><span class="v">${dateObj.toLocaleDateString('en-US',{month:'short',day:'numeric'})}, ${minutesToLabel(state.time)}</span></div>
      <div class="b-summary-row"><span class="k">Price</span><span class="v">₱${svc.price}</span></div>
    </div>`;
    html += `<div class="field"><label>Full Name</label><input type="text" id="bName" value="${escapeHtml(state.name)}" placeholder="Juan Dela Cruz"></div>
    <div class="field"><label>Contact Number</label><input type="tel" id="bPhone" value="${escapeHtml(state.phone)}" placeholder="0912 345 6789"></div>
    <input type="text" id="bHoneypot" autocomplete="off" tabindex="-1" style="position:absolute;left:-9999px;opacity:0;" aria-hidden="true">
    <div class="book-nav-row">
      <button class="btn-outline" data-action="goto-time">Back</button>
      <button class="btn-gold" id="confirmBtn" data-action="confirm-booking">Confirm Appointment</button>
    </div>`;
    return html;
  }

  function renderConfirmationStep(){
    const a = state.lastConfirmed;
    if(!a) return `<div class="empty-state">Nothing to confirm yet.</div>`;
    const svc = getService(a.service_id);
    const dateObj = new Date(a.date + 'T00:00:00');
    let html = renderStepNav('confirmation');
    html += `
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
    <div style="max-width:340px;margin:0 auto;">
      <a href="appointments.html" class="btn-navy">View My Appointments</a>
      <div style="height:10px;"></div>
      <a href="index.html" class="btn-outline" style="display:block;text-align:center;">Back to Home</a>
    </div>`;
    return html;
  }

  async function generateSlots(dateIso){
    const { data, error } = await sb.rpc('get_booked_times', { p_date: dateIso });
    if(error){ showToast('Could not check availability'); return []; }
    return (data||[]).map(r=>{ const start = timeStrToMinutes(r.slot_time); return [start, start+30]; });
  }

  async function loadSlotsIntoDom(){
    const svc = getService(state.serviceId);
    const booked = await generateSlots(state.date);
    const el = document.getElementById('slotArea');
    if(!el) return;

    const step = 30;
    const startMin = SHOP_HOURS.start*60, endMin = SHOP_HOURS.end*60;
    const now = new Date();
    const todayIso = isoDate(now);
    const nowMins = now.getHours()*60+now.getMinutes();

    const morning = [], afternoon = [];
    for(let t=startMin; t+svc.duration<=endMin; t+=step){
      const isPast = state.date===todayIso && t<=nowMins;
      const isBooked = booked.some(([bs,be]) => t<be && (t+svc.duration)>bs);
      const slot = { t, disabled: isPast || isBooked };
      (t < 12*60 ? morning : afternoon).push(slot);
    }

    function renderGroup(label, slots){
      if(slots.length===0) return '';
      return `<div class="slot-group-label">${label}</div><div class="b-slot-grid">` +
        slots.map(s=>{
          const sel = state.time===s.t;
          if(s.disabled){
            return `<div class="b-slot disabled">${minutesToLabel(s.t)}</div>`;
          }
          return `<div class="b-slot ${sel?'selected':''}" data-action="pick-time" data-time="${s.t}">${minutesToLabel(s.t)}</div>`;
        }).join('') + `</div>`;
    }

    if(morning.length===0 && afternoon.length===0){
      el.innerHTML = `<div class="empty-state">No time slots configured for this service.</div>`;
    }else{
      el.innerHTML = renderGroup('Morning Sessions', morning) + renderGroup('Afternoon &amp; Evening Sessions', afternoon);
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
    if(action==='pick-service'){ state.serviceId = el.dataset.id; render(); }
    else if(action==='goto-service'){ state.step='service'; render(); }
    else if(action==='goto-date'){ if(!el.hasAttribute('disabled')){ state.step='date'; render(); } }
    else if(action==='pick-date'){ state.date = el.dataset.date; state.time=null; render(); }
    else if(action==='goto-time'){ if(!el.hasAttribute('disabled')){ state.step='time'; render(); } }
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
    if(state.step==='time') loadSlotsIntoDom();
  }

  init();
})();
