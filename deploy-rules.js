import fs from 'fs';
import { google } from 'googleapis';

async function run() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  const client = await auth.getClient();
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  
  const res = await client.request({
    url: 'https://firebaserules.googleapis.com/v1/projects/diacontrolapp/releases',
    method: 'GET'
  });
  console.log("Releases:", JSON.stringify(res.data, null, 2));
}

run().catch(e => console.error(e));
