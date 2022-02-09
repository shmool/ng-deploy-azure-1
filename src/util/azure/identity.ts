import { Express, json, urlencoded } from 'express';
import express = require('express');
import { Server } from 'http';
import { AccessToken, InteractiveBrowserCredential } from '@azure/identity';
import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import { selectSubscription } from './subscription';
import { Logger } from '../shared/types';
import { Subscription, SubscriptionListResult, TenantIdDescription, TenantListResult } from './azure-types';
import { prompt } from 'inquirer';

const HOST = 'management.azure.com';
const TENANTS_ENDPOINT = `https://${HOST}/tenants`;
const SUBSCRIPTIONS_ENDPOINT = `https://${HOST}/subscriptions`;
const API_VERSION = '2020-01-01';
const LOGIN_SCOPE = 'https://management.azure.com/.default';
const REDIECT_URL = (port: number) => `http://localhost:${port}/`;

export async function loginToAzure(logger: Logger, _options?: any) {
  logger.info(
    'Please log in to Azure twice: first, to get your tenants. Second to get your subscriptions for the selected tenant.'
  );
  const tenants = await getTenants();
  const tenantId = await selectTenant(tenants.value);
  const azureService = new AzureService(3002);
  await azureService.login(tenantId);
  const subscriptionId = await selectSubscription(await azureService.getSubscriptions(), _options, logger);
  azureService.selectedSubscriptionId = subscriptionId;
  return azureService;
}

export async function getTenants(): Promise<TenantListResult> {
  const cred = new InteractiveBrowserCredential({ redirectUri: REDIECT_URL(3000) });
  const accessToken = await cred.getToken(LOGIN_SCOPE);
  return sendRequest(TENANTS_ENDPOINT, accessToken);
}

async function selectTenant(tenants: TenantIdDescription[]): Promise<string> {
  const { tenant } = await prompt<{ tenant: string }>([
    {
      type: 'list',
      name: 'tenant',
      choices: tenants.map((choice) => ({
        name: `${choice.displayName} – ${choice.tenantId}`,
        value: choice.tenantId,
      })),
      message: 'Please select the your azure tenant',
    },
  ]);
  if (!tenant) {
    throw new Error('No tenant ID');
  }
  return tenant;
}

async function sendRequest(url: string, accessToken: AccessToken) {
  const searchParams = new URLSearchParams({ 'api-version': API_VERSION });
  const res = await fetch(`${url}?${searchParams}`, {
    headers: {
      Authorization: `Bearer ${accessToken.token}`,
      'Content-Type': 'application/json',
    },
  });
  return res.json();
}

export async function getSubscriptions(accessToken: AccessToken): Promise<SubscriptionListResult> {
  return sendRequest(SUBSCRIPTIONS_ENDPOINT, accessToken);
}

export default class AzureService {
  public credentials: InteractiveBrowserCredential | undefined;
  public subscriptions: Subscription[] | undefined;
  public selectedSubscriptionId: string | undefined;
  public githubToken: string | undefined;
  public app: Express;
  public server: Server | undefined;

  constructor(public port: number) {
    this.app = express();
    this.app.use(json(), urlencoded({ extended: false }));
  }

  init() {
    this.server = this.app.listen(this.port);
    this.app.get('/callback', async (_, res: any) => {
      res.send('OK');
      (this.server as Server).close();
    });
  }
  async login(_tenantId: string) {
    this.credentials = new InteractiveBrowserCredential({ redirectUri: REDIECT_URL(this.port), tenantId: _tenantId });
    const accessToken = await this.credentials.getToken(LOGIN_SCOPE);
    const subscriptions = await getSubscriptions(accessToken);
    this.subscriptions = subscriptions.value;
  }
  async getSubscriptions() {
    if (!this.credentials) {
      throw new Error("sorry you're not logged in yet");
    }
    const accessToken = await this.credentials.getToken(LOGIN_SCOPE);
    const res = await getSubscriptions(accessToken);
    return res.value;
  }
}
