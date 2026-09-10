(function(){
  renderChrome('contact');

  document.getElementById('sendBtn').addEventListener('click', async ()=>{
    const name = document.getElementById('cName').value.trim();
    const phone = document.getElementById('cPhone').value.trim();
    const message = document.getElementById('cMessage').value.trim();
    const honeypot = document.getElementById('cHoneypot').value.trim();

    if(honeypot) return; // likely a bot; drop silently

    if(!name || !phone || !message){
      showToast('Please fill in your name, number, and message');
      return;
    }

    const btn = document.getElementById('sendBtn');
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Sending…';

    const { error } = await sb.from('contact_messages').insert({
      full_name: name,
      contact_number: phone,
      message: message,
    });

    btn.disabled = false;
    btn.textContent = originalText;

    if(error){
      showToast('Could not send: ' + error.message);
      return;
    }
    showToast("Message sent — we'll get back to you soon");
    document.getElementById('cName').value = '';
    document.getElementById('cPhone').value = '';
    document.getElementById('cMessage').value = '';
  });
})();
