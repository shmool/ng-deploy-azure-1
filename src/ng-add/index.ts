/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { confirm } from '../util/prompt/confirm';
import { loginToAzureWithCI } from '../util/azure/auth';
import { DeviceTokenCredentials, AuthResponse } from '@azure/ms-rest-nodeauth';
// import { selectSubscription } from '../util/azure/subscription';
import { getResourceGroup } from '../util/azure/resource-group';
import { getAccount, getAzureStorageClient } from '../util/azure/account';
import { AngularWorkspace } from '../util/workspace/angular-json';
import { generateAzureJson, readAzureJson, getAzureHostingConfig } from '../util/workspace/azure-json';
import { AddOptions } from '../util/shared/types';
import { getLocalGitBranches, selectDeploymentBranch } from '../util/git/branches';
import { getRepoURL } from '../util/git/remote';
import { getGitHubOAuthToken } from '../util/github/auth';
// import { WebSiteManagementClient } from '@azure/arm-appservice';

export function ngAdd(_options: AddOptions): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    return chain([addDeployAzure(_options)])(tree, _context);
  };
}

export function addDeployAzure(_options: AddOptions): Rule {
  return async (tree: Tree, _context: SchematicContext) => {
    const project = new AngularWorkspace(tree);
    await project.getWorkspaceData(_options);
    const azureJson = readAzureJson(tree);
    const hostingConfig = azureJson ? getAzureHostingConfig(azureJson, project.projectName) : null;

    if (!hostingConfig || (await confirm(`Overwrite existing Azure config for ${project.projectName}?`))) {
      let auth = {} as AuthResponse;
      let subscription = '';
      if (process.env['CI']) {
        _context.logger.info(`CI mode detected`);
        auth = await loginToAzureWithCI(_context.logger);
        // the AZURE_SUBSCRIPTION_ID variable is validated inside the loginToAzureWithCI
        // so we have the guarantee that the value is not empty.
        subscription = process.env.AZURE_SUBSCRIPTION_ID as string;

        // make sure the project property is set correctly
        // this is needed when creating a storage account
        _options = {
          ..._options,
          project: project.projectName,
        };
      } else {
        // auth = await loginToAzure(_context.logger);
        // subscription = await selectSubscription(auth.subscriptions, _options, _context.logger);
      }

      const remoteURL = await getRepoURL();
      await confirm(`The repository remote URL is ${remoteURL}, is that correct?`, true);

      const gitBranches = await getLocalGitBranches();
      let selectedBranch = null;
      while (!selectedBranch?.deploymentBranch.remote) {
        selectedBranch = await selectDeploymentBranch(gitBranches, _options, _context.logger);
        if (!selectedBranch.deploymentBranch.remote) {
          _context.logger.warn(
            `The deployment branch must be remote.` +
              ` Please create the branch in the remote repository or select a different branch.`
          );
        }
      }
      _context.logger.info('selected branch: ' + JSON.stringify(selectedBranch));

      // get GitHub token for OAuth app
      const gitHubToken = await getGitHubOAuthToken();
      console.log(gitHubToken);

      const credentials = auth.credentials as DeviceTokenCredentials;
      const resourceGroup = await getResourceGroup(credentials, subscription, _options, _context.logger);

      if (_options.storage) {
        const client = getAzureStorageClient(credentials, subscription);
        const account = await getAccount(client, resourceGroup, _options, _context.logger);

        const appDeployConfig = {
          project: project.projectName,
          target: project.target,
          configuration: project.configuration,
          path: project.path,
        };

        const azureDeployConfig = {
          subscription,
          resourceGroupName: resourceGroup.name,
          account,
        };

        // TODO: log url for account at Azure portal
        generateAzureJson(tree, appDeployConfig, azureDeployConfig);
      } else {
        // deploy with SWA
        // const client = new WebSiteManagementClient(credentials, subscription);
      }
    }

    await project.addLogoutArchitect();
    await project.addDeployArchitect();
  };
}
