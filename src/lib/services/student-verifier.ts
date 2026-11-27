export interface StudentVerificationResult {
  valid: boolean;
  reason?: string;
}

export interface StudentIdVerifier {
  verify(studentId: string, email: string): Promise<StudentVerificationResult>;
}

/**
 * Validates university student IDs (7-digit BUET CSE format like 2104012 or alphanumeric 6-12 chars)
 * and institutional email formatting.
 */
export class UniversityStudentVerifier implements StudentIdVerifier {
  async verify(
    studentId: string,
    email: string
  ): Promise<StudentVerificationResult> {
    const trimmedId = studentId.trim();
    const trimmedEmail = email.trim();

    if (!/^[A-Za-z0-9]{6,12}$/.test(trimmedId)) {
      return {
        valid: false,
        reason: "Student ID must be 6–12 alphanumeric characters (e.g., 2104012).",
      };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return {
        valid: false,
        reason: "A valid student email address is required.",
      };
    }

    return { valid: true };
  }
}
