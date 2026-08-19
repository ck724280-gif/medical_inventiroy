import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Current password is required' })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  newPassword: string;

  @IsString()
  @MinLength(8, { message: 'Confirm password must match' })
  confirmPassword: string;
}
