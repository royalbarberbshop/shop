(function(){
  renderChrome(null);

  const params = new URLSearchParams(location.search);
  const nextPage = params.get('next') || 'index.html';

  // If already logged in, don't sit on the login page
  getSession().then(session=>{ if(session) location.href = nextPage; });

  let tab = 'login';

  function render(){
    document.getElementById('tabLogin').classList.toggle('active', tab==='login');
    document.getElementById('tabSignup').classList.toggle('active', tab==='signup');
    const area = document.getElementById('authFormArea');
    if(tab==='login'){
      area.innerHTML = `
        <div class="field"><label>Email</label><input type="email" id="loginEmail" placeholder="you@email.com"></div>
        <div class="field"><label>Password</label><input type="password" id="loginPassword" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"></div>
        <button class="btn-gold" id="loginBtn">Log In</button>
        <p class="auth-note">Don't have an account? <a href="#" id="goSignup">Sign up</a></p>
      `;
      document.getElementById('goSignup').addEventListener('click', e=>{ e.preventDefault(); tab='signup'; render(); });
      document.getElementById('loginBtn').addEventListener('click', doLogin);
    }else{
      area.innerHTML = `
        <div class="field"><label>Full Name</label><input type="text" id="suName" placeholder="Juan Dela Cruz"></div>
        <div class="field"><label>Contact Number</label><input type="tel" id="suPhone" placeholder="0912 345 6789"></div>
        <div class="field"><label>Email</label><input type="email" id="suEmail" placeholder="you@email.com"></div>
        <div class="field"><label>Password</label><input type="password" id="suPassword" placeholder="At least 6 characters"></div>
        <button class="btn-gold" id="signupBtn">Create Account</button>
        <p class="auth-note">Already have an account? <a href="#" id="goLogin">Log in</a></p>
      `;
      document.getElementById('goLogin').addEventListener('click', e=>{ e.preventDefault(); tab='login'; render(); });
      document.getElementById('signupBtn').addEventListener('click', doSignup);
    }
  }

  async function doLogin(){
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if(!email || !password){ showToast('Enter your email and password'); return; }
    const btn = document.getElementById('loginBtn');
    btn.disabled = true; btn.textContent = 'Logging in…';
    const { error } = await signInWithEmail(email, password);
    if(error){
      showToast(error.message);
      btn.disabled = false; btn.textContent = 'Log In';
      return;
    }
    location.href = nextPage;
  }

  async function doSignup(){
    const name = document.getElementById('suName').value.trim();
    const phone = document.getElementById('suPhone').value.trim();
    const email = document.getElementById('suEmail').value.trim();
    const password = document.getElementById('suPassword').value;
    if(!name || !phone || !email || !password){ showToast('Please fill in every field'); return; }
    if(password.length < 6){ showToast('Password must be at least 6 characters'); return; }
    const btn = document.getElementById('signupBtn');
    btn.disabled = true; btn.textContent = 'Creating account…';
    const { data, error } = await signUpWithEmail(email, password, name, phone);
    if(error){
      showToast(error.message);
      btn.disabled = false; btn.textContent = 'Create Account';
      return;
    }
    if(data.session){
      // Email confirmation is off — logged in immediately
      location.href = nextPage;
    }else{
      showToast('Account created — check your email to confirm, then log in');
      tab = 'login';
      render();
    }
  }

  document.getElementById('tabLogin').addEventListener('click', ()=>{ tab='login'; render(); });
  document.getElementById('tabSignup').addEventListener('click', ()=>{ tab='signup'; render(); });
  document.getElementById('fbBtn').addEventListener('click', ()=> signInWithFacebook(nextPage));

  render();
})();
