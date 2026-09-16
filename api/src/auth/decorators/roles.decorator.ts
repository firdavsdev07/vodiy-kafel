import { SetMetadata } from '@nestjs/common';

/** Rol talab qiladi: `@Roles('SUPER_ADMIN')` */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
