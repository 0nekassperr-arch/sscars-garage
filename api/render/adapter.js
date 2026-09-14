/**
 * SSCARS GARAGE 2.0 — Capa de Renderizado Desacoplada
 * Define la interfaz canónica del RendererAdapter y la implementación determinista MockRenderer.
 * 
 * PRINCIPIO FUNDAMENTAL:
 * El renderer consume exclusivamente un `build_snapshot` inmutable, NUNCA el build actual.
 */

import crypto from 'crypto';

/**
 * Interfaz base de Adaptador de Render
 */
export class RendererAdapter {
  constructor(providerName, version = '1.0.0') {
    this.provider = providerName;
    this.version = version;
  }

  /**
   * Genera la clave de render determinista a partir del contenido inmutable del snapshot
   */
  generateRenderKey(snapshot) {
    const canonicalData = JSON.stringify({
      snapshotId: snapshot.id,
      version: snapshot.snapshot_version || 1,
      carId: snapshot.car_id,
      buildData: snapshot.build_data,
      stats: snapshot.stats,
      provider: this.provider,
      rendererVersion: this.version
    });
    return crypto.createHash('sha256').update(canonicalData).digest('hex');
  }

  /**
   * Genera el path determinista en Supabase Storage
   */
  generateStoragePath(userId, snapshotId) {
    return `build-renders/${userId}/${snapshotId}/${this.version}/render.png`;
  }

  /**
   * Método de renderizado a implementar por adaptadores específicos
   */
  async renderSnapshot(snapshot, userId) {
    throw new Error('Método renderSnapshot() debe ser implementado por la subclase');
  }
}

/**
 * MockRenderer: Implementación determinista para pruebas y desarrollo
 * Genera la representación visual y metadatos de la Car Card HD sin costes de API ni dependencias externas.
 */
export class MockRenderer extends RendererAdapter {
  constructor() {
    super('mock', '1.0.0');
  }

  async renderSnapshot(snapshot, userId) {
    if (!snapshot || !snapshot.id || !snapshot.build_data) {
      throw new Error('Snapshot inválido o incompleto para renderizado');
    }

    const renderKey = this.generateRenderKey(snapshot);
    const storagePath = this.generateStoragePath(userId, snapshot.id);
    const buildData = snapshot.build_data;
    const stats = snapshot.stats || {};
    const parts = buildData.parts || {};

    // Composición determinista de metadatos de la Car Card HD
    const cardData = {
      cardType: 'car_card_hd',
      renderKey,
      storagePath,
      provider: this.provider,
      version: this.version,
      dimensions: { width: 2048, height: 2048 },
      mimeType: 'image/png',
      car: {
        id: snapshot.car_id,
        name: buildData.car_name || 'Vehículo JDM',
        realModel: buildData.real_model || ''
      },
      build: {
        id: snapshot.build_id,
        name: buildData.build_name || 'Custom Build',
        parts: {
          wheels: parts.wheels || 'wheels-stock',
          paint: parts.paint || 'paint-stock',
          spoiler: parts.spoiler || 'spoiler-stock',
          exhaust: parts.exhaust || 'exhaust-stock',
          bodyKit: parts.body_kit || 'bodykit-stock'
        }
      },
      stats: {
        hp: stats.hp || 280,
        topSpeedKmh: stats.top_speed_kmh || 250,
        acceleration0100: stats.acceleration_0_100 || 5.0,
        handling: stats.handling || 90,
        stylePoints: stats.style_points || 0
      },
      timestamp: new Date().toISOString()
    };

    return {
      success: true,
      renderKey,
      storagePath,
      width: 2048,
      height: 2048,
      mimeType: 'image/png',
      metadata: cardData
    };
  }
}
