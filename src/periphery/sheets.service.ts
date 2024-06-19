import { Injectable } from '@nestjs/common';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';
import * as path from 'path';
import * as fs from 'fs';
import { Timeout } from '@nestjs/schedule';
import { OrderHistoryDTO } from 'src/types/order.model';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'google_credentials.json');
const SHEET_ID = '1MUm6jFUOA-5xZX7HJ4YocqlZ-J_Ow1HMi_xc41uBeK0';
const SHEET_NAME = 'ORDER_HISTORY';

@Injectable()
export class SheetsService {
  private client: any;

  constructor() {
    this.authorize();
  }

  async loadSavedCredentialsIfExists() {
    try {
      const content = fs.readFileSync(TOKEN_PATH).toString();
      const credentials = JSON.parse(content);
      return google.auth.fromJSON(credentials);
    } catch (err) {
      return null;
    }
  }

  async saveCredentials(client) {
    const content = fs.readFileSync(CREDENTIALS_PATH).toString();
    const key = JSON.parse(content);
    const payload = JSON.stringify({
      type: 'authorized_user',
      client_id: key.web.client_id,
      client_secret: key.web.client_secret,
      refresh_token: client.credentials.refresh_token,
    });
    fs.writeFileSync(TOKEN_PATH, payload);
  }

  async authorize() {
    let client: any = await this.loadSavedCredentialsIfExists();
    if (client) {
      this.client = client;
      return client;
    }
    client = await authenticate({
      scopes: SCOPES,
      keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
      await this.saveCredentials(client);
    }

    return client;
  }

  async insertRows() {
    const sheets = google.sheets({ version: 'v4', auth: this.client });
    const data = [
      ['Name', 'Age', 'City'],
      ['John', 30, 'New York'],
      ['Alice', 25, 'San Francisco'],
    ];
    const range = '시트1!A1:C3';

    const res = await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: data },
    });

    console.log(res);
    return;
  }

  async appendRow(data: OrderHistoryDTO) {
    const values = Object.values(data);
    const sheets = google.sheets({ version: 'v4', auth: this.client });

    try {
      const res = await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: SHEET_NAME,
        valueInputOption: 'RAW',
        requestBody: { values: [values] },
      });

      return res;
    } catch (err) {
      console.log(err);
      throw Error('Google API ERR');
    }
  }
}
