import { CollaborationService } from './collaboration.service';

export class CollaborationModule {
  public readonly collaborationService: CollaborationService;

  constructor() {
    this.collaborationService = new CollaborationService();
  }
}
