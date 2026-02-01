import type { DataSource } from 'typeorm';
import type { IEventBus } from './lib/EventBus';

import { AddressModule } from './address/address.module';
import { UserModule } from './user/user.module';
import { LambdaModule } from './lambda/lambda.module';
import { DataTableModule } from './dataTable/dataTable.module';
import { AuthModule } from './auth/auth.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { EventBus } from './lib/EventBus';

/**
 * Instantiates and manages the core domain services and repositories.
 *
 * This module serves as the main orchestrator for domain-level services,
 * handling dependencies and connections between different parts of the domain.
 * It initializes repositories, services, and sets up event handlers.
 *
 * The module requires a DataSource for database access and optionally accepts
 * an EventBus for domain event handling.
 */
export class DomainModule {
  private readonly dataSource: DataSource;
  private readonly eventBus: IEventBus;

  // Domain namespaces
  public readonly address: AddressModule;
  public readonly user: UserModule;
  public readonly lambda: LambdaModule;
  public readonly dataTable: DataTableModule;
  public readonly auth: AuthModule;
  public readonly collaboration: CollaborationModule;

  constructor(dataSource: DataSource, eventBus: IEventBus = new EventBus()) {
    this.dataSource = dataSource;
    this.eventBus = eventBus;

    this.address = new AddressModule(this.dataSource);
    this.user = new UserModule(this.dataSource);
    this.lambda = new LambdaModule(this.dataSource);
    this.dataTable = new DataTableModule(this.dataSource);
    this.auth = new AuthModule(this.user.userService);
    this.collaboration = new CollaborationModule(this.eventBus);
  }
}
