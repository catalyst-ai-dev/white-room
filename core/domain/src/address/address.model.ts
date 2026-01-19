import type { AddressLocationPointDto, AddressPartialDto } from '@namespace/address-helpers';
import type { Coordinates } from '@namespace/shared';

import { State, AddressType } from '@namespace/address-helpers';
import { generateSnowflakeId } from '@domain/lib/snowflake';
import { Entity, PrimaryColumn, Column, CreateDateColumn, BeforeInsert, Index } from 'typeorm';
import { AddressDisplayRequiredError } from './address.errors';

@Entity('address')
export class Address {
  @PrimaryColumn('bigint')
  id!: string;

  @Index()
  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'enum', enum: AddressType })
  type!: AddressType;

  @Column({ type: 'varchar', nullable: true })
  streetName: string | null = null;

  @Column({ type: 'varchar', nullable: true })
  streetNumber: string | null = null;

  @Column({ type: 'varchar', nullable: true })
  streetPrefix: string | null = null;

  @Column({ type: 'varchar', nullable: true })
  streetSuffix: string | null = null;

  @Column({ type: 'varchar', nullable: true })
  unitNumber: string | null = null;

  @Column()
  city!: string;

  @Column({ type: 'varchar', nullable: true })
  county: string | null = null;

  @Column({ type: 'enum', enum: State })
  stateCode!: State;

  @Column({ default: 'US' })
  countryCode!: 'US';

  @Column()
  zip!: string;

  @Column({ type: 'float' })
  latitude!: number;

  @Column({ type: 'float' })
  longitude!: number;

  @Column({ type: 'varchar', nullable: true })
  streetDisplay: string | null = null;

  @Column()
  display!: string;

  @Column('jsonb')
  locationPoint!: AddressLocationPointDto;

  static create(data: AddressPartialDto) {
    const address = new Address();
    address.id = generateSnowflakeId();
    address.createdAt = new Date();

    // Determine the address type based on the presence of street information
    address.type =
      data.streetName && data.streetNumber ? AddressType.Address : AddressType.Coordinates;

    Object.assign(address, data);

    // For coordinates-only addresses, ensure display fields are properly set
    if (address.type === AddressType.Coordinates) {
      if (!data.display) {
        throw new AddressDisplayRequiredError(
          'Display field is required for coordinate-only addresses',
        );
      }
      address.display = data.display;
      address.streetDisplay = null;
      address.streetName = null;
      address.streetNumber = null;
      address.streetPrefix = null;
      address.streetSuffix = null;
      address.unitNumber = null;
    }

    return address;
  }

  getCoordinates(): Coordinates {
    return { lat: this.latitude, lon: this.longitude };
  }

  @BeforeInsert()
  createLocationPoint() {
    if (this.latitude && this.longitude) {
      this.locationPoint = {
        type: 'Point',
        coordinates: [this.longitude, this.latitude],
      };
    }
  }
}
