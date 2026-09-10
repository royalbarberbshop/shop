(function(){
  renderChrome('home');

  const AVG_MINUTES_PER_TURN = 15;

  async function loadServiceMap(){
    const { data } = await sb.from('services').select('id,name');
    const map = {};
    (data||[]).forEach(s=>{ map[s.id] = s.name; });
    return map;
  }

  function svcName(map, id){ return map[id] || 'Service'; }

  async function load(){
    const [{ data: queue, error: qErr }, serviceMap] = await Promise.all([
      sb.rpc('get_public_queue', { p_date: isoDateToday() }),
      loadServiceMap(),
    ]);

    if(qErr){
      document.getElementById('statGrid').innerHTML = `<div class="banner-error" style="grid-column:1/-1;">Could not load queue status: ${escapeHtml(qErr.message)}</div>`;
      return;
    }

    const entries = (queue||[]).slice().sort((a,b)=>a.queue_number-b.queue_number);
    const serving = entries.find(e=>e.status==='in-progress');
    const waiting = entries.filter(e=>e.status==='waiting');

    // Is a real customer logged in with an active ticket today?
    let myEntry = null;
    const session = await getSession();
    if(session){
      const { data } = await sb.from('queue_entries')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('date', isoDateToday())
        .in('status', ['waiting','in-progress'])
        .limit(1);
      if(data && data.length) myEntry = data[0];
    }

    renderStats(entries, serving, waiting, myEntry);
    renderSequence(entries, serviceMap);
  }

  function renderStats(entries, serving, waiting, myEntry){
    const grid = document.getElementById('statGrid');
    let customersAhead, estWait, ticketCard;

    if(myEntry){
      customersAhead = entries.filter(e=>e.status==='waiting' && e.queue_number < myEntry.queue_number).length;
      estWait = customersAhead * AVG_MINUTES_PER_TURN;
      ticketCard = `
        <div class="stat-card">
          <div class="stat-head"><img src="icons/ticket-icon.PNG" class="ui-icon" alt=""> YOUR TICKET</div>
          <div class="stat-num">Q-${String(myEntry.queue_number).padStart(3,'0')}</div>
          <span class="pill ${statusPillClass(myEntry.status)}">${statusLabel(myEntry.status)}</span>
        </div>`;
    }else{
      customersAhead = waiting.length;
      estWait = customersAhead * AVG_MINUTES_PER_TURN;
      ticketCard = `
        <div class="stat-card">
          <div class="stat-head"><img src="icons/ticket-icon.PNG" class="ui-icon" alt=""> YOUR TICKET</div>
          <div class="stat-num" style="font-size:20px;color:var(--gray-400);">No active ticket</div>
          <a href="booking.html" class="pill pill-waiting" style="text-decoration:none;">BOOK NOW</a>
        </div>`;
    }

    const servingCard = `
      <div class="stat-card dark">
        <div class="stat-head"><img src="icons/person-icon-white.PNG" class="ui-icon" alt=""> CURRENTLY SERVING</div>
        <div class="stat-num">${serving ? 'Q-'+String(serving.queue_number).padStart(3,'0') : '—'}</div>
        <span class="pill pill-serving">${serving ? 'IN SERVING' : 'NONE YET'}</span>
      </div>`;

    const aheadCard = `
      <div class="stat-card">
        <div class="stat-head"><img src="icons/people-icon.PNG" class="ui-icon" alt=""> CUSTOMERS AHEAD</div>
        <div class="stat-num">${customersAhead}</div>
        <div class="stat-caption">Estimated Turn</div>
      </div>`;

    const waitCard = `
      <div class="stat-card">
        <div class="stat-head"><img src="icons/time-icon.PNG" class="ui-icon" alt=""> ESTIMATED WAIT</div>
        <div class="stat-num">${estWait} Mins</div>
        <div class="stat-caption">Subject to further progress</div>
      </div>`;

    grid.innerHTML = ticketCard + servingCard + aheadCard + waitCard;
  }

  function renderSequence(entries, serviceMap){
    const row = document.getElementById('seqRow');
    const active = entries.filter(e=>e.status==='waiting' || e.status==='in-progress').slice(0,4);
    if(active.length===0){
      row.innerHTML = `<div class="empty-state">No one's in line right now — book an appointment to be first!</div>`;
      return;
    }
    const labels = ['CURRENTLY SERVING','2ND IN LINE (AHEAD)','3RD IN LINE (AHEAD)','4TH IN LINE (AHEAD)'];
    let html = '';
    active.forEach((e,i)=>{
      const isCurrent = e.status==='in-progress';
      html += `<div class="seq-card ${isCurrent?'current':''}">
        <div class="seq-label">${labels[i] || (i+1)+'TH IN LINE'}</div>
        <div class="seq-num">Q-${String(e.queue_number).padStart(3,'0')}</div>
        <div class="seq-service">${escapeHtml(svcName(serviceMap, e.service_id))}</div>
      </div>`;
      if(i < active.length-1) html += `<div class="seq-arrow">&rarr;</div>`;
    });
    row.innerHTML = html;
  }

  load();
})();
