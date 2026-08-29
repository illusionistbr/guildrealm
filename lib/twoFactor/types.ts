export type TwoFactorStatus = {
  enabled: boolean;
  enabledAt?: FirebaseFirestore.Timestamp | null;
  hasRecoveryCodes?: boolean;
  algorithm?: string;
  period?: number;
  digits?: number;
};

export type EnrollmentResult = {
  enrollmentId: string;
  secret: string;
  otpauthUrl: string;
  expiresAt: FirebaseFirestore.Timestamp;
};

export type ChallengeResult = {
  challengeId: string;
  expiresAt: FirebaseFirestore.Timestamp;
};
