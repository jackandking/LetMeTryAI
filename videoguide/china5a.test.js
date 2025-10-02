/**
 * Unit tests for china5a.js
 * Tests the structure and content of the Chinese 5A scenic spots data
 */

let china5a;

describe('china5a Data Structure', () => {
  beforeAll(async () => {
    // Load china5a module using dynamic import for ES6 modules
    // Note: The file exports both module.exports (for Node.js CommonJS)
    // and window.china5a (for browser)
    try {
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const filePath = path.join(__dirname, 'china5a.js');
      const code = fs.readFileSync(filePath, 'utf-8');
      
      // Execute the code in a context that provides module.exports
      const module = { exports: {} };
      const func = new Function('module', 'exports', code);
      func(module, module.exports);
      china5a = module.exports;
    } catch (error) {
      // Fallback: if the above doesn't work, try creating a mock window object
      global.window = {};
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const filePath = path.join(__dirname, 'china5a.js');
      const code = fs.readFileSync(filePath, 'utf-8');
      eval(code);
      china5a = global.window.china5a;
    }
  });

  it('should be an object with province keys', () => {
    expect(typeof china5a).toBe('object');
    expect(china5a).not.toBeNull();
  });

  it('should have Zhejiang province', () => {
    expect(china5a).toHaveProperty('浙江');
    expect(Array.isArray(china5a['浙江'])).toBe(true);
  });

  it('should have valid structure for all scenic spots', () => {
    for (const province in china5a) {
      expect(Array.isArray(china5a[province])).toBe(true);
      
      china5a[province].forEach(spot => {
        expect(spot).toHaveProperty('name');
        expect(spot).toHaveProperty('latitude');
        expect(spot).toHaveProperty('longitude');
        
        expect(typeof spot.name).toBe('string');
        expect(typeof spot.latitude).toBe('number');
        expect(typeof spot.longitude).toBe('number');
        
        // Validate coordinate ranges
        expect(spot.latitude).toBeGreaterThanOrEqual(-90);
        expect(spot.latitude).toBeLessThanOrEqual(90);
        expect(spot.longitude).toBeGreaterThanOrEqual(-180);
        expect(spot.longitude).toBeLessThanOrEqual(180);
      });
    }
  });

  describe('Huzhou Science and Technology Museum', () => {
    it('should include 湖州科技馆 in Zhejiang province', () => {
      const zhejiangSpots = china5a['浙江'];
      const huzhouMuseum = zhejiangSpots.find(spot => spot.name === '湖州科技馆');
      
      expect(huzhouMuseum).toBeDefined();
      expect(huzhouMuseum.name).toBe('湖州科技馆');
    });

    it('should have valid coordinates for 湖州科技馆', () => {
      const zhejiangSpots = china5a['浙江'];
      const huzhouMuseum = zhejiangSpots.find(spot => spot.name === '湖州科技馆');
      
      expect(huzhouMuseum.latitude).toBeCloseTo(30.8703, 2);
      expect(huzhouMuseum.longitude).toBeCloseTo(120.0933, 2);
    });

    it('should be located near other Huzhou attractions', () => {
      const zhejiangSpots = china5a['浙江'];
      const huzhouMuseum = zhejiangSpots.find(spot => spot.name === '湖州科技馆');
      const nanxunAncientTown = zhejiangSpots.find(spot => spot.name === '湖州市南浔古镇景区');
      
      expect(huzhouMuseum).toBeDefined();
      expect(nanxunAncientTown).toBeDefined();
      
      // Both should be in Huzhou area (similar latitude)
      expect(Math.abs(huzhouMuseum.latitude - nanxunAncientTown.latitude)).toBeLessThan(1);
      expect(Math.abs(huzhouMuseum.longitude - nanxunAncientTown.longitude)).toBeLessThan(1);
    });
  });

  describe('Regression Tests', () => {
    it('should maintain all existing entries', () => {
      // Check that major provinces exist
      const majorProvinces = ['北京', '上海', '浙江', '江苏', '广东', '四川'];
      majorProvinces.forEach(province => {
        expect(china5a).toHaveProperty(province);
        expect(china5a[province].length).toBeGreaterThan(0);
      });
    });

    it('should not have duplicate names within same province', () => {
      for (const province in china5a) {
        const names = china5a[province].map(spot => spot.name);
        const uniqueNames = new Set(names);
        expect(names.length).toBe(uniqueNames.size);
      }
    });

    it('should maintain Shanghai Science Museum entry', () => {
      const shanghaiSpots = china5a['上海'];
      const shanghaiMuseum = shanghaiSpots.find(spot => spot.name === '上海科技馆');
      expect(shanghaiMuseum).toBeDefined();
    });
  });

  describe('Data Quality', () => {
    it('should have no empty names', () => {
      for (const province in china5a) {
        china5a[province].forEach(spot => {
          expect(spot.name.trim()).not.toBe('');
        });
      }
    });

    it('should have reasonable coordinates for China', () => {
      for (const province in china5a) {
        china5a[province].forEach(spot => {
          // China's approximate coordinates
          expect(spot.latitude).toBeGreaterThanOrEqual(18);
          expect(spot.latitude).toBeLessThanOrEqual(54);
          expect(spot.longitude).toBeGreaterThanOrEqual(73);
          expect(spot.longitude).toBeLessThanOrEqual(135);
        });
      }
    });
  });
});
