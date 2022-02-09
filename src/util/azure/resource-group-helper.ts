/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ResourceGroup, ResourceManagementClient } from '@azure/arm-resources';
import { ListItem } from '../prompt/list';
import { TokenCredential } from '@azure/core-auth';

export interface ResourceGroupDetails extends ListItem {
  id: string;
  name: string;
  properties?: any;
  location: string;
}

export async function getResourceGroups(creds: TokenCredential, subscription: string) {
  const client = new ResourceManagementClient(creds, subscription);
  const asyncList = await client.resourceGroups.list();
  const resourceGroupList = [];
  for await (const item of asyncList) {
    resourceGroupList.push(item as ResourceGroupDetails);
  }
  return resourceGroupList;
}

export async function createResourceGroup(
  name: string,
  subscription: string,
  creds: TokenCredential,
  location: string
): Promise<ResourceGroup> {
  // TODO: throws an error here if the subscription is wrong
  const client = new ResourceManagementClient(creds, subscription);
  const resourceGroupRes = await client.resourceGroups.createOrUpdate(name, {
    location,
  });
  return resourceGroupRes;
}
