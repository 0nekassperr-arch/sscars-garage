/**
 * SSCARS GARAGE 2.0 — Lógica del Garaje & Colección Digital
 * Renderiza el estado del perfil de conductor, el progreso de XP y la colección de cartas JDM.
 */

(function() {
  'use strict';

  let currentCars = [];
  let currentUserCards = [];
  let activeFilter = 'all';

  const $ = id => document.getElementById(id);

  // Inicializar interfaz
  document.addEventListener('DOMContentLoaded', () => {
    window.SSCARS_AUTH.onAuthStateChange(handleAuthChange);
  });

  async function handleAuthChange(session) {
    const isAuth = Boolean(session && session.user);
    const authBtn = $('authBtn');
    const guestSec = $('guestSection');
    const authSec = $('authSection');

    if (!isAuth) {
      if (authBtn) {
        authBtn.textContent = 'Iniciar Sesión';
        authBtn.onclick = () => openAuthModal('login');
      }
      if (guestSec) guestSec.style.display = 'block';
      if (authSec) authSec.style.display = 'none';
    } else {
      if (authBtn) {
        authBtn.textContent = 'Mi Cuenta';
        authBtn.onclick = () => openEditProfileModal();
      }
      if (guestSec) guestSec.style.display = 'none';
      if (authSec) authSec.style.display = 'block';
      loadGarageData();
    }
  }

  async function loadGarageData() {
    try {
      const [profile, cars, userCards] = await Promise.all([
        window.SSCARS_AUTH.getProfile(),
        window.SSCARS_AUTH.getCars().catch(() => getFallbackCars()),
        window.SSCARS_AUTH.getUserCollection().catch(() => [])
      ]);

      currentCars = cars || getFallbackCars();
      currentUserCards = userCards || [];

      renderProfile(profile);
      renderCollection();
    } catch (err) {
      console.error('Error cargando el garaje:', err);
    }
  }

  function renderProfile(profile) {
    if (!profile) return;
    const nameEl = $('profName');
    const handleEl = $('profHandle');
    const levelEl = $('profLevel');
    const streakEl = $('profStreak');
    const xpTextEl = $('profXpText');
    const xpFillEl = $('profXpFill');
    const avatarEl = $('avatarContainer');

    if (nameEl) nameEl.textContent = profile.display_name || 'Conductor SSCARS';
    if (handleEl) handleEl.textContent = '@' + (profile.username || 'driver');
    if (levelEl) levelEl.textContent = `Nivel ${profile.level || 1}`;
    if (streakEl) streakEl.textContent = `🔥 ${profile.daily_streak || 0} días`;

    // XP calculation: Next Level XP = 100 * (Level)^1.8
    const currentLevel = profile.level || 1;
    const currentXp = Number(profile.xp || 0);
    const nextLevelXp = Math.floor(100 * Math.pow(currentLevel, 1.8));
    const prevLevelXp = currentLevel === 1 ? 0 : Math.floor(100 * Math.pow(currentLevel - 1, 1.8));
    const xpInCurrentLevel = Math.max(0, currentXp - prevLevelXp);
    const xpNeededForLevel = Math.max(1, nextLevelXp - prevLevelXp);
    const pct = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForLevel) * 100));

    if (xpTextEl) xpTextEl.textContent = `${currentXp.toLocaleString()} / ${nextLevelXp.toLocaleString()} XP`;
    if (xpFillEl) xpFillEl.style.width = `${pct}%`;

    if (avatarEl) {
      if (profile.avatar_url) {
        avatarEl.innerHTML = `<img src="${encodeURI(profile.avatar_url)}" alt="Avatar">`;
      } else {
        avatarEl.innerHTML = '🏎️';
      }
    }
  }

  function renderCollection() {
    const grid = $('cardsGrid');
    if (!grid) return;

    // Mapa de cartas poseídas por car_id
    const ownedMap = new Map();
    currentUserCards.forEach(uc => {
      const card = uc.cards;
      if (card && card.car_id) {
        ownedMap.set(card.car_id, { ...card, ...uc });
      }
    });

    const totalCars = currentCars.length || 15;
    const ownedCount = ownedMap.size;
    const lockedCount = Math.max(0, totalCars - ownedCount);
    const pct = Math.round((ownedCount / totalCars) * 100);

    const statsEl = $('collectionStats');
    if (statsEl) statsEl.textContent = `Desbloqueadas: ${ownedCount} / ${totalCars} · ${pct}% Completado`;
    const ocEl = $('ownedCount');
    if (ocEl) ocEl.textContent = ownedCount;
    const lcEl = $('lockedCount');
    if (lcEl) lcEl.textContent = lockedCount;

    let filtered = currentCars;
    if (activeFilter === 'owned') {
      filtered = currentCars.filter(c => ownedMap.has(c.id));
    } else if (activeFilter === 'locked') {
      filtered = currentCars.filter(c => !ownedMap.has(c.id));
    } else if (activeFilter === 'gold') {
      filtered = currentCars.filter(c => {
        const o = ownedMap.get(c.id);
        return o && o.is_gold;
      });
    }

    if (filtered.length === 0) {
      grid.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center; padding: 40px;">No hay cartas que coincidan con este filtro.</p>`;
      return;
    }

    grid.innerHTML = filtered.map(car => {
      const owned = ownedMap.get(car.id);
      const isGold = Boolean(owned && owned.is_gold);
      const rarity = isGold ? 'gold_chrome' : (car.rarity || 'rare');
      const stats = car.base_stats || {};
      const imgUrl = (car.images && car.images.front) ? car.images.front : `images/${car.slug}-front.webp`;

      if (owned) {
        return `
          <div class="car-card owned ${isGold ? 'gold-card' : ''}">
            <div class="card-top">
              <span class="card-num">#${car.number || car.id}</span>
              <span class="card-rarity ${getRarityClass(rarity)}">${isGold ? '✨ GOLD CHROME' : rarity.toUpperCase()}</span>
            </div>
            <div class="card-img-wrap">
              <img src="${imgUrl}" alt="${car.name}" loading="lazy">
            </div>
            <div class="card-title">${car.name}</div>
            <div class="card-model">${car.real_model} (${car.year})</div>
            <div class="card-stats">
              <div class="stat-row"><span class="stat-k">Potencia:</span><span class="stat-v">${stats.hp || 280} CV</span></div>
              <div class="stat-row"><span class="stat-k">Vel. Máx:</span><span class="stat-v">${stats.top_speed_kmh || 250} km/h</span></div>
              <div class="stat-row"><span class="stat-k">0-100:</span><span class="stat-v">${stats.acceleration_0_100 || 5.0} s</span></div>
              <div class="stat-row"><span class="stat-k">Manejo:</span><span class="stat-v">${stats.handling || 90}/100</span></div>
            </div>
            <div class="card-serial">${owned.code || 'CARD-' + car.slug.toUpperCase() + '-001'}</div>
          </div>
        `;
      } else {
        return `
          <div class="car-card locked">
            <div class="card-top">
              <span class="card-num">#${car.number || car.id}</span>
              <span class="card-rarity rarity-common">BLOQUEADA</span>
            </div>
            <div class="card-img-wrap">
              <div class="card-lock-icon">🔒</div>
            </div>
            <div class="card-title">${car.name}</div>
            <div class="card-model">${car.real_model}</div>
            <div class="card-stats">
              <div class="stat-row"><span class="stat-k">Estado:</span><span class="stat-v" style="color:#FF4444">No descubierta</span></div>
              <div class="stat-row"><span class="stat-k">Caja:</span><span class="stat-v">Mystery Box</span></div>
            </div>
            <div class="card-serial" style="color:#666">Disponible en la tienda</div>
          </div>
        `;
      }
    }).join('');
  }

  function getRarityClass(rarity) {
    switch (rarity) {
      case 'gold_chrome': return 'rarity-gold';
      case 'legendary': return 'rarity-legendary';
      case 'epic': return 'rarity-epic';
      case 'rare': return 'rarity-rare';
      default: return 'rarity-common';
    }
  }

  function getFallbackCars() {
    return [
      { id:'01', number:'01', slug:'r34', name:'El Emperador Azul', real_model:'Nissan Skyline GT-R R34', year:1999, rarity:'legendary', base_stats:{hp:327,top_speed_kmh:252,acceleration_0_100:4.9,handling:94} },
      { id:'02', number:'02', slug:'r32', name:'El Monstruo Púrpura', real_model:'Nissan Skyline GT-R R32', year:1989, rarity:'rare', base_stats:{hp:276,top_speed_kmh:250,acceleration_0_100:5.6,handling:88} },
      { id:'03', number:'03', slug:'350z', name:'Colmillo Azul', real_model:'Nissan 350Z', year:2002, rarity:'rare', base_stats:{hp:287,top_speed_kmh:250,acceleration_0_100:5.8,handling:86} },
      { id:'04', number:'04', slug:'supra', name:'La Bestia Naranja', real_model:'Toyota Supra MK4', year:1993, rarity:'legendary', base_stats:{hp:326,top_speed_kmh:250,acceleration_0_100:4.6,handling:92} },
      { id:'05', number:'05', slug:'ae86', name:'El Fantasma de la Montaña', real_model:'Toyota AE86 Sprinter Trueno', year:1983, rarity:'common', base_stats:{hp:128,top_speed_kmh:200,acceleration_0_100:8.5,handling:96} },
      { id:'06', number:'06', slug:'mr2', name:'El Exótico de Bolsillo', real_model:'Toyota MR2', year:1989, rarity:'rare', base_stats:{hp:200,top_speed_kmh:240,acceleration_0_100:5.9,handling:89} },
      { id:'07', number:'07', slug:'rx7', name:'El Aullido Rotativo', real_model:'Mazda RX-7 FD3S', year:1992, rarity:'epic', base_stats:{hp:255,top_speed_kmh:250,acceleration_0_100:5.2,handling:95} },
      { id:'08', number:'08', slug:'nsx', name:'El Samurái Rojo', real_model:'Honda NSX', year:1990, rarity:'epic', base_stats:{hp:274,top_speed_kmh:270,acceleration_0_100:5.0,handling:97} },
      { id:'09', number:'09', slug:'civic', name:'El Puño Blanco', real_model:'Honda Civic EK9 Type R', year:1997, rarity:'common', base_stats:{hp:182,top_speed_kmh:225,acceleration_0_100:6.8,handling:90} },
      { id:'10', number:'10', slug:'s2000', name:'El Grito Amarillo', real_model:'Honda S2000', year:1999, rarity:'rare', base_stats:{hp:240,top_speed_kmh:241,acceleration_0_100:6.2,handling:91} },
      { id:'11', number:'11', slug:'evo', name:'El Domador', real_model:'Mitsubishi Lancer Evolution', year:1992, rarity:'rare', base_stats:{hp:280,top_speed_kmh:250,acceleration_0_100:4.8,handling:93} },
      { id:'12', number:'12', slug:'eclipse', name:'Verde Veneno', real_model:'Mitsubishi Eclipse', year:1995, rarity:'common', base_stats:{hp:210,top_speed_kmh:240,acceleration_0_100:6.5,handling:85} },
      { id:'13', number:'13', slug:'3000gt', name:'El Visionario', real_model:'Mitsubishi 3000GT VR-4', year:1990, rarity:'common', base_stats:{hp:300,top_speed_kmh:250,acceleration_0_100:5.4,handling:87} },
      { id:'14', number:'14', slug:'wrc', name:'El Azul del Rally', real_model:'Subaru Impreza WRX STI', year:1998, rarity:'rare', base_stats:{hp:280,top_speed_kmh:245,acceleration_0_100:4.9,handling:94} },
      { id:'15', number:'15', slug:'lfa', name:'La Voz del V10', real_model:'Lexus LFA', year:2010, rarity:'rare', base_stats:{hp:553,top_speed_kmh:325,acceleration_0_100:3.7,handling:98} }
    ];
  }

  // ============================================================================
  // ACCIONES DE UI Y MODALES (Exportadas a Window)
  // ============================================================================

  window.filterCards = function(type) {
    activeFilter = type;
    document.querySelectorAll('.filter-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === type);
    });
    renderCollection();
  };

  window.openAuthModal = function(tab = 'login') {
    const modal = $('authModal');
    if (modal) modal.classList.add('open');
    switchAuthTab(tab);
  };

  window.closeAuthModal = function() {
    const modal = $('authModal');
    if (modal) modal.classList.remove('open');
    const msg = $('authMsg');
    if (msg) msg.style.display = 'none';
  };

  window.switchAuthTab = function(tab) {
    const tabLog = $('tabLogin');
    const tabReg = $('tabRegister');
    const fLog = $('formLogin');
    const fReg = $('formRegister');
    const fRec = $('formRecover');
    const msg = $('authMsg');
    if (msg) msg.style.display = 'none';

    if (tab === 'login') {
      if (tabLog) tabLog.classList.add('active');
      if (tabReg) tabReg.classList.remove('active');
      if (fLog) fLog.style.display = 'flex';
      if (fReg) fReg.style.display = 'none';
      if (fRec) fRec.style.display = 'none';
    } else if (tab === 'register') {
      if (tabLog) tabLog.classList.remove('active');
      if (tabReg) tabReg.classList.add('active');
      if (fLog) fLog.style.display = 'none';
      if (fReg) fReg.style.display = 'flex';
      if (fRec) fRec.style.display = 'none';
    } else if (tab === 'recover') {
      if (tabLog) tabLog.classList.remove('active');
      if (tabReg) tabReg.classList.remove('active');
      if (fLog) fLog.style.display = 'none';
      if (fReg) fReg.style.display = 'none';
      if (fRec) fRec.style.display = 'flex';
    }
  };

  window.handleLogin = async function(e) {
    e.preventDefault();
    const btn = $('btnLoginSubmit');
    const email = $('loginEmail').value;
    const pass = $('loginPass').value;
    const msg = $('authMsg');

    if (btn) { btn.disabled = true; btn.textContent = 'Iniciando sesión...'; }
    try {
      await window.SSCARS_AUTH.signIn({ email, password: pass });
      closeAuthModal();
    } catch (err) {
      if (msg) {
        msg.textContent = err.message;
        msg.className = 'auth-msg error';
      }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Entrar al Garaje'; }
    }
  };

  window.handleRegister = async function(e) {
    e.preventDefault();
    const btn = $('btnRegSubmit');
    const email = $('regEmail').value;
    const username = $('regUsername').value;
    const displayName = $('regName').value;
    const pass = $('regPass').value;
    const msg = $('authMsg');

    if (btn) { btn.disabled = true; btn.textContent = 'Creando cuenta...'; }
    try {
      await window.SSCARS_AUTH.signUp({ email, password: pass, username, displayName });
      if (msg) {
        msg.textContent = '¡Cuenta creada con éxito! Si se requiere confirmación por email, revisa tu bandeja de entrada.';
        msg.className = 'auth-msg success';
      }
      setTimeout(() => closeAuthModal(), 1500);
    } catch (err) {
      if (msg) {
        msg.textContent = err.message;
        msg.className = 'auth-msg error';
      }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Crear mi Garaje'; }
    }
  };

  window.handleRecover = async function(e) {
    e.preventDefault();
    const btn = $('btnRecSubmit');
    const email = $('recEmail').value;
    const msg = $('authMsg');

    if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
    try {
      await window.SSCARS_AUTH.resetPassword(email);
      if (msg) {
        msg.textContent = 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.';
        msg.className = 'auth-msg success';
      }
    } catch (err) {
      if (msg) {
        msg.textContent = err.message;
        msg.className = 'auth-msg error';
      }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Enviar Enlace'; }
    }
  };

  window.handleLogout = async function() {
    await window.SSCARS_AUTH.signOut();
  };

  window.openEditProfileModal = async function() {
    const modal = $('editProfileModal');
    const profile = await window.SSCARS_AUTH.getProfile();
    if (profile) {
      $('editDisplayName').value = profile.display_name || '';
      $('editUsername').value = profile.username || '';
      $('editAvatarUrl').value = profile.avatar_url || '';
    }
    if (modal) modal.classList.add('open');
  };

  window.closeEditProfileModal = function() {
    const modal = $('editProfileModal');
    if (modal) modal.classList.remove('open');
    const msg = $('editProfMsg');
    if (msg) msg.style.display = 'none';
  };

  window.handleProfileUpdate = async function(e) {
    e.preventDefault();
    const btn = $('btnEditProfSubmit');
    const displayName = $('editDisplayName').value;
    const username = $('editUsername').value;
    const avatarUrl = $('editAvatarUrl').value;
    const msg = $('editProfMsg');

    if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
    try {
      await window.SSCARS_AUTH.updateProfile({ displayName, username, avatarUrl });
      closeEditProfileModal();
      loadGarageData();
    } catch (err) {
      if (msg) {
        msg.textContent = err.message;
        msg.className = 'auth-msg error';
      }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Guardar Cambios'; }
    }
  };

})();
