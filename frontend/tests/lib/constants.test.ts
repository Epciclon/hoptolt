import { describe, it, expect } from 'vitest';
import {
  CAGE_TYPES,
  CAGE_CAPACITY,
  RABBIT_SEXES,
  RABBIT_PURPOSES,
  RABBIT_MAX_WEIGHT,
  RABBIT_MAX_AGE,
  VACCINE_TYPES,
  MORTALITY_CAUSES,
  USER_ROLES,
} from '@/lib/constants';

describe('Constants', () => {
  describe('CAGE_TYPES', () => {
    it('has correct values', () => {
      expect(CAGE_TYPES).toEqual(['engorde', 'reproducción']);
    });
  });

  describe('CAGE_CAPACITY', () => {
    it('has correct min/max per type', () => {
      expect(CAGE_CAPACITY.engorde).toEqual({ min: 1, max: 6 });
      expect(CAGE_CAPACITY.reproducción).toEqual({ min: 1, max: 1 });
    });
  });

  describe('RABBIT_SEXES', () => {
    it('has macho and hembra', () => {
      expect(RABBIT_SEXES).toEqual(['macho', 'hembra']);
    });
  });

  describe('RABBIT_PURPOSES', () => {
    it('has engorde and reproducción', () => {
      expect(RABBIT_PURPOSES).toEqual(['Reproducción', 'Engorde']);
    });
  });

  describe('RABBIT_MAX_WEIGHT', () => {
    it('is a positive number', () => {
      expect(RABBIT_MAX_WEIGHT).toBe(4.5);
    });
  });

  describe('RABBIT_MAX_AGE', () => {
    it('is a positive number', () => {
      expect(RABBIT_MAX_AGE).toBe(18);
    });
  });

  describe('VACCINE_TYPES', () => {
    it('exists and is an array', () => {
      expect(Array.isArray(VACCINE_TYPES)).toBe(true);
      expect(VACCINE_TYPES.length).toBeGreaterThan(0);
    });

    it('contains expected vaccines', () => {
      expect(VACCINE_TYPES).toContain('mixomatosis');
      expect(VACCINE_TYPES).toContain('hemorrágica vírica (VHD)');
    });
  });

  describe('MORTALITY_CAUSES', () => {
    it('exists and is an array', () => {
      expect(Array.isArray(MORTALITY_CAUSES)).toBe(true);
      expect(MORTALITY_CAUSES.length).toBeGreaterThan(0);
    });

    it('contains expected causes', () => {
      expect(MORTALITY_CAUSES).toContain('enfermedad');
      expect(MORTALITY_CAUSES).toContain('accidente');
      expect(MORTALITY_CAUSES).toContain('depredador');
      expect(MORTALITY_CAUSES).toContain('edad');
      expect(MORTALITY_CAUSES).toContain('sacrificio');
      expect(MORTALITY_CAUSES).toContain('otra');
    });
  });

  describe('USER_ROLES', () => {
    it('has correct roles', () => {
      expect(USER_ROLES).toEqual(['Propietario', 'Administrador', 'Trabajador']);
    });
  });
});
