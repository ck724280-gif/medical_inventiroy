import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateScheduleHPrescription } from '../tier1-feature-coverage/r7-schedule-h.test.js';

export function runR7ScheduleHBoundsTests() {
  describe('Tier 2 - R7: Schedule H Compliance Register (Boundary & Corner Cases)', () => {
    it('R7-BND-1: should reject whitespace-only doctor names and doctor reg nos', () => {
      const res = validateScheduleHPrescription({
        scheduleType: 'SCHEDULE_H',
        doctorName: '    ',
        doctorRegNo: '\t\n',
        patientName: 'Karan',
        patientAge: 25,
      });
      assert.strictEqual(res.isValid, false);
    });

    it('R7-BND-2: should reject zero and negative patient age values', () => {
      const res = validateScheduleHPrescription({
        scheduleType: 'SCHEDULE_H',
        doctorName: 'Dr. Rao',
        doctorRegNo: 'REG-1234',
        patientName: 'Karan',
        patientAge: 0,
      });
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errors.some(e => e.includes('Patient Age')));
    });

    it('R7-BND-3: should strictly enforce patient address on Schedule X narcotic medications', () => {
      const res = validateScheduleHPrescription({
        scheduleType: 'SCHEDULE_X',
        doctorName: 'Dr. Rao',
        doctorRegNo: 'REG-1234',
        patientName: 'Karan',
        patientAge: 40,
        patientAddress: '',
      });
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errors.some(e => e.includes('Patient Address')));
    });

    it('R7-BND-4: should accept complex doctor registration numbers with hyphens and slashes', () => {
      const res = validateScheduleHPrescription({
        scheduleType: 'SCHEDULE_H',
        doctorName: 'Dr. S. K. Mukherjee',
        doctorRegNo: 'WB/MCI/2018/00982-A',
        patientName: 'Pooja Roy',
        patientAge: 29,
      });
      assert.strictEqual(res.isValid, true);
    });

    it('R7-BND-5: should accept pediatric patients with age 1 year', () => {
      const res = validateScheduleHPrescription({
        scheduleType: 'SCHEDULE_H',
        doctorName: 'Dr. Child Specialist',
        doctorRegNo: 'MCI-001122',
        patientName: 'Baby Aarav',
        patientAge: 1,
      });
      assert.strictEqual(res.isValid, true);
    });
  });
}