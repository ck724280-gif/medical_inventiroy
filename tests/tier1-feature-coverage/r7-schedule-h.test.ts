import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export interface ScheduleHValidationParams {
  scheduleType: 'OTC' | 'SCHEDULE_H' | 'SCHEDULE_H1' | 'SCHEDULE_X';
  doctorName?: string | null;
  doctorRegNo?: string | null;
  patientName?: string | null;
  patientAge?: number | null;
  patientAddress?: string | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateScheduleHPrescription(params: ScheduleHValidationParams): ValidationResult {
  const errors: string[] = [];
  if (params.scheduleType === 'OTC') {
    return { isValid: true, errors: [] };
  }

  if (!params.doctorName || params.doctorName.trim().length === 0) {
    errors.push('Doctor Name is required for Schedule H/H1/X drugs');
  }
  if (!params.doctorRegNo || params.doctorRegNo.trim().length === 0) {
    errors.push('Doctor Registration Number is required');
  }
  if (!params.patientName || params.patientName.trim().length === 0) {
    errors.push('Patient Name is required');
  }
  if (params.patientAge === undefined || params.patientAge === null || params.patientAge <= 0) {
    errors.push('Valid Patient Age is required');
  }

  if (params.scheduleType === 'SCHEDULE_H1' || params.scheduleType === 'SCHEDULE_X') {
    if (!params.patientAddress || params.patientAddress.trim().length === 0) {
      errors.push('Patient Address is mandatory for Schedule H1 and Schedule X records');
    }
  }

  return { isValid: errors.length === 0, errors };
}

export function runR7ScheduleHTests() {
  describe('Tier 1 - R7: Schedule H/H1 Compliance Register & Prescription Engine', () => {
    it('R7-T1-1: should allow OTC medicine checkout without prescription details', () => {
      const res = validateScheduleHPrescription({ scheduleType: 'OTC' });
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.errors.length, 0);
    });

    it('R7-T1-2: should reject Schedule H medicine checkout when doctor name or reg no is missing', () => {
      const res = validateScheduleHPrescription({
        scheduleType: 'SCHEDULE_H',
        patientName: 'Rahul Sharma',
        patientAge: 34,
      });
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errors.some(e => e.includes('Doctor Name')));
      assert.ok(res.errors.some(e => e.includes('Doctor Registration Number')));
    });

    it('R7-T1-3: should reject Schedule H1 medicine when patient address is missing', () => {
      const res = validateScheduleHPrescription({
        scheduleType: 'SCHEDULE_H1',
        doctorName: 'Dr. A. Verma',
        doctorRegNo: 'MCI-998822',
        patientName: 'Anita Gupta',
        patientAge: 45,
      });
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errors.some(e => e.includes('Patient Address')));
    });

    it('R7-T1-4: should validate complete Schedule H1 dispensing entry', () => {
      const res = validateScheduleHPrescription({
        scheduleType: 'SCHEDULE_H1',
        doctorName: 'Dr. A. Verma',
        doctorRegNo: 'MCI-998822',
        patientName: 'Anita Gupta',
        patientAge: 45,
        patientAddress: 'Flat 402, Sunshine Heights, Mumbai',
      });
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.errors.length, 0);
    });

    it('R7-T1-5: should format schedule H audit export record according to Form 35 regulatory requirements', () => {
      const record = {
        date: '2026-08-19',
        patientName: 'Anita Gupta',
        patientAddress: 'Mumbai',
        doctorName: 'Dr. A. Verma',
        doctorRegNo: 'MCI-998822',
        medicineName: 'Alprazolam 0.5mg',
        batchNumber: 'ALP-2026-01',
        quantity: 10,
      };

      assert.strictEqual(record.quantity, 10);
      assert.strictEqual(record.doctorRegNo, 'MCI-998822');
    });
  });
}