import { PartialType } from '@nestjs/swagger';
import { CreateProductoDto } from './create-producto.dto';

// No incluye "stock": cambia solo con movimientos
export class UpdateProductoDto extends PartialType(CreateProductoDto) {}