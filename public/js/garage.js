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
      const [profile, cars, userCards, dailyStatus] = await Promise.all([
        window.SSCARS_AUTH.getProfile(),
        window.SSCARS_AUTH.getCars().catch(() => getFallbackCars()),
        window.SSCARS_AUTH.getUserCollection().catch(() => []),
        window.SSCARS_AUTH.getDailyRewardStatus().catch(() => ({ canClaim: false }))
      ]);

      currentCars = cars || getFallbackCars();
      currentUserCards = userCards || [];

      renderProfile(profile);
      renderDailyDropStatus(dailyStatus);
      renderCollection();
    } catch (err) {
      console.error('Error cargando el garaje:', err);
    }
  }

  function renderDailyDropStatus(dailyStatus) {
    const actionEl = $('dailyDropAction');
    const subEl = $('dailyDropSubtitle');
    if (!actionEl) return;

    if (dailyStatus && dailyStatus.canClaim) {
      actionEl.innerHTML = `<button class="btn-claim-drop" id="btnClaimDrop" onclick="handleClaimDailyReward()">🎁 Abrir Recompensa</button>`;
      if (subEl) subEl.textContent = '¡Tu recompensa de conexión de hoy está lista! Ábrela para conseguir XP, cartas o un posible Gold Chase.';
    } else {
      actionEl.innerHTML = `<div class="daily-claimed-badge">✅ Reclamado hoy · Vuelve mañana</div>`;
      if (subEl) subEl.textContent = 'Has reclamado tu Daily Drop de hoy. El próximo estará disponible a las 00:00:00 (Hora peninsular española).';
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
            <button class="btn-tune" onclick="openTuningStudio('${car.id}')">🔧 TUNEAR / BUILDS</button>
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
            <button class="btn-tune" style="opacity:0.4;cursor:not-allowed;" onclick="alert('🔒 Desbloquea este coche en tu Garaje primero para poder personalizarlo.')">🔒 BLOQUEADO</button>
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

  window.handleClaimDailyReward = async function() {
    const btn = $('btnClaimDrop');
    if (btn) { btn.disabled = true; btn.textContent = 'Abriendo Daily Drop...'; }
    try {
      const res = await window.SSCARS_AUTH.claimDailyReward();
      if (res && res.success) {
        openDailyRewardModal(res);
      } else if (res && res.alreadyClaimed) {
        alert(res.message || 'Ya has reclamado tu recompensa de hoy.');
      }
      loadGarageData();
    } catch (err) {
      alert(err.message || 'Error al reclamar recompensa diaria');
      if (btn) { btn.disabled = false; btn.textContent = '🎁 Abrir Recompensa'; }
    }
  };

  window.openDailyRewardModal = function(data) {
    const modal = $('dailyRewardModal');
    if (!modal) return;

    const reward = data.reward || {};
    const xp = data.xp || {};
    const isGold = Boolean(reward.isGold);
    const isCard = reward.type === 'card';

    const iconEl = $('rewardModalIcon');
    const titleEl = $('rewardModalTitle');
    const descEl = $('rewardModalDesc');
    const cardWrap = $('rewardModalCardWrap');
    const cardBadge = $('rewardModalCardBadge');
    const cardName = $('rewardModalCardName');
    const cardModel = $('rewardModalCardModel');
    const cardCode = $('rewardModalCardCode');
    const xpEl = $('rewardModalXp');
    const streakEl = $('rewardModalStreak');

    if (isGold) {
      if (iconEl) iconEl.textContent = '✨';
      if (titleEl) titleEl.textContent = '¡GOLD CHROME DROP!';
      if (descEl) descEl.textContent = '¡Increíble! Has desbloqueado una carta secreta Gold Chrome.';
    } else if (isCard) {
      if (iconEl) iconEl.textContent = '🃏';
      if (titleEl) titleEl.textContent = '¡Nueva Carta Desbloqueada!';
      if (descEl) descEl.textContent = 'Se ha añadido un nuevo coche a tu Garaje y álbum de colección.';
    } else {
      if (iconEl) iconEl.textContent = '⚡';
      if (titleEl) titleEl.textContent = '¡Experiencia Obtenida!';
      if (descEl) descEl.textContent = reward.note || 'Has recibido tu bonus de conexión diaria.';
    }

    if (cardWrap) {
      if (isCard) {
        cardWrap.style.display = 'block';
        cardWrap.className = 'reward-card-preview' + (isGold ? ' is-gold' : '');
        if (cardBadge) cardBadge.textContent = isGold ? '✨ EDICIÓN GOLD CHROME' : (reward.rarity ? reward.rarity.toUpperCase() : 'NUEVA CARTA');
        if (cardName) cardName.textContent = reward.carName || 'Vehículo JDM';
        if (cardModel) cardModel.textContent = reward.code || '';
        if (cardCode) cardCode.textContent = 'Añadida a tu colección';
      } else {
        cardWrap.style.display = 'none';
      }
    }

    if (xpEl) xpEl.textContent = `+${xp.awarded || 50} XP`;
    if (streakEl) streakEl.textContent = `🔥 Racha de ${data.streak || 1} día(s)`;

    modal.classList.add('open');
  };

  window.closeDailyRewardModal = function() {
    const modal = $('dailyRewardModal');
    if (modal) modal.classList.remove('open');
    loadGarageData();
  };

  // ============================================================================
  // TUNING STUDIO & BUILDS MANAGER
  // ============================================================================

  let allTuningParts = [];
  let userBuildsList = [];
  let currentTuningCar = null;
  let selectedParts = {
    wheels: 'wheels-stock',
    paint: 'paint-stock',
    spoiler: 'spoiler-stock',
    exhaust: 'exhaust-stock',
    body_kit: 'bodykit-stock'
  };
  let activeEditingBuildId = null;

  window.openTuningStudio = async function(carId) {
    const car = currentCars.find(c => c.id === carId);
    if (!car) return;

    // Verificar ownership en frontend antes de abrir
    const isOwned = currentUserCards.some(uc => uc.cards && uc.cards.car_id === carId);
    if (!isOwned) {
      alert('🔒 Desbloquea este coche en tu Garaje primero para poder personalizarlo.');
      return;
    }

    currentTuningCar = car;
    activeEditingBuildId = null;
    selectedParts = {
      wheels: 'wheels-stock',
      paint: 'paint-stock',
      spoiler: 'spoiler-stock',
      exhaust: 'exhaust-stock',
      body_kit: 'bodykit-stock'
    };

    const modal = $('tuningModal');
    if (modal) modal.classList.add('open');

    // Cargar piezas y builds si no están cargados
    try {
      const [parts, builds] = await Promise.all([
        window.SSCARS_AUTH.getTuningParts().catch(() => getFallbackTuningParts()),
        window.SSCARS_AUTH.getUserBuilds().catch(() => [])
      ]);
      allTuningParts = parts && parts.length ? parts : getFallbackTuningParts();
      userBuildsList = builds || [];
    } catch (e) {
      allTuningParts = getFallbackTuningParts();
      userBuildsList = [];
    }

    renderTuningStudio();
  };

  window.closeTuningStudio = function() {
    const modal = $('tuningModal');
    if (modal) modal.classList.remove('open');
    currentTuningCar = null;
    activeEditingBuildId = null;
  };

  function renderTuningStudio() {
    if (!currentTuningCar) return;

    const thumb = $('tuneCarThumb');
    const nameEl = $('tuneCarName');
    const modelEl = $('tuneCarModel');
    const nameInput = $('buildNameInput');

    if (thumb) {
      const img = currentTuningCar.images && currentTuningCar.images.front ? currentTuningCar.images.front : `images/${currentTuningCar.slug}-front.webp`;
      thumb.innerHTML = `<img src="${img}" alt="${currentTuningCar.name}">`;
    }
    if (nameEl) nameEl.textContent = currentTuningCar.name;
    if (modelEl) modelEl.textContent = `${currentTuningCar.real_model} (${currentTuningCar.year})`;
    if (nameInput) nameInput.value = `Custom ${currentTuningCar.name}`;

    // Renderizar categorías de piezas
    const categoriesWrap = $('tuningCategoriesWrap');
    if (categoriesWrap) {
      const categories = [
        { key: 'wheels', label: '🛞 Llantas (Wheels)' },
        { key: 'paint', label: '🎨 Pintura (Paint)' },
        { key: 'spoiler', label: '🏎️ Alerón (Spoiler)' },
        { key: 'exhaust', label: '💨 Escape (Exhaust)' },
        { key: 'body_kit', label: '📐 Kit de Carrocería (Body Kit)' }
      ];

      const userProfile = window.SSCARS_AUTH.getUser() ? (window.SSCARS_AUTH.getProfile() || { xp: 0 }) : { xp: 0 };
      const currentXp = Number(userProfile.xp || 0);

      categoriesWrap.innerHTML = categories.map(cat => {
        const partsInCat = allTuningParts.filter(p => p.category === cat.key);
        return `
          <div>
            <div class="tuning-cat-title">${cat.label}</div>
            <div class="parts-row">
              ${partsInCat.map(p => {
                const isSelected = selectedParts[cat.key] === p.slug;
                const isLocked = p.xp_required > currentXp;
                return `
                  <button class="part-btn ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}" 
                          onclick="selectTuningPart('${cat.key}', '${p.slug}', ${p.xp_required})">
                    <span>${p.name}</span>
                    <span class="part-xp-tag">${p.xp_required > 0 ? (isLocked ? '🔒 ' + p.xp_required + ' XP' : p.xp_required + ' XP') : 'Gratis'}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('');
    }

    updateTuningStatsPreview();
    renderSavedBuildsList();
  }

  window.selectTuningPart = function(category, slug, xpRequired) {
    const profile = window.SSCARS_AUTH.getUser() ? (window.SSCARS_AUTH.getProfile() || { xp: 0 }) : { xp: 0 };
    if (xpRequired > (profile.xp || 0)) {
      alert(`🔒 Requiere ${xpRequired} XP. Consigue más experiencia en el Daily Drop para desbloquear esta pieza.`);
      return;
    }
    selectedParts[category] = slug;
    renderTuningStudio();
  };

  function updateTuningStatsPreview() {
    if (!currentTuningCar) return;

    const base = currentTuningCar.base_stats || {};
    let hp = base.hp || 280;
    let accel = base.acceleration_0_100 || 5.0;
    let handling = base.handling || 90;
    let style = 0;

    let modHp = 0;
    let modAccel = 0;
    let modHandling = 0;

    Object.values(selectedParts).forEach(slug => {
      const part = allTuningParts.find(p => p.slug === slug);
      if (part && part.stats_modifier) {
        const m = part.stats_modifier;
        if (m.hp) { hp += m.hp; modHp += m.hp; }
        if (m.acceleration_0_100) { accel += m.acceleration_0_100; modAccel += m.acceleration_0_100; }
        if (m.handling) { handling += m.handling; modHandling += m.handling; }
        if (m.style) { style += m.style; }
      }
    });

    accel = Math.max(2.0, Math.round(accel * 10) / 10);
    handling = Math.min(100, Math.max(1, handling));

    const hpEl = $('tstatHp');
    const hpModEl = $('tstatHpMod');
    const accEl = $('tstatAccel');
    const accModEl = $('tstatAccelMod');
    const hanEl = $('tstatHandling');
    const hanModEl = $('tstatHandlingMod');
    const styEl = $('tstatStyle');

    if (hpEl) hpEl.textContent = hp;
    if (hpModEl) hpModEl.textContent = modHp > 0 ? `(+${modHp})` : '';
    if (accEl) accEl.textContent = accel.toFixed(1);
    if (accModEl) accModEl.textContent = modAccel < 0 ? `(${modAccel.toFixed(1)})` : '';
    if (hanEl) hanEl.textContent = handling;
    if (hanModEl) hanModEl.textContent = modHandling > 0 ? `(+${modHandling})` : '';
    if (styEl) styEl.textContent = style;
  }

  function renderSavedBuildsList() {
    const listEl = $('savedBuildsList');
    if (!listEl || !currentTuningCar) return;

    const buildsForThisCar = userBuildsList.filter(b => b.car_id === currentTuningCar.id);
    if (buildsForThisCar.length === 0) {
      listEl.innerHTML = `<p style="font-size: 12px; color: var(--text-muted);">No tienes builds guardadas aún para este modelo.</p>`;
      return;
    }

    listEl.innerHTML = buildsForThisCar.map(b => {
      const stats = b.stats || {};
      return `
        <div class="saved-build-item">
          <div>
            <div style="font-size: 14px; font-weight: 800;">${b.name}</div>
            <div style="font-size: 11px; color: var(--text-muted);">
              ${stats.hp || '-'} CV · ${stats.acceleration_0_100 || '-'}s · ${stats.handling || '-'}/100
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn-secondary" style="font-size: 11px; padding: 4px 8px;" onclick="loadSavedBuild('${b.id}')">Cargar</button>
            <button class="btn-secondary" style="font-size: 11px; padding: 4px 8px; color: var(--gold); border-color: rgba(255,215,0,0.3);" onclick="handleSnapshotClick('${b.id}')">📸 Snapshot</button>
            <button class="btn-secondary btn-logout" style="font-size: 11px; padding: 4px 8px;" onclick="handleDeleteBuildClick('${b.id}')">✕</button>
          </div>
        </div>
      `;
    }).join('');
  }

  window.loadSavedBuild = function(buildId) {
    const build = userBuildsList.find(b => b.id === buildId);
    if (!build) return;

    activeEditingBuildId = build.id;
    const nameInput = $('buildNameInput');
    if (nameInput) nameInput.value = build.name;

    const parts = build.parts || {};
    selectedParts = {
      wheels: parts.wheels || 'wheels-stock',
      paint: parts.paint || 'paint-stock',
      spoiler: parts.spoiler || 'spoiler-stock',
      exhaust: parts.exhaust || 'exhaust-stock',
      body_kit: parts.body_kit || 'bodykit-stock'
    };

    renderTuningStudio();
  };

  window.handleSaveBuildClick = async function() {
    if (!currentTuningCar) return;
    const nameInput = $('buildNameInput');
    const buildName = (nameInput?.value || '').trim() || `Custom ${currentTuningCar.name}`;
    const partSlugs = Object.values(selectedParts);

    const btn = $('btnSaveBuild');
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando en Servidor...'; }

    try {
      const res = await window.SSCARS_AUTH.saveBuild({
        carId: currentTuningCar.id,
        name: buildName,
        partSlugs: partSlugs,
        buildId: activeEditingBuildId
      });

      if (res && res.success) {
        alert('✅ ¡Build guardada exitosamente en tu Garaje!');
        userBuildsList = await window.SSCARS_AUTH.getUserBuilds();
        renderTuningStudio();
      }
    } catch (err) {
      alert(`❌ Error al guardar build: ${err.message}`);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar Build'; }
    }
  };

  window.handleSnapshotClick = async function(specificBuildId) {
    let targetBuildId = specificBuildId || activeEditingBuildId;
    if (!targetBuildId) {
      alert('Debes guardar la Build primero antes de crear su Snapshot inmutable.');
      return;
    }

    const btn = $('btnCreateSnapshot');
    if (btn) { btn.disabled = true; btn.textContent = 'Creando Snapshot & Render...'; }

    try {
      // 1. Crear Snapshot inmutable
      const snapRes = await window.SSCARS_AUTH.createBuildSnapshot(targetBuildId);
      if (snapRes && snapRes.success && snapRes.snapshot) {
        // 2. Solicitar Render determinista para el Snapshot
        const renderRes = await window.SSCARS_AUTH.requestBuildRender(snapRes.snapshot.id);
        alert('📸 ¡Snapshot inmutable creado y Render HD generado con éxito!');
        if (renderRes && renderRes.job) {
          openCarCardModal(snapRes.snapshot, renderRes.job);
        }
      }
    } catch (err) {
      alert(`❌ Error al procesar snapshot/render: ${err.message}`);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '📸 Crear Snapshot Inmutable'; }
    }
  };

  window.openCarCardModal = function(snapshot, renderJob) {
    const modal = $('carCardModal');
    if (!modal) return;

    const buildData = snapshot.build_data || {};
    const stats = snapshot.stats || {};
    const parts = buildData.parts || {};
    const profile = window.SSCARS_AUTH.getUser() ? (window.SSCARS_AUTH.getProfile() || {}) : {};

    const nameEl = $('hdCardCarName');
    const modelEl = $('hdCardModel');
    const buildNameEl = $('hdCardBuildName');
    const ownerEl = $('hdCardOwner');
    const hpEl = $('hdCardHp');
    const accEl = $('hdCardAccel');
    const hanEl = $('hdCardHandling');
    const styEl = $('hdCardStyle');
    const partsEl = $('hdCardPartsList');
    const hashEl = $('hdCardHash');

    if (nameEl) nameEl.textContent = buildData.car_name || currentTuningCar?.name || 'Vehículo JDM';
    if (modelEl) modelEl.textContent = buildData.real_model || currentTuningCar?.real_model || '';
    if (buildNameEl) buildNameEl.textContent = `"${buildData.build_name || 'Custom Build'}"`;
    if (ownerEl) ownerEl.textContent = `Propietario: @${profile.username || 'driver'}`;

    if (hpEl) hpEl.textContent = stats.hp || '-';
    if (accEl) accEl.textContent = (stats.acceleration_0_100 ? stats.acceleration_0_100.toFixed(1) : '-') + 's';
    if (hanEl) hanEl.textContent = stats.handling || '-';
    if (styEl) styEl.textContent = stats.style_points || 0;

    if (partsEl) {
      partsEl.innerHTML = `
        <div>🛞 <b>Llantas:</b> ${parts.wheels || 'De serie'}</div>
        <div>🎨 <b>Pintura:</b> ${parts.paint || 'De serie'}</div>
        <div>🏎️ <b>Alerón:</b> ${parts.spoiler || 'De serie'}</div>
        <div>💨 <b>Escape:</b> ${parts.exhaust || 'De serie'}</div>
        <div>📐 <b>Carrocería:</b> ${parts.body_kit || 'De serie'}</div>
      `;
    }

    if (hashEl) {
      hashEl.textContent = `RENDER KEY: ${renderJob?.render_key || 'DETERMINISTIC-KEY-v1.0.0'} · PATH: ${renderJob?.storage_path || 'build-renders/...'}`;
    }

    modal.classList.add('open');
  };

  window.closeCarCardModal = function() {
    const modal = $('carCardModal');
    if (modal) modal.classList.remove('open');
  };

  window.handleDeleteBuildClick = async function(buildId) {
    if (!confirm('¿Seguro que deseas eliminar esta build de tu garaje?')) return;
    try {
      await window.SSCARS_AUTH.deleteBuild(buildId);
      userBuildsList = await window.SSCARS_AUTH.getUserBuilds();
      if (activeEditingBuildId === buildId) activeEditingBuildId = null;
      renderTuningStudio();
    } catch (err) {
      alert(`Error al eliminar build: ${err.message}`);
    }
  };

  function getFallbackTuningParts() {
    return [
      { category: 'wheels', name: 'Llantas de Serie', slug: 'wheels-stock', xp_required: 0, stats_modifier: { hp: 0, handling: 0, style: 0 } },
      { category: 'wheels', name: 'Llantas Street Rays TE37', slug: 'wheels-street', xp_required: 100, stats_modifier: { hp: 0, handling: 2, style: 4 } },
      { category: 'wheels', name: 'Llantas Competición Magnesio', slug: 'wheels-racing', xp_required: 500, stats_modifier: { hp: 0, handling: 5, style: 8 } },
      { category: 'paint', name: 'Pintura Original de Fábrica', slug: 'paint-stock', xp_required: 0, stats_modifier: { hp: 0, handling: 0, style: 0 } },
      { category: 'paint', name: 'Midnight Purple III', slug: 'paint-midnight-purple', xp_required: 250, stats_modifier: { hp: 0, handling: 0, style: 8 } },
      { category: 'paint', name: 'Negro Carbón Satinado', slug: 'paint-carbon-black', xp_required: 150, stats_modifier: { hp: 0, handling: 0, style: 5 } },
      { category: 'paint', name: 'Blanco Campeonato Type R', slug: 'paint-championship-white', xp_required: 100, stats_modifier: { hp: 0, handling: 0, style: 4 } },
      { category: 'paint', name: 'Rojo Fórmula GT', slug: 'paint-formula-red', xp_required: 100, stats_modifier: { hp: 0, handling: 0, style: 4 } },
      { category: 'spoiler', name: 'Alerón de Serie', slug: 'spoiler-stock', xp_required: 0, stats_modifier: { hp: 0, handling: 0, style: 0 } },
      { category: 'spoiler', name: 'Ducktail Callejero', slug: 'spoiler-ducktail', xp_required: 150, stats_modifier: { hp: 0, handling: 2, style: 5 } },
      { category: 'spoiler', name: 'Alerón GT de Carbono Alto', slug: 'spoiler-gt-wing', xp_required: 400, stats_modifier: { hp: 0, handling: 6, style: 7 } },
      { category: 'exhaust', name: 'Línea de Escape de Serie', slug: 'exhaust-stock', xp_required: 0, stats_modifier: { hp: 0, acceleration_0_100: 0.0, style: 0 } },
      { category: 'exhaust', name: 'Escape Deportivo Inox', slug: 'exhaust-sport', xp_required: 150, stats_modifier: { hp: 5, acceleration_0_100: -0.1, style: 3 } },
      { category: 'exhaust', name: 'Línea Completa de Titanio', slug: 'exhaust-titanium', xp_required: 600, stats_modifier: { hp: 12, acceleration_0_100: -0.2, style: 8 } },
      { category: 'body_kit', name: 'Carrocería de Serie', slug: 'bodykit-stock', xp_required: 0, stats_modifier: { hp: 0, handling: 0, style: 0 } },
      { category: 'body_kit', name: 'Splitter y Taloneras Street', slug: 'bodykit-street', xp_required: 200, stats_modifier: { hp: 0, handling: 3, style: 6 } },
      { category: 'body_kit', name: 'Kit Ensanchado Widebody GT', slug: 'bodykit-widebody', xp_required: 750, stats_modifier: { hp: 0, handling: 7, style: 12 } }
    ];
  }

})();
