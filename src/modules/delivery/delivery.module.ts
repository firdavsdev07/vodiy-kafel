import { Module } from '@nestjs/common';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';

/** Transport turlari, viloyatlar, tariflar (TZ 3.13). Admin CRUD — B-056. */
@Module({
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
