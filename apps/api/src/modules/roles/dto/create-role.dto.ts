import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty({ message: 'Role name is required' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray({ message: 'Permissions must be an array of permission IDs' })
  permissionIds: string[];
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  permissionIds?: string[];
}
