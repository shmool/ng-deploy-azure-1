import { Express, Request, Response, json, urlencoded } from 'express';
import express = require('express');
import fetch from 'node-fetch';
import 'dotenv';
import * as open from 'open';
import { Server } from 'http';
import { URL, URLSearchParams } from 'url';
import { githubClientId, githubClientSecret, githubScopes } from './constants';

export interface AccessTokenResponse {
  access_token: string;
  scope: string;
  token_type: string;
}

class DeferredToken {
  promise: Promise<string>;
  reject: (value: string | PromiseLike<string>) => void;
  resolve: (reason: any) => void;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.reject = reject;
      this.resolve = resolve;
    });
  }
}

export async function getGitHubOAuthToken() {
  const tokenPromise = new DeferredToken();

  async function afterGitHubOAuthComplete(token: string) {
    return tokenPromise.resolve(token);
  }

  const githubOauth = new GitHubOAuthService(3001, afterGitHubOAuthComplete);
  await githubOauth.init();
  await githubOauth.loginToGithub();
  return tokenPromise.promise;
}

const host = new URL('https://github.com');

export default class GitHubOAuthService {
  public app: Express;
  public server: Server | undefined;
  public token: string | undefined;

  constructor(public port: number, public loginCompleteCallback: (token: string) => void) {
    this.app = express();
    this.app.use(json(), urlencoded({ extended: false }));
  }

  async init() {
    // redirect after logging in to GitHub
    this.server = this.app.listen(this.port);
    this.app.get('/callback', async (req: Request, res: Response) => {
      const { code } = req.query;
      const token = await this.getToken(code as string);
      if (!token) {
        throw new Error('error receiving github token');
      }
      this.token = token;
      res.send('OK');
      (this.server as Server).close();
      this.loginCompleteCallback(token);
    });
  }

  public async loginToGithub() {
    const searchParams = new URLSearchParams({
      scope: githubScopes.join(' '),
      redirect_uri: `http://localhost:${this.port}/callback`,
      client_id: githubClientId as string,
    });
    const url = `https://${host.hostname}/login/oauth/authorize?${searchParams}`;
    return await open(url);
  }

  public async getToken(code: string): Promise<string> {
    const { hostname } = host;
    const params = new URLSearchParams({
      client_id: githubClientId,
      client_secret: githubClientSecret,
      code: code,
    });

    const res = await fetch(`https://${hostname}/login/oauth/access_token`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: params,
    });
    return (await res.json()).access_token;
  }
}
