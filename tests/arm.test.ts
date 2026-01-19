import { describe, it, expect } from 'vitest';
import { parseARM } from '../src/lib/arm';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('ARM Parser', () => {
  it('should parse a real .arm file correctly', () => {
    const fixturePath = join(__dirname, 'fixtures', 'cavernwall_cv_01.arm');
    const content = readFileSync(fixturePath, 'utf-8');
    
    const result = parseARM(content);
    
    // Basic assertions based on the fixture content
    expect(result.version).toBe(36);
    expect(result.strings.length).toBe(7);
    expect(result.strings[0]).toBe('Metadata/Terrain/black_inside_wall.gt');
    
    expect(result.root_slot.width).toBe(9);
    expect(result.root_slot.height).toBe(9);
    
    // Check grid dimensions
    expect(result.grid.length).toBe(9);
    result.grid.forEach(row => {
      expect(row.length).toBe(9);
    });
    
    // Check some specific cells if possible
    // Line 17 of fixture: k 1 1 2 2 2 2 1 3 1 3 1 3 1 3 1 0 1 0 0 0 0 0 0 0 ...
    const firstRow = result.grid[0];
    expect(firstRow[0].tag).toBe('k');
    if (firstRow[0].tag === 'k') {
      expect(firstRow[0].width).toBe(1);
      expect(firstRow[0].height).toBe(1);
    }

    // Check last cells of first row which are 's'
    expect(firstRow[6].tag).toBe('s');
    expect(firstRow[7].tag).toBe('s');
    expect(firstRow[8].tag).toBe('s');
  });

  it('should throw error on invalid format', () => {
    const invalidContent = "not a version line";
    expect(() => parseARM(invalidContent)).toThrow("Failed to find version");
  });
});
