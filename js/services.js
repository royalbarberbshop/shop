(function(){
  renderChrome('services');

  const ICONS = ['✂️','🪒','💈','🧔','✨','🪮'];

  async function load(){
    const { data, error } = await sb.from('services').select('*').order('name');
    const grid = document.getElementById('svcGrid');
    if(error){
      grid.innerHTML = `<div class="banner-error" style="grid-column:1/-1;">Could not load services: ${escapeHtml(error.message)}</div>`;
      return;
    }
    if(!data || data.length===0){
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">No services listed yet — check back soon.</div>`;
      return;
    }
    grid.innerHTML = data.map((s,i)=>`
      <div class="service-card">
        <div class="svc-icon">${ICONS[i % ICONS.length]}</div>
        <h3>${escapeHtml(s.name)}</h3>
        <div class="svc-meta">${s.duration} minutes</div>
        <div class="svc-price">₱${s.price}</div>
        <a href="booking.html?service=${encodeURIComponent(s.id)}" class="btn-gold">Book This Service</a>
      </div>
    `).join('');
  }

  load();
})();
