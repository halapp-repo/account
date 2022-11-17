export interface AccountRepositoryDTO {
  AccountID: string;
  TS: string;
  EventType: string;
  Payload: string;
}

export interface OrganizationRepositoryDTO extends AccountRepositoryDTO {
  VKN?: string;
}
export interface UserRepositoryDTO extends AccountRepositoryDTO {
  Email?: string;
}
