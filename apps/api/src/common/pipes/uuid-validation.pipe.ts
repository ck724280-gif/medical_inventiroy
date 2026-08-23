import { PipeTransform, Injectable, BadRequestException, ArgumentMetadata } from '@nestjs/common';
import { isUUID } from 'class-validator';

@Injectable()
export class UUIDValidationPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value || typeof value !== 'string') {
      throw new BadRequestException(`Resource parameter '${metadata.data || 'id'}' must be a valid UUID.`);
    }

    const trimmed = value.trim();
    if (!isUUID(trimmed, '4')) {
      throw new BadRequestException(
        `Invalid resource identifier: '${trimmed}'. Expected a valid standard UUID v4.`
      );
    }

    return trimmed;
  }
}
