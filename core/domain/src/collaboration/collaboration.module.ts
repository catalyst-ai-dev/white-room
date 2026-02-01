import type { IEventBus } from '@domain/lib/EventBus';
import { CollaborationService } from './collaboration.service';

export class CollaborationModule {
  public readonly collaborationService: CollaborationService;

  constructor(eventBus: IEventBus) {
    this.collaborationService = new CollaborationService(eventBus);
  }
}
