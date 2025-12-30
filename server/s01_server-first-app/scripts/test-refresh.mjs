import { LicensingService } from '../lib/licensing-service.mjs';
import { initializeLicensingDB } from '../lib/licensing-db.mjs';

async function testRefresh() {
  try {
    await initializeLicensingDB();
    
    const refreshToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjdXN0bWdyLmFpcHJpdmF0ZXNlYXJjaC5jb20iLCJzdWIiOjEwLCJhdWQiOiJhaXByaXZhdGVzZWFyY2giLCJqdGkiOiI4ZTVjNTk1MC1hMzYyLTRjNGMtYmRiZi0zODNiYTRjZjgxMjEiLCJpYXQiOjE3NjcxMTMwNzYsImV4cCI6MTc2OTcwNTA3NiwiZW1haWwiOiJicnVjZS50cm91dG1hbkBnbWFpbC5jb20iLCJjdXN0b21lcl9pZCI6MTAsInRpZXIiOjEsInRpZXJfbmFtZSI6InN0YW5kYXJkIiwic3RhdHVzIjoiYWN0aXZlIiwiaHciOiJhYzQzYmI3NDU2ZWFiNzRjYjBkZTlmNTE3Yzc0ZmRlZmVhNDM5NjY3NmFkODMxNWYxYThhM2YxNTlmZjNlOWU2IiwiZGV2aWNlX2lkIjoiZjAzMGY5NmItMmZjNS00NDU5LTg2MWEtNmFhNDBlZTAxYmJkIiwiZmVhdHVyZXMiOlsic2VhcmNoIiwiY29sbGVjdGlvbnMiXSwibWF4X2RldmljZXMiOjIsImN1cnJlbnRfZGV2aWNlcyI6MSwiYXBwIjoiYWlwcml2YXRlc2VhcmNoIiwidmVyIjoiMTkuODMiLCJ0b2tlbl92ZXJzaW9uIjoyLCJ0b2tlbl90eXBlIjoicmVmcmVzaCJ9.Lj9xYq-WItXulJuH-0N90dOiD0biCJ-g4bRt1i3koLN8uOlDxsQ4CTsSrKvCsiOLNMqn4p4YS4Xi9Ej15f3ygZCDIO9MwTRYqnffAO3rPktLjGJ3TOo9gtyz3Otnr2uqSVOvJ0b0stjmiEyW-1zx6jLs1e5vsWsJwcFbdelP9paSBzfrGQSwqSIyjOyPNSPOdSBeNjsHjbd6UgnHsnmvQgllHPhpfaADrHpeF256yMgfHZOQ0BQpVOpQZH9wS_yr3PpQ1ozS4q4V797SlqQMEM7CT72lwNj8KCJJz41mIKH2nrSF_4fCCEWyci_5LuMYozNBR9EKpOpNAw1LmoSUrw";
    
    console.log('Testing token refresh...');
    const result = await LicensingService.refreshLicense(refreshToken);
    
    console.log('Refresh result:', JSON.stringify(result, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Refresh error:', error.message);
    process.exit(1);
  }
}

testRefresh();