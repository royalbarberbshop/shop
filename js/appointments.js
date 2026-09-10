(function(){
  renderChrome('appointments');

  let serviceMap = {};
  let allEntries = [];
  let reschedulingId = null;
  let rDate = null;
  let rTime = null;

  async function loadServiceMap(){
    const { data } = await sb.from('services').select('id,name,price');
    (data||[]).forEach(s=>{ serviceMap[s.id] = s; });
  }

  function isoDate(d){
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function next14Days(){
    const days = [];
    const today = new Date();
    for(let i=0;i<14;i++){ const d=new Date(today); d.setDate(today.getDate()+i); days.push(d); }
    return days;
  }

  async function generateSlots(dateIso, durationMins, excludeId){
    const { data, error } = await sb.from('queue_entries')
      .select('id,time').eq('date', dateIso).eq('type','appointment').in('status', ['waiting','in-progress']);
    if(error){ showToast('Could not check availability'); return []; }
    const booked = data.filter(r=>r.time && r.id!==excludeId).map(r=>{ const start = timeStrToMinutes(r.time); return [start, start+30]; });
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

  async function nextQueueNumber(dateIso){
    const { data, error } = await sb.from('queue_entries').select('queue_number').eq('date', dateIso).order('queue_number', {ascending:false}).limit(1);
    if(error || !data || data.length===0) return 1;
    return data[0].queue_number + 1;
  }

  function renderReschedulePanel(a){
    const svc = serviceMap[a.service_id] || {duration:30};
    let html = `<div class="reschedule-panel">
      <p class="rp-label">NEW DATE</p>
      <div class="b-date-row">`;
    next14Days().forEach(d=>{
      const iso = isoDate(d);
      const sel = rDate===iso;
      html += `<div class="b-date-chip ${sel?'selected':''}" data-action="r-pick-date" data-date="${iso}">
        <div class="dow">${d.toLocaleDateString('en-US',{weekday:'short'})}</div><div class="dnum">${d.getDate()}</div></div>`;
    });
    html += `</div><p class="rp-label" style="margin-top:16px;">NEW TIME</p>
      <div id="rSlotArea">${rDate ? '<div class="b-slot empty">Loading times…</div>' : '<div class="b-slot empty">Pick a date first</div>'}</div>
      <div style="display:flex;gap:10px;margin-top:16px;">
        <button class="btn-outline" data-action="r-close">Never mind</button>
        <button class="btn-gold" id="rConfirmBtn" data-action="r-confirm" data-id="${a.id}" ${(!rDate || rTime==null)?'disabled':''}>Confirm New Time</button>
      </div>
    </div>`;
    return html;
  }

  function renderActive(){
    const el = document.getElementById('activeSection');
    const active = allEntries.filter(e=>['waiting','in-progress'].includes(e.status))
      .sort((a,b)=> (a.date+a.time) < (b.date+b.time) ? -1 : 1);

    if(active.length===0){
      el.innerHTML = `<div class="card-panel"><div class="panel-title">Active Queue</div>
        <div class="empty-state">No active bookings right now. <a href="booking.html" style="color:var(--gold-dark);font-weight:600;">Book an appointment &rarr;</a></div>
      </div>`;
      return;
    }

    el.innerHTML = `<div class="panel-title">Active Queue</div>` + active.map(a=>{
      const svc = serviceMap[a.service_id] || {name:'Service', price:''};
      return `
      <div class="card-panel">
        <div class="active-queue-top">
          <div><span class="pill pill-active">ACTIVE QUEUE</span><span class="aq-ref">Ref: RB-${a.confirmation_code}</span></div>
          <div class="aq-price">
            <div class="lbl">Booked on ${fmtDate(a.created_at ? a.created_at.slice(0,10) : a.date)}</div>
            <div class="val">₱${svc.price}.00</div>
          </div>
        </div>
        <div class="aq-navybox">
          <div class="queuenum">
            <div class="lbl">Your Queue Number</div>
            <div class="num">Q-${String(a.queue_number).padStart(3,'0')}</div>
            <div class="sub">${a.status==='in-progress' ? "You're up now!" : 'Estimated Wait: ~15 mins'}</div>
          </div>
        </div>
        <div class="aq-meta-row">
          <div class="aq-meta"><div class="lbl">✂️ Service</div><div class="val">${escapeHtml(svc.name)}</div></div>
          <div class="aq-meta"><div class="lbl">📅 Date &amp; Time</div><div class="val">${fmtDateFull(a.date, a.time)}</div></div>
          <div class="aq-meta"><div class="lbl">👤 Barber</div><div class="val">${escapeHtml(BARBER_NAME)}</div></div>
        </div>
        <div style="height:16px;"></div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <a href="index.html" class="btn-navy" style="max-width:230px;">🖥️ View Real-Time Queue</a>
          ${a.status==='waiting' ? `
            <button class="btn-outline" data-action="reschedule" data-id="${a.id}">Reschedule</button>
            <button class="btn-outline" data-action="cancel" data-id="${a.id}" style="border-color:var(--red-text);color:var(--red-text);">Cancel</button>
          ` : ''}
        </div>
        ${reschedulingId===a.id ? renderReschedulePanel(a) : ''}
      </div>`;
    }).join('');

    el.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click', onAction));

    if(reschedulingId && rDate){
      const activeEntry = active.find(a=>a.id===reschedulingId);
      if(activeEntry) loadRescheduleSlots(activeEntry);
    }
  }

  function renderHistory(){
    const el = document.getElementById('historySection');
    const history = allEntries.filter(e=>['completed','cancelled','no-show'].includes(e.status))
      .sort((a,b)=> (a.date+a.time) > (b.date+b.time) ? -1 : 1);

    if(history.length===0){
      el.innerHTML = `<div class="card-panel"><div class="panel-title">Appointment History</div>
        <div class="empty-state">No past appointments yet.</div></div>`;
      return;
    }

    el.innerHTML = `<div class="card-panel">
      <div class="panel-title">Appointment History</div>
      ${history.map(a=>{
        const svc = serviceMap[a.service_id] || {name:'Service', price:''};
        return `<div class="history-row">
          <div class="history-row-main">
            <span class="pill ${statusPillClass(a.status)}" style="margin-top:2px;">${statusLabel(a.status)}</span>
            <div>
              <p class="htitle">${escapeHtml(svc.name)} (₱${svc.price}.00)</p>
              <p class="hsub">Date: ${fmtDateFull(a.date, a.time)}</p>
            </div>
          </div>
          <div class="href">Ref: RB-${a.confirmation_code}</div>
        </div>`;
      }).join('')}
    </div>`;
  }

  async function loadRescheduleSlots(entry){
    const svc = serviceMap[entry.service_id] || {duration:30};
    const slots = await generateSlots(rDate, svc.duration, entry.id);
    const elArea = document.getElementById('rSlotArea');
    if(!elArea) return;
    if(slots.length===0){
      elArea.innerHTML = `<div class="b-slot empty">No open times that day — try another date</div>`;
    }else{
      elArea.innerHTML = `<div class="b-slot-grid">` + slots.map(t=>{
        const sel = rTime===t;
        return `<div class="b-slot ${sel?'selected':''}" data-action="r-pick-time" data-time="${t}">${minutesToLabel(t)}</div>`;
      }).join('') + `</div>`;
      elArea.querySelectorAll('[data-action="r-pick-time"]').forEach(x=>x.addEventListener('click', onAction));
    }
  }

  async function cancelBooking(id){
    const { error } = await sb.from('queue_entries')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('status', 'waiting');
    if(error){ showToast('Could not cancel: ' + error.message); return; }
    showToast('Appointment cancelled');
    load();
  }

  async function confirmReschedule(id){
    const btn = document.getElementById('rConfirmBtn');
    if(btn){ btn.disabled = true; btn.textContent = 'Saving…'; }
    const qnum = await nextQueueNumber(rDate);
    const { error } = await sb.from('queue_entries')
      .update({ date: rDate, time: minutesToTimeStr(rTime), queue_number: qnum })
      .eq('id', id)
      .eq('status', 'waiting');
    if(error){
      if(error.code==='23505' && error.message.includes('unique_appointment_slot')) showToast('That time was just taken — pick another');
      else showToast('Could not reschedule: ' + error.message);
      if(btn){ btn.disabled=false; btn.textContent='Confirm New Time'; }
      return;
    }
    showToast('Appointment rescheduled');
    reschedulingId = null; rDate = null; rTime = null;
    load();
  }

  function onAction(e){
    const el = e.currentTarget;
    const action = el.dataset.action;
    if(action==='cancel') cancelBooking(el.dataset.id);
    else if(action==='reschedule'){ reschedulingId = el.dataset.id; rDate=null; rTime=null; renderActive(); }
    else if(action==='r-close'){ reschedulingId = null; rDate=null; rTime=null; renderActive(); }
    else if(action==='r-pick-date'){ rDate = el.dataset.date; rTime=null; renderActive(); }
    else if(action==='r-pick-time'){ rTime = parseInt(el.dataset.time,10); renderActive(); }
    else if(action==='r-confirm'){ if(!el.hasAttribute('disabled')) confirmReschedule(el.dataset.id); }
  }

  async function load(){
    const session = await requireLogin('appointments.html');
    if(!session) return;
    await loadServiceMap();
    const { data, error } = await sb.from('queue_entries')
      .select('*')
      .eq('user_id', session.user.id)
      .order('date', {ascending:false});
    if(error){
      document.getElementById('activeSection').innerHTML = `<div class="banner-error">Could not load your appointments: ${escapeHtml(error.message)}</div>`;
      return;
    }
    allEntries = data || [];
    renderActive();
    renderHistory();
  }

  load();
})();
