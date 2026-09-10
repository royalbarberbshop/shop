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
  }

  load();
})();
