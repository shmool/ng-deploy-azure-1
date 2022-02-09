import { StaticSiteARMResource, WebSiteManagementClient } from '@azure/arm-appservice';
import { TokenCredential } from '@azure/core-auth';

export type DeployInformation = {
  branch: string;
  repositoryUrl: string;
  appName: string;
};

export type AzureInformation = {
  credentials: TokenCredential;
  subscriptionId: string;
  resourceGroup: string;
};

export type GitHubInformation = {
  branch: string;
  repositoryUrl: string;
  token: string;
};

export type AppInformation = {
  appName: string;
  outputPath: string;
};

export async function deploy(
  azureInformation: AzureInformation,
  gitHubInformation: GitHubInformation,
  appInformation: AppInformation
) {
  if (!azureInformation.credentials) {
    throw new Error('no credentials set');
  }
  if (!azureInformation.subscriptionId) {
    throw new Error('no selectedSubscriptionId set');
  }
  const client = new WebSiteManagementClient(azureInformation.credentials, azureInformation.subscriptionId);
  const parameter: StaticSiteARMResource = {
    location: 'eastus2',
    sku: {
      name: 'Free',
    },
    repositoryUrl: gitHubInformation.repositoryUrl,
    branch: gitHubInformation.branch,
    repositoryToken: gitHubInformation.token,
    buildProperties: {
      appLocation: '',
      appArtifactLocation: appInformation.outputPath,
    },
  };
  return await client.staticSites.beginCreateOrUpdateStaticSiteAndWait(
    azureInformation.resourceGroup,
    appInformation.appName,
    parameter
  );
}

export async function listAllSwa(credentials: TokenCredential, subscription: string) {
  const client = new WebSiteManagementClient(credentials, subscription);
  return (await client.staticSites.listStaticSitesByResourceGroup('swa-deploy-cli-demo')).byPage();
}
