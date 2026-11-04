export interface PinStatusResponse {
  hasPin: boolean;
  isDefaultPin: boolean;
  isLockedOut: boolean;
  lockoutRemainingSeconds: number;
  updatedAt?: string;
}

export interface VerifyPinResponse {
  success: boolean;
  message: string;
  token?: string;
  isDefaultPin?: boolean;
  isLockedOut?: boolean;
  remainingSeconds?: number;
  attemptsLeft?: number;
}

export interface ChangePinResponse {
  success: boolean;
  message: string;
}
