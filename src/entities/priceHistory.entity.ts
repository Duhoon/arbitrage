import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
@Index(['currentDate', 'pair', 'chance'])
export class PriceHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'current_date' })
  currentDate: Date;

  @Column()
  pair: string;

  @Column({ type: 'double' })
  input: number;

  @Column({ name: 'cex_price', type: 'double' })
  cexPrice: number;

  @Column({ name: 'dex_price', type: 'double' })
  dexPrice: number;

  @Column({ type: 'double' })
  profit: number;

  @Column({ type: 'double' })
  cost: number;

  @Column()
  chance: boolean;
}
