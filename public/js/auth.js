/**
 * SSCARS GARAGE 2.0 — Cliente de Autenticación y Colección (Supabase Auth)
 * Gestiona sesión persistente, registro, login, logout, recuperación de contraseña,
 * perfil y sincronización de cartas del garaje.
 * 
 * REGLAS DE SEGURIDAD:
 * - Utiliza únicamente URL y Anon Key públicas.
 * - NUNCA expone ni requiere claves privadas de servidor.
 * - La identidad del usuario se verifica mediante el Bearer JWT Token.
 */

(function(window) {
  'use strict';

  const STORAGE_KEY = 'sscars_auth_session_v2';
  const config = window.__SSCARS_SUPABASE_CONFIG__ || {
    url: 'https://lxvxgjozudqdlrnoulfx.supabase.co',
    anonKey: ''
  };

  let currentSession = null;
  const authListeners = [];

  function getBaseUrl() {
    return (config.url || '').replace(/\/$/, '');
  }

  function getAnonKey() {
    return config.anonKey || '';
  }

  function saveSession(session) {
    currentSession = session;
    try {
      if (session) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn('No se pudo guardar la sesión en localStorage:', e);
    }
    notifyListeners();
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        currentSession = JSON.parse(raw);
        // Comprobar expiración básica del token
        if (currentSession && currentSession.expires_at) {
          const now = Math.floor(Date.now() / 1000);
          if (now >= currentSession.expires_at) {
            // Token expirado, intentar refrescar
            refreshSession();
          }
        }
      }
    } catch (e) {
      currentSession = null;
    }
    notifyListeners();
    return currentSession;
  }

  function notifyListeners() {
    authListeners.forEach(fn => {
      try { fn(currentSession); } catch (err) { console.error('Auth listener error:', err); }
    });
    window.dispatchEvent(new CustomEvent('sscars:auth-change', { detail: { session: currentSession } }));
  }

  async function authFetch(path, options = {}) {
    const url = `${getBaseUrl()}/auth/v1/${path.replace(/^\//, '')}`;
    const headers = {
      'apikey': getAnonKey(),
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (currentSession && currentSession.access_token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${currentSession.access_token}`;
    }

    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = translateAuthError(data?.error_description || data?.msg || data?.message || `Error ${res.status}`);
      throw new Error(msg);
    }
    return data;
  }

  async function restFetch(path, options = {}) {
    const url = `${getBaseUrl()}/rest/v1/${path.replace(/^\//, '')}`;
    const headers = {
      'apikey': getAnonKey(),
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options.headers || {})
    };

    if (currentSession && currentSession.access_token) {
      headers['Authorization'] = `Bearer ${currentSession.access_token}`;
    }

    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      if (res.status === 401 && currentSession) {
        // Token inválido o revocado en Supabase: intentar refrescar o cerrar sesión
        const refreshed = await Auth.refreshSession();
        if (!refreshed) {
          saveSession(null);
        }
      }
      const msg = data?.message || data?.error || `Error ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  function translateAuthError(msg) {
    if (!msg) return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
    const lower = msg.toLowerCase();
    if (lower.includes('invalid login credentials') || lower.includes('invalid_grant')) {
      return 'Correo o contraseña incorrectos.';
    }
    if (lower.includes('user already registered') || lower.includes('already exists')) {
      return 'Ya existe una cuenta con este correo electrónico.';
    }
    if (lower.includes('password should be at least')) {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }
    if (lower.includes('rate limit')) {
      return 'Demasiados intentos. Espera unos minutos antes de volver a probar.';
    }
    return msg;
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS DE AUTH
  // ============================================================================

  const Auth = {
    /**
     * Inicializa la sesión al cargar la página
     */
    init() {
      return loadSession();
    },

    /**
     * Suscribe una función a los cambios de estado de autenticación
     */
    onAuthStateChange(callback) {
      if (typeof callback === 'function') {
        authListeners.push(callback);
        callback(currentSession);
      }
      return () => {
        const idx = authListeners.indexOf(callback);
        if (idx !== -1) authListeners.splice(idx, 1);
      };
    },

    /**
     * Obtiene la sesión actual
     */
    getSession() {
      return currentSession;
    },

    /**
     * Obtiene el usuario autenticado
     */
    getUser() {
      return currentSession?.user || null;
    },

    /**
     * Comprueba si hay una sesión activa
     */
    isAuthenticated() {
      return Boolean(currentSession && currentSession.access_token);
    },

    /**
     * Registro con Email y Contraseña
     */
    async signUp({ email, password, username, displayName }) {
      if (!email || !password) throw new Error('Debes indicar un correo y contraseña.');
      if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');

      const data = await authFetch('signup', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          data: {
            username: (username || '').trim() || undefined,
            full_name: (displayName || '').trim() || undefined
          }
        })
      });

      if (data && data.access_token) {
        saveSession(data);
      }
      return data;
    },

    /**
     * Inicio de sesión con Email y Contraseña
     */
    async signIn({ email, password }) {
      if (!email || !password) throw new Error('Debes indicar tu correo y contraseña.');

      const data = await authFetch('token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password
        })
      });

      if (data && data.access_token) {
        saveSession(data);
      }
      return data;
    },

    /**
     * Cierre de sesión seguro
     */
    async signOut() {
      try {
        if (currentSession && currentSession.access_token) {
          await authFetch('logout', { method: 'POST' }).catch(() => {});
        }
      } finally {
        saveSession(null);
      }
      return true;
    },

    /**
     * Solicitar recuperación de contraseña por email
     */
    async resetPassword(email) {
      if (!email) throw new Error('Indica tu correo electrónico.');
      return authFetch('recover', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase()
        })
      });
    },

    /**
     * Actualizar contraseña con token de recuperación activo
     */
    async updatePassword(newPassword) {
      if (!newPassword || newPassword.length < 6) {
        throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
      }
      return authFetch('user', {
        method: 'PUT',
        body: JSON.stringify({ password: newPassword })
      });
    },

    /**
     * Refresca el token JWT si existe refresh_token
     */
    async refreshSession() {
      if (!currentSession || !currentSession.refresh_token) return null;
      try {
        const data = await authFetch('token?grant_type=refresh_token', {
          method: 'POST',
          body: JSON.stringify({
            refresh_token: currentSession.refresh_token
          })
        });
        if (data && data.access_token) {
          saveSession(data);
          return data;
        }
      } catch (e) {
        console.warn('Fallo al refrescar sesión, cerrando:', e);
        saveSession(null);
      }
      return null;
    },

    /**
     * Obtiene el perfil del usuario autenticado desde Supabase (PostgreSQL)
     */
    async getProfile() {
      if (!this.isAuthenticated()) return null;
      const userId = this.getUser().id;
      const rows = await restFetch(`profiles?id=eq.${userId}&select=*`);
      return (rows && rows.length) ? rows[0] : null;
    },

    /**
     * Actualiza los campos permitidos del perfil (username, display_name, avatar_url)
     */
    async updateProfile({ username, displayName, avatarUrl }) {
      if (!this.isAuthenticated()) throw new Error('Debes iniciar sesión.');
      const userId = this.getUser().id;
      const payload = {};
      if (username !== undefined) payload.username = username.trim();
      if (displayName !== undefined) payload.display_name = displayName.trim();
      if (avatarUrl !== undefined) payload.avatar_url = avatarUrl ? avatarUrl.trim() : null;

      const updated = await restFetch(`profiles?id=eq.${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      return (updated && updated.length) ? updated[0] : null;
    },

    /**
     * Obtiene el catálogo de los 15 coches
     */
    async getCars() {
      return restFetch('cars?active=eq.true&order=number.asc');
    },

    /**
     * Reclama la recompensa diaria atómica server-side
     */
    async claimDailyReward() {
      if (!this.isAuthenticated()) throw new Error('Debes iniciar sesión para reclamar tu recompensa.');
      return restFetch('rpc/claim_daily_reward_atomic', { method: 'POST', body: '{}' });
    },

    /**
     * Consulta el estado de la recompensa diaria
     */
    async getDailyRewardStatus() {
      if (!this.isAuthenticated()) return { canClaim: false, isAuth: false };
      const profile = await this.getProfile();
      if (!profile) return { canClaim: false, isAuth: false };

      const nowMadrid = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      let alreadyClaimed = false;
      if (profile.last_daily_claim) {
        const lastMadrid = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(profile.last_daily_claim));
        alreadyClaimed = (nowMadrid === lastMadrid);
      }
      return {
        canClaim: !alreadyClaimed,
        isAuth: true,
        streak: profile.daily_streak || 0,
        lastClaimDate: profile.last_daily_claim,
        todayMadrid: nowMadrid
      };
    },

    /**
     * Obtiene las cartas poseídas por el usuario autenticado (user_cards con JOIN)
     */
    async getUserCollection() {
      if (!this.isAuthenticated()) return [];
      const userId = this.getUser().id;
      // Lectura aislada de user_cards protegida por RLS
      const userCards = await restFetch(`user_cards?user_id=eq.${userId}&select=id,card_id,obtained_at,source,metadata,cards(id,car_id,rarity,code,is_gold,cars(id,number,slug,name,real_model,year,base_stats,images))`);
      return userCards || [];
    },

    /**
     * Obtiene el catálogo de piezas de tuning activas
     */
    async getTuningParts() {
      return restFetch('tuning_parts?active=eq.true&order=category.asc,xp_required.asc');
    },

    /**
     * Obtiene las configuraciones/builds guardadas por el usuario
     */
    async getUserBuilds() {
      if (!this.isAuthenticated()) return [];
      const userId = this.getUser().id;
      return restFetch(`builds?user_id=eq.${userId}&select=*&order=updated_at.desc`);
    },

    /**
     * Guarda o actualiza un build validando ownership y XP en servidor
     */
    async saveBuild({ carId, name, partSlugs = [], buildId = null }) {
      if (!this.isAuthenticated()) throw new Error('Debes iniciar sesión para tunear tu coche.');
      return restFetch('rpc/save_build_atomic', {
        method: 'POST',
        body: JSON.stringify({
          p_car_id: carId,
          p_name: name,
          p_part_slugs: partSlugs,
          p_build_id: buildId || undefined
        })
      });
    },

    /**
     * Crea un snapshot inmutable a partir de un build
     */
    async createBuildSnapshot(buildId) {
      if (!this.isAuthenticated()) throw new Error('Debes iniciar sesión.');
      return restFetch('rpc/create_build_snapshot_atomic', {
        method: 'POST',
        body: JSON.stringify({ p_build_id: buildId })
      });
    },

    /**
     * Elimina un build propio
     */
    async deleteBuild(buildId) {
      if (!this.isAuthenticated()) throw new Error('Debes iniciar sesión.');
      return restFetch('rpc/delete_build_atomic', {
        method: 'POST',
        body: JSON.stringify({ p_build_id: buildId })
      });
    }
  };

  // Autoejecutar inicialización
  Auth.init();
  window.SSCARS_AUTH = Auth;

})(window);
