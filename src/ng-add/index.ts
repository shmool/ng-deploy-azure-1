/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { confirm } from '../util/prompt/confirm';
import { getResourceGroup } from '../util/azure/resource-group';
import { AngularWorkspace } from '../util/workspace/angular-json';
import { readAzureJson, getAzureHostingConfig } from '../util/workspace/azure-json';
import { AddOptions } from '../util/shared/types';
import { getLocalGitBranches, selectDeploymentBranch } from '../util/git/branches';
import { getRepoURL } from '../util/git/remote';
import { getGitHubOAuthToken } from '../util/github/auth';
import { loginToAzure } from '../util/azure/identity';
import { TokenCredential } from '@azure/core-auth';
import { deploy } from '../util/azure/static-web-app';

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
      let auth = {} as TokenCredential;
      let subscription = '';

      // TODO: Fix CI authentication to use @azure/identity
      if (process.env['CI']) {
      } else {
        const azureService = await loginToAzure(_context.logger, _options);
        if (!azureService.credentials || !azureService.selectedSubscriptionId) {
          throw new Error('No credentials or no subscription for Azure provided.');
        }
        auth = azureService.credentials;
        subscription = azureService.selectedSubscriptionId;
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
      _context.logger.info('selected branch: ' + selectedBranch.deploymentBranch.id);

      // get GitHub token for OAuth app
      const gitHubToken = await getGitHubOAuthToken();

      const credentials = auth;
      const resourceGroup = await getResourceGroup(credentials, subscription, _options, _context.logger);

      if (_options.storage) {
        /* const client = getAzureStorageClient(credentials, subscription);
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
         generateAzureJson(tree, appDeployConfig, azureDeployConfig);*/
      } else {
        const azureInfo = {
          credentials: credentials,
          subscriptionId: subscription,
          resourceGroup: resourceGroup.name,
        };

        const gitHubInfo = {
          branch: selectedBranch.deploymentBranch.id,
          repositoryUrl: remoteURL,
          token: gitHubToken,
        };

        const appInfo = {
          appName: project.projectName,
          outputPath: project.path,
        };
        // deploy with SWA
        // const client = new WebSiteManagementClient(credentials, subscription);
        const deployRes = await deploy(azureInfo, gitHubInfo, appInfo);

        _context.logger.info(`Deployed 🚀🚀🚀 visit your new website at https://${deployRes.defaultHostname} , 
You can view the process the the deployment here: ${deployRes.repositoryUrl}/actions, 
enjoy!`);
      }
    }

    await project.addLogoutArchitect();
    await project.addDeployArchitect();
  };
}
