import { AddOptions, Logger } from '../shared/types';
import { Repository, Reference } from 'nodegit';
import { filteredList, ListItem } from '../prompt/list';

const util = require('util');
const gitConfigOriginal = require('gitconfiglocal');

const gitConfig = util.promisify(gitConfigOriginal);

interface iBranch {
  name?: string;
  id: string;
  local?: boolean; // is local
  remote?: boolean; // is remote
}

export async function getLocalGitBranches() {
  const pathToRepo = require('path').resolve('');
  const repo = await Repository.open(pathToRepo);
  const refNames = await repo.getReferenceNames(Reference.TYPE.LISTALL);

  const branchList: iBranch[] = [];
  refNames.forEach((val) => {
    const branchParse = val.split('/');
    const branchName = branchParse[branchParse.length - 1];
    const branchType = branchParse[1] === 'remotes' ? 'remote' : 'local';

    let branch = branchList.find((branch) => branch.id === branchName);
    if (!branch) {
      branch = { id: branchName };
      branchList.push(branch);
    }

    branch[branchType] = true;
    branch.name = branch.remote ? branchName : branchName + ' (local)';
  });

  return branchList;
}

export async function getRepositoryUrl(): Promise<string> {
  const config = await gitConfig('./');
  const url = config?.remote?.origin?.url;
  if (!url) {
    throw new Error('no remote url found');
  }
  return url.startsWith('https') ? url : convertToGitHttpsUrl(url);
}

export function convertToGitHttpsUrl(sshUrl: string) {
  const regex = new RegExp('git@github.com:([^/]+)/(.+).git');
  //   const [_, owner, repoName] = regex.exec(sshUrl);
  const gitRepoConfig = regex.exec(sshUrl);
  if (!gitRepoConfig) {
    throw new Error('Getting Git config failed');
  }
  const owner = gitRepoConfig[1];
  const repoName = gitRepoConfig[2];
  return `https://github.com/${owner}/${repoName}`;
}

export async function selectDeploymentBranch(gitBranches: iBranch[] | undefined, options: AddOptions, logger: Logger) {
  if (!gitBranches || !gitBranches.length) {
    throw new Error('no git branches');
  }

  const branch = await filteredList(gitBranches as ListItem[], {
    id: 'deploymentBranch',
    message: 'Which Git branch should be used for deployment?',
  });

  return branch;
}
