import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsArray, IsBoolean } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsArray({ message: 'Roles must be an array of role IDs' })
  roleIds: string[];

  @IsOptional()
  @IsArray({ message: 'Branch IDs must be an array' })
  branchIds?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsArray()
  roleIds?: string[];

  @IsOptional()
  @IsArray()
  branchIds?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
