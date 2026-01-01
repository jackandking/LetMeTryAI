import './points-system.js';

describe('womanai points system', () => {
  it('should expose core APIs', () => {
    expect(typeof window.PointsSystem.initialize).toBe('function');
    expect(typeof window.PointsSystem.awardUploadPoints).toBe('function');
    expect(typeof window.PointsSystem.viewItem).toBe('function');
  });

  it('should have config numbers', () => {
    expect(window.PointsSystem.POINTS_CONFIG.NEW_USER).toBeGreaterThan(0);
    expect(window.PointsSystem.POINTS_CONFIG.UPLOAD_IMAGE).toBeGreaterThan(0);
  });
});
