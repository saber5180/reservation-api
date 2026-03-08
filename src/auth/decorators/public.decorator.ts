import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Use @Public() on routes that don't require authentication
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
