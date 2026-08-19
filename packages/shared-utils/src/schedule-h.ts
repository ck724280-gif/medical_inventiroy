export const CONTROLLED_SCHEDULES = ['SCHEDULE_H', 'SCHEDULE_H1', 'SCHEDULE_X', 'H', 'H1', 'X'];

export function isControlledSchedule(schedule?: string | null): boolean {
  if (!schedule) return false;
  return CONTROLLED_SCHEDULES.includes(schedule.toUpperCase().trim());
}

export interface PrescriptionValidationInput {
  doctorName?: string | null;
  doctorRegNo?: string | null;
  patientName?: string | null;
  patientAge?: number | null;
  prescriptionNumber?: string | null;
  patientAddress?: string | null;
  drugSchedule?: string | null;
}

export function validatePrescriptionDetails(input: PrescriptionValidationInput): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.doctorName || input.doctorName.trim().length === 0) {
    errors.push('Doctor name is required for Schedule H/H1/X drugs.');
  }

  if (!input.doctorRegNo || input.doctorRegNo.trim().length === 0) {
    errors.push('Doctor registration number is required for Schedule H/H1/X drugs.');
  }

  if (!input.patientName || input.patientName.trim().length === 0) {
    errors.push('Patient name is required.');
  }

  if (input.patientAge === undefined || input.patientAge === null || Number(input.patientAge) <= 0) {
    errors.push('Valid patient age is required.');
  }

  if (input.drugSchedule && input.drugSchedule.toUpperCase() === 'SCHEDULE_X') {
    if (!input.patientAddress || input.patientAddress.trim().length === 0) {
      errors.push('Patient address is mandatory for Schedule X narcotic drugs.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
