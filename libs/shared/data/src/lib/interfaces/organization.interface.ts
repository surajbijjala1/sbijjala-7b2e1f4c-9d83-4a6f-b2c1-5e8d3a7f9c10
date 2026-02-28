export interface IOrganization {
  id: string;
  name: string;
  parentId: string | null;
}

export interface ICreateOrganization {
  name: string;
  parentId?: string | null;
}
