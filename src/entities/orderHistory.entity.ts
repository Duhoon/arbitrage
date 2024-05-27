import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity({ name: 'ORDER_HISTORY' })
@Index(['pair', 'orderId', 'swapTxHash'])
export class OrderHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'price_id', unique: true })
  priceId: number;

  @Column()
  currentDate: Date;

  @Column()
  pair: string;

  @Column({ type: 'double' })
  profit: number;

  @Column({ type: 'double' })
  cost: number;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'swap_tx_hash' })
  swapTxHash: string;

  @Column({ default: false })
  orderFill: boolean;

  @Column({ default: false })
  swapSuccess: boolean;

  @Column({ type: 'text', nullable: true })
  memo: string;
}
